#!/usr/bin/env bash
# Chạy bộ kiểm chứng end-to-end với cấu hình phù hợp, rồi khôi phục nguyên trạng.
#
#   bash scripts/run-e2e.sh              # chạy cả 4 bộ
#   bash scripts/run-e2e.sh e2e-smoke    # chạy một bộ
#
# Script tự lo phần hạ tầng cho test:
#   - Bật Mailpit (bộ test đọc token xác thực từ thư; token chỉ lưu hash
#     trong DB nên không lấy ngược ra được)
#   - Trỏ backend về Mailpit để thư không bay ra Gmail thật
#   - Bật các cờ mà một số phần cần (khóa phân tán, hoàn tiền bất đồng bộ,
#     chu kỳ dọn file ngắn)
#   - Chạy xong khôi phục lại cấu hình trong .env
#
# CHỈ dùng cho môi trường phát triển — bộ test ghi và xóa dữ liệu giao dịch.
set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1

SUITES=("e2e-smoke" "e2e-admin-mock-ai" "e2e-platform" "e2e-content-types")
[ $# -gt 0 ] && SUITES=("$@")

wait_healthy() {
  for _ in $(seq 1 45); do
    case "$(docker inspect --format='{{.State.Health.Status}}' aptis-backend 2>/dev/null)" in
      healthy) return 0 ;;
      unhealthy) echo "  backend UNHEALTHY"; return 1 ;;
    esac
    sleep 8
  done
  echo "  backend khong len sau 6 phut"
  return 1
}

restore() {
  echo
  echo "== Khoi phuc cau hinh tu .env =="
  docker compose up -d backend >/dev/null 2>&1
  wait_healthy >/dev/null && echo "  backend da tro lai SMTP that" \
    || echo "  CANH BAO: backend chua len, kiem tra bang docker compose logs backend"

  # Tắt Mailpit để không còn container thừa gây nhầm lẫn xem thư ở đâu
  docker compose stop mailpit >/dev/null 2>&1
  echo "  mailpit da tat"
}
# Khôi phục cả khi bị Ctrl+C giữa chừng, nếu không backend kẹt ở cấu hình test
trap restore EXIT

echo "== Chuan bi moi truong test =="
docker compose --profile test up -d mailpit >/dev/null 2>&1
echo "  mailpit da bat (http://localhost:8025)"

MAIL_HOST=mailpit MAIL_PORT=1025 MAIL_USERNAME= MAIL_PASSWORD= \
MAIL_SMTP_AUTH=false MAIL_SMTP_STARTTLS=false \
SCHEDULER_LOCK=true SANDBOX_ASYNC_REFUND=true \
EXPORT_PURGE_INTERVAL=PT20S EXPORT_PURGE_INITIAL_DELAY=PT10S \
  docker compose up -d backend >/dev/null 2>&1

wait_healthy || exit 1
echo "  backend da tro ve mailpit, bat day du co test"
echo

total_pass=0
total_fail=0
for suite in "${SUITES[@]}"; do
  printf '%-24s ' "$suite"
  result=$(bash "scripts/${suite}.sh" 2>&1 | tail -2 | grep -E "PASS=")
  if [ -z "$result" ]; then
    echo "KHONG CHAY DUOC"
    total_fail=$((total_fail + 1))
    continue
  fi
  echo "$result"
  total_pass=$((total_pass + $(echo "$result" | sed -n 's/.*PASS=\([0-9]*\).*/\1/p')))
  total_fail=$((total_fail + $(echo "$result" | sed -n 's/.*FAIL=\([0-9]*\).*/\1/p')))
done

echo "-----------------------------------------"
printf 'TONG: PASS=%d  FAIL=%d\n' "$total_pass" "$total_fail"

[ "$total_fail" -eq 0 ]
