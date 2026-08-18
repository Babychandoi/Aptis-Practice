-- Chuẩn hoá tiêu đề Writing Part 3 theo danh sách biên tập.
--
-- SINH TỰ ĐỘNG bằng: node scripts/gen-writing-part3-titles.js
-- Sửa danh sách trong file .js rồi chạy lại, đừng sửa tay file này.
--
-- Tiêu đề cũ là tên mô tả tự đặt lúc seed ("Writing Part 3 - Travel and the
-- environment") vì file nguồn không có tên chủ đề. Tên thật là tên câu lạc bộ.
-- Năm và số lửa tách sang exam_year / hotness thay vì để trong tiêu đề.

SET NAMES utf8mb4;

UPDATE question_sets SET title='Nature Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_001';
UPDATE question_sets SET title='Outdoor Club', exam_year=NULL, hotness=NULL, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_002';
UPDATE question_sets SET title='Debate Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_003';
UPDATE question_sets SET title='Book Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_004';
UPDATE question_sets SET title='Home Living Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_005';
UPDATE question_sets SET title='Art Club', exam_year=2026, hotness=5, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_006';
UPDATE question_sets SET title='Film Club', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_007';
UPDATE question_sets SET title='Language Club (Version 1)', exam_year=2026, hotness=5, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_008';
UPDATE question_sets SET title='Writing Club', exam_year=NULL, hotness=NULL, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_009';
UPDATE question_sets SET title='English Club (Version 1)', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_010';
UPDATE question_sets SET title='Television Club', exam_year=2026, hotness=2, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_011';
UPDATE question_sets SET title='Beautiful Homes Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_012';
UPDATE question_sets SET title='Garden Club', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_013';
UPDATE question_sets SET title='Food Club', exam_year=2026, hotness=5, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_014';
UPDATE question_sets SET title='Language Club (Version 2)', exam_year=2026, hotness=5, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_015';
UPDATE question_sets SET title='English Club (Version 2)', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_016';
UPDATE question_sets SET title='Cinema Club', exam_year=NULL, hotness=NULL, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_017';
UPDATE question_sets SET title='Nature Club (Version 2)', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_018';
UPDATE question_sets SET title='Sports Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_019';
UPDATE question_sets SET title='Reading Club (partial)', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_020';
UPDATE question_sets SET title='English Club V3 – Confidence, Guests and Club Rules', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_021';
UPDATE question_sets SET title='Fashion Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_022';
UPDATE question_sets SET title='Photography Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_023';
UPDATE question_sets SET title='Technology Club', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_024';
UPDATE question_sets SET title='Business Club', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_025';
UPDATE question_sets SET title='Museum Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_026';
UPDATE question_sets SET title='Movie Club', exam_year=NULL, hotness=NULL, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_027';
UPDATE question_sets SET title='Computer Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_028';
UPDATE question_sets SET title='College Club', exam_year=NULL, hotness=NULL, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_029';
UPDATE question_sets SET title='English Club (Version 2)', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_030';
UPDATE question_sets SET title='Walking Club (Version 1)', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_031';
UPDATE question_sets SET title='Community Club', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_032';
UPDATE question_sets SET title='Travel Club (Version 2)', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_033';
UPDATE question_sets SET title='Cooking Club', exam_year=NULL, hotness=NULL, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_034';
UPDATE question_sets SET title='Car Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_035';
UPDATE question_sets SET title='Travel Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_036';
UPDATE question_sets SET title='Social Club', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_037';
UPDATE question_sets SET title='Home Living – Shared Spaces, Neighbourhoods and Heritage', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_038';
UPDATE question_sets SET title='Music Club', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_039';
UPDATE question_sets SET title='Science Club', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_040';
UPDATE question_sets SET title='Fitness Club', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_041';
UPDATE question_sets SET title='Healthy Club', exam_year=NULL, hotness=NULL, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_042';
UPDATE question_sets SET title='Fitness Club – Flexible Exercise and Workplace Health', exam_year=2026, hotness=3, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_043';
UPDATE question_sets SET title='Technology Club – Focus, Backups and Responsible AI', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_044';
UPDATE question_sets SET title='Walking Club V2 – Routes, Safety and Community', exam_year=2026, hotness=4, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_045';
UPDATE question_sets SET title='Food Club (Version 2)', exam_year=2026, hotness=5, updated_at=NOW() WHERE part_id='16000000-0000-4000-8000-000000000043' AND code='WRITING_PART_3_046';

SELECT COUNT(*) AS de, COUNT(exam_year) AS co_nam, COUNT(hotness) AS co_lua
FROM question_sets WHERE part_id='16000000-0000-4000-8000-000000000043' AND status='PUBLISHED';

SELECT hotness, COUNT(*) AS so_de FROM question_sets
WHERE part_id='16000000-0000-4000-8000-000000000043' AND status='PUBLISHED'
GROUP BY hotness ORDER BY hotness DESC;
