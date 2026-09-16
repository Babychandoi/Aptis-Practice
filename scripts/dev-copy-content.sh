#!/usr/bin/env bash
#
# Copy ngân hàng đề từ production sang bản dev.
#
#   bash scripts/dev-copy-content.sh
#
# Chỉ ĐỌC từ production và chỉ GHI vào dev. Không có lệnh nào ghi ngược lại
# production.
#
# Copy ba nơi vì nội dung đề nằm rải ở cả ba:
#   MySQL   — topics, question_sets, assets, question_set_assets
#   MongoDB — question_set_documents (nội dung câu hỏi thật)
#   MinIO   — file audio và ảnh
#
# KHÔNG copy: người dùng, đơn hàng, lượt làm bài, hoa hồng, bài nói học viên
# nộp — dữ liệu của người thật không có lý do gì nằm trên bản test.
#
# Chạy lại được: mỗi lần chạy thay thế toàn bộ phần nội dung ở dev.

set -euo pipefail

PROD_MYSQL=aptis-mysql
DEV_MYSQL=aptis-dev-mysql
PROD_MONGO=aptis-mongo
DEV_MONGO=aptis-dev-mongo
PROD_MINIO=aptis-minio
DEV_MINIO=aptis-dev-minio

PROD_MINIO_VOLUME=aptis_minio-data
DEV_MINIO_VOLUME=aptis-dev_dev-minio-data

# Chỉ bucket chứa nội dung đề. Cố ý bỏ aptis-user-recordings và
# aptis-user-uploads: đó là bài nói và file học viên thật nộp lên.
BUCKETS="aptis-content aptis-public"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

canh_bao() { printf '\n\033[1;33m%s\033[0m\n' "$*"; }
buoc() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

# Dừng sớm nếu thiếu container, tránh copy nửa vời rồi để dev ở trạng thái lỡ dở.
for c in "$PROD_MYSQL" "$DEV_MYSQL" "$PROD_MONGO" "$DEV_MONGO" "$PROD_MINIO" "$DEV_MINIO"; do
  if ! docker ps --format '{{.Names}}' | grep -qx "$c"; then
    echo "Thiếu container đang chạy: $c" >&2
    exit 1
  fi
done

# ---------------------------------------------------------------- MySQL
buoc "MySQL — topics, question_sets, assets"

# --no-create-info: giữ nguyên schema của dev (do Flyway dựng), chỉ lấy dữ liệu.
# Lấy cả CREATE TABLE thì schema production cũ hơn sẽ đè lên dev.
docker exec "$PROD_MYSQL" mysqldump -uroot -proot \
  --no-create-info --skip-add-locks --skip-comments --complete-insert \
  --default-character-set=utf8mb4 \
  aptis topics assets question_sets question_set_assets \
  > "$TMP/content.sql" 2>/dev/null

# created_by/updated_by trỏ tới tài khoản của production, mà dev không có những
# tài khoản đó nên khoá ngoại sẽ chặn. Dev cũng không cần biết ai tạo đề, nên
# cắt luôn liên kết thay vì kéo theo bảng users.
{
  echo "SET FOREIGN_KEY_CHECKS=0;"
  echo "SET NAMES utf8mb4;"
  echo "DELETE FROM question_set_assets;"
  echo "DELETE FROM question_sets;"
  echo "DELETE FROM assets;"
  echo "DELETE FROM topics;"
  cat "$TMP/content.sql"
  echo "UPDATE assets SET created_by=NULL;"
  echo "UPDATE question_sets SET created_by=NULL, updated_by=NULL;"
  echo "SET FOREIGN_KEY_CHECKS=1;"
} > "$TMP/load.sql"

docker exec -i "$DEV_MYSQL" mysql -uroot -proot --default-character-set=utf8mb4 aptis \
  < "$TMP/load.sql" 2>&1 | grep -v "Using a password" || true

echo "  đề: $(docker exec "$DEV_MYSQL" mysql -uroot -proot -N -e \
  'SELECT COUNT(*) FROM aptis.question_sets;' 2>/dev/null | grep -v Warning)"

# ---------------------------------------------------------------- MongoDB
buoc "MongoDB — nội dung câu hỏi"

docker exec "$PROD_MONGO" mongodump --quiet --db aptis \
  --collection question_set_documents --archive > "$TMP/qs.archive"

docker exec -i "$DEV_MONGO" mongorestore --quiet --archive --drop \
  --nsInclude 'aptis.question_set_documents' < "$TMP/qs.archive"

echo "  document: $(docker exec "$DEV_MONGO" mongosh --quiet --eval \
  'db.getSiblingDB("aptis").question_set_documents.countDocuments()')"

# ---------------------------------------------------------------- MinIO
buoc "MinIO — audio và ảnh (có thể mất vài phút)"

# Copy thẳng giữa hai docker volume thay vì dùng mc qua API S3.
#
# mc mirror báo chuyển 0 byte dù mc ls liệt kê đủ file, và mc cp một file lẻ thì
# báo "Object does not exist" — mc bản mới không hợp với MinIO đang chạy. Đọc
# thẳng volume vừa nhanh hơn vừa không phụ thuộc phiên bản API.
#
# Dừng MinIO dev trong lúc chép: ghi vào thư mục dữ liệu sau lưng một MinIO
# đang chạy thì nó không thấy file mới.
docker stop "$DEV_MINIO" >/dev/null

docker run --rm \
  -v "$PROD_MINIO_VOLUME":/from:ro \
  -v "$DEV_MINIO_VOLUME":/to \
  -e "BUCKETS=$BUCKETS" \
  alpine:3 sh -c '
    for b in $BUCKETS; do
      echo "  chép $b"
      rm -rf "/to/$b"
      cp -a "/from/$b" "/to/$b"
    done
    # .minio.sys giữ metadata bucket; thiếu nó MinIO coi như chưa có bucket.
    mkdir -p /to/.minio.sys
    cp -a /from/.minio.sys/buckets /to/.minio.sys/ 2>/dev/null || true
  '

docker start "$DEV_MINIO" >/dev/null

# Đợi MinIO dev khoẻ lại trước khi báo xong, để người chạy không mở trang quá sớm.
until docker inspect "$DEV_MINIO" --format '{{.State.Health.Status}}' 2>/dev/null \
    | grep -q healthy; do
  sleep 2
done

echo "  dung lượng: $(docker exec "$DEV_MINIO" sh -c 'du -sh /data/aptis-content' 2>/dev/null | cut -f1)"

buoc "Xong"
canh_bao "Bản dev giờ có nội dung đề giống production. Người dùng, đơn hàng,
lượt làm bài và bài nói học viên KHÔNG được copy."
