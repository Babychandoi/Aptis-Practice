package vn.weconex.aptis.conversation.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.weconex.aptis.common.config.AptisProperties;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.conversation.domain.AiConversationSession;
import vn.weconex.aptis.conversation.repository.AiConversationSessionRepository;
import vn.weconex.aptis.conversation.repository.AiConversationTurnRepository;
import vn.weconex.aptis.entitlement.service.EntitlementService;
import vn.weconex.aptis.conversation.service.AiConversationHistoryService.HistoryTurn;

class AiConversationRecoveryTest {
    private final AiConversationSessionRepository sessions = mock(AiConversationSessionRepository.class);
    private final AiConversationTurnRepository turns = mock(AiConversationTurnRepository.class);
    private final EntitlementService entitlements = mock(EntitlementService.class);
    private final GeminiEphemeralTokenClient tokens = mock(GeminiEphemeralTokenClient.class);
    private final GeminiProviderPool providers = mock(GeminiProviderPool.class);
    private final AiConversationPrompt prompt = mock(AiConversationPrompt.class);
    private final AiConversationMemoryService memory = mock(AiConversationMemoryService.class);
    private final AiConversationHistoryService history = new AiConversationHistoryService(new ObjectMapper(), turns, sessions);
    private final AptisProperties properties = new AptisProperties(null, null, null, null, null, null, null,
            new AptisProperties.AiConversation(true, true, "unused", "new-default-model", 60, 120, 30), null);
    private final AiConversationService service = new AiConversationService(sessions, entitlements, tokens,
            providers, properties, prompt, memory, history, new AiConversationReconnectLimiter());
    private AiConversationSession room;
    private GeminiProviderPool.Credential pinned;

    @BeforeEach
    void setup() {
        room = new AiConversationSession();
        room.setId("room-1");
        room.setUserId("owner");
        room.setStatus("ACTIVE");
        room.setTopic("Travel");
        room.setCefrLevel("B1");
        room.setStartedAt(Instant.now().minusSeconds(60));
        room.setExpiresAt(Instant.now().plusSeconds(3540));
        room.setProviderId("project-original");
        room.setModel("original-model");
        room.setVoice("Puck");
        room.setConnectionPrompt("exact original instructions");
        room.setHistoryJson("[]");
        when(entitlements.hasAiConversationAccess("owner")).thenReturn(true);
        when(sessions.findOwnedForUpdate("owner", "room-1")).thenReturn(Optional.of(room));
        when(sessions.findOverlappingDay(eq("owner"), any(), any())).thenReturn(List.of(room));
        pinned = new GeminiProviderPool.Credential("project-original", "original", "unused", "original-model");
        when(providers.forSession("project-original", "original-model")).thenReturn(pinned);
        when(tokens.create(anyString(), any(), anyInt(), nullable(String.class), anyString()))
                .thenReturn(new GeminiEphemeralTokenClient.Token("temporary-token", Instant.now().plusSeconds(3600),
                        Instant.now().plusSeconds(60)));
        when(prompt.build(anyString(), anyString(), anyString())).thenReturn("fresh complete prompt");
        when(memory.buildContext(anyString(), isNull())).thenReturn("{\"known_facts\":{\"name\":\"Lan\"}}");
    }

    @Test
    void resumptionPinsProjectModelVoiceAndPromptWithoutNewBillingRoomOrExpiryExtension() {
        Instant expiry = room.getExpiresAt();
        var result = service.reconnect("owner", "room-1", "resume-1", null, null, false);
        assertThat(result.session()).isSameAs(room);
        assertThat(result.resumeAttempted()).isTrue();
        assertThat(result.session().getExpiresAt()).isEqualTo(expiry);
        assertThat(result.session().getStartedAt()).isEqualTo(room.getStartedAt());
        verify(tokens).create(eq("exact original instructions"), same(pinned), anyInt(), eq("resume-1"), eq("Puck"));
        verify(providers, never()).acquire();
        verify(sessions, never()).save(any());
        verify(sessions, never()).countByUserIdAndCreatedAtAfter(any(), any());
        verifyNoInteractions(memory);
    }

    @Test
    void forceFreshRebuildsFromAllTurnsEvenWithAHandle() {
        List<HistoryTurn> full = List.of(new HistoryTurn("turn-1", "user", "My dog is named Miso."),
                new HistoryTurn("turn-2", "ai", "Miso sounds lovely."),
                new HistoryTurn("turn-3", "user", "What is my dog's name?"));
        var result = service.reconnect("owner", "room-1", "old-handle", full, 3L, true);
        assertThat(result.resumeAttempted()).isFalse();
        assertThat(result.history()).isEqualTo(full);
        ArgumentCaptor<String> context = ArgumentCaptor.forClass(String.class);
        verify(prompt).build(eq("Travel"), eq("B1"), context.capture());
        assertThat(context.getValue()).contains("Miso", "What is my dog's name?", "complete_room_transcript");
        verify(tokens).create(eq("fresh complete prompt"), same(pinned), anyInt(), isNull(), eq("Puck"));
    }

    @Test
    void validResumePersistsLatestHistoryButDoesNotDuplicateItIntoOriginalPrompt() {
        var full = List.of(new HistoryTurn("turn-1", "user", "new phrase since original setup"));
        var result = service.reconnect("owner", "room-1", "resume-1", full, 1L, false);
        assertThat(result.history()).isEqualTo(full);
        assertThat(room.getHistoryRevision()).isEqualTo(1);
        verifyNoInteractions(prompt);
        verify(tokens).create(eq("exact original instructions"), same(pinned), anyInt(), eq("resume-1"), eq("Puck"));
    }

    @Test
    void invalidProviderCannotMoveResumeHandleToAnotherProject() {
        when(providers.forSession(any(), any())).thenThrow(new ApiException(
                vn.weconex.aptis.common.exception.ErrorCode.PAYMENT_PROVIDER_ERROR));
        assertThatThrownBy(() -> service.reconnect("owner", "room-1", "resume-1", null, null, false))
                .isInstanceOf(ApiException.class);
        verify(providers, never()).acquire();
        verifyNoInteractions(tokens);
    }

    @Test
    void explicitlyFreshConnectionMayChooseAnotherProjectAndNeverForwardsOldHandle() {
        when(providers.forSession(any(), any())).thenThrow(new ApiException(
                vn.weconex.aptis.common.exception.ErrorCode.PAYMENT_PROVIDER_ERROR));
        var replacement = new GeminiProviderPool.Credential("replacement-project", "replacement", "unused", "replacement-model");
        when(providers.acquire()).thenReturn(replacement);
        var result = service.reconnect("owner", "room-1", "resume-1", null, null, true);
        assertThat(result.resumeAttempted()).isFalse();
        assertThat(room.getModel()).isEqualTo("replacement-model");
        assertThat(room.getProviderId()).isEqualTo("replacement-project");
        verify(tokens).create(eq("fresh complete prompt"), same(replacement), anyInt(), isNull(), eq("Puck"));
    }

    @Test
    void ownershipAndEntitlementRemainMandatoryForReconnect() {
        when(entitlements.hasAiConversationAccess("other")).thenReturn(true);
        assertThatThrownBy(() -> service.reconnect("other", "room-1", "resume-1", null, null, false))
                .isInstanceOf(ApiException.class);
        when(entitlements.hasAiConversationAccess("owner")).thenReturn(false);
        assertThatThrownBy(() -> service.reconnect("owner", "room-1", "resume-1", null, null, false))
                .isInstanceOf(ApiException.class);
        verifyNoInteractions(tokens);
    }

    @Test
    void expiredOrClosedRoomCannotBeReopenedByReconnect() {
        room.setExpiresAt(Instant.now().minusSeconds(1));
        assertThatThrownBy(() -> service.reconnect("owner", "room-1", null, null, null, true))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.details()).containsEntry("reason", "AI_SESSION_EXPIRED"));
        room.setExpiresAt(Instant.now().plusSeconds(100));
        room.setStatus("CLOSED");
        assertThatThrownBy(() -> service.reconnect("owner", "room-1", null, null, null, true))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.details()).containsEntry("reason", "AI_SESSION_CLOSED"));
        verifyNoInteractions(tokens);
    }

    @Test
    void exhaustedDailyQuotaIsCheckedAgainOnReconnect() {
        // There cannot be a full minute of usage in the first minute of a new quota day.
        org.junit.jupiter.api.Assumptions.assumeTrue(Instant.now().atZone(
                java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalTime().toSecondOfDay() >= 60);
        AiConversationSession charged = new AiConversationSession();
        charged.setStartedAt(Instant.now().minusSeconds(7201));
        charged.setExpiresAt(Instant.now().plusSeconds(100));
        when(sessions.findOverlappingDay(eq("owner"), any(), any())).thenReturn(List.of(charged, charged, charged));
        // A quota service computes only today's overlap, even for a session crossing midnight.
        AptisProperties oneSecondDay = new AptisProperties(null, null, null, null, null, null, null,
                new AptisProperties.AiConversation(true, true, "unused", "model", 60, 1, 30), null);
        AiConversationService shortQuota = new AiConversationService(sessions, entitlements, tokens, providers,
                oneSecondDay, prompt, memory, history, new AiConversationReconnectLimiter());
        assertThatThrownBy(() -> shortQuota.reconnect("owner", "room-1", null, null, null, false))
                .isInstanceOfSatisfying(ApiException.class,
                        e -> assertThat(e.details()).containsEntry("reason", "AI_DAILY_QUOTA_EXHAUSTED"));
        verifyNoInteractions(tokens);
    }

    @Test
    void closeIsIndependentOfSummaryModelAndPreservesHistoryForLateFinalFlush() {
        service.saveHistory("owner", "room-1", List.of(new HistoryTurn("t", "user", "Remember me")), 1L);
        service.close("owner", "room-1", null);
        Instant ended = room.getEndedAt();
        service.close("owner", "room-1", null);
        service.saveHistory("owner", "room-1", List.of(new HistoryTurn("t", "user", "Remember me, I'm Lan")), 2L);
        assertThat(room.getEndedAt()).isEqualTo(ended);
        assertThat(history.read(room).get(0).text()).isEqualTo("Remember me, I'm Lan");
        verifyNoInteractions(memory);
    }

    @Test
    void creatingANewRoomHydratesCompleteLatestHistoryRatherThanOnlyEightTurns() {
        room.setStatus("CLOSED");
        var full = java.util.stream.IntStream.range(0, 30)
                .mapToObj(i -> new HistoryTurn("turn-" + i, i % 2 == 0 ? "user" : "ai", "phrase " + i)).toList();
        history.save(room, full, 30L);
        when(sessions.findFirstByUserIdOrderByStartedAtDesc("owner")).thenReturn(Optional.of(room));
        when(sessions.save(any())).thenAnswer(call -> {
            AiConversationSession created = call.getArgument(0);
            created.setId("room-2");
            return created;
        });
        when(providers.acquire()).thenReturn(pinned);
        var created = service.create("owner", "Travel", "B1", null, null, "Aoede", List.of(), 0L);
        assertThat(created.history()).isEqualTo(full);
        assertThat(created.session().getHistoryRevision()).isEqualTo(30);
        assertThat(created.session().getPreviousSessionId()).isEqualTo("room-1");
        ArgumentCaptor<String> context = ArgumentCaptor.forClass(String.class);
        verify(prompt).build(eq("Travel"), eq("B1"), context.capture());
        assertThat(context.getValue()).contains("phrase 0", "phrase 29");
    }

    @Test
    void explicitFreshConversationStartsEmptyWithoutDeletingPreviousArchive() {
        var full = List.of(new HistoryTurn("old", "user", "Retain this in the archive"));
        history.save(room, full, 1L);
        when(sessions.save(any())).thenAnswer(call -> {
            AiConversationSession created = call.getArgument(0);
            created.setId("room-new");
            return created;
        });
        when(providers.acquire()).thenReturn(pinned);
        var created = service.create("owner", "Travel", "B1", null, null, "Aoede", List.of(), 0L, true);
        assertThat(created.history()).isEmpty();
        assertThat(created.session().getPreviousSessionId()).isNull();
        assertThat(created.session().getMemoryContext()).isEmpty();
        assertThat(history.read(room)).isEqualTo(full);
        verify(sessions, never()).findFirstByUserIdOrderByStartedAtDesc(anyString());
        verifyNoInteractions(memory);
    }

    @Test
    void automaticLeaseHandoffPreservesHistoryEvenIfOriginalRoomWasStartedFresh() {
        var full = List.of(new HistoryTurn("old", "user", "Keep me after the hourly handoff"));
        history.save(room, full, 1L);
        when(sessions.save(any())).thenAnswer(call -> {
            AiConversationSession created = call.getArgument(0);
            created.setId("room-next");
            return created;
        });
        when(providers.acquire()).thenReturn(pinned);
        var created = service.create("owner", "Travel", "B1", "room-1", null, "Aoede", full, 1L, true);
        assertThat(created.history()).isEqualTo(full);
        assertThat(created.session().getPreviousSessionId()).isEqualTo("room-1");
    }
}
