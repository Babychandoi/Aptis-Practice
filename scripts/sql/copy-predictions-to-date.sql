-- Sao bản tin dự đoán từ ngày này sang ngày khác.
--
--   Sửa hai ngày bên dưới rồi chạy:
--   docker compose -f docker-compose.yml -f docker-compose.tunnel.yml exec -T mysql \
--     sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 aptis' \
--     < scripts/sql/copy-predictions-to-date.sql
--
-- Dùng khi hôm nay chưa có tin mới nhưng muốn bản tin mang ngày hôm nay. Không
-- bắt buộc: backend tự lùi về ngày gần nhất có tin, nên để trống thì học viên
-- vẫn thấy bản tin cũ kèm đúng ngày của nó.
--
-- NOT EXISTS thay vì INSERT IGNORE: unique key (ngày, topic, part) không chặn
-- được khi part_id NULL vì MySQL coi NULL khác NULL, nên chạy lại sẽ nhân đôi
-- toàn bộ mục Writing (dự đoán theo cả kỹ năng nên part_id luôn NULL).
SET @from_date = '2026-08-26';
SET @to_date   = '2026-08-27';

INSERT INTO exam_predictions
  (id, predict_date, topic_id, part_id, component_id, priority,
   label, section_label, source, status, display_order,
   created_by, created_at, updated_at)
SELECT UUID(), @to_date, src.topic_id, src.part_id, src.component_id, src.priority,
       src.label, src.section_label, src.source, src.status, src.display_order,
       src.created_by, NOW(), NOW()
  FROM exam_predictions src
 WHERE src.predict_date = @from_date
   AND NOT EXISTS (
     SELECT 1 FROM exam_predictions dst
      WHERE dst.predict_date = @to_date
        AND dst.topic_id = src.topic_id
        AND (dst.part_id <=> src.part_id)
        AND dst.priority = src.priority
        AND (dst.section_label <=> src.section_label));

SELECT predict_date, COUNT(*) so_muc FROM exam_predictions
 GROUP BY predict_date ORDER BY predict_date DESC LIMIT 7;
