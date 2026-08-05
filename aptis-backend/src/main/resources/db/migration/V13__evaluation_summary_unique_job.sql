-- =====================================================================
-- V13 : Một job chấm chỉ có một bản tổng hợp điểm
--
-- Trước đó bảng không có ràng buộc nào, nên mỗi lần job được chấm lại (retry
-- hoặc giáo viên chấm lại) lại thêm một dòng mới với cùng evaluation_job_id.
-- Kết quả: báo cáo đếm trùng và không biết dòng nào là mới nhất.
--
-- Dọn dữ liệu trùng trước khi thêm UNIQUE: giữ dòng mới nhất theo created_at.
-- =====================================================================

DELETE s1 FROM evaluation_summaries s1
INNER JOIN evaluation_summaries s2
    ON s1.evaluation_job_id = s2.evaluation_job_id
   AND (s1.created_at < s2.created_at
        OR (s1.created_at = s2.created_at AND s1.id > s2.id));

ALTER TABLE evaluation_summaries
    ADD CONSTRAINT uk_evaluation_summary_job UNIQUE (evaluation_job_id);
