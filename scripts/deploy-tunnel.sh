#!/usr/bin/env bash
#
# Điền cấu hình domain vào .env rồi bật hệ thống sau Cloudflare Tunnel.
#
# Chạy sau khi đã tạo tunnel + hai public hostname trên dashboard Cloudflare
# (xem docs/DEPLOY-CLOUDFLARE.md — phải là tài khoản chứa aptispractices.io.vn).
#
#   TUNNEL_TOKEN='<token tu dashboard>' ./scripts/deploy-tunnel.sh
#
# Đổi domain khác:
#   DOMAIN=example.com TUNNEL_TOKEN='...' ./scripts/deploy-tunnel.sh
#
# Script tự sinh JWT_SECRET mới nếu .env còn dùng chuỗi dev mặc định — chuỗi đó
# nằm công khai trong docker-compose.yml nên ai đọc repo cũng ký được token admin.
#
# Chạy lại được nhiều lần: mỗi khoá chỉ thay giá trị, không thêm dòng trùng.
set -euo pipefail
export MSYS_NO_PATHCONV=1

cd "$(dirname "$0")/.."

DOMAIN=${DOMAIN:-aptispractices.io.vn}
CDN_HOST=${CDN_HOST:-cdn.$DOMAIN}
TUNNEL_TOKEN=${TUNNEL_TOKEN:-${CLOUDFLARE_TUNNEL_TOKEN:-}}

DEV_JWT=ZGV2LW9ubHktc2VjcmV0LWRvLW5vdC11c2UtaW4tcHJvZHVjdGlvbi0xMjM0NTY3ODkw

if [ -z "$TUNNEL_TOKEN" ]; then
    echo "LỖI: chưa có TUNNEL_TOKEN." >&2
    echo "" >&2
    echo "Lấy token: Zero Trust → Networks → Tunnels → tunnel của bạn →" >&2
    echo "Configure, copy chuỗi sau '--token' trong lệnh cài đặt." >&2
    echo "" >&2
    echo "  TUNNEL_TOKEN='eyJ...' ./scripts/deploy-tunnel.sh" >&2
    exit 1
fi

if [ ! -f .env ]; then
    echo "LỖI: không thấy .env. Tạo từ mẫu: cp .env.example .env" >&2
    exit 1
fi

# Sửa .env qua file tạm rồi mv: ghi trực tiếp mà máy tắt giữa chừng là mất sạch
# cấu hình, kèm cả mật khẩu SMTP và khoá AI không có ở đâu khác.
BACKUP=".env.bak-$(date -u +%Y%m%d-%H%M%S)"
cp .env "$BACKUP"
echo "==> Đã lưu bản cũ: $BACKUP"

# Đặt một khoá về đúng giá trị: thay tại chỗ nếu đã có, thêm vào cuối nếu chưa.
# Giá trị đi qua biến môi trường chứ không nội suy vào chuỗi awk, để token có
# ký tự lạ (/, &, dấu nháy) không làm hỏng cú pháp.
set_env() {
    local key=$1 val=$2
    if grep -q "^$key=" .env; then
        KEY="$key" VAL="$val" awk '
            BEGIN { k = ENVIRON["KEY"]; v = ENVIRON["VAL"] }
            index($0, k "=") == 1 { print k "=" v; done = 1; next }
            { print }
        ' .env > .env.tmp
    else
        cp .env .env.tmp
        printf '%s=%s\n' "$key" "$val" >> .env.tmp
    fi
    mv .env.tmp .env
}

echo "==> Cấu hình domain $DOMAIN"
set_env CLOUDFLARE_TUNNEL_TOKEN "$TUNNEL_TOKEN"
set_env PUBLIC_ORIGIN "https://$DOMAIN"
set_env MINIO_PUBLIC_ORIGIN "https://$CDN_HOST"

# JWT_SECRET dev nằm trong repo — phải đổi trước khi mở ra Internet.
CURRENT_JWT=$(awk -F= '/^JWT_SECRET=/{print $2; exit}' .env)
if [ -z "$CURRENT_JWT" ] || [ "$CURRENT_JWT" = "$DEV_JWT" ]; then
    NEW_JWT=$(docker run --rm alpine:3 sh -c "head -c 48 /dev/urandom | base64 -w0")
    set_env JWT_SECRET "$NEW_JWT"
    echo "==> JWT_SECRET: đã thay chuỗi dev bằng khoá mới 384 bit"
    echo "    (mọi phiên đăng nhập hiện tại sẽ hết hiệu lực — đăng nhập lại là xong)"
else
    echo "==> JWT_SECRET: đã là khoá riêng, giữ nguyên"
fi

# nginx.conf có thể đã đổi (X-Forwarded-Proto) nên build lại, không chỉ restart.
echo "==> Build lại frontend"
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml build frontend

echo "==> Khởi động toàn bộ kèm tunnel"
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d

echo "==> Chờ tunnel kết nối"
for i in $(seq 1 30); do
    if docker logs aptis-cloudflared 2>&1 | grep -q "Registered tunnel connection"; then
        echo "    tunnel đã kết nối"
        break
    fi
    if docker logs aptis-cloudflared 2>&1 | grep -qiE "invalid tunnel|401|Unauthorized|failed to parse token"; then
        echo "LỖI: token không hợp lệ. Log:" >&2
        docker logs aptis-cloudflared 2>&1 | tail -10 >&2
        exit 1
    fi
    sleep 3
done

echo ""
echo "==> Kiểm chứng"
printf '    %-34s ' "https://$DOMAIN"
curl -s -o /dev/null -w "HTTP %{http_code}\n" --max-time 20 "https://$DOMAIN" || echo "chưa tới được"
printf '    %-34s ' "https://$DOMAIN/api/v1/catalog/parts"
curl -s --max-time 20 "https://$DOMAIN/api/v1/catalog/parts" | head -c 80 || true
echo ""
echo ""
echo "Còn một việc phải tự kiểm bằng mắt: đăng nhập, mở một bài Listening và bấm"
echo "play. Đó là đường duy nhất chạm vào presigned URL, nên nó xác nhận"
echo "MINIO_PUBLIC_ORIGIN đúng. Audio không chạy thì mở DevTools → Network xem"
echo "link asset đang trỏ host nào."
