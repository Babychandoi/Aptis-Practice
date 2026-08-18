-- Gộp lại hai Part sắp xếp câu của Reading về một Part duy nhất.
--
-- V21 tách Reading Part 2 thành Part 2 + Part 3 để đề thi thử lấy được hai bài
-- sắp xếp câu khác nhau. Việc đó không cần thiết: blueprint_part_rules đã có
-- question_set_count, và MockTestService truyền danh sách đã chọn làm
-- excludedIds nên một rule lấy N bộ vẫn không bao giờ trùng.
--
-- Tách Part còn có hại: pool random bị chia đôi (10+10 thay vì 20), một bài
-- không bao giờ xuất hiện được ở vị trí còn lại, và Reading có 5 Part trong khi
-- Aptis General thật chỉ có 4.
--
-- Sau migration này: Reading trở lại 4 Part, Part 2 giữ nguyên 10 điểm và
-- blueprint lấy 2 bộ từ cùng một pool.

SET @component_reading = '15000000-0000-4000-8000-000000000002';
SET @part_2            = '16000000-0000-4000-8000-000000000012'; -- giữ lại
SET @part_ordering_2   = '16000000-0000-4000-8000-000000000015'; -- Part 3 của V21, xoá
SET @part_speaker      = '16000000-0000-4000-8000-000000000013'; -- Part 4 -> Part 3
SET @part_heading      = '16000000-0000-4000-8000-000000000014'; -- Part 5 -> Part 4

-- ---------------------------------------------------------------
-- 1. Blueprint: dồn số lượng của Part 3 vào rule Part 2 rồi xoá rule đó.
-- ---------------------------------------------------------------

-- Rule Part 2 phải lấy 2 bộ: một bộ cho mỗi bài sắp xếp câu của đề thật.
UPDATE blueprint_part_rules
SET question_set_count = 2
WHERE part_id = @part_2;

DELETE FROM blueprint_part_rules
WHERE part_id = @part_ordering_2;

-- ---------------------------------------------------------------
-- 2. Điểm: trả Part 2 về nguyên 10 điểm (5+5 của V21).
--    PartScoringService bắt buộc tổng mỗi component = 50, nên phải cộng lại
--    đủ trước khi xoá rule của Part 3.
-- ---------------------------------------------------------------

UPDATE part_scoring_rules
SET max_score = 10,
    points_per_correct = 1,
    perfect_bonus = 0,
    updated_at = NOW()
WHERE part_id = @part_2;

DELETE FROM part_scoring_rules
WHERE part_id = @part_ordering_2;

-- ---------------------------------------------------------------
-- 3. Xoá Part 3 của V21.
--    An toàn: Part này chưa có question_sets và chưa có attempt nào trỏ vào.
--    Nếu môi trường nào đã kịp tạo nội dung cho nó thì chuyển về Part 2 trước
--    để không mất dữ liệu.
-- ---------------------------------------------------------------

UPDATE question_sets
SET part_id = @part_2, updated_at = NOW()
WHERE part_id = @part_ordering_2;

DELETE FROM parts
WHERE id = @part_ordering_2;

-- ---------------------------------------------------------------
-- 4. Dồn lại số Part. Phải chạy SAU bước 3: Part 3 cũ còn tồn tại thì
--    rename Part 4 thành PART_3 sẽ vi phạm unique(component_id, code).
-- ---------------------------------------------------------------

UPDATE parts
SET code = 'PART_3',
    name = 'Reading Part 3',
    display_order = 3,
    updated_at = NOW()
WHERE id = @part_speaker;

UPDATE parts
SET code = 'PART_4',
    name = 'Reading Part 4',
    display_order = 4,
    updated_at = NOW()
WHERE id = @part_heading;

-- ---------------------------------------------------------------
-- 5. Nén display_order của blueprint_part_rules: xoá rule Reading Part 3 để
--    lại một bậc trống trong mỗi blueprint có nó.
-- ---------------------------------------------------------------

UPDATE blueprint_part_rules bpr
JOIN (
    SELECT bpr2.id,
           ROW_NUMBER() OVER (
               PARTITION BY bpr2.blueprint_id
               ORDER BY bpr2.display_order
           ) AS new_order
    FROM blueprint_part_rules bpr2
) ranked ON ranked.id = bpr.id
SET bpr.display_order = ranked.new_order
WHERE bpr.display_order <> ranked.new_order;
