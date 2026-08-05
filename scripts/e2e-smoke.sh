#!/usr/bin/env bash
# Kiểm chứng end-to-end luồng nghiệp vụ cốt lõi trên hệ thống đang chạy.
#
# Chạy: bash scripts/e2e-smoke.sh
#
# Script tự dọn dữ liệu giao dịch ở đầu mỗi lần chạy nên chạy lại được nhiều
# lần, và không phụ thuộc thứ tự với scripts/e2e-admin-mock-ai.sh.
#
# CHỈ dùng cho môi trường phát triển — nó XÓA dữ liệu giao dịch.
set -uo pipefail

API=http://localhost:8080/api/v1
WEB=http://localhost
EMAIL="e2e@test.local"
PASS="MatKhau12345"
PLAN=18000000-0000-4000-8000-000000000001
PART=16000000-0000-4000-8000-000000000001
QS_FREE=aa000000-0000-4000-8000-000000000001

pass=0; fail=0
check() {
  if [ "$2" = "$3" ]; then printf '  OK   %-52s %s\n' "$1" "$2"; pass=$((pass+1))
  else printf '  FAIL %-52s got=%s want=%s\n' "$1" "$2" "$3"; fail=$((fail+1)); fi
}
jq_() { python -c "
import sys, json
try: d = json.load(sys.stdin)
except Exception: print('PARSE_ERROR'); raise SystemExit
k = sys.argv[1]
for part in k.split('.'):
    if part.isdigit(): d = d[int(part)]
    else: d = d.get(part) if isinstance(d, dict) else None
    if d is None: break
print(d if d is not None else 'null')
" "$1"; }

# Dọn dữ liệu giao dịch để script chạy lại được và không phụ thuộc bộ test khác.
# Giữ nguyên seed data (role, gói, blueprint, ngân hàng câu hỏi).
#
# KHÔNG dùng TRUNCATE cho bảng users: nó xóa sạch mọi tài khoản, kể cả tài
# khoản thật do người dùng tự đăng ký trên máy dev. Chỉ xóa đúng tài khoản của
# script này.
echo "== 0. Dat lai du lieu giao dich =="
docker exec aptis-mysql mysql -uaptis -paptis aptis -e "
SET FOREIGN_KEY_CHECKS=0;
TRUNCATE TABLE payment_webhook_events;
TRUNCATE TABLE outbox_events;
UPDATE promotion_codes SET total_used_count = 0, status = 'ACTIVE';
SET FOREIGN_KEY_CHECKS=1;" 2>/dev/null

# Dữ liệu gắn với người dùng chỉ xóa của hai tài khoản trên. TRUNCATE cả bảng
# sẽ cuốn theo entitlement, đơn hàng và lịch sử làm bài của tài khoản thật.
docker exec aptis-mysql mysql -uaptis -paptis aptis -e "
SET FOREIGN_KEY_CHECKS=0;
DELETE es FROM evaluation_summaries es JOIN test_attempts ta ON ta.id = es.attempt_id
  JOIN users u ON u.id = ta.user_id WHERE u.email IN ('$EMAIL', 'editor-e2e@test.local');
DELETE ej FROM evaluation_jobs ej JOIN test_attempts ta ON ta.id = ej.attempt_id
  JOIN users u ON u.id = ta.user_id WHERE u.email IN ('$EMAIL', 'editor-e2e@test.local');
DELETE aps FROM attempt_part_scores aps JOIN test_attempts ta ON ta.id = aps.attempt_id
  JOIN users u ON u.id = ta.user_id WHERE u.email IN ('$EMAIL', 'editor-e2e@test.local');
DELETE acs FROM attempt_component_scores acs JOIN test_attempts ta ON ta.id = acs.attempt_id
  JOIN users u ON u.id = ta.user_id WHERE u.email IN ('$EMAIL', 'editor-e2e@test.local');
DELETE aqs FROM attempt_question_sets aqs JOIN test_attempts ta ON ta.id = aqs.attempt_id
  JOIN users u ON u.id = ta.user_id WHERE u.email IN ('$EMAIL', 'editor-e2e@test.local');
DELETE ta FROM test_attempts ta JOIN users u ON u.id = ta.user_id
  WHERE u.email IN ('$EMAIL', 'editor-e2e@test.local');
DELETE uqs FROM user_question_stats uqs JOIN users u ON u.id = uqs.user_id
  WHERE u.email IN ('$EMAIL', 'editor-e2e@test.local');
DELETE ue FROM user_entitlements ue JOIN users u ON u.id = ue.user_id
  WHERE u.email IN ('$EMAIL', 'editor-e2e@test.local');
DELETE us FROM user_subscriptions us JOIN users u ON u.id = us.user_id
  WHERE u.email IN ('$EMAIL', 'editor-e2e@test.local');
DELETE pt FROM payment_transactions pt JOIN orders o ON o.id = pt.order_id
  JOIN users u ON u.id = o.user_id WHERE u.email IN ('$EMAIL', 'editor-e2e@test.local');
DELETE pr FROM promotion_redemptions pr JOIN users u ON u.id = pr.user_id
  WHERE u.email IN ('$EMAIL', 'editor-e2e@test.local');
DELETE oi FROM order_items oi JOIN orders o ON o.id = oi.order_id
  JOIN users u ON u.id = o.user_id WHERE u.email IN ('$EMAIL', 'editor-e2e@test.local');
DELETE o FROM orders o JOIN users u ON u.id = o.user_id
  WHERE u.email IN ('$EMAIL', 'editor-e2e@test.local');
DELETE rt FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
  WHERE u.email IN ('$EMAIL', 'editor-e2e@test.local');
DELETE evt FROM email_verification_tokens evt JOIN users u ON u.id = evt.user_id
  WHERE u.email IN ('$EMAIL', 'editor-e2e@test.local');
DELETE prt FROM password_reset_tokens prt JOIN users u ON u.id = prt.user_id
  WHERE u.email IN ('$EMAIL', 'editor-e2e@test.local');
DELETE ur FROM user_roles ur JOIN users u ON u.id = ur.user_id
  WHERE u.email IN ('$EMAIL', 'editor-e2e@test.local');
DELETE up FROM user_profiles up JOIN users u ON u.id = up.user_id
  WHERE u.email IN ('$EMAIL', 'editor-e2e@test.local');
DELETE FROM users WHERE email IN ('$EMAIL', 'editor-e2e@test.local');
SET FOREIGN_KEY_CHECKS=1;" 2>/dev/null
docker exec aptis-mongo mongosh aptis --quiet --eval \
  'db.attempt_documents.deleteMany({}); db.evaluation_documents.deleteMany({})' >/dev/null 2>&1
echo "  da dat lai"

echo "== 1. Ha tang =="
check "nginx healthz" "$(curl -s $WEB/healthz)" "ok"
check "backend health" "$(curl -s $API/../../actuator/health | jq_ status)" "UP"
check "SPA fallback route" "$(curl -s -o /dev/null -w '%{http_code}' $WEB/history)" "200"
check "API qua nginx proxy" "$(curl -s $WEB/api/v1/plans | jq_ 0.code)" "PREMIUM_30"

echo "== 2. Dang ky & xac thuc email =="
check "register" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/register \
  -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"fullName\":\"E2E User\"}")" "202"
check "register trung email" "$(curl -s -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | jq_ code)" "EMAIL_ALREADY_USED"
check "login truoc xac thuc" "$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | jq_ code)" "EMAIL_NOT_VERIFIED"

# Token chỉ lưu dạng hash trong DB nên phải lấy từ thư. Bộ test cần backend
# gửi qua Mailpit; trỏ sang SMTP thật thì thư bay ra ngoài và không lấy được.
TOKEN=$(curl -s "http://localhost:8025/api/v1/messages?limit=1" | python -c "
import sys,json,re,urllib.request
d=json.load(sys.stdin)
if not d.get('messages'): print(''); raise SystemExit
raw=urllib.request.urlopen('http://localhost:8025/api/v1/message/'+d['messages'][0]['ID']).read().decode('utf-8','replace')
m=re.search(r'verify-email\?token=([A-Za-z0-9_-]+)', raw); print(m.group(1) if m else '')")

if [ -z "$TOKEN" ]; then
  MH=$(docker exec aptis-backend printenv MAIL_HOST 2>/dev/null | tr -d '\r')
  echo
  echo "  DUNG: khong lay duoc token xac thuc tu Mailpit."
  if [ -n "$MH" ] && [ "$MH" != "mailpit" ]; then
    echo "  Backend dang gui mail qua '$MH' nen thu khong vao Mailpit."
    echo "  Chay bo test voi Mailpit:"
    echo "      MAIL_HOST=mailpit MAIL_USERNAME= MAIL_PASSWORD= docker compose up -d backend"
    echo "  Xong thi khoi phuc lai bang: docker compose up -d backend"
  else
    echo "  Kiem tra container mailpit con chay khong: docker compose ps mailpit"
  fi
  exit 1
fi
check "verify email" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/auth/verify-email \
  -H 'Content-Type: application/json' -d "{\"token\":\"$TOKEN\"}")" "200"
check "verify lai token da dung" "$(curl -s -X POST $API/auth/verify-email \
  -H 'Content-Type: application/json' -d "{\"token\":\"$TOKEN\"}" | jq_ code)" "TOKEN_EXPIRED"

echo "== 3. Login & JWT =="
LOGIN=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
AT=$(echo "$LOGIN" | jq_ accessToken); RT=$(echo "$LOGIN" | jq_ refreshToken)
check "me khong token -> 401" "$(curl -s -o /dev/null -w '%{http_code}' $API/me)" "401"
check "me co token" "$(curl -s $API/me -H "Authorization: Bearer $AT" | jq_ email)" "$EMAIL"
check "role STUDENT" "$(curl -s $API/me -H "Authorization: Bearer $AT" | jq_ roles.0)" "STUDENT"
check "premium chua bat" "$(curl -s $API/me -H "Authorization: Bearer $AT" | jq_ premiumActive)" "False"

echo "== 4. Refresh token rotation & chong danh cap =="
RT2=$(curl -s -X POST $API/auth/refresh -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$RT\"}" | jq_ refreshToken)
check "rotate ra token moi" "$([ "$RT" != "$RT2" ] && echo yes || echo no)" "yes"
check "reuse token cu bi chan" "$(curl -s -X POST $API/auth/refresh -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$RT\"}" | jq_ code)" "REFRESH_TOKEN_REUSED"
check "ca chuoi token bi thu hoi" "$(curl -s -X POST $API/auth/refresh -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$RT2\"}" | jq_ code)" "REFRESH_TOKEN_REUSED"

AT=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | jq_ accessToken)

echo "== 5. Kiem tra quyen noi dung =="
LIST=$(curl -s "$API/parts/$PART/question-sets" -H "Authorization: Bearer $AT")
check "bai FREE truy cap duoc" "$(echo "$LIST" | jq_ 0.canAccess)" "True"
check "bai PREMIUM bi khoa" "$(echo "$LIST" | jq_ 1.canAccess)" "False"
check "lockReason" "$(echo "$LIST" | jq_ 1.lockReason)" "PREMIUM_REQUIRED"

echo "== 6. Luong lam bai =="
ATT=$(curl -s -X POST $API/practice/part-attempts -H "Authorization: Bearer $AT" \
  -H 'Content-Type: application/json' -d "{\"partId\":\"$PART\",\"questionSetCount\":5}")
AID=$(echo "$ATT" | jq_ id)
check "chi lay bai FREE" "$(echo "$ATT" | python -c "import sys,json; print(len(json.load(sys.stdin)['questionSets']))")" "1"
check "answer key da luoc" "$(echo "$ATT" | python -c "
import sys,json
a=json.load(sys.stdin)
leak=[i for qs in a['questionSets'] for i in qs['content']['items'] if i.get('answerKey')]
print('leaked' if leak else 'stripped')")" "stripped"
check "start attempt" "$(curl -s -X POST $API/attempts/$AID/start -H "Authorization: Bearer $AT" | jq_ status)" "IN_PROGRESS"
check "autosave" "$(curl -s -o /dev/null -w '%{http_code}' -X PUT "$API/attempts/$AID/responses/$QS_FREE" \
  -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' \
  -d '{"itemResponses":[{"itemId":"item_1","responseType":"SINGLE_CHOICE","selectedOptionId":"B"},{"itemId":"item_2","responseType":"SINGLE_CHOICE","selectedOptionId":"A"}],"timeSpentSeconds":42}')" "204"
SUB=$(curl -s -X POST $API/attempts/$AID/submit -H "Authorization: Bearer $AT")
check "submit -> COMPLETED" "$(echo "$SUB" | jq_ status)" "COMPLETED"
check "cham 1/2 diem" "$(echo "$SUB" | jq_ questionSets.0.awardedScore)" "1.0"
check "sau nop tra dap an" "$(echo "$SUB" | python -c "
import sys,json
a=json.load(sys.stdin)
n=len([i for qs in a['questionSets'] for i in qs['content']['items'] if i.get('answerKey')])
print(n)")" "2"
check "submit lan 2 bi chan" "$(curl -s -X POST $API/attempts/$AID/submit -H "Authorization: Bearer $AT" | jq_ code)" "ATTEMPT_ALREADY_SUBMITTED"

echo "== 7. Mua Premium =="
ORD=$(curl -s -X POST $API/orders -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: e2e-order-1' -d "{\"planId\":\"$PLAN\"}")
OID=$(echo "$ORD" | jq_ id); OCODE=$(echo "$ORD" | jq_ orderCode)
check "gia lay tu plan" "$(echo "$ORD" | jq_ totalAmount)" "199000"
check "idempotency tra don cu" "$(curl -s -X POST $API/orders -H "Authorization: Bearer $AT" \
  -H 'Content-Type: application/json' -H 'Idempotency-Key: e2e-order-1' \
  -d "{\"planId\":\"$PLAN\"}" | jq_ orderCode)" "$OCODE"
check "khoi tao thanh toan" "$(curl -s -X POST $API/orders/$OID/payments -H "Authorization: Bearer $AT" \
  -H 'Content-Type: application/json' -H 'Idempotency-Key: e2e-pay-1' \
  -d '{"provider":"sandbox","returnUrl":"http://localhost/checkout"}' | jq_ status)" "PENDING"
check "premium chua bat sau redirect" "$(curl -s $API/me -H "Authorization: Bearer $AT" | jq_ premiumActive)" "False"

echo "== 8. Webhook =="
mkbody() { echo "{\"eventId\":\"$1\",\"orderCode\":\"$OCODE\",\"transactionId\":\"$2\",\"amount\":$3,\"currency\":\"VND\",\"status\":\"SUCCESS\"}"; }
sign() { python -c "import hmac,hashlib,sys; print(hmac.new(b'sandbox-secret', sys.argv[1].encode(), hashlib.sha256).hexdigest())" "$1"; }

B=$(mkbody evt-bad tx-bad 199000)
check "chu ky sai -> 401" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/payments/webhooks/sandbox \
  -H 'Content-Type: application/json' -H 'x-signature: deadbeef' -d "$B")" "401"
B=$(mkbody evt-amt tx-amt 1000)
check "so tien sai -> khong xu ly" "$(curl -s -X POST $API/payments/webhooks/sandbox \
  -H 'Content-Type: application/json' -H "x-signature: $(sign "$B")" -d "$B" | jq_ processed)" "False"
check "premium van tat" "$(curl -s $API/me -H "Authorization: Bearer $AT" | jq_ premiumActive)" "False"

B=$(mkbody evt-ok tx-ok 199000); S=$(sign "$B")
check "webhook hop le" "$(curl -s -X POST $API/payments/webhooks/sandbox \
  -H 'Content-Type: application/json' -H "x-signature: $S" -d "$B" | jq_ processed)" "True"
curl -s -o /dev/null -X POST $API/payments/webhooks/sandbox -H 'Content-Type: application/json' -H "x-signature: $S" -d "$B"
# Đếm theo đúng tài khoản của script: bảng còn dữ liệu của tài khoản khác
# (kể cả tài khoản thật trên máy dev), đếm cả bảng sẽ ra số sai.
check "webhook lap khong tao sub thu 2" "$(docker exec aptis-mysql mysql -uaptis -paptis aptis -N -e \
  "SELECT COUNT(*) FROM user_subscriptions us JOIN users u ON u.id = us.user_id
    WHERE u.email='$EMAIL';" 2>/dev/null | tr -d '\r')" "1"
check "6 entitlement duoc cap" "$(docker exec aptis-mysql mysql -uaptis -paptis aptis -N -e \
  "SELECT COUNT(*) FROM user_entitlements ue JOIN users u ON u.id = ue.user_id
    WHERE u.email='$EMAIL' AND ue.revoked_at IS NULL;" 2>/dev/null | tr -d '\r')" "6"
check "premium da bat" "$(curl -s $API/me -H "Authorization: Bearer $AT" | jq_ premiumActive)" "True"

echo "== 9. Premium mo noi dung =="
LIST=$(curl -s "$API/parts/$PART/question-sets" -H "Authorization: Bearer $AT")
check "bai PREMIUM mo" "$(echo "$LIST" | jq_ 1.canAccess)" "True"
check "luyen duoc ca 2 bo" "$(curl -s -X POST $API/practice/part-attempts -H "Authorization: Bearer $AT" \
  -H 'Content-Type: application/json' -d "{\"partId\":\"$PART\",\"questionSetCount\":5}" \
  | python -c "import sys,json; print(len(json.load(sys.stdin)['questionSets']))")" "2"

echo "== 10. Thu hoi quyen =="
docker exec aptis-mysql mysql -uaptis -paptis aptis -e \
  "UPDATE user_entitlements SET revoked_at = UTC_TIMESTAMP();" >/dev/null 2>&1
check "premium tat ngay" "$(curl -s $API/me -H "Authorization: Bearer $AT" | jq_ premiumActive)" "False"
check "bai PREMIUM khoa lai" "$(curl -s "$API/parts/$PART/question-sets" -H "Authorization: Bearer $AT" | jq_ 1.canAccess)" "False"

echo
echo "================================"
printf "PASS=%d  FAIL=%d\n" "$pass" "$fail"
echo "================================"
[ "$fail" -eq 0 ]
