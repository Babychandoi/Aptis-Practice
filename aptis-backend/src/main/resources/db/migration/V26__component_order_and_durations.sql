-- Thứ tự và thời lượng các kỹ năng theo "Aptis ESOL General Guide for Teachers"
-- (British Council): Core 25' → Reading 35' → Listening 40' → Writing 50' →
-- Speaking 12'.
--
-- Trước đây Speaking đứng trước Writing, sai so với đề thật: Speaking luôn là
-- phần cuối và chạy một chiều, không quay lại được.

-- Đổi chỗ Speaking (4) và Writing (5). Dùng giá trị tạm để không đụng ràng buộc
-- unique nếu có trên (exam_version_id, display_order).
UPDATE components SET display_order = 99 WHERE code = 'SPEAKING';
UPDATE components SET display_order = 4  WHERE code = 'WRITING';
UPDATE components SET display_order = 5  WHERE code = 'SPEAKING';

-- Thời lượng chuẩn cho bài thi thử từng kỹ năng.
UPDATE test_blueprints b
JOIN components c ON c.id = b.component_id
SET b.duration_seconds = CASE c.code
        WHEN 'GRAMMAR_VOCABULARY' THEN 25 * 60
        WHEN 'READING'            THEN 35 * 60
        WHEN 'LISTENING'          THEN 40 * 60
        WHEN 'WRITING'            THEN 50 * 60
        WHEN 'SPEAKING'           THEN 12 * 60
    END
WHERE b.mode = 'MOCK_TEST' AND b.duration_seconds IS NULL;

-- Bài thi đủ 5 kỹ năng: tổng đúng bằng 25+35+40+50+12.
UPDATE test_blueprints SET duration_seconds = (25 + 35 + 40 + 50 + 12) * 60
WHERE code = 'MOCK_FULL_V1';
