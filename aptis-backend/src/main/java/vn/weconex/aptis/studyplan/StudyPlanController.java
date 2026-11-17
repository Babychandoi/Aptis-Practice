package vn.weconex.aptis.studyplan;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.weconex.aptis.common.security.CurrentUser;

/** Lộ trình học cá nhân của học viên đang đăng nhập. */
@RestController
@RequestMapping("/api/v1/study-plan")
@RequiredArgsConstructor
public class StudyPlanController {

    private final StudyPlanService service;
    private final CurrentUser currentUser;

    @GetMapping
    public StudyPlanDtos.StudyPlanResponse view() {
        return service.view(currentUser.requireUserId());
    }

    @PutMapping
    public StudyPlanDtos.StudyPlanResponse save(@Valid @RequestBody StudyPlanDtos.SavePlanRequest request) {
        return service.save(currentUser.requireUserId(), request);
    }

    /** Tạo (hoặc trả lại) lượt làm bài test năng lực: kind FULL (mặc định) hoặc SHORT. */
    @PostMapping("/placement")
    public StudyPlanDtos.PlacementStartResponse startPlacement(
            @RequestBody(required = false) StudyPlanDtos.PlacementStartRequest request) {
        return service.startPlacement(currentUser.requireUserId(), request == null ? null : request.kind());
    }

    /** Mở phiên luyện cho một việc hôm nay, đề do hệ thống chọn sẵn. */
    @PostMapping("/tasks/start")
    public StudyPlanDtos.StartTaskResponse startTask(@Valid @RequestBody StudyPlanDtos.StartTaskRequest request) {
        return service.startTask(currentUser.requireUserId(), request.key());
    }

    /** Báo kết quả thi thật sau ngày thi. */
    @PostMapping("/exam-result")
    public StudyPlanDtos.StudyPlanResponse examResult(@Valid @RequestBody StudyPlanDtos.ExamResultRequest request) {
        return service.reportExam(currentUser.requireUserId(), request);
    }
}
