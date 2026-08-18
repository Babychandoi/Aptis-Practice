-- Sửa tên và mô tả blueprint Ngữ pháp & Từ vựng.
--
-- Bản chèn đầu tiên đi qua `mysql -e "..."` nên chữ tiếng Việt bị mã hóa sai
-- (client mặc định latin1). Nạp lại từ file với --default-character-set=utf8mb4.
UPDATE test_blueprints
SET name = 'Thi thử Ngữ pháp & Từ vựng - Đề 1',
    description = '25 câu ngữ pháp và 25 câu từ vựng, làm trong 25 phút như đề thật.',
    updated_at = NOW()
WHERE code = 'MOCK_GRAMMAR_VOCAB_001';

SELECT code, name, description FROM test_blueprints WHERE code = 'MOCK_GRAMMAR_VOCAB_001';
