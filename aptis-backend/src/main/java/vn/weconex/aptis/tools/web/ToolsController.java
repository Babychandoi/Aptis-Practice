package vn.weconex.aptis.tools.web;

import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.common.security.CurrentUser;
import vn.weconex.aptis.tools.domain.AiMergedAnswer;
import vn.weconex.aptis.tools.service.SpeakingMergeService;

/** Trang Công cụ: gộp đề Speaking Part 4 bằng AI. */
@RestController
@RequestMapping("/api/v1/tools/speaking-merge")
@RequiredArgsConstructor
public class ToolsController {

    private final SpeakingMergeService mergeService;
    private final CurrentUser currentUser;
    private final ObjectMapper objectMapper;

    /** Danh sách đề để chọn, kèm lượt còn lại hôm nay. */
    @GetMapping
    public Overview overview() {
        String userId = currentUser.requireUserId();
        return new Overview(mergeService.sets(), mergeService.quota(userId),
                mergeService.history(userId).stream().map(this::toResponse).toList());
    }

    @PostMapping
    public MergeResponse merge(@RequestBody MergeRequest request) {
        String userId = currentUser.requireUserId();
        return toResponse(mergeService.merge(userId, request.questionSetIds()));
    }

    private MergeResponse toResponse(AiMergedAnswer entity) {
        try {
            List<String> ids = objectMapper.readValue(entity.getQuestionSetIds(),
                    objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
            return new MergeResponse(entity.getId(), ids, objectMapper.readTree(entity.getResult()), entity.getCreatedAt());
        } catch (Exception ex) {
            throw new IllegalStateException("Kết quả gộp đề lưu sai định dạng", ex);
        }
    }

    public record MergeRequest(@Size(min = 2, max = 3) List<String> questionSetIds) {}

    public record MergeResponse(String id, List<String> questionSetIds, JsonNode result, Instant createdAt) {}

    public record Overview(List<SpeakingMergeService.Part4Set> sets, SpeakingMergeService.Quota quota,
            List<MergeResponse> history) {}
}
