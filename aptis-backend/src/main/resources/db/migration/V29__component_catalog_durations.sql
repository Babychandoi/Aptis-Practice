-- Thời lượng chuẩn từng kỹ năng trong danh mục (Aptis ESOL General).
--
-- Seed ban đầu để Listening 25' và Reading 30'; số đúng là 40' và 35'. Bảng
-- components là nguồn duy nhất cho đồng hồ từng kỹ năng của bài thi đủ 5 kỹ năng
-- (attempt_component_progress lấy từ đây lúc bắt đầu lượt), nên sai ở đây là sai
-- toàn bộ đồng hồ.

UPDATE components SET duration_seconds = CASE code
        WHEN 'SPEAKING'           THEN 12 * 60
        WHEN 'LISTENING'          THEN 40 * 60
        WHEN 'GRAMMAR_VOCABULARY' THEN 25 * 60
        WHEN 'READING'            THEN 35 * 60
        WHEN 'WRITING'            THEN 50 * 60
        ELSE duration_seconds
    END
WHERE code IN ('SPEAKING', 'LISTENING', 'GRAMMAR_VOCABULARY', 'READING', 'WRITING');
