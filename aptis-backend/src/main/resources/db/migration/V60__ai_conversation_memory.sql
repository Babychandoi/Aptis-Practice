-- Bộ nhớ cho AI Voice: nhớ được cuộc hội thoại trước khi phải tạo phiên mới.
--
-- Trước đây ngữ cảnh chỉ nằm trong RAM trình duyệt và chỉ ghi xuống lúc đóng
-- phiên, nên đóng tab đột ngột là mất sạch. Phần tóm tắt cũng là một câu cố
-- định chứ không phải nội dung thật, nên phiên mới không biết đã nói những gì.

-- Từng lượt nói, ghi ngay khi phát sinh chứ không chờ đóng phiên.
CREATE TABLE ai_conversation_turns (
    id          CHAR(36)     NOT NULL PRIMARY KEY,
    session_id  CHAR(36)     NOT NULL,
    user_id     CHAR(36)     NOT NULL,
    -- 'user' hoặc 'ai'; để chuỗi cho khớp cách frontend gắn nhãn transcript.
    role        VARCHAR(10)  NOT NULL,
    content     TEXT         NOT NULL,
    -- Thứ tự trong phiên. Không dựa vào created_at vì nhiều lượt có thể rơi
    -- vào cùng một giây, lúc đó sắp xếp sẽ không còn ổn định.
    seq         INT          NOT NULL,
    created_at  DATETIME     NOT NULL,
    updated_at  DATETIME     NOT NULL,
    CONSTRAINT uk_ai_turn_seq UNIQUE (session_id, seq)
) ENGINE = InnoDB;

CREATE INDEX idx_ai_turns_session ON ai_conversation_turns (session_id, seq);
CREATE INDEX idx_ai_turns_user ON ai_conversation_turns (user_id, created_at);

-- Hồ sơ dài hạn: thứ cần nhớ qua mọi phiên, không chỉ phiên liền trước.
-- Mỗi học viên một dòng.
CREATE TABLE ai_conversation_profiles (
    user_id          CHAR(36)   NOT NULL PRIMARY KEY,
    -- JSON: tên, nghề, sở thích, lỗi hay mắc, chủ đề đang dở...
    -- Để JSON thay vì nhiều cột vì nội dung nhớ sẽ còn thay đổi theo thời gian.
    facts            JSON       NULL,
    -- Yêu cầu về phong cách của học viên (english only, đừng cà khịa...).
    -- Tách khỏi facts vì prompt phải đọc riêng phần này để tôn trọng ngay.
    style_prefs      JSON       NULL,
    last_summary     TEXT       NULL,
    total_sessions   INT        NOT NULL DEFAULT 0,
    last_session_at  DATETIME   NULL,
    created_at       DATETIME   NOT NULL,
    updated_at       DATETIME   NOT NULL
) ENGINE = InnoDB;
