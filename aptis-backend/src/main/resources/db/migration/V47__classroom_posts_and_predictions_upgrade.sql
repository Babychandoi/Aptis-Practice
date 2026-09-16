-- Bảng tin và dự đoán đề của lớp làm ngang với bản của admin.
--
-- Trước đây hai thứ này chỉ có tiêu đề và nội dung chữ. Giáo viên không soạn
-- nháp được, không định dạng được chữ, và dự đoán thì học viên đọc xong không
-- bấm vào đâu để luyện — khác hẳn dự đoán chung của hệ thống vốn mở thẳng ra đề.

-- ---------------------------------------------------------------- Bảng tin
ALTER TABLE classroom_posts
    -- Nháp: giáo viên soạn dần, xong mới cho lớp thấy. Cột status cũ chỉ có
    -- PUBLISHED/HIDDEN nên không diễn tả được "chưa soạn xong".
    MODIFY COLUMN status ENUM('DRAFT','PUBLISHED','HIDDEN')
        NOT NULL DEFAULT 'PUBLISHED',

    ADD COLUMN excerpt VARCHAR(500) NULL
        COMMENT 'Tóm tắt hiện ở danh sách; để trống thì cắt từ nội dung'
        AFTER title,

    ADD COLUMN cover_asset_id CHAR(36) NULL
        COMMENT 'Ảnh bìa bài đăng'
        AFTER content,

    ADD COLUMN pinned TINYINT(1) NOT NULL DEFAULT 0
        COMMENT 'Ghim lên đầu bảng tin lớp'
        AFTER cover_asset_id,

    ADD COLUMN published_at DATETIME NULL
        COMMENT 'Lúc bài được đăng; NULL khi còn là nháp'
        AFTER pinned;

-- Bài cũ đều đang hiển thị nên coi như đã đăng từ lúc tạo.
UPDATE classroom_posts SET published_at = created_at WHERE status = 'PUBLISHED';

ALTER TABLE classroom_posts
    ADD CONSTRAINT fk_classroom_posts_cover
        FOREIGN KEY (cover_asset_id) REFERENCES assets (id);

-- Ghim trước, mới trước. Thứ tự sắp xếp đã đổi nên cần index khác.
--
-- Phải tạo index mới TRƯỚC rồi mới xoá index cũ: khoá ngoại classroom_id đang
-- bám vào index cũ, xoá trước thì MySQL chặn với lỗi 1553. Có index mới cùng
-- tiền tố classroom_id rồi thì khoá ngoại chuyển sang bám vào đó.
CREATE INDEX idx_classroom_posts_feed
    ON classroom_posts (classroom_id, status, pinned, published_at);
DROP INDEX idx_classroom_posts_class ON classroom_posts;

-- ------------------------------------------------------------- Dự đoán đề
--
-- Bám theo exam_predictions của hệ thống để hai bên hiểu giống nhau: cùng
-- topic_id, part_id, component_id, priority, status. Nhờ vậy màn hình dự đoán
-- của lớp dùng lại được cách lọc đề sẵn có.
ALTER TABLE classroom_predictions
    -- Chủ đề: đây chính là thứ dùng để lọc ra đề khi học viên bấm vào. NULL
    -- được, vì giáo viên vẫn có thể ghi một nhận định chữ không gắn đề nào.
    ADD COLUMN topic_id CHAR(36) NULL
        COMMENT 'Chủ đề hệ thống; có thì học viên bấm vào mở được đề'
        AFTER component_id,

    ADD COLUMN part_id CHAR(36) NULL
        COMMENT 'Part cụ thể; NULL = cả kỹ năng'
        AFTER topic_id,

    ADD COLUMN predict_date DATE NULL
        COMMENT 'Ngày thi được dự đoán'
        AFTER part_id,

    ADD COLUMN priority ENUM('HOT','BACKUP') NOT NULL DEFAULT 'HOT'
        COMMENT 'HOT = khả năng ra cao, BACKUP = dự phòng'
        AFTER predict_date,

    ADD COLUMN label VARCHAR(255) NULL
        COMMENT 'Nhãn hiển thị; để trống thì lấy tên chủ đề'
        AFTER priority,

    ADD COLUMN section_label VARCHAR(64) NULL
        COMMENT 'Nhóm hiển thị tự do, ví dụ "Part 2+3"'
        AFTER label,

    ADD COLUMN source VARCHAR(255) NULL
        COMMENT 'Nguồn tin, để học viên biết độ tin cậy'
        AFTER section_label,

    ADD COLUMN status ENUM('DRAFT','PUBLISHED') NOT NULL DEFAULT 'PUBLISHED'
        COMMENT 'Nháp thì chỉ giáo viên thấy'
        AFTER source,

    ADD COLUMN display_order INT NOT NULL DEFAULT 0
        COMMENT 'Thứ tự trong cùng một kỹ năng'
        AFTER status;

ALTER TABLE classroom_predictions
    ADD CONSTRAINT fk_classroom_predictions_topic
        FOREIGN KEY (topic_id) REFERENCES topics (id),
    ADD CONSTRAINT fk_classroom_predictions_part
        FOREIGN KEY (part_id) REFERENCES parts (id);

CREATE INDEX idx_classroom_predictions_feed
    ON classroom_predictions (classroom_id, status, predict_date, display_order);

-- Đề giáo viên tự chọn gắn vào một mục dự đoán.
--
-- Dự đoán của hệ thống lọc đề theo topic, nhưng giáo viên còn muốn chỉ đích
-- danh vài đề — kể cả đề do chính họ soạn, vốn không nằm trong topic nào của
-- hệ thống. Bảng nối riêng để làm được cả hai.
CREATE TABLE classroom_prediction_question_sets (
    prediction_id   CHAR(36) NOT NULL,
    question_set_id CHAR(36) NOT NULL,
    display_order   INT      NOT NULL DEFAULT 0,
    PRIMARY KEY (prediction_id, question_set_id),
    KEY idx_cpqs_order (prediction_id, display_order),
    CONSTRAINT fk_cpqs_prediction FOREIGN KEY (prediction_id)
        REFERENCES classroom_predictions (id) ON DELETE CASCADE,
    CONSTRAINT fk_cpqs_question_set FOREIGN KEY (question_set_id)
        REFERENCES question_sets (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
