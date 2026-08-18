-- Thứ tự thi thật trên máy: Speaking → Listening → Core → Reading → Writing.
--
-- V26 xếp Core → Reading → Listening → Writing → Speaking theo thứ tự TRÌNH BÀY
-- trong "Guide for Teachers". Đó là thứ tự các chương của tài liệu, không phải
-- trình tự làm bài; thực tế Speaking thi trước tiên (cần micro, làm xong mới
-- sang các phần còn lại).
--
-- Thời lượng giữ nguyên như V26: Speaking 12', Listening 40', Core 25',
-- Reading 35', Writing 50'.

UPDATE components SET display_order = display_order + 100;

UPDATE components SET display_order = CASE code
        WHEN 'SPEAKING'           THEN 1
        WHEN 'LISTENING'          THEN 2
        WHEN 'GRAMMAR_VOCABULARY' THEN 3
        WHEN 'READING'            THEN 4
        WHEN 'WRITING'            THEN 5
        ELSE display_order
    END
WHERE code IN ('SPEAKING', 'LISTENING', 'GRAMMAR_VOCABULARY', 'READING', 'WRITING');

-- Xếp lại thứ tự Part trong bài thi đủ 5 kỹ năng cho khớp.
-- Dời tạm ra khỏi vùng 1..18 để không đụng uk_blueprint_rules_order.
UPDATE blueprint_part_rules r
JOIN test_blueprints b ON b.id = r.blueprint_id
SET r.display_order = r.display_order + 1000
WHERE b.component_id IS NULL AND b.mode = 'MOCK_TEST';

UPDATE blueprint_part_rules r
JOIN test_blueprints b ON b.id = r.blueprint_id
JOIN parts p ON p.id = r.part_id
JOIN components c ON c.id = p.component_id
SET r.display_order = (c.display_order - 1) * 10 + p.display_order
WHERE b.component_id IS NULL AND b.mode = 'MOCK_TEST';
