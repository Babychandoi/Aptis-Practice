-- =====================================================================
-- V14 : Cho phép nhiều bản chấm cho cùng một job
--
-- V13 đặt UNIQUE (evaluation_job_id) để chặn AI ghi trùng khi retry. Nhưng khi
-- giáo viên chấm lại cùng bài, cần thêm một bản ghi nữa với
-- evaluator_type = TEACHER — ràng buộc cũ chặn mất.
--
-- Đổi thành UNIQUE (evaluation_job_id, evaluator_user_id):
--   - AI: evaluator_user_id NULL → MySQL cho phép nhiều NULL, nên vẫn phải
--     chống trùng ở tầng ứng dụng (findByEvaluationJobId + upsert).
--   - Giáo viên: mỗi người một bản, chấm lại thì cập nhật bản của chính mình.
-- =====================================================================

ALTER TABLE evaluation_summaries
    DROP INDEX uk_evaluation_summary_job;

ALTER TABLE evaluation_summaries
    ADD CONSTRAINT uk_evaluation_summary_job_evaluator
        UNIQUE (evaluation_job_id, evaluator_user_id);

-- Truy vấn danh sách bài chờ giáo viên xem, và tra bản chấm cuối cùng
CREATE INDEX idx_evaluation_summary_pending
    ON evaluation_summaries (evaluator_type, is_final, created_at);
