#!/usr/bin/env bash
#
# Nạp một bản backup LÊN server ở xa. Chiều ngược của backup-remote.sh.
#
# Client chạy trong container Docker đúng phiên bản server (mysql:8.4, mongo:7)
# nên máy bạn KHÔNG cần cài mysql/mongorestore/mc.
#
# Hai cách đặt cấu hình (giống backup-remote.sh):
#
#   1) File .env.remote - KHUYẾN NGHỊ
#        cp .env.remote.example .env.remote   # rồi sửa HOST
#        ./scripts/restore-remote.sh backups/db-20260819-085437
#
#   2) Truyền trực tiếp
#        HOST=1.2.3.4 ./scripts/restore-remote.sh backups/db-20260819-085437
#
# Chỉ nạp một phần:
#   ONLY=mysql ./scripts/restore-remote.sh <thu-muc>    # mysql | mongo | minio
#   SKIP_MINIO=1 ./scripts/restore-remote.sh <thu-muc>  # bỏ phần 363M
#
# Chạy không cần xác nhận (cho cron/CI):
#   YES=1 HOST=1.2.3.4 ./scripts/restore-remote.sh <thu-muc>
#
# ---------------------------------------------------------------------------
# CẢNH BÁO: script này GHI ĐÈ dữ liệu trên server.
#
#   - MySQL: dump có DROP TABLE nên mọi bảng trùng tên bị xoá và tạo lại.
#   - MongoDB: --drop xoá collection trùng tên trước khi nạp.
#   - MinIO: mirror ghi đè object trùng key (không xoá object lạ).
#
# Mặc định script HỎI trước khi làm. Nếu server đang có dữ liệu thật, hãy
# backup nó trước bằng: HOST=... ./scripts/backup-remote.sh
#
# Server phải mở port 3306 / 27017 / 9000 cho IP của bạn. Xem hướng dẫn ufw
# ở đầu scripts/backup-remote.sh, và ĐÓNG LẠI sau khi xong.
# ---------------------------------------------------------------------------
set -euo pipefail
export MSYS_NO_PATHCONV=1

cd "$(dirname "$0")/.."

SRC=${1:-}
if [ -z "$SRC" ]; then
    echo "LỖI: thiếu đường dẫn thư mục backup." >&2
    echo "" >&2
    echo "Ví dụ: HOST=1.2.3.4 ./scripts/restore-remote.sh backups/db-20260819-085437" >&2
    echo "" >&2
    echo "Các bản có sẵn:" >&2
    ls -d backups/db-* 2>/dev/null | sed "s|^|  |" >&2 || echo "  (không có bản nào trong backups/)" >&2
    exit 1
fi
SRC=${SRC%/}
if [ ! -d "$SRC" ]; then
    echo "LỖI: không thấy thư mục $SRC" >&2
    exit 1
fi

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
    echo "  1) Truyền trực tiếp:  HOST=1.2.3.4 ./scripts/restore-remote.sh $SRC" >&2
    echo "  2) Ghi vào file:      cp .env.remote.example .env.remote" >&2
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
ONLY=${ONLY:-all}
YES=${YES:-0}

SQL_FILE="$SRC/mysql-$MYSQL_DB.sql"
MONGO_FILE="$SRC/mongo-$MYSQL_DB.archive.gz"
MINIO_FILE="$SRC/minio-aptis-content.tar.gz"
[ -f "$MINIO_FILE" ] || MINIO_FILE="$SRC/minio.tar.gz"

want() { [ "$ONLY" = "all" ] || [ "$ONLY" = "$1" ]; }

# ------------------------------------------------------------ Kiểm tra nguồn
echo "==> Nguồn: $SRC"
DO_MYSQL=0
DO_MONGO=0
DO_MINIO=0
if want mysql && [ -f "$SQL_FILE" ]; then
    T=$(grep -c "^CREATE TABLE" "$SQL_FILE" || true)
    echo "    MySQL : $(du -h "$SQL_FILE" | cut -f1), $T bảng"
    if [ "${T:-0}" -ge 1 ]; then
        DO_MYSQL=1
    else
        echo "    CẢNH BÁO: dump không có bảng nào, bỏ qua MySQL" >&2
    fi
fi
if want mongo && [ -f "$MONGO_FILE" ]; then
    echo "    Mongo : $(du -h "$MONGO_FILE" | cut -f1)"
    DO_MONGO=1
fi
if want minio && [ "$SKIP_MINIO" != "1" ] && [ -f "$MINIO_FILE" ]; then
    echo "    MinIO : $(du -h "$MINIO_FILE" | cut -f1)"
    DO_MINIO=1
fi
if [ "$DO_MYSQL$DO_MONGO$DO_MINIO" = "000" ]; then
    echo "LỖI: không có gì để nạp. Kiểm tra tên file trong $SRC" >&2
    exit 1
fi

# ------------------------------------------------------------ Kiểm tra cổng
echo "==> Đích: $HOST"
check_port() {
    docker run --rm alpine:3 sh -c "nc -z -w5 $1 $2" >/dev/null 2>&1
}
if [ "$DO_MYSQL" = 1 ]; then
    check_port "$HOST" "$MYSQL_PORT" || { echo "LỖI: không nối được MySQL $HOST:$MYSQL_PORT" >&2; exit 1; }
    echo "    MySQL $MYSQL_PORT: mở"
fi
if [ "$DO_MONGO" = 1 ]; then
    check_port "$HOST" "$MONGO_PORT" || { echo "LỖI: không nối được MongoDB $HOST:$MONGO_PORT" >&2; exit 1; }
    echo "    MongoDB $MONGO_PORT: mở"
fi
if [ "$DO_MINIO" = 1 ]; then
    check_port "$HOST" "$MINIO_PORT" || { echo "LỖI: không nối được MinIO $HOST:$MINIO_PORT" >&2; exit 1; }
    echo "    MinIO $MINIO_PORT: mở"
fi

# ------------------------------------------------------------ Xác nhận
# Ghi đè dữ liệu không hoàn tác được, nên mặc định phải hỏi.
if [ "$YES" != "1" ]; then
    echo ""
    echo "!!  Sắp GHI ĐÈ dữ liệu trên $HOST:"
    [ "$DO_MYSQL" = 1 ] && echo "      - MySQL $MYSQL_DB: mọi bảng trùng tên bị xoá và tạo lại"
    [ "$DO_MONGO" = 1 ] && echo "      - MongoDB $MYSQL_DB: collection trùng tên bị xoá trước khi nạp"
    [ "$DO_MINIO" = 1 ] && echo "      - MinIO: object trùng key bị ghi đè"
    echo ""
    printf "Gõ yes để tiếp tục: "
    read -r ANSWER
    if [ "$ANSWER" != "yes" ]; then
        echo "Đã huỷ, không thay đổi gì."
        exit 0
    fi
fi

# ------------------------------------------------------------ MySQL
if [ "$DO_MYSQL" = 1 ]; then
    echo "--> Nạp MySQL"
    # Dump có sẵn CREATE DATABASE + USE nên không cần chỉ định database.
    # --default-character-set=utf8mb4 BẮT BUỘC: thiếu là tiếng Việt thành rác.
    docker run --rm -i mysql:8.4 mysql \
        --host="$HOST" --port="$MYSQL_PORT" \
        --user="$MYSQL_USER" --password="$MYSQL_PASSWORD" \
        --default-character-set=utf8mb4 \
        < "$SQL_FILE" 2>&1 | grep -v "Using a password" || true

    # Đếm lại từ server để biết chắc đã vào, không tin vào exit code.
    GOT=$(docker run --rm -i mysql:8.4 mysql \
        --host="$HOST" --port="$MYSQL_PORT" \
        --user="$MYSQL_USER" --password="$MYSQL_PASSWORD" \
        -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$MYSQL_DB'" \
        2>/dev/null | tr -d "\r")
    echo "    server có $GOT bảng"
    if [ "${GOT:-0}" -lt 1 ]; then
        echo "LỖI: nạp xong mà server không có bảng nào." >&2
        exit 1
    fi
fi

# ------------------------------------------------------------ MongoDB
if [ "$DO_MONGO" = 1 ]; then
    echo "--> Nạp MongoDB"
    # --drop: xoá collection trùng tên trước khi nạp. Không có nó thì dữ liệu cũ
    # và mới trộn vào nhau, sinh bản trùng _id.
    docker run --rm -i mongo:7 mongorestore \
        --host="$HOST" --port="$MONGO_PORT" \
        --archive --gzip --drop --quiet \
        < "$MONGO_FILE" 2>&1 | grep -iE "document|error" || true

    GOT=$(docker run --rm -i mongo:7 mongosh --quiet \
        "mongodb://$HOST:$MONGO_PORT/$MYSQL_DB" \
        --eval "db.getCollectionNames().length" 2>/dev/null | tr -d "\r")
    echo "    server có $GOT collection"
fi

# ------------------------------------------------------------ MinIO
if [ "$DO_MINIO" = 1 ]; then
    echo "--> Nạp MinIO"
    TMP=$(mktemp -d)
    # --force-local: tar thấy "C:/..." trên Windows và hiểu là host từ xa.
    tar --force-local -xzf "$MINIO_FILE" -C "$TMP"

    # Archive có hai dạng: ./aptis-content/... (một bucket) hoặc ./<bucket>/...
    # cho nhiều bucket. Lặp thư mục con nên xử lý được cả hai.
    docker run --rm -v "$TMP":/in --entrypoint sh minio/mc:latest -c "
        mc alias set r http://$HOST:$MINIO_PORT '$MINIO_ACCESS_KEY' '$MINIO_SECRET_KEY' >/dev/null 2>&1
        for D in /in/*/; do
            B=\$(basename \"\$D\")
            mc mb --ignore-existing r/\$B >/dev/null 2>&1 || true
            mc mirror --quiet \"\$D\" r/\$B >/dev/null 2>&1 || true
        done" </dev/null 2>/dev/null
    rm -rf "$TMP"
    echo "    xong"
fi

echo ""
echo "==> Đã nạp $SRC lên $HOST"
echo "!!  ĐÓNG NGAY các cổng 3306 / 27017 / 9000 trên $HOST"
