-- Dự đoán đề: chủ đề nào có khả năng ra thi, theo từng ngày và từng kỹ năng.
--
-- Không suy ra từ question_sets.hotness: hotness là mức "hay ra thi" chung do
-- biên tập đặt một lần cho cả bộ, còn dự đoán là tin theo NGÀY và thay đổi
-- liên tục theo phản hồi người thi thật. Hai thứ khác nhau về bản chất và
-- vòng đời, nên tách bảng riêng.
--
-- Một mục = một chủ đề của một part, kèm mức ưu tiên. Học viên bấm vào là làm
-- ngay các đề thuộc chủ đề + part đó (topic_id + part_id đủ để lọc).
CREATE TABLE exam_predictions (
    id CHAR(36) NOT NULL,

    -- Ngày dự đoán. Tách khỏi created_at để admin ghi trước cho ngày mai, hoặc
    -- ghi lùi cho hôm qua.
    predict_date DATE NOT NULL,

    -- Chủ đề dự đoán. Bắt buộc: đây chính là thứ dùng để lọc đề khi học viên
    -- bấm vào, không có thì mục dự đoán vô nghĩa.
    topic_id CHAR(36) NOT NULL,

    -- Part cụ thể. NULL = cả kỹ năng (ví dụ Writing dự đoán theo chủ đề chứ
    -- không theo part), lúc đó lọc đề theo component_id của kỹ năng.
    part_id CHAR(36) NULL,

    -- Kỹ năng, luôn có để nhóm hiển thị theo tab Reading/Writing/...
    component_id CHAR(36) NOT NULL,

    -- HOT = khả năng ra cao, BACKUP = đề dự phòng. Khớp nhãn trên giao diện.
    priority ENUM('HOT','BACKUP') NOT NULL DEFAULT 'HOT',

    -- Nhãn hiển thị. Thường trùng tên topic nhưng cho phép đặt khác: tin đề
    -- hay dùng cách gọi riêng ("Q14", "Part 2+3") không giống tên chủ đề.
    label VARCHAR(255) NULL,

    -- Nhóm hiển thị tự do, ví dụ "Part 5", "Q16-17", "Part 2+3". Đề thi thật
    -- đôi khi gộp nhiều part vào một cụm câu nên không suy ra được từ part_id.
    section_label VARCHAR(64) NULL,

    -- Nguồn tin để ghi công và người học biết độ tin cậy.
    source VARCHAR(255) NULL,

    -- Chỉ hiện mục PUBLISHED; DRAFT để admin soạn trước khi công bố.
    status ENUM('DRAFT','PUBLISHED') NOT NULL DEFAULT 'PUBLISHED',
    display_order INT NOT NULL DEFAULT 0,

    created_by CHAR(36) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    PRIMARY KEY (id),

    -- Cùng ngày + cùng chủ đề + cùng part thì chỉ một mục, tránh admin nhập
    -- trùng khi cập nhật nhiều lần trong ngày.
    UNIQUE KEY uk_exam_predictions_slot (predict_date, topic_id, part_id),

    KEY idx_exam_predictions_date (predict_date DESC),
    KEY idx_exam_predictions_feed (status, predict_date DESC, component_id),
    KEY idx_exam_predictions_component (component_id, predict_date DESC),

    CONSTRAINT fk_exam_predictions_topic
        FOREIGN KEY (topic_id) REFERENCES topics (id),
    CONSTRAINT fk_exam_predictions_part
        FOREIGN KEY (part_id) REFERENCES parts (id),
    CONSTRAINT fk_exam_predictions_component
        FOREIGN KEY (component_id) REFERENCES components (id),
    CONSTRAINT fk_exam_predictions_created_by
        FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;
