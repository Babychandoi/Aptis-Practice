-- Xoá toàn bộ lượt làm bài (dữ liệu test).
--
-- Xoá theo thứ tự phụ thuộc khoá ngoại: bảng con trước, test_attempts sau cùng.
-- KHÔNG đụng ngân hàng đề (question_sets) và tài khoản người dùng.
--
-- Chạy:
--   docker exec -i aptis-mysql mysql -uaptis -paptis --default-character-set=utf8mb4 aptis < scripts/clear-attempts.sql

SET NAMES utf8mb4;

DELETE FROM attempt_component_scores;
DELETE FROM attempt_part_scores;
DELETE FROM attempt_recordings;
DELETE FROM attempt_question_sets;
DELETE FROM evaluation_summaries;
DELETE FROM evaluation_jobs;
DELETE FROM test_attempts;

-- Thống kê học tập được tính lại từ lượt làm bài, nên cũng phải dọn.
DELETE FROM user_question_stats;
DELETE FROM user_part_progress;
DELETE FROM user_component_progress;
DELETE FROM user_daily_learning_stats;

SELECT 'test_attempts' AS bang, COUNT(*) AS con_lai FROM test_attempts
UNION ALL SELECT 'attempt_question_sets', COUNT(*) FROM attempt_question_sets
UNION ALL SELECT 'attempt_part_scores', COUNT(*) FROM attempt_part_scores
UNION ALL SELECT 'attempt_component_scores', COUNT(*) FROM attempt_component_scores
UNION ALL SELECT 'user_question_stats', COUNT(*) FROM user_question_stats;
