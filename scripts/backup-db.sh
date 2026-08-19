#!/usr/bin/env bash
#
# Backup toàn bộ dữ liệu: MySQL + MongoDB + MinIO.
#
# Chạy được cả trên Windows (Git Bash) và Linux — cùng một script, vì mọi lệnh
# đều đi qua `docker compose exec` nên không phụ thuộc hệ điều hành host.
#
#   ./scripts/backup-db.sh                      # ra ../Aptis-Practise-Backups
#   ./scripts/backup-db.sh /mnt/backup          # chỉ định nơi lưu
#   SKIP_MINIO=1 ./scripts/backup-db.sh         # bỏ MinIO (363M) cho backup nhanh
#   KEEP=7 ./scripts/backup-db.sh               # giữ tổng 7 bản gần nhất (kể cả bản vừa tạo)
#
# Trên cloud Linux nên cho cron gọi script này, ví dụ 2 giờ sáng mỗi ngày:
#   0 2 * * * cd /srv/aptis && KEEP=7 ./scripts/backup-db.sh /mnt/backup >> /var/log/aptis-backup.log 2>&1
#
set -euo pipefail

# MSYS_NO_PATHCONV: trên Git Bash Windows, đường dẫn kiểu /tmp/x bị dịch thành
# C:/Users/.../tmp/x TRƯỚC khi vào container, nên mongorestore/mongodump báo
# "no such file". Trên Linux biến này vô hại.
export MSYS_NO_PATHCONV=1

cd "$(dirname "$0")/.."
PROJECT_DIR=$(pwd)

DEST_ROOT=${1:-"$PROJECT_DIR/../Aptis-Practise-Backups"}
KEEP=${KEEP:-0}
SKIP_MINIO=${SKIP_MINIO:-0}

# Đọc mật khẩu từ .env nếu có; giá trị mặc định khớp docker-compose.yml.
if [ -f .env ]; then
    set +u
    # shellcheck disable=SC1091
    . ./.env 2>/dev/null || true
    set -u
fi
MYSQL_USER=${MYSQL_USER:-aptis}
MYSQL_PASSWORD=${MYSQL_PASSWORD:-aptis}
MYSQL_DB=${MYSQL_DB:-aptis}
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:-minioadmin}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-minioadmin}

dc() { docker compose "$@"; }

# Mốc thời gian lấy từ container để mọi bản backup cùng một múi giờ (UTC), kể cả
# khi host Windows và host Linux đặt giờ khác nhau.
TS=$(dc exec -T mysql date -u +%Y%m%d-%H%M%S | tr -d '\r')
OUT="$DEST_ROOT/db-$TS"
mkdir -p "$OUT"

echo "==> Backup vào $OUT"

# ---------------------------------------------------------------- MySQL
# --default-character-set=utf8mb4 là BẮT BUỘC: thiếu nó, client mặc định latin1
# và toàn bộ tiếng Việt trong dump thành ký tự rác.
echo "--> MySQL"
dc exec -T mysql mysqldump \
    --default-character-set=utf8mb4 \
    --no-tablespaces --single-transaction --routines --triggers --events \
    -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --databases "$MYSQL_DB" \
    > "$OUT/mysql-$MYSQL_DB.sql" 2>/dev/null

MYSQL_TABLES=$(grep -c "^CREATE TABLE" "$OUT/mysql-$MYSQL_DB.sql" || true)
# ORDER BY installed_rank, KHÔNG dùng MAX(version): version là chuỗi nên
# MAX() trả "9" thay vì "30".
FLYWAY=$(dc exec -T mysql mysql -N -B -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DB" \
    -e "SELECT version FROM flyway_schema_history WHERE success=1 ORDER BY installed_rank DESC LIMIT 1" \
    2>/dev/null | tr -d '\r' || echo "?")
echo "    $MYSQL_TABLES bảng, Flyway v$FLYWAY"

# Dump rỗng hoặc thiếu CREATE TABLE là backup vô dụng — dừng ngay thay vì báo thành công.
if [ "${MYSQL_TABLES:-0}" -lt 1 ]; then
    echo "LỖI: dump MySQL không có bảng nào. Backup không dùng được." >&2
    exit 1
fi

# ---------------------------------------------------------------- MongoDB
echo "--> MongoDB"
dc exec -T mongo mongodump --quiet --archive --gzip -d "$MYSQL_DB" \
    > "$OUT/mongo-$MYSQL_DB.archive.gz" 2>/dev/null

MONGO_BYTES=$(wc -c < "$OUT/mongo-$MYSQL_DB.archive.gz" | tr -d ' ')
echo "    $MONGO_BYTES byte"
if [ "$MONGO_BYTES" -lt 1000 ]; then
    echo "LỖI: archive MongoDB quá nhỏ, gần như chắc chắn rỗng." >&2
    exit 1
fi

# Kiểm chứng thật: restore vào database tạm rồi xoá. Backup không restore được
# thì không phải backup, và chỉ biết điều đó vào lúc cần dùng là quá muộn.
echo "--> Kiểm chứng MongoDB (restore thử)"
dc exec -T mongo sh -c 'cat > /tmp/verify.gz' < "$OUT/mongo-$MYSQL_DB.archive.gz"
RESTORED=$(dc exec -T mongo mongorestore --archive=/tmp/verify.gz --gzip \
    --nsFrom="$MYSQL_DB.*" --nsTo="backup_verify.*" --drop 2>&1 \
    | grep -oE "[0-9]+ document\(s\) restored" | grep -oE "^[0-9]+" || echo 0)
dc exec -T mongo mongosh --quiet --eval 'db.getSiblingDB("backup_verify").dropDatabase()' >/dev/null 2>&1
dc exec -T mongo rm -f /tmp/verify.gz >/dev/null 2>&1
echo "    restore được $RESTORED document"

# ---------------------------------------------------------------- MinIO
MINIO_NOTE="bỏ qua (SKIP_MINIO=1)"
if [ "$SKIP_MINIO" != "1" ]; then
    echo "--> MinIO"
    NET=$(docker network ls --format '{{.Name}}' | grep -E "aptis.*default" | head -1)
    if [ -z "$NET" ]; then
        echo "    CẢNH BÁO: không tìm được docker network của aptis, bỏ qua MinIO" >&2
        MINIO_NOTE="THIẾU — không tìm được docker network"
    else
        # Liet ke bucket bang danh sach co dinh, khong parse `mc ls`: image
        # minio/mc khong co sed/awk/grep, va cot cua `mc ls` tung doi giua cac
        # ban khien cut lay sai truong roi backup ra archive rong ma van bao OK.
        # Danh sach nay khop aptis.minio.buckets trong application.yml.
        BUCKETS=${BUCKETS:-"aptis-public aptis-content aptis-user-recordings aptis-user-uploads aptis-imports aptis-exports"}

        mkdir -p "$OUT/minio-tmp"
        docker run --rm --network "$NET" -v "$OUT/minio-tmp":/out \
            --entrypoint sh minio/mc:latest -c "
                mc alias set m http://minio:9000 '$MINIO_ACCESS_KEY' '$MINIO_SECRET_KEY' >/dev/null 2>&1
                for B in $BUCKETS; do
                    mc mirror --quiet m/\$B /out/\$B >/dev/null 2>&1 || true
                done" </dev/null 2>/dev/null

        # Chỉ nén nếu thật sự có file — tránh tạo archive rỗng rồi báo thành công.
        if [ -n "$(ls -A "$OUT/minio-tmp" 2>/dev/null)" ]; then
            tar --force-local -czf "$OUT/minio.tar.gz" -C "$OUT/minio-tmp" .
            MINIO_FILES=$(tar --force-local -tzf "$OUT/minio.tar.gz" | grep -vE '/$' | wc -l | tr -d ' ')
            MINIO_SIZE=$(du -h "$OUT/minio.tar.gz" | cut -f1)
            MINIO_NOTE="$MINIO_FILES file, $MINIO_SIZE"
            echo "    $MINIO_NOTE"
        else
            MINIO_NOTE="không có object nào"
            echo "    $MINIO_NOTE"
        fi
        rm -rf "$OUT/minio-tmp"
    fi
fi

# ---------------------------------------------------------------- Manifest
cat > "$OUT/MANIFEST.md" <<EOF
# Backup $TS (UTC)

| Thành phần | Nội dung |
|---|---|
| \`mysql-$MYSQL_DB.sql\` | $MYSQL_TABLES bảng, Flyway v$FLYWAY |
| \`mongo-$MYSQL_DB.archive.gz\` | restore thử được $RESTORED document |
| \`minio.tar.gz\` | $MINIO_NOTE |

Tạo bởi \`scripts/backup-db.sh\`.

## Phục hồi

\`\`\`bash
export MSYS_NO_PATHCONV=1   # chỉ cần trên Git Bash Windows

docker compose exec -T mysql mysql --default-character-set=utf8mb4 \
    -u$MYSQL_USER -p'$MYSQL_PASSWORD' < mysql-$MYSQL_DB.sql

docker compose exec -T mongo sh -c 'cat > /tmp/r.gz' < mongo-$MYSQL_DB.archive.gz
docker compose exec -T mongo mongorestore --archive=/tmp/r.gz --gzip --drop

mkdir -p minio-restore && tar --force-local -xzf minio.tar.gz -C minio-restore
NET=\$(docker network ls --format '{{.Name}}' | grep -E 'aptis.*default' | head -1)
docker run --rm --network "\$NET" -v "\$PWD/minio-restore":/in \
    --entrypoint sh minio/mc:latest -c \
    'mc alias set m http://minio:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY && \
     for B in /in/*; do mc mirror --quiet "\$B" "m/\$(basename \$B)"; done'
\`\`\`
EOF

# ---------------------------------------------------------------- Dọn bản cũ
if [ "$KEEP" -gt 0 ]; then
    # Chỉ xoá thư mục có MANIFEST.md — bản backup dở dang hoặc thư mục lạ thì để yên.
    mapfile -t OLD < <(find "$DEST_ROOT" -maxdepth 1 -type d -name 'db-*' | sort -r | tail -n +$((KEEP + 1)))
    for d in "${OLD[@]:-}"; do
        [ -n "$d" ] && [ -f "$d/MANIFEST.md" ] && rm -rf "$d" && echo "    đã xoá bản cũ $(basename "$d")"
    done
fi

echo "==> Xong: $OUT ($(du -sh "$OUT" | cut -f1))"
