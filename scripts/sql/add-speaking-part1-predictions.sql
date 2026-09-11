-- Đưa các chủ đề Speaking Part 1 vừa tách vào bản tin dự đoán.
--
-- Sau khi tách, Part 1 có 46 chủ đề nhưng bản tin mới liệt kê 10 — tab "đề hot
-- nhất" vì thế vẫn chỉ hiện chừng đó. Bổ sung mọi chủ đề CÓ ĐỀ vào cả ba bản
-- tin để bảng xếp hạng phản ánh đúng ngân hàng.
INSERT INTO exam_predictions
  (id, predict_date, topic_id, part_id, component_id, priority, label,
   section_label, source, status, display_order, created_by, created_at, updated_at)
SELECT
  UUID(), d.predict_date, t.id,
  '16000000-0000-4000-8000-000000000031',
  '15000000-0000-4000-8000-000000000004',
  'HOT', t.name, 'Part 1', 'Aptistest.edu.vn', 'PUBLISHED', 0,
  (SELECT id FROM users WHERE email='plat-admin@test.local'),
  NOW(), NOW()
FROM (SELECT DISTINCT predict_date FROM exam_predictions WHERE status='PUBLISHED') d
CROSS JOIN topics t
WHERE EXISTS (
        SELECT 1 FROM question_sets qs
        WHERE qs.topic_id = t.id AND qs.status='PUBLISHED'
          AND qs.part_id = '16000000-0000-4000-8000-000000000031')
  AND NOT EXISTS (
        SELECT 1 FROM exam_predictions ep
        WHERE ep.predict_date = d.predict_date
          AND ep.topic_id = t.id
          AND ep.part_id <=> '16000000-0000-4000-8000-000000000031');

SELECT predict_date, COUNT(*) AS muc_speaking_p1
FROM exam_predictions
WHERE part_id='16000000-0000-4000-8000-000000000031'
GROUP BY predict_date ORDER BY predict_date;
