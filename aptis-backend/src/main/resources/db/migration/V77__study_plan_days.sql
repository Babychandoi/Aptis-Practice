-- Việc đã giao của từng ngày trong lộ trình, chốt lần đầu học viên mở lộ trình trong
-- ngày đó. Ngày đã qua giữ đúng việc đã giao (tiến độ không nhảy khi điểm đổi), và các
-- ngày sau xếp tiếp từ những gì thật sự đã giao. Đổi mục tiêu thì xoá từ hôm nay trở đi.
CREATE TABLE study_plan_days (
    user_id CHAR(36) NOT NULL,
    day DATE NOT NULL,
    -- Mảng việc: {key, type, skill, part, count, minutes}
    tasks JSON NOT NULL,
    created_at DATETIME NOT NULL,

    PRIMARY KEY (user_id, day),
    CONSTRAINT fk_study_plan_days_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
