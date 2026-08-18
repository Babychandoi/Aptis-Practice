-- Chuẩn hoá tiêu đề Writing Part 2 theo danh sách biên tập.
--
-- SINH TỰ ĐỘNG bằng: node scripts/gen-writing-part2-titles.js
-- Sửa danh sách trong file .js rồi chạy lại, đừng sửa tay file này.
--
-- Tiêu đề cũ là tên mô tả tự đặt lúc seed ("Writing Part 2 - Travel and the
-- environment") vì file nguồn không có tên chủ đề. Tên thật là tên câu lạc bộ.
-- Năm và số lửa tách sang exam_year / hotness thay vì để trong tiêu đề.

SET NAMES utf8mb4;

UPDATE question_sets SET title='Travel Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_001';
UPDATE question_sets SET title='Fashion Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_002';
UPDATE question_sets SET title='Language Club (Version 1)', exam_year=2026, hotness=5, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_003';
UPDATE question_sets SET title='Computer Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_004';
UPDATE question_sets SET title='Language Club (Version 2)', exam_year=2026, hotness=5, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_005';
UPDATE question_sets SET title='College Club', exam_year=NULL, hotness=NULL, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_006';
UPDATE question_sets SET title='Social Club', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_007';
UPDATE question_sets SET title='Nature Club (Version 2)', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_008';
UPDATE question_sets SET title='Debate Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_009';
UPDATE question_sets SET title='Science Club', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_010';
UPDATE question_sets SET title='Cooking Club', exam_year=NULL, hotness=NULL, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_011';
UPDATE question_sets SET title='English Club (Version 2)', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_012';
UPDATE question_sets SET title='English Club V2 – Improving Speaking Skills', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_013';
UPDATE question_sets SET title='Nature Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_014';
UPDATE question_sets SET title='Healthy Club', exam_year=NULL, hotness=NULL, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_015';
UPDATE question_sets SET title='Movie Club – A Film Recommendation', exam_year=NULL, hotness=NULL, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_016';
UPDATE question_sets SET title='Walking Club (Version 1)', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_017';
UPDATE question_sets SET title='Reading Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_018';
UPDATE question_sets SET title='Business Club', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_019';
UPDATE question_sets SET title='Cinema Club', exam_year=NULL, hotness=NULL, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_020';
UPDATE question_sets SET title='Food Club', exam_year=2026, hotness=5, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_021';
UPDATE question_sets SET title='Photography Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_022';
UPDATE question_sets SET title='Writing Club', exam_year=NULL, hotness=NULL, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_023';
UPDATE question_sets SET title='English Club (Version 1)', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_024';
UPDATE question_sets SET title='Travel Club (Version 2)', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_025';
UPDATE question_sets SET title='Home Living Club – My Most Used Room', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_026';
UPDATE question_sets SET title='Technology Club', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_027';
UPDATE question_sets SET title='Beautiful Homes Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_028';
UPDATE question_sets SET title='Fitness Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_029';
UPDATE question_sets SET title='English Club (Version 3)', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_030';
UPDATE question_sets SET title='Television Club', exam_year=2026, hotness=2, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_031';
UPDATE question_sets SET title='Art Club', exam_year=2026, hotness=5, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_032';
UPDATE question_sets SET title='Garden Club', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_033';
UPDATE question_sets SET title='Outdoor Club', exam_year=NULL, hotness=NULL, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_034';
UPDATE question_sets SET title='Film Club', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_035';
UPDATE question_sets SET title='Museum Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_036';
UPDATE question_sets SET title='Sports Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_037';
UPDATE question_sets SET title='Music Club', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_038';
UPDATE question_sets SET title='Book Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_039';
UPDATE question_sets SET title='Car Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_040';
UPDATE question_sets SET title='Home Living', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_041';
UPDATE question_sets SET title='Fitness Club – A New Healthy Habit', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_042';
UPDATE question_sets SET title='Technology Club – Organising Study Online', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_043';
UPDATE question_sets SET title='Walking Club V2 – A Recommended Route', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_044';
UPDATE question_sets SET title='Community Club', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_045';
UPDATE question_sets SET title='Food Club (Version 2)', exam_year=2026, hotness=5, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000042' AND code='WRITING_PART_2_046';

SELECT COUNT(*) AS de, COUNT(exam_year) AS co_nam, COUNT(hotness) AS co_lua
FROM question_sets WHERE part_id='16000000-0000-4000-8000-000000000042' AND status='PUBLISHED';

SELECT hotness, COUNT(*) AS so_de FROM question_sets
WHERE part_id='16000000-0000-4000-8000-000000000042' AND status='PUBLISHED'
GROUP BY hotness ORDER BY hotness DESC;
