#!/usr/bin/env bash
#
# Deploy code mới lên production. Dùng hằng ngày, khác với deploy-tunnel.sh —
# script kia để dựng lại hạ tầng từ đầu (cần TUNNEL_TOKEN, ghi đè .env).
#
#   ./scripts/deploy-prod.sh              # build + đẩy backend và frontend
#   ./scripts/deploy-prod.sh backend      # chỉ một dịch vụ
#   ./scripts/deploy-prod.sh --no-build   # chỉ nạp lại cấu hình, không build
#   SKIP_IDLE_CHECK=1 ./scripts/deploy-prod.sh   # bỏ qua kiểm tra vắng người
#
# Vì sao có script này: gõ tay `docker compose up -d backend` là cái bẫy — thiếu
# `-f docker-compose.tunnel.yml` thì backend im lặng rơi về giá trị localhost
# trong docker-compose.yml. Không có lỗi nào hiện ra, nhưng presigned URL trỏ về
# máy người dùng nên mọi thao tác tải file lên/nghe lại đều chết. Đã xảy ra hai
# lần (dev 08/2026, prod 18/09/2026 hỏng ghi âm Speaking suốt 28 tiếng).
#
# Nên script ghim cứng cả hai file compose, và kiểm lại biến sau khi khởi động
# thay vì tin là nó đúng.
set -euo pipefail
export MSYS_NO_PATHCONV=1

cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.tunnel.yml)

BUILD=1
SERVICES=()
for arg in "$@"; do
    case "$arg" in
        --no-build) BUILD=0 ;;
        -*) echo "LỖI: không hiểu tham số $arg" >&2; exit 1 ;;
        *) SERVICES+=("$arg") ;;
    esac
done
[ ${#SERVICES[@]} -eq 0 ] && SERVICES=(backend frontend)

if [ ! -f .env ]; then
    echo "LỖI: không thấy .env." >&2
    exit 1
fi

# Biến bắt buộc phải có trong .env. Thiếu thì docker-compose.tunnel.yml sẽ báo
# lỗi `:?` và dừng, nhưng báo ở đây rõ hơn và chưa động vào container nào.
for key in PUBLIC_ORIGIN MINIO_PUBLIC_ORIGIN; do
    if ! grep -q "^$key=" .env; then
        echo "LỖI: .env thiếu $key — cần cho cấu hình sau tunnel." >&2
        exit 1
    fi
done

PUBLIC_ORIGIN=$(awk -F= '/^PUBLIC_ORIGIN=/{print $2; exit}' .env)
MINIO_PUBLIC_ORIGIN=$(awk -F= '/^MINIO_PUBLIC_ORIGIN=/{print $2; exit}' .env)

# ---------------------------------------------------------------------------
# Vắng người mới deploy: restart backend làm đứt bài đang làm dở.
# IP admin không tính — đó là máy người vận hành, luôn online khi deploy.
# ---------------------------------------------------------------------------
ADMIN_IP=${ADMIN_IP:-118.68.96.251}

if [ "${SKIP_IDLE_CHECK:-0}" != "1" ]; then
    echo "==> Kiểm tra có ai đang dùng không"
    BUSY=$(docker exec aptis-mysql mysql -uroot -proot aptis -N -e "
        SELECT
          (SELECT COUNT(*) FROM test_attempts
            WHERE status='IN_PROGRESS' AND updated_at > NOW() - INTERVAL 20 MINUTE),
          (SELECT COUNT(DISTINCT user_id) FROM test_attempts
            WHERE updated_at > NOW() - INTERVAL 15 MINUTE),
          (SELECT COUNT(*) FROM refresh_tokens
            WHERE created_at > NOW() - INTERVAL 15 MINUTE AND ip_address <> '$ADMIN_IP');
    " 2>/dev/null | tr '\t' ' ')

    read -r DANG_LAM HOAT_DONG DANG_NHAP <<< "$BUSY"
    echo "    đang làm bài: $DANG_LAM | hoạt động 15p: $HOAT_DONG | đăng nhập 15p: $DANG_NHAP"

    # Đăng nhập tính riêng: người vừa vào hệ thống chưa sinh bản ghi test_attempts
    # nào, nhìn mỗi bảng đó sẽ tưởng vắng trong khi họ đang thao tác.
    if [ "$DANG_LAM" != "0" ] || [ "$HOAT_DONG" != "0" ] || [ "$DANG_NHAP" != "0" ]; then
        echo "" >&2
        echo "DỪNG: đang có người dùng hệ thống." >&2
        echo "Chờ lúc vắng, hoặc chạy lại với SKIP_IDLE_CHECK=1 nếu lỗi gấp." >&2
        exit 2
    fi
    echo "    không có ai — tiếp tục"
fi

if [ "$BUILD" = "1" ]; then
    echo "==> Build ${SERVICES[*]}"
    "${COMPOSE[@]}" build "${SERVICES[@]}"
fi

echo "==> Khởi động ${SERVICES[*]}"
"${COMPOSE[@]}" up -d "${SERVICES[@]}"

# ---------------------------------------------------------------------------
# Kiểm lại biến thật trong container. Đây là phần quan trọng nhất của script:
# sai cấu hình kiểu này không làm container chết, không ghi log lỗi, chỉ lặng lẽ
# hỏng tính năng cho tới khi có người báo.
# ---------------------------------------------------------------------------
if printf '%s\n' "${SERVICES[@]}" | grep -qx backend; then
    echo "==> Chờ backend sẵn sàng"
    for _ in $(seq 1 120); do
        [ "$(docker inspect -f '{{.State.Health.Status}}' aptis-backend)" = "healthy" ] && break
        sleep 5
    done

    TRANG_THAI=$(docker inspect -f '{{.State.Health.Status}}' aptis-backend)
    echo "    trạng thái: $TRANG_THAI"
    if [ "$TRANG_THAI" != "healthy" ]; then
        echo "LỖI: backend không healthy. Log:" >&2
        docker logs --tail 30 aptis-backend >&2
        exit 1
    fi

    echo "==> Kiểm biến môi trường"
    LOI=0
    kiem() {
        local key=$1 mong_doi=$2
        local thuc_te
        thuc_te=$(docker exec aptis-backend printenv "$key" 2>/dev/null || echo '<trống>')
        if [ "$thuc_te" = "$mong_doi" ]; then
            printf '    OK   %-24s %s\n' "$key" "$thuc_te"
        else
            printf '    SAI  %-24s %s (cần: %s)\n' "$key" "$thuc_te" "$mong_doi" >&2
            LOI=1
        fi
    }
    kiem MINIO_PUBLIC_ENDPOINT "$MINIO_PUBLIC_ORIGIN"
    kiem CORS_ORIGINS "$PUBLIC_ORIGIN"
    kiem REFRESH_COOKIE_SECURE true

    if [ "$LOI" = "1" ]; then
        echo "" >&2
        echo "LỖI: biến sai — gần như chắc chắn thiếu docker-compose.tunnel.yml." >&2
        echo "Ghi âm và phát lại audio sẽ hỏng. Chạy lại script này để sửa." >&2
        exit 1
    fi
fi

echo "==> Kiểm chứng từ ngoài"
printf '    %-38s ' "$PUBLIC_ORIGIN"
curl -s -o /dev/null -w "HTTP %{http_code}\n" --max-time 20 "$PUBLIC_ORIGIN" || echo "không tới được"
# 403 là đúng: MinIO từ chối request không chữ ký, chứng tỏ nó sống và ra được Internet.
printf '    %-38s ' "$MINIO_PUBLIC_ORIGIN"
curl -s -o /dev/null -w "HTTP %{http_code}\n" --max-time 20 "$MINIO_PUBLIC_ORIGIN" || echo "không tới được"

echo ""
echo "Xong. Còn một việc phải tự kiểm bằng mắt: ghi âm thử một câu Speaking."
echo "Đó là đường duy nhất đi qua presigned URL tải lên."
