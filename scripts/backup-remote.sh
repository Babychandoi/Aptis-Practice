#!/usr/bin/env bash
#
# Backup dữ liệu từ một server ở XA về máy đang chạy script này.
#
# Khác backup-db.sh: bản đó dùng `docker compose exec` nên chỉ chạy được với
# container trên cùng máy. Bản này kết nối qua mạng bằng --host, nên server
# phải mở port 3306 (MySQL), 27017 (Mongo), 9000 (MinIO).
#
# Client chạy trong container Docker đúng phiên bản server (mysql:8.4, mongo:7)
# nên máy bạn KHÔNG cần cài mysqldump/mongodump/mc.
#
# Hai cách đặt cấu hình:
#
#   1) File .env.remote (gọn khi dùng thường xuyên) — KHUYẾN NGHỊ
#        cp .env.remote.example .env.remote
#        # sửa HOST trong .env.remote
#        ./scripts/backup-remote.sh
#
#   2) Truyền trực tiếp trên dòng lệnh (dùng một lần)
#        HOST=1.2.3.4 ./scripts/backup-remote.sh
#        HOST=1.2.3.4 SKIP_MINIO=1 ./scripts/backup-remote.sh
#
#   Giá trị trên dòng lệnh ghi đè giá trị trong .env.remote.
#
# ---------------------------------------------------------------------------
# CẢNH BÁO BẢO MẬT
#
# Trong lúc chạy, ba cổng dữ liệu của bạn phơi ra Internet. Nếu mật khẩu vẫn là
# mặc định (aptis/aptis, minioadmin/minioadmin) thì bot quét cổng dò ra rất
# nhanh. Hãy đóng cổng ngay sau khi backup xong:
#
#   # Trên server, MỞ trước khi chạy script:
#   sudo ufw allow from <IP-may-ban> to any port 3306 proto tcp
#   sudo ufw allow from <IP-may-ban> to any port 27017 proto tcp
#   sudo ufw allow from <IP-may-ban> to any port 9000 proto tcp
#
#   # ĐÓNG ngay sau khi xong:
#   sudo ufw delete allow from <IP-may-ban> to any port 3306 proto tcp
#   sudo ufw delete allow from <IP-may-ban> to any port 27017 proto tcp
#   sudo ufw delete allow from <IP-may-ban> to any port 9000 proto tcp
#
# Giới hạn `from <IP-may-ban>` quan trọng hơn việc đóng lại: nó khiến cổng chỉ
# mở với đúng máy bạn thay vì cả Internet. Xem IP của mình: curl ifconfig.me
# ---------------------------------------------------------------------------
set -euo pipefail
export MSYS_NO_PATHCONV=1

cd "$(dirname "$0")/.."

# Đọc cấu hình server từ xa từ .env.remote nếu có.
#
# KHÔNG dùng .env của dự án: đó là cấu hình chạy local (MYSQL_HOST=localhost,
# mật khẩu của container trên máy này), không phải của server từ xa. Trộn hai
# thứ vào nhau là cách nhanh nhất để dump nhầm database.
#
# .env.remote nằm trong .gitignore vì chứa IP và mật khẩu server thật.
# Tạo từ mẫu: cp .env.remote.example .env.remote
REMOTE_ENV=${REMOTE_ENV:-.env.remote}
# Giữ giá trị truyền trên dòng lệnh trước khi đọc file: `. file` sẽ ghi đè mọi
# biến, nên nếu không cứu lại thì HOST=x ./script bị file vô hiệu hoá — ngược
# với thứ tự ưu tiên đã ghi trong hướng dẫn ở đầu file.
_CLI_HOST=${HOST:-}
_CLI_MYSQL_PASSWORD=${MYSQL_PASSWORD:-}
_CLI_MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-}
_CLI_SKIP_MINIO=${SKIP_MINIO:-}
_CLI_DEST_ROOT=${DEST_ROOT:-}
if [ -f "$REMOTE_ENV" ]; then
    set +u
    # shellcheck disable=SC1090
    . "./$REMOTE_ENV" 2>/dev/null || true
    set -u
    echo "==> Đọc cấu hình từ $REMOTE_ENV"
fi
# Phục hồi: dòng lệnh thắng file.
[ -n "$_CLI_HOST" ] && HOST=$_CLI_HOST
[ -n "$_CLI_MYSQL_PASSWORD" ] && MYSQL_PASSWORD=$_CLI_MYSQL_PASSWORD
[ -n "$_CLI_MINIO_SECRET_KEY" ] && MINIO_SECRET_KEY=$_CLI_MINIO_SECRET_KEY
[ -n "$_CLI_SKIP_MINIO" ] && SKIP_MINIO=$_CLI_SKIP_MINIO
[ -n "$_CLI_DEST_ROOT" ] && DEST_ROOT=$_CLI_DEST_ROOT

HOST=${HOST:-}
if [ -z "$HOST" ]; then
    echo "LỖI: chưa có HOST." >&2
    echo "" >&2
    echo "Chọn một trong hai cách:" >&2
    echo "  1) Truyền trực tiếp:  HOST=1.2.3.4 ./scripts/backup-remote.sh" >&2
    echo "  2) Ghi vào file:      cp .env.remote.example .env.remote" >&2
    echo "                        rồi sửa HOST trong .env.remote" >&2
    exit 1
fi

MYSQL_PORT=${MYSQL_PORT:-3306}
MONGO_PORT=${MONGO_PORT:-27017}
MINIO_PORT=${MINIO_PORT:-9000}
MYSQL_USER=${MYSQL_USER:-aptis}
MYSQL_PASSWORD=${MYSQL_PASSWORD:-aptis}
MYSQL_DB=${MYSQL_DB:-aptis}
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:-minioadmin}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-minioadmin}
SKIP_MINIO=${SKIP_MINIO:-0}
DEST_ROOT=${DEST_ROOT:-"$(pwd)/../Aptis-Practise-Backups"}

# Mốc thời gian lấy từ máy chạy script (không gọi được vào container từ xa).
TS=$(date -u +%Y%m%d-%H%M%S)
OUT="$DEST_ROOT/remote-$HOST-$TS"
mkdir -p "$OUT"

echo "==> Backup từ $HOST vào $OUT"

# Kiểm tra kết nối trước khi dump: sai IP hay chưa mở cổng thì báo ngay thay vì
# treo hàng phút rồi để lại file rỗng.
echo "--> Kiểm tra cổng"
for P in "$MYSQL_PORT:MySQL" "$MONGO_PORT:MongoDB"; do
    PORT=${P%%:*}; NAME=${P##*:}
    if docker run --rm alpine:3 sh -c "nc -z -w5 $HOST $PORT" >/dev/null 2>&1; then
        echo "    $NAME $PORT: mở"
    else
        echo "LỖI: không nối được $NAME tại $HOST:$PORT." >&2
        echo "      Kiểm tra firewall đã mở cổng cho IP của bạn chưa." >&2
        exit 1
    fi
done

# ---------------------------------------------------------------- MySQL
# Client mysql:8.4 khớp server: dump bằng client cũ hơn có thể thiếu cú pháp mới.
# --default-character-set=utf8mb4 BẮT BUỘC, thiếu là tiếng Việt thành rác.
echo "--> MySQL"
docker run --rm -i mysql:8.4 mysqldump \
    --host="$HOST" --port="$MYSQL_PORT" \
    --user="$MYSQL_USER" --password="$MYSQL_PASSWORD" \
    --default-character-set=utf8mb4 \
    --no-tablespaces --single-transaction --routines --triggers --events \
    --databases "$MYSQL_DB" \
    > "$OUT/mysql-$MYSQL_DB.sql" 2>/dev/null

MYSQL_TABLES=$(grep -c "^CREATE TABLE" "$OUT/mysql-$MYSQL_DB.sql" || true)
echo "    $MYSQL_TABLES bảng"
if [ "${MYSQL_TABLES:-0}" -lt 1 ]; then
    echo "LỖI: dump MySQL không có bảng nào — sai mật khẩu hoặc sai tên database." >&2
    exit 1
fi

# ---------------------------------------------------------------- MongoDB
echo "--> MongoDB"
docker run --rm -i mongo:7 mongodump \
    --host="$HOST" --port="$MONGO_PORT" \
    --quiet --archive --gzip -d "$MYSQL_DB" \
    > "$OUT/mongo-$MYSQL_DB.archive.gz" 2>/dev/null

MONGO_BYTES=$(wc -c < "$OUT/mongo-$MYSQL_DB.archive.gz" | tr -d ' ')
echo "    $MONGO_BYTES byte"
if [ "$MONGO_BYTES" -lt 1000 ]; then
    echo "LỖI: archive MongoDB quá nhỏ, gần như chắc chắn rỗng." >&2
    exit 1
fi

# ---------------------------------------------------------------- MinIO
MINIO_NOTE="bỏ qua (SKIP_MINIO=1)"
if [ "$SKIP_MINIO" != "1" ]; then
    echo "--> MinIO"
    # Danh sách bucket cố định: image minio/mc không có sed/awk/grep để parse
    # `mc ls`, và cột của nó từng đổi giữa các bản khiến backup ra rỗng mà vẫn
    # báo thành công. Khớp aptis.minio.buckets trong application.yml.
    BUCKETS=${BUCKETS:-"aptis-public aptis-content aptis-user-recordings aptis-user-uploads aptis-imports aptis-exports"}

    mkdir -p "$OUT/minio-tmp"
    docker run --rm -v "$OUT/minio-tmp":/out --entrypoint sh minio/mc:latest -c "
        mc alias set r http://$HOST:$MINIO_PORT '$MINIO_ACCESS_KEY' '$MINIO_SECRET_KEY' >/dev/null 2>&1
        for B in $BUCKETS; do
            mc mirror --quiet r/\$B /out/\$B >/dev/null 2>&1 || true
        done" </dev/null 2>/dev/null

    if [ -n "$(ls -A "$OUT/minio-tmp" 2>/dev/null)" ]; then
        # --force-local: tar thấy "C:/..." trên Windows và hiểu là host từ xa.
        tar --force-local -czf "$OUT/minio.tar.gz" -C "$OUT/minio-tmp" .
        MINIO_FILES=$(tar --force-local -tzf "$OUT/minio.tar.gz" | grep -vE '/$' | wc -l | tr -d ' ')
        MINIO_NOTE="$MINIO_FILES file, $(du -h "$OUT/minio.tar.gz" | cut -f1)"
        echo "    $MINIO_NOTE"
    else
        MINIO_NOTE="không có object nào"
        echo "    $MINIO_NOTE"
    fi
    rm -rf "$OUT/minio-tmp"
fi

cat > "$OUT/MANIFEST.md" <<EOF
# Backup từ xa: $HOST — $TS (UTC)

| Thành phần | Nội dung |
|---|---|
| \`mysql-$MYSQL_DB.sql\` | $MYSQL_TABLES bảng |
| \`mongo-$MYSQL_DB.archive.gz\` | $MONGO_BYTES byte |
| \`minio.tar.gz\` | $MINIO_NOTE |

Tạo bởi \`scripts/backup-remote.sh\` từ $HOST.

## Phục hồi vào máy local

Xem lệnh trong MANIFEST của \`scripts/backup-db.sh\`, hoặc:

\`\`\`bash
export MSYS_NO_PATHCONV=1
docker compose exec -T mysql mysql --default-character-set=utf8mb4 \
    -u$MYSQL_USER -p'$MYSQL_PASSWORD' < mysql-$MYSQL_DB.sql
docker compose exec -T mongo sh -c 'cat > /tmp/r.gz' < mongo-$MYSQL_DB.archive.gz
docker compose exec -T mongo mongorestore --archive=/tmp/r.gz --gzip --drop
\`\`\`

## Nhắc đóng cổng

Backup xong ĐÓNG NGAY 3306 / 27017 / 9000 trên $HOST. Xem hướng dẫn ở đầu
\`scripts/backup-remote.sh\`.
EOF

echo "==> Xong: $OUT ($(du -sh "$OUT" | cut -f1))"
echo ""
echo "!!  ĐÓNG NGAY các cổng 3306 / 27017 / 9000 trên $HOST"
