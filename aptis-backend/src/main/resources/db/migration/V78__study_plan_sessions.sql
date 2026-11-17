-- Lộ trình học, đợt 2: phiên luyện do hệ thống chọn đề, ngày nghỉ, nhắc học qua email,
-- kết quả thi thật và bài test năng lực rút gọn.

ALTER TABLE study_plans
    -- Ngày nghỉ trong tuần, mảng số ISO (1 = thứ Hai … 7 = Chủ nhật). NULL = học cả tuần.
    ADD COLUMN rest_days JSON NULL AFTER minutes_per_day,
    -- Lộ trình có sẵn mặc định KHÔNG nhắc; học viên tự bật ở form mục tiêu.
    ADD COLUMN reminders_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER rest_days,
    ADD COLUMN last_reminded_at DATETIME NULL AFTER reminders_enabled;

-- Phiên luyện của một việc trong lộ trình: hệ thống chọn sẵn đúng số đề (dự đoán hôm
-- nay → trọng điểm tháng → đề hay sai → đề chưa làm) rồi tạo lượt làm bài.
CREATE TABLE study_plan_sessions (
    user_id CHAR(36) NOT NULL,
    task_key VARCHAR(120) NOT NULL,
    day DATE NOT NULL,
    attempt_id CHAR(36) NOT NULL,
    set_count INT NOT NULL,
    created_at DATETIME NOT NULL,

    PRIMARY KEY (user_id, task_key),
    KEY idx_study_plan_sessions_day (user_id, day),
    CONSTRAINT fk_study_plan_sessions_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Kết quả thi thật học viên tự báo sau ngày thi.
CREATE TABLE exam_results (
    user_id CHAR(36) NOT NULL,
    exam_date DATE NOT NULL,
    -- A1 … C1, hoặc 'NA' khi chưa có kết quả / chưa thi
    level VARCHAR(4) NOT NULL,
    target_level VARCHAR(4) NULL,
    note VARCHAR(500) NULL,
    created_at DATETIME NOT NULL,

    PRIMARY KEY (user_id, exam_date),
    CONSTRAINT fk_exam_results_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- FULL: đủ cấu trúc đề thật (~160 phút). SHORT: rút gọn (~45 phút), kém chính xác hơn.
ALTER TABLE placement_attempts
    ADD COLUMN kind VARCHAR(8) NOT NULL DEFAULT 'FULL' AFTER attempt_id;

-- Đề test năng lực rút gọn: vẫn đủ 5 kỹ năng nhưng mỗi kỹ năng chỉ các Part ngắn.
INSERT INTO test_blueprints (id, exam_version_id, component_id, owner_teacher_id, code, name, description,
                             mode, access_level, duration_seconds, status, listed, created_at, updated_at)
SELECT '19000000-0000-4000-8000-0000000000a2', exam_version_id, NULL, NULL, 'PLACEMENT_SHORT_V1',
       'Bài test năng lực rút gọn', 'Đủ 5 kỹ năng, mỗi kỹ năng các Part ngắn — khoảng 45 phút.',
       'MOCK_TEST', 'FREE', NULL, 'PUBLISHED', 0, UTC_TIMESTAMP(), UTC_TIMESTAMP()
FROM test_blueprints WHERE code = 'MOCK_FULL_V1';

INSERT INTO blueprint_part_rules (id, blueprint_id, part_id, question_set_count, difficulty_min, difficulty_max,
                                  selection_strategy, allow_free_content, allow_premium_content, config_json, display_order)
SELECT UUID(), '19000000-0000-4000-8000-0000000000a2', r.part_id, s.n, r.difficulty_min, r.difficulty_max,
       'RANDOM', 1, 1, r.config_json, r.display_order
FROM blueprint_part_rules r
JOIN test_blueprints b ON b.id = r.blueprint_id AND b.code = 'MOCK_FULL_V1'
JOIN (
    SELECT '16000000-0000-4000-8000-000000000031' AS part_id, 3 AS n   -- Speaking 1 (3 câu gộp một bài)
    UNION ALL SELECT '16000000-0000-4000-8000-000000000032', 1         -- Speaking 2
    UNION ALL SELECT '16000000-0000-4000-8000-000000000021', 5         -- Listening 1
    UNION ALL SELECT '16000000-0000-4000-8000-000000000022', 1         -- Listening 2
    UNION ALL SELECT '16000000-0000-4000-8000-000000000023', 1         -- Listening 3
    UNION ALL SELECT '16000000-0000-4000-8000-000000000001', 10        -- Grammar
    UNION ALL SELECT '16000000-0000-4000-8000-000000000002', 2         -- Vocabulary
    UNION ALL SELECT '16000000-0000-4000-8000-000000000011', 1         -- Reading 1
    UNION ALL SELECT '16000000-0000-4000-8000-000000000012', 1         -- Reading 2
    UNION ALL SELECT '16000000-0000-4000-8000-000000000013', 1         -- Reading 3
    UNION ALL SELECT '16000000-0000-4000-8000-000000000041', 5         -- Writing 1 (5 câu gộp một bài)
    UNION ALL SELECT '16000000-0000-4000-8000-000000000042', 1         -- Writing 2
) s ON s.part_id = r.part_id;
