-- Lộ trình học cá nhân (trang /lo-trinh): bài test năng lực đầu vào, mục tiêu và điểm
-- khởi đầu. Việc từng ngày không lưu — StudyPlanner tính ra từ các cột dưới đây cùng
-- bài đã làm, nên đổi mục tiêu hay có điểm mới thì lộ trình tự đúng.

-- Mỗi học viên một lộ trình đang chạy.
CREATE TABLE study_plans (
    user_id CHAR(36) NOT NULL,
    -- B1 | B2 | C1
    target_level VARCHAR(4) NOT NULL,
    exam_date DATE NOT NULL,
    -- Học viên chưa biết ngày thi: hệ thống đặt mặc định 8 tuần, ghi lại để giao diện nói rõ.
    exam_date_estimated TINYINT(1) NOT NULL DEFAULT 0,
    minutes_per_day SMALLINT NOT NULL,
    -- {"LISTENING": {"score": 31.5, "source": "PLACEMENT"}, …}; score thang 50, null = chưa rõ.
    baseline JSON NOT NULL,
    start_date DATE NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (user_id),
    CONSTRAINT fk_study_plans_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Lượt test năng lực: mỗi tài khoản một lần, kể cả tài khoản miễn phí.
CREATE TABLE placement_attempts (
    user_id CHAR(36) NOT NULL,
    attempt_id CHAR(36) NOT NULL,
    created_at DATETIME NOT NULL,

    PRIMARY KEY (user_id),
    CONSTRAINT fk_placement_attempts_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Đề test năng lực: cùng cấu trúc đề thi đủ 5 kỹ năng (bốc ngẫu nhiên đề chuẩn), không
-- hiện trong danh sách thi thử (listed = 0). Chép từ MOCK_FULL_V1; môi trường chưa có
-- đề đó thì hai câu dưới không chèn gì.
INSERT INTO test_blueprints (id, exam_version_id, component_id, owner_teacher_id, code, name, description,
                             mode, access_level, duration_seconds, status, listed, created_at, updated_at)
SELECT '19000000-0000-4000-8000-0000000000a1', exam_version_id, NULL, NULL, 'PLACEMENT_FULL_V1',
       'Bài test năng lực đầu vào', 'Đủ 5 kỹ năng như đề thi thật, để xếp lộ trình học.',
       'MOCK_TEST', 'FREE', duration_seconds, 'PUBLISHED', 0, UTC_TIMESTAMP(), UTC_TIMESTAMP()
FROM test_blueprints WHERE code = 'MOCK_FULL_V1';

INSERT INTO blueprint_part_rules (id, blueprint_id, part_id, question_set_count, difficulty_min, difficulty_max,
                                  selection_strategy, allow_free_content, allow_premium_content, config_json, display_order)
SELECT UUID(), '19000000-0000-4000-8000-0000000000a1', r.part_id, r.question_set_count, r.difficulty_min,
       r.difficulty_max, 'RANDOM', 1, 1, r.config_json, r.display_order
FROM blueprint_part_rules r JOIN test_blueprints b ON b.id = r.blueprint_id
WHERE b.code = 'MOCK_FULL_V1';
