-- Mỗi lần job đồng bộ aptisprep (Task Scheduler trên máy chủ) chạy xong một bước thì
-- ghi một dòng. Backend đọc bảng này cùng dữ liệu đề để biết job có còn chạy đều không
-- và báo quản trị khi hỏng — 12–16/11/2026 job lỗi kết nối suốt 4 ngày mà không ai biết
-- vì Task Scheduler vẫn báo thành công.
CREATE TABLE sync_job_runs (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    job         VARCHAR(64) NOT NULL,
    status      ENUM('OK', 'FAILED') NOT NULL,
    attempts    INT NOT NULL DEFAULT 1,
    finished_at DATETIME NOT NULL,
    KEY idx_sync_job_runs_job (job, finished_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
