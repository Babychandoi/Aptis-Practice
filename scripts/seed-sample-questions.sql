-- Bộ câu hỏi mẫu để thử luồng nghiệp vụ (1 FREE + 1 PREMIUM).
-- Dùng cùng seed-sample-questions.js: file này tạo metadata ở MySQL,
-- file .js tạo nội dung ở MongoDB với cùng UUID.
--
-- Chạy:
--   docker exec -i aptis-mysql mysql -uaptis -paptis aptis < seed-sample-questions.sql
--
-- KHÔNG dùng ở production — đây là dữ liệu thử.

SET @part_grammar = '16000000-0000-4000-8000-000000000001';
SET @tt_single    = '12000000-0000-4000-8000-000000000001';
SET @topic_daily  = '17000000-0000-4000-8000-000000000001';

INSERT INTO question_sets
    (id, part_id, task_type_id, topic_id, code, title, difficulty, access_level, status,
     current_revision, item_count, estimated_seconds, max_score, published_at,
     created_at, updated_at)
VALUES
    ('aa000000-0000-4000-8000-000000000001', @part_grammar, @tt_single, @topic_daily,
     'GV_FREE_001', 'Grammar - Present Simple (free)', 1, 'FREE', 'PUBLISHED',
     1, 2, 60, 2.00, NOW(), NOW(), NOW()),
    ('aa000000-0000-4000-8000-000000000002', @part_grammar, @tt_single, @topic_daily,
     'GV_PREM_001', 'Grammar - Conditionals (premium)', 3, 'PREMIUM', 'PUBLISHED',
     1, 2, 90, 2.00, NOW(), NOW(), NOW())
ON DUPLICATE KEY UPDATE
    title = VALUES(title),
    status = VALUES(status),
    updated_at = NOW();
