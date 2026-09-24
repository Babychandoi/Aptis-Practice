-- Speaking Part 2 phải là 10 điểm, không phải 15.
--
-- Thang chuẩn Aptis Speaking là 50: Part 1 (5) + Part 2 (10) + Part 3 (15)
-- + Part 4 (20). Rubric APTIS_SPEAKING_PART_2_V1 trong MongoDB đã ghi đúng
-- maxScore = 10 ngay từ đầu; chỉ question_sets.max_score bị nhập thành 15.
--
-- Hệ quả: trang kết quả cộng dồn điểm tối đa từng part nên hiện tổng 55 thay
-- vì 50 (5 + 15 + 15 + 20), khiến phần trăm của học viên thấp hơn thực tế
-- khoảng 9%. Bốn kỹ năng còn lại đều cộng đúng 50, chỉ Speaking lệch.
--
-- Không phải sửa rubric hay code chấm: EvaluationWorker.applyScoreToAttempt
-- quy đổi tỷ lệ từ thang rubric sang max_score của bộ đề, nên hạ max_score
-- xuống 10 là công thức tự khớp lại.

UPDATE question_sets qs
JOIN parts p ON p.id = qs.part_id
JOIN components c ON c.id = p.component_id
SET qs.max_score = 10.00,
    qs.updated_at = NOW()
WHERE c.code = 'SPEAKING'
  AND p.code = 'PART_2'
  AND qs.max_score <> 10.00;

-- Part 1 giữ nguyên 1.66/câu. Ba câu cộng lại là 4.98 chứ không tròn 5, vì
-- decimal(10,2) không giữ được 1.6667, nhưng trang kết quả làm tròn một chữ số
-- nên vẫn hiện 50.0. Chia lệch từng câu (1.67/1.67/1.66) để bù 0.02 sẽ khiến
-- ba câu giống hệt nhau lại mang trần điểm khác nhau, khó giải thích hơn là
-- được lợi.

-- Các bài đã chấm trước đây được quy đổi theo thang 15, nên điểm và trần điểm
-- của chúng vẫn mang giá trị cũ. Đưa về thang 10 theo đúng tỷ lệ đã chấm, để
-- bài cũ và bài mới không nằm trên hai thang khác nhau.
--
-- Chỉ đụng tới dòng đang ở trần 15: bài chấm sau khi migration chạy đã đúng
-- thang rồi, chạy lại migration cũng không làm điểm trôi thêm lần nữa.
UPDATE attempt_question_sets aqs
JOIN question_sets qs ON qs.id = aqs.question_set_id
JOIN parts p ON p.id = qs.part_id
JOIN components c ON c.id = p.component_id
SET aqs.awarded_score = ROUND(aqs.awarded_score * 10 / 15, 2),
    aqs.max_score = 10.00
WHERE c.code = 'SPEAKING'
  AND p.code = 'PART_2'
  AND aqs.max_score = 15.00;

-- test_attempts lưu tổng điểm riêng chứ không tính lại từ các part mỗi lần
-- đọc, nên không cập nhật ở đây thì trang kết quả hiện tổng cũ trong khi từng
-- part đã đổi — người xem thấy các con số không cộng lại thành tổng.
--
-- Làm tròn mọi điểm đã chấm về bội số 0.5, khớp với AttemptQuestionSet.applyScore
-- từ nay trở đi. Không làm ở đây thì bài cũ vẫn hiện 1.33 hay 0.20 trong khi
-- bài mới đã tròn, hai thang lẫn lộn trên cùng một trang lịch sử.
--
-- Chạm trần thì giữ nguyên trần: bộ đề trần lẻ như 1.66 mà ép về 1.5 sẽ thành
-- ra học viên đạt tuyệt đối vẫn nhìn như mất điểm.
UPDATE attempt_question_sets
SET awarded_score = CASE
        WHEN awarded_score >= max_score THEN max_score
        WHEN ROUND(awarded_score * 2) / 2 > max_score THEN max_score
        ELSE ROUND(awarded_score * 2) / 2
    END
WHERE status = 'SCORED'
  AND awarded_score IS NOT NULL
  AND awarded_score <> CASE
        WHEN awarded_score >= max_score THEN max_score
        WHEN ROUND(awarded_score * 2) / 2 > max_score THEN max_score
        ELSE ROUND(awarded_score * 2) / 2
    END;

-- Tính lại từ chính attempt_question_sets sau khi đã sửa ở trên, thay vì trừ
-- một lượng cố định: bài chỉ luyện riêng một part không có đủ 4 part nên trừ
-- cứng sẽ sai.
--
-- Bỏ điều kiện chỉ lấy bài có Speaking Part 2: bước làm tròn vừa rồi đụng tới
-- mọi kỹ năng nên tổng của bài nào cũng có thể đã đổi.
UPDATE test_attempts ta
JOIN (
    SELECT aqs.attempt_id,
           SUM(aqs.awarded_score) AS tong_dat,
           SUM(aqs.max_score)     AS tong_toi_da
    FROM attempt_question_sets aqs
    WHERE aqs.status = 'SCORED'
    GROUP BY aqs.attempt_id
) t ON t.attempt_id = ta.id
SET ta.raw_score = t.tong_dat,
    ta.max_score = t.tong_toi_da,
    ta.percentage_score = CASE WHEN t.tong_toi_da > 0
        THEN ROUND(t.tong_dat * 100 / t.tong_toi_da, 4) ELSE 0 END
WHERE ta.raw_score IS NOT NULL;
