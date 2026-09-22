package vn.weconex.aptis.conversation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Limit;
import vn.weconex.aptis.conversation.domain.AiConversationProfile;
import vn.weconex.aptis.conversation.domain.AiConversationTurn;
import vn.weconex.aptis.conversation.repository.AiConversationProfileRepository;
import vn.weconex.aptis.conversation.repository.AiConversationTurnRepository;

/** Bộ nhớ AI Voice: đánh số lượt và dựng ngữ cảnh cho phiên mới. */
class AiConversationMemoryServiceTest {

    private static final String USER = "user-1";
    private static final String SESSION = "session-1";

    private AiConversationTurnRepository turns;
    private AiConversationProfileRepository profiles;
    private AiConversationMemoryService service;

    @BeforeEach
    void setUp() {
        turns = mock(AiConversationTurnRepository.class);
        profiles = mock(AiConversationProfileRepository.class);
        service = new AiConversationMemoryService(
                turns, profiles, mock(GeminiProviderPool.class), new ObjectMapper());
        when(turns.findRecentByUser(anyString(), any(Limit.class))).thenReturn(List.of());
        when(profiles.findById(anyString())).thenReturn(Optional.empty());
    }

    @Test
    void danhSoLuotLienTuTuKhongChoPhienMoi() {
        when(turns.countBySessionId(SESSION)).thenReturn(0L);

        service.appendTurns(USER, SESSION, List.of(
                new AiConversationMemoryService.TurnInput("user", "Hello", 0),
                new AiConversationMemoryService.TurnInput("ai", "Hi there", 1)));

        assertThat(savedSeqs()).containsExactly(0, 1);
    }

    @Test
    void danhSoTiepTuLuotDaCoTrongPhien() {
        // Phiên đã có 5 lượt: lô mới phải nối tiếp, không ghi đè.
        when(turns.countBySessionId(SESSION)).thenReturn(5L);

        service.appendTurns(USER, SESSION, List.of(
                new AiConversationMemoryService.TurnInput("user", "More", 99)));

        assertThat(savedSeqs()).containsExactly(5);
    }

    @Test
    void boQuaLuotRong() {
        when(turns.countBySessionId(SESSION)).thenReturn(0L);

        int saved = service.appendTurns(USER, SESSION, List.of(
                new AiConversationMemoryService.TurnInput("user", "  ", 0),
                new AiConversationMemoryService.TurnInput("ai", null, 1),
                new AiConversationMemoryService.TurnInput("user", "Thật sự có nội dung", 2)));

        assertThat(saved).isEqualTo(1);
        assertThat(savedContents()).containsExactly("Thật sự có nội dung");
    }

    @Test
    void khongGoiRepositoryKhiDanhSachRong() {
        assertThat(service.appendTurns(USER, SESSION, List.of())).isZero();
        assertThat(service.appendTurns(USER, SESSION, null)).isZero();
        verify(turns, never()).saveAll(any());
    }

    @Test
    void vaiTroChiNhanUserHoacAi() {
        when(turns.countBySessionId(SESSION)).thenReturn(0L);

        service.appendTurns(USER, SESSION, List.of(
                new AiConversationMemoryService.TurnInput("ai", "A", 0),
                // Giá trị lạ phải quy về "user", không được ghi thẳng vào DB.
                new AiConversationMemoryService.TurnInput("system", "B", 1)));

        assertThat(savedRoles()).containsExactly("ai", "user");
    }

    @Test
    void nguCanhRongKhiChuaCoGiDeNho() {
        assertThat(service.buildContext(USER, null)).isEmpty();
    }

    @Test
    void nguCanhGomHoSoDaiHanVaTomTatPhienTruoc() {
        AiConversationProfile profile = new AiConversationProfile();
        profile.setUserId(USER);
        profile.setFacts("{\"name\":\"Phong\"}");
        profile.setStylePrefs("{\"teasing\":\"off\"}");
        profile.setLastSummary("Đã nói về công việc.");
        profile.setTotalSessions(3);
        when(profiles.findById(USER)).thenReturn(Optional.of(profile));

        String context = service.buildContext(USER, "{\"current_topic\":\"Work\"}");

        assertThat(context).contains("Phong").contains("teasing")
                .contains("Đã nói về công việc.").contains("last_session_summary");
    }

    @Test
    void luotGanNhatDocXuoiTheoThoiGian() {
        // findRecentByUser trả mới trước; ngữ cảnh phải đảo lại cho đọc xuôi,
        // vì thứ tự ngược làm câu chuyện thành vô nghĩa.
        when(turns.findRecentByUser(anyString(), any(Limit.class)))
                .thenReturn(List.of(turn("ai", "Câu sau", 1), turn("user", "Câu trước", 0)));

        String context = service.buildContext(USER, null);

        assertThat(context.indexOf("Câu trước")).isLessThan(context.indexOf("Câu sau"));
    }

    private List<Integer> savedSeqs() {
        return captured().stream().map(AiConversationTurn::getSeq).toList();
    }

    private List<String> savedRoles() {
        return captured().stream().map(AiConversationTurn::getRole).toList();
    }

    private List<String> savedContents() {
        return captured().stream().map(AiConversationTurn::getContent).toList();
    }

    @SuppressWarnings("unchecked")
    private List<AiConversationTurn> captured() {
        ArgumentCaptor<List<AiConversationTurn>> captor = ArgumentCaptor.forClass(List.class);
        verify(turns).saveAll(captor.capture());
        return new ArrayList<>(captor.getValue());
    }

    private static AiConversationTurn turn(String role, String content, int seq) {
        AiConversationTurn turn = new AiConversationTurn();
        turn.setRole(role);
        turn.setContent(content);
        turn.setSeq(seq);
        turn.setUserId(USER);
        turn.setSessionId(SESSION);
        turn.setCreatedAt(Instant.now());
        return turn;
    }
}
