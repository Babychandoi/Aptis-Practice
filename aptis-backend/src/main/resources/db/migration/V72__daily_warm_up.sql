-- Khởi động hằng ngày ở trang chủ, đồng bộ từ aptisprep.com (scripts/aptisprep-warmup.mjs,
-- chạy cùng job dự đoán đề 07:00 và 21:30).
--
-- Ngày lẻ (tính từ 11/11/2026): gõ lại các câu trả lời mẫu Writing Part 1 và Part 2.
-- Ngày chẵn: Speaking Marathon của một Part, xoay vòng 1→4.

-- Bộ câu gõ của từng ngày. items là mảng {id, prompt, text}; ngày chưa có bản thì
-- dùng bản gần nhất trước đó.
CREATE TABLE daily_warm_ups (
    day_key DATE NOT NULL,
    items JSON NOT NULL,
    synced_at DATETIME NOT NULL,

    PRIMARY KEY (day_key)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- Ngân hàng câu Speaking Marathon: câu hỏi kèm câu trả lời mẫu tách theo câu (để nghe
-- và nói theo từng câu), gợi ý ý và bản dịch. Part 2-3 có nhiều câu cùng group_id
-- (một bức tranh và các câu hỏi đi kèm). Đồng bộ thay cả Part mỗi lần chạy.
CREATE TABLE speaking_marathon_questions (
    id VARCHAR(64) NOT NULL,
    part TINYINT NOT NULL,
    group_id VARCHAR(64) NULL,
    question VARCHAR(500) NOT NULL,
    question_vi VARCHAR(500) NULL,
    ideas JSON NULL,
    ideas_vi JSON NULL,
    sentences JSON NOT NULL,
    sentences_vi JSON NULL,
    images JSON NULL,
    display_order INT NOT NULL,
    synced_at DATETIME NOT NULL,

    PRIMARY KEY (id),
    KEY idx_speaking_marathon_part (part, display_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
