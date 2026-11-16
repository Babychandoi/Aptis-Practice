-- Đề giáo viên tự soạn chỉ dành cho lớp của họ (TeacherContentAuthoringService), nhưng
-- các truy vấn luyện theo Part / thi thử chỉ lọc theo trạng thái nên trước đây đề lớp
-- lẫn vào kho chung cho mọi học viên. Ẩn khỏi kho; bài giao, bài ghép FIXED và dự đoán
-- chọn sẵn đề của lớp vẫn mở theo id như cũ.
UPDATE question_sets SET listed = 0 WHERE owner_teacher_id IS NOT NULL;
