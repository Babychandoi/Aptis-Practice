#!/usr/bin/env bash
# Kiểm tra cấu hình gửi email mà không phải đăng ký tài khoản thật.
#
#   bash scripts/test-mail.sh                    # gửi tới chính MAIL_USERNAME
#   bash scripts/test-mail.sh ai-do@gmail.com    # gửi tới địa chỉ khác
#
# Script đọc .env, gửi thư qua đúng cấu hình backend đang dùng, rồi in kết quả.
set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1

if [ ! -f .env ]; then
  echo "Không thấy .env — chép từ mẫu: cp .env.example .env"
  exit 1
fi

# Chỉ đọc dòng KEY=VALUE, bỏ comment và dòng trống
set -a
# shellcheck disable=SC1091
. ./.env
set +a

HOST="${MAIL_HOST:-}"
PORT="${MAIL_PORT:-}"
USER="${MAIL_USERNAME:-}"
PASSWD="${MAIL_PASSWORD:-}"
FROM="${MAIL_FROM:-$USER}"
TO="${1:-$USER}"

echo "Cấu hình đang dùng:"
echo "  host     : $HOST:$PORT"
echo "  username : $USER"
# Không in mật khẩu, chỉ xác nhận đã điền và đúng độ dài
if [ -z "$PASSWD" ]; then
  echo "  password : (TRỐNG)"
  echo
  echo "Chưa điền MAIL_PASSWORD trong .env."
  echo "Lấy App Password tại https://myaccount.google.com/apppasswords"
  echo "(phải bật xác minh 2 bước trước), dán vào .env, xóa hết khoảng trắng."
  exit 1
fi
CLEAN=${PASSWD// /}
echo "  password : đã điền, ${#CLEAN} ký tự"
echo "  gửi tới  : $TO"
echo

if [ "${#CLEAN}" -ne 16 ] && [[ "$HOST" == *gmail* ]]; then
  echo "CẢNH BÁO: App Password của Google dài đúng 16 ký tự, giá trị hiện tại"
  echo "có ${#CLEAN}. Nếu bạn đang dán mật khẩu đăng nhập Gmail thì sẽ bị từ chối."
  echo
fi

echo "Đang gửi..."
python - "$HOST" "$PORT" "$USER" "$CLEAN" "$FROM" "$TO" <<'PYEOF'
import sys, smtplib, ssl
from email.message import EmailMessage

host, port, user, password, sender, to = sys.argv[1:7]

msg = EmailMessage()
msg["Subject"] = "Aptis Practice - kiem tra cau hinh email"
msg["From"] = sender
msg["To"] = to
msg.set_content(
    "Thu nay duoc gui tu script scripts/test-mail.sh.\n"
    "Neu ban doc duoc thu nay thi cau hinh SMTP da chay dung.\n"
)

try:
    with smtplib.SMTP(host, int(port), timeout=20) as smtp:
        smtp.ehlo()
        smtp.starttls(context=ssl.create_default_context())
        smtp.ehlo()
        smtp.login(user, password)
        smtp.send_message(msg)
    print("THANH CONG — kiem tra hop thu", to)

except smtplib.SMTPAuthenticationError as ex:
    print("LOI XAC THUC:", ex.smtp_code, ex.smtp_error.decode(errors="replace"))
    print()
    print("Thuong do mot trong ba nguyen nhan:")
    print("  1. Dung mat khau dang nhap Gmail thay vi App Password")
    print("  2. Chua bat xac minh 2 buoc cho tai khoan")
    print("  3. App Password da bi thu hoi — tao lai cai moi")
    raise SystemExit(1)

except (smtplib.SMTPConnectError, OSError) as ex:
    print("KHONG KET NOI DUOC:", ex)
    print()
    print("Kiem tra: mang co chan cong 587 khong, host/port trong .env dung chua.")
    raise SystemExit(1)

except Exception as ex:
    print("LOI:", type(ex).__name__, ex)
    raise SystemExit(1)
PYEOF
