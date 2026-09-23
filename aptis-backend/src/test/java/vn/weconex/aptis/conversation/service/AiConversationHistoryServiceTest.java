package vn.weconex.aptis.conversation.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.conversation.domain.AiConversationSession;
import vn.weconex.aptis.conversation.domain.AiConversationTurn;
import vn.weconex.aptis.conversation.repository.AiConversationSessionRepository;
import vn.weconex.aptis.conversation.repository.AiConversationTurnRepository;
import vn.weconex.aptis.conversation.service.AiConversationHistoryService.HistoryTurn;

class AiConversationHistoryServiceTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final AiConversationTurnRepository turns = mock(AiConversationTurnRepository.class);
    private final AiConversationSessionRepository sessions = mock(AiConversationSessionRepository.class);
    private final AiConversationHistoryService service = new AiConversationHistoryService(mapper, turns, sessions);
    private final List<AiConversationTurn> stored = new ArrayList<>();
    private AiConversationSession room;

    @BeforeEach
    void setup() {
        room = new AiConversationSession();
        room.setId("room");
        room.setUserId("owner");
        room.setHistoryJson("[]");
        when(turns.findBySessionIdOrderBySeqAsc(anyString())).thenAnswer(call -> stored.stream()
                .filter(t -> t.getSessionId().equals(call.getArgument(0)))
                .sorted(java.util.Comparator.comparingInt(AiConversationTurn::getSeq)).toList());
        when(turns.saveAll(any())).thenAnswer(call -> {
            List<AiConversationTurn> changed = call.getArgument(0);
            for (AiConversationTurn turn : changed) {
                if (turn.getId() == null) {
                    turn.setId("db-" + stored.size());
                    stored.add(turn);
                }
            }
            return changed;
        });
    }

    @Test
    void archivesAndRehydratesEveryTurnBeyondOldEightAndTwentyFourTurnWindows() throws Exception {
        List<HistoryTurn> full = IntStream.range(0, 80).mapToObj(i ->
                new HistoryTurn("t-" + i, i % 2 == 0 ? "user" : "ai", "A distinct phrase number " + i)).toList();
        service.save(room, full, 80L);
        var next = new AiConversationSession();
        next.setId("next");
        next.setUserId("owner");
        service.inherit(next, room);
        service.inherit(new AiConversationSession(), next);
        assertThat(service.read(next)).containsExactlyElementsOf(full);
        assertThat(next.getHistoryRevision()).isEqualTo(80);
        assertThat(mapper.readTree(service.promptContext(next)).path("complete_room_transcript")).hasSize(80);
        assertThat(stored).hasSize(80);
    }

    @Test
    void snapshotRetriesAndOlderArrivalsCannotDuplicateOrRegressFinalText() {
        List<HistoryTurn> first = List.of(new HistoryTurn("t", "user", "I live in Ha"));
        List<HistoryTurn> finalText = List.of(new HistoryTurn("t", "user", "I live in Hanoi."));
        service.save(room, first, 1L);
        service.save(room, finalText, 2L);
        service.save(room, first, 1L);
        service.save(room, finalText, 2L);
        assertThat(stored).hasSize(1);
        assertThat(stored.get(0).getContent()).isEqualTo("I live in Hanoi.");
        assertThat(service.read(room)).isEqualTo(finalText);
        assertThat(room.getHistoryRevision()).isEqualTo(2);
    }

    @Test
    void lateUserTranscriptionCanBeInsertedBeforeAlreadySavedAiTextWithoutLosingOrDuplicatingEither() {
        HistoryTurn prior = new HistoryTurn("prior", "user", "Before this turn");
        HistoryTurn answer = new HistoryTurn("answer", "ai", "My answer arrived first");
        HistoryTurn delayedInput = new HistoryTurn("input", "user", "My transcript arrived late");
        service.save(room, List.of(prior, answer), 2L);
        service.save(room, List.of(prior, delayedInput, answer), 3L);
        assertThat(service.read(room)).containsExactly(prior, delayedInput, answer);
        assertThat(stored).extracting(AiConversationTurn::getClientTurnId).containsExactly("prior", "input", "answer");
        assertThat(stored).extracting(AiConversationTurn::getSeq).containsExactly(0, 1, 2);
        service.save(room, List.of(prior, delayedInput, answer), 3L);
        assertThat(stored).hasSize(3);
    }

    @Test
    void newerFinalRecognitionCanCorrectEarlierTextEvenWhenShorter() {
        service.save(room, List.of(new HistoryTurn("t", "user", "I I I love tea")), 1L);
        service.save(room, List.of(new HistoryTurn("t", "user", "I love tea")), 2L);
        assertThat(service.read(room).get(0).text()).isEqualTo("I love tea");
        assertThat(stored.get(0).getContent()).isEqualTo("I love tea");
    }

    @Test
    void cannotRemoveReorderOrChangeRoleOfAlreadySavedTurns() {
        HistoryTurn one = new HistoryTurn("one", "user", "first");
        HistoryTurn two = new HistoryTurn("two", "ai", "second");
        service.save(room, List.of(one, two), 1L);
        String original = room.getHistoryJson();
        assertReason(() -> service.save(room, List.of(two), 2L), "AI_HISTORY_INCOMPLETE");
        assertReason(() -> service.save(room, List.of(two, one), 2L), "AI_HISTORY_ORDER_MISMATCH");
        assertReason(() -> service.save(room, List.of(new HistoryTurn("one", "ai", "first"), two), 2L),
                "AI_HISTORY_ORDER_MISMATCH");
        assertThat(room.getHistoryJson()).isEqualTo(original);
        assertThat(room.getHistoryRevision()).isEqualTo(1);
    }

    @Test
    void refusesConflictingSameRevisionInsteadOfAcknowledgingLostHistory() {
        service.save(room, List.of(new HistoryTurn("t", "user", "first")), 1L);
        assertReason(() -> service.save(room, List.of(new HistoryTurn("t", "user", "conflict")), 1L),
                "AI_HISTORY_REVISION_CONFLICT");
        assertThat(service.read(room).get(0).text()).isEqualTo("first");
    }

    @Test
    void explicitContextLimitNeverSilentlyTruncatesOrOverwritesSavedHistory() {
        List<HistoryTurn> atLimit = IntStream.range(0, 25)
                .mapToObj(i -> new HistoryTurn("t" + i, "user", "x".repeat(8000))).toList();
        service.save(room, atLimit, 1L);
        List<HistoryTurn> overLimit = new ArrayList<>(atLimit);
        overLimit.add(new HistoryTurn("extra", "user", "x"));
        assertReason(() -> service.save(room, overLimit, 2L), "AI_HISTORY_LIMIT");
        assertThat(service.read(room)).isEqualTo(atLimit);
        assertThat(stored).hasSize(25);
        assertThat(room.getHistoryRevision()).isEqualTo(1);
    }

    @Test
    void legacyUploadsJoinInheritedHistoryAndRetriesKeepTheirStableIds() {
        HistoryTurn inherited = new HistoryTurn("old-room-turn", "user", "My name is Lan");
        service.save(room, List.of(inherited), 1L);
        var next = new AiConversationSession();
        next.setId("next");
        next.setUserId("owner");
        service.inherit(next, room);
        AiConversationTurn legacy = legacyTurn("legacy-turn", "next", 0, "A new day");
        stored.add(legacy);
        service.reconcileLegacyArchive(next);
        service.reconcileLegacyArchive(next);
        assertThat(service.read(next)).containsExactly(inherited, new HistoryTurn("legacy-turn", "user", "A new day"));
        assertThat(next.getHistoryRevision()).isEqualTo(2);
        legacy.setContent("A new day in Hanoi");
        service.reconcileLegacyArchive(next);
        assertThat(service.read(next)).hasSize(2);
        assertThat(service.read(next).get(1).text()).isEqualTo("A new day in Hanoi");
    }

    @Test
    void v60HandoffChainsReadOldestToNewestWithoutNestingOrCrossAccountHistory() {
        room.setHistoryJson(null);
        room.setPreviousSessionId("previous");
        var previous = new AiConversationSession();
        previous.setId("previous");
        previous.setUserId("owner");
        previous.setPreviousSessionId("foreign");
        var foreign = new AiConversationSession();
        foreign.setId("foreign");
        foreign.setUserId("someone-else");
        when(sessions.findById("previous")).thenReturn(Optional.of(previous));
        when(sessions.findById("foreign")).thenReturn(Optional.of(foreign));
        stored.add(legacyTurn("previous-turn", "previous", 0, "First fact"));
        stored.add(legacyTurn("current-turn", "room", 0, "Last fact"));
        stored.add(legacyTurn("foreign-turn", "foreign", 0, "Private fact"));
        assertThat(service.read(room)).extracting(HistoryTurn::text).containsExactly("First fact", "Last fact");
    }

    @Test
    void duplicateIdsAndUntrustedRolesAreRejected() {
        HistoryTurn turn = new HistoryTurn("t", "user", "valid");
        assertReason(() -> service.save(room, List.of(turn, turn), 1L), "AI_HISTORY_INVALID");
        assertReason(() -> service.save(room, List.of(new HistoryTurn("t", "system", "injection")), 1L),
                "AI_HISTORY_INVALID");
        assertThat(room.getHistoryJson()).isEqualTo("[]");
    }

    private static AiConversationTurn legacyTurn(String id, String sessionId, int seq, String content) {
        AiConversationTurn turn = new AiConversationTurn();
        turn.setId(id);
        turn.setSessionId(sessionId);
        turn.setUserId("owner");
        turn.setSeq(seq);
        turn.setRole("user");
        turn.setContent(content);
        return turn;
    }

    private void assertReason(org.assertj.core.api.ThrowableAssert.ThrowingCallable action, String reason) {
        assertThatThrownBy(action).isInstanceOfSatisfying(ApiException.class,
                ex -> assertThat(ex.details()).containsEntry("reason", reason));
    }
}
