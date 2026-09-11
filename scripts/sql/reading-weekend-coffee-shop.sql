-- Reading Part 2+3: hai mục "Weekend Activities" và "New coffee shop" trong
-- bản tin đối thủ mà mình chưa có, dù ngân hàng đã sẵn đề.
--
-- "Weekend activities" đang gắn lộn vào topic "Sự kiện thể thao" (không đúng
-- nghĩa), và "New coffee shop"/"A new café in town" là đề mồ côi hoặc trùng ý
-- với "Quán cà phê" — tách hẳn thành 2 topic mới đúng nhãn bản tin.

INSERT INTO topics (id, code, name, created_at, updated_at)
VALUES ('7a000000-0000-4000-8000-000000000001', 'weekend-activities-r', 'Weekend Activities', NOW(), NOW());
UPDATE question_sets SET topic_id='7a000000-0000-4000-8000-000000000001', updated_at=NOW()
WHERE id='a2000000-0000-4000-8000-000000000002';

INSERT INTO topics (id, code, name, created_at, updated_at)
VALUES ('7a000000-0000-4000-8000-000000000002', 'new-coffee-shop-r', 'New coffee shop', NOW(), NOW());
UPDATE question_sets SET topic_id='7a000000-0000-4000-8000-000000000002', updated_at=NOW()
WHERE id IN ('cc8bf840-b505-44af-a473-7f6a0ad057ea','a2000000-0000-4000-8000-000000000028',
             'a2000000-0000-4000-8000-000000000008','a2000000-0000-4000-8000-000000000033');

-- Thêm vào cả 3 bản tin đang publish
INSERT INTO exam_predictions (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT UUID(), d.dt, '7a000000-0000-4000-8000-000000000001',
 (SELECT p.id FROM parts p JOIN components c ON c.id=p.component_id WHERE c.code='READING' AND p.code='PART_2'),
 (SELECT id FROM components WHERE code='READING'), 'HOT', 'Weekend Activities', 'Part 2+3', 'Bản tin dự đoán', 'PUBLISHED', 9, NOW(), NOW()
FROM (SELECT '2026-08-26' dt UNION SELECT '2026-08-27' UNION SELECT '2026-09-05') d;

INSERT INTO exam_predictions (id, predict_date, topic_id, part_id, component_id, priority, label, section_label, source, status, display_order, created_at, updated_at)
SELECT UUID(), d.dt, '7a000000-0000-4000-8000-000000000002',
 (SELECT p.id FROM parts p JOIN components c ON c.id=p.component_id WHERE c.code='READING' AND p.code='PART_2'),
 (SELECT id FROM components WHERE code='READING'), 'HOT', 'New coffee shop', 'Part 2+3', 'Bản tin dự đoán', 'PUBLISHED', 10, NOW(), NOW()
FROM (SELECT '2026-08-26' dt UNION SELECT '2026-08-27' UNION SELECT '2026-09-05') d;
