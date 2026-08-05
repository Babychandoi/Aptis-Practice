#!/usr/bin/env bash
# Kiểm chứng end-to-end 8 phần hạ tầng và quản trị:
#   1. Outbox consumer         5. Import Excel
#   2. Distributed lock        6. Export báo cáo
#   3. Trial campaign          7. Admin gói/đơn hàng
#   4. Hoàn tiền               8. Giáo viên chấm lại
#
# Script tự chuẩn bị tài khoản và dọn dữ liệu nên chạy độc lập, lặp lại được.
#   bash scripts/e2e-platform.sh
#
# CHỈ dùng cho môi trường phát triển — nó ghi và xóa dữ liệu giao dịch.
set -uo pipefail

# Thư mục tạm cạnh script: /tmp không tồn tại khi chạy Git Bash trên Windows
TMPDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.e2e-tmp"
mkdir -p "$TMPDIR"
export TMPDIR

API=http://localhost:8080/api/v1
PW="MatKhau12345"

STUDENT=plat-student@test.local
EDITOR=plat-editor@test.local
ADMIN=plat-admin@test.local

PLAN_30=18000000-0000-4000-8000-000000000001
PART_WRITING4=16000000-0000-4000-8000-000000000044
TT_LONGTEXT=12000000-0000-4000-8000-000000000009
XLSX=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

pass=0; fail=0
check() {
  if [ "$2" = "$3" ]; then printf '  OK   %-48s %s\n' "$1" "$2"; pass=$((pass+1))
  else printf '  FAIL %-48s got=%s want=%s\n' "$1" "$2" "$3"; fail=$((fail+1)); fi
}
jq_() { python -c "
import sys, json
try: d = json.load(sys.stdin)
except Exception: print('PARSE_ERROR'); raise SystemExit
for part in sys.argv[1].split('.'):
    if d is None: break
    if part.isdigit(): d = d[int(part)] if isinstance(d, list) and len(d) > int(part) else None
    elif isinstance(d, dict): d = d.get(part)
    else: d = None
print(d if d is not None else 'null')
" "$1"; }
# Lưu ý khi viết SQL nhiều câu lệnh:
#  - KHÔNG dùng comment SQL (--): client mysql bỏ comment và làm hỏng phần sau.
#  - Xóa theo đúng chiều phụ thuộc khóa ngoại: một câu lỗi thì mọi câu sau bị bỏ.
# Lỗi được in ra (trừ cảnh báo mật khẩu) để không âm thầm bỏ qua như trước.
mysql_() {
  docker exec aptis-mysql mysql -uaptis -paptis aptis -N -e "$1" 2>&1 \
    | grep -v "Using a password on the command line" | tr -d '\r'
}
login() { curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$1\",\"password\":\"$PW\"}" | jq_ accessToken; }

ensure_user() {
  local email="$1"; shift
  if [ "$(mysql_ "SELECT COUNT(*) FROM users WHERE email='$email';")" = "0" ]; then
    curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
      -d "{\"email\":\"$email\",\"password\":\"$PW\"}"
  fi
  mysql_ "UPDATE users SET status='ACTIVE', email_verified_at=NOW() WHERE email='$email';"
  for role in "$@"; do
    mysql_ "INSERT IGNORE INTO user_roles (user_id, role_id, assigned_at)
            SELECT u.id, r.id, NOW() FROM users u, roles r
            WHERE u.email='$email' AND r.code='$role';"
  done
}

# ---------------------------------------------------------------------
echo "== 0. Chuan bi =="

SUF=$(mysql_ "SELECT UNIX_TIMESTAMP();")

# Dọn dữ liệu của lần chạy trước
# Thứ tự xóa theo chiều phụ thuộc khóa ngoại: evaluation_summaries →
# evaluation_jobs → attempt_question_sets → question_sets. Sai thứ tự thì câu
# lệnh đầu tiên lỗi và mọi câu sau trong cùng chuỗi bị bỏ qua.
mysql_ "DELETE FROM outbox_events WHERE aggregate_type LIKE 'E2E%';
        DELETE es FROM evaluation_summaries es
          JOIN question_sets qs ON qs.id = es.question_set_id
         WHERE qs.code LIKE 'PLAT\_%' OR qs.code LIKE 'IMP\_%';
        DELETE ej FROM evaluation_jobs ej
          JOIN question_sets qs ON qs.id = ej.question_set_id
         WHERE qs.code LIKE 'PLAT\_%' OR qs.code LIKE 'IMP\_%';
        DELETE aqs FROM attempt_question_sets aqs
          JOIN question_sets qs ON qs.id = aqs.question_set_id
         WHERE qs.code LIKE 'PLAT\_%' OR qs.code LIKE 'IMP\_%';
        DELETE uqs FROM user_question_stats uqs
          JOIN question_sets qs ON qs.id = uqs.question_set_id
         WHERE qs.code LIKE 'PLAT\_%' OR qs.code LIKE 'IMP\_%';
        DELETE FROM question_sets WHERE code LIKE 'PLAT\_%' OR code LIKE 'IMP\_%';
        DELETE FROM user_trials WHERE user_id IN (SELECT id FROM users WHERE email='$STUDENT');
        UPDATE trial_campaigns SET status='ACTIVE' WHERE code='TRIAL7';
        UPDATE user_entitlements SET revoked_at = UTC_TIMESTAMP()
         WHERE user_id IN (SELECT id FROM users WHERE email='$STUDENT')
           AND revoked_at IS NULL;
        DELETE FROM subscription_plans WHERE code LIKE 'PLAT\_%';"
docker exec aptis-mongo mongosh aptis --quiet --eval \
  'db.question_set_documents.deleteMany({title: /^PLAT /})' >/dev/null 2>&1

ensure_user "$STUDENT" STUDENT
ensure_user "$EDITOR" CONTENT_EDITOR CONTENT_REVIEWER
ensure_user "$ADMIN" ADMIN FINANCE TEACHER

SAT=$(login "$STUDENT"); EAT=$(login "$EDITOR"); AAT=$(login "$ADMIN")
check "3 tai khoan dang nhap duoc" \
  "$([ ${#SAT} -gt 50 ] && [ ${#EAT} -gt 50 ] && [ ${#AAT} -gt 50 ] && echo yes || echo no)" "yes"
check "admin co quyen refund" "$(curl -s $API/me -H "Authorization: Bearer $AAT" | python -c "
import sys,json; print('yes' if 'refund:write' in json.load(sys.stdin)['permissions'] else 'no')")" "yes"

# ---------------------------------------------------------------------
echo "== 1. Outbox consumer =="

mysql_ "INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type,
          payload_json, status, retry_count, available_at, created_at)
        VALUES (UUID(), 'E2E', UUID(), 'KHONG_CO_HANDLER', '{}', 'PENDING', 0, NOW(), NOW());"
sleep 12
check "event khong handler -> PUBLISHED" \
  "$(mysql_ "SELECT status FROM outbox_events WHERE aggregate_type='E2E';")" "PUBLISHED"

# ---------------------------------------------------------------------
echo "== 2. Distributed lock =="

LOCK_ON=$(docker exec aptis-backend printenv APTIS_SCHEDULER_LOCK_ENABLED 2>/dev/null | tr -d '\r')
if [ "$LOCK_ON" = "true" ]; then
  docker exec aptis-redis redis-cli SET "aptis:lock:outbox-dispatch" "e2e-holder" EX 25 NX >/dev/null
  mysql_ "INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type,
            payload_json, status, retry_count, available_at, created_at)
          VALUES (UUID(), 'E2ELOCK', UUID(), 'KHONG_CO_HANDLER', '{}', 'PENDING', 0, NOW(), NOW());"
  sleep 12
  check "job bi bo qua khi khoa bi giu" \
    "$(mysql_ "SELECT status FROM outbox_events WHERE aggregate_type='E2ELOCK';")" "PENDING"

  docker exec aptis-redis redis-cli DEL "aptis:lock:outbox-dispatch" >/dev/null
  sleep 12
  check "job chay lai sau khi nha khoa" \
    "$(mysql_ "SELECT status FROM outbox_events WHERE aggregate_type='E2ELOCK';")" "PUBLISHED"
  mysql_ "DELETE FROM outbox_events WHERE aggregate_type='E2ELOCK';"
else
  printf '  SKIP khoa phan tan chua bat (SCHEDULER_LOCK=true de test)\n'
fi
mysql_ "DELETE FROM outbox_events WHERE aggregate_type='E2E';"

# ---------------------------------------------------------------------
echo "== 3. Trial campaign =="

check "chien dich dang mo" "$(curl -s $API/trials/campaigns -H "Authorization: Bearer $SAT" | jq_ 0.code)" "TRIAL7"
check "premium truoc trial" "$(curl -s $API/me -H "Authorization: Bearer $SAT" | jq_ premiumActive)" "False"
check "bat dau dung thu" "$(curl -s -X POST $API/trials -H "Authorization: Bearer $SAT" \
  -H 'Content-Type: application/json' -d '{"campaignCode":"TRIAL7"}' | jq_ status)" "ACTIVE"
check "premium sau trial" "$(curl -s $API/me -H "Authorization: Bearer $SAT" | jq_ premiumActive)" "True"
check "dung thu lan 2 bi chan" "$(curl -s -X POST $API/trials -H "Authorization: Bearer $SAT" \
  -H 'Content-Type: application/json' -d '{"campaignCode":"TRIAL7"}' | jq_ code)" "CONFLICT"
check "chien dich la bi chan" "$(curl -s -X POST $API/trials -H "Authorization: Bearer $SAT" \
  -H 'Content-Type: application/json' -d '{"campaignCode":"KHONGCO"}' | jq_ code)" "RESOURCE_NOT_FOUND"

# Thu hồi quyền trial để phần sau test mua Premium từ đầu
mysql_ "UPDATE user_entitlements SET revoked_at = UTC_TIMESTAMP()
        WHERE user_id = (SELECT id FROM users WHERE email='$STUDENT') AND revoked_at IS NULL;"
check "thu hoi quyen trial" "$(curl -s $API/me -H "Authorization: Bearer $SAT" | jq_ premiumActive)" "False"

# ---------------------------------------------------------------------
echo "== 4. Admin quan ly goi =="

PLAN=$(curl -s -X POST $API/admin/plans -H "Authorization: Bearer $AAT" -H 'Content-Type: application/json' \
  -d "{\"code\":\"PLAT_$SUF\",\"name\":\"Goi e2e\",\"durationDays\":14,\"priceAmount\":99000,\"displayOrder\":9}")
PLAN_ID=$(echo "$PLAN" | jq_ id)
check "goi moi o DRAFT" "$(echo "$PLAN" | jq_ status)" "DRAFT"
check "goi DRAFT khong hien cho hoc vien" "$(curl -s $API/plans | python -c "
import sys,json; print('yes' if any(p['code']=='PLAT_$SUF' for p in json.load(sys.stdin)) else 'no')")" "no"
check "kich hoat goi" "$(curl -s -X PATCH $API/admin/plans/$PLAN_ID -H "Authorization: Bearer $AAT" \
  -H 'Content-Type: application/json' -d '{"status":"ACTIVE"}' | jq_ status)" "ACTIVE"
check "goi ACTIVE hien cho hoc vien" "$(curl -s $API/plans | python -c "
import sys,json; print('yes' if any(p['code']=='PLAT_$SUF' for p in json.load(sys.stdin)) else 'no')")" "yes"
check "ma goi trung bi chan" "$(curl -s -X POST $API/admin/plans -H "Authorization: Bearer $AAT" \
  -H 'Content-Type: application/json' -d "{\"code\":\"PLAT_$SUF\",\"name\":\"x\",\"priceAmount\":1}" | jq_ code)" "CONFLICT"
check "hoc vien khong tao duoc goi" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/admin/plans \
  -H "Authorization: Bearer $SAT" -H 'Content-Type: application/json' \
  -d '{"code":"X","name":"x","priceAmount":1}')" "403"

# ---------------------------------------------------------------------
echo "== 5. Hoan tien =="

sign() { python -c "import hmac,hashlib,sys; print(hmac.new(b'sandbox-secret', sys.argv[1].encode(), hashlib.sha256).hexdigest())" "$1"; }

ORD=$(curl -s -X POST $API/orders -H "Authorization: Bearer $SAT" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: plat-order-$SUF" -d "{\"planId\":\"$PLAN_30\"}")
OID=$(echo "$ORD" | jq_ id); OCODE=$(echo "$ORD" | jq_ orderCode)
curl -s -o /dev/null -X POST $API/orders/$OID/payments -H "Authorization: Bearer $SAT" \
  -H 'Content-Type: application/json' -H "Idempotency-Key: plat-pay-$SUF" \
  -d '{"provider":"sandbox","returnUrl":"http://localhost/checkout"}'
B="{\"eventId\":\"plat-$SUF\",\"orderCode\":\"$OCODE\",\"transactionId\":\"tx-$SUF\",\"amount\":199000,\"currency\":\"VND\",\"status\":\"SUCCESS\"}"
curl -s -o /dev/null -X POST $API/payments/webhooks/sandbox -H 'Content-Type: application/json' \
  -H "x-signature: $(sign "$B")" -d "$B"
check "don da thanh toan" "$(mysql_ "SELECT status FROM orders WHERE id='$OID';")" "PAID"
check "premium bat sau mua" "$(curl -s $API/me -H "Authorization: Bearer $SAT" | jq_ premiumActive)" "True"

# Cổng sandbox chạy được hai chế độ: hoàn tiền ngay, hoặc trả PROCESSING rồi
# chờ webhook (SANDBOX_ASYNC_REFUND=true, giống cổng thật). Hàm dưới xác nhận
# nốt bằng webhook khi ở chế độ bất đồng bộ, để phần kiểm tra sau đó kiểm chứng
# cùng một kết quả nghiệp vụ ở cả hai chế độ.
refund_and_settle() {  # $1 = body JSON, $2 = hậu tố eventId; in ra trạng thái cuối
  local body="$1" tag="$2" resp rid status prid rb
  resp=$(curl -s -X POST $API/admin/orders/$OID/refunds -H "Authorization: Bearer $AAT" \
    -H 'Content-Type: application/json' -d "$body")
  status=$(echo "$resp" | jq_ status)
  rid=$(echo "$resp" | jq_ id)

  if [ "$status" = "PROCESSING" ]; then
    prid=$(mysql_ "SELECT provider_refund_id FROM refunds WHERE id='$rid';")
    rb="{\"eventId\":\"plat-rf-$tag-$SUF\",\"refundId\":\"$prid\",\"status\":\"SUCCESS\"}"
    curl -s -o /dev/null -X POST $API/payments/webhooks/sandbox/refund-callbacks \
      -H 'Content-Type: application/json' -H "x-signature: $(sign "$rb")" -d "$rb"
    status=$(mysql_ "SELECT status FROM refunds WHERE id='$rid';")
  fi
  echo "$status"
}

check "hoan mot phan 50k" "$(refund_and_settle '{"amount":50000,"reason":"e2e mot phan"}' mot-phan)" "SUCCESS"
check "don PARTIALLY_REFUNDED" "$(mysql_ "SELECT status FROM orders WHERE id='$OID';")" "PARTIALLY_REFUNDED"
check "hoan mot phan giu quyen" "$(curl -s $API/me -H "Authorization: Bearer $SAT" | jq_ premiumActive)" "True"
check "hoan qua so con lai bi chan" "$(curl -s -X POST $API/admin/orders/$OID/refunds -H "Authorization: Bearer $AAT" \
  -H 'Content-Type: application/json' -d '{"amount":900000,"reason":"qua"}' | jq_ code)" "VALIDATION_FAILED"
check "hoan not so con lai" "$(refund_and_settle '{"reason":"e2e hoan het"}' hoan-het)" "SUCCESS"
check "don REFUNDED" "$(mysql_ "SELECT status FROM orders WHERE id='$OID';")" "REFUNDED"
check "subscription bi thu hoi" "$(mysql_ "SELECT status FROM user_subscriptions WHERE source_order_id='$OID';")" "REVOKED"
check "premium tat sau hoan het" "$(curl -s $API/me -H "Authorization: Bearer $SAT" | jq_ premiumActive)" "False"
check "hoan them bi chan" "$(curl -s -X POST $API/admin/orders/$OID/refunds -H "Authorization: Bearer $AAT" \
  -H 'Content-Type: application/json' -d '{"reason":"lan nua"}' | jq_ code)" "CONFLICT"

# ---------------------------------------------------------------------
echo "== 6. Tang / thu hoi quyen thu cong =="

SID=$(mysql_ "SELECT id FROM users WHERE email='$STUDENT';")
ENT=$(curl -s -X POST $API/admin/users/$SID/entitlements -H "Authorization: Bearer $AAT" \
  -H 'Content-Type: application/json' \
  -d '{"entitlementCode":"PREMIUM_CONTENT_ACCESS","durationDays":30,"reason":"e2e tang quyen"}')
ENT_ID=$(echo "$ENT" | jq_ id)
check "tang quyen thu cong" "$(echo "$ENT" | jq_ sourceType)" "ADMIN_GRANT"
check "premium bat sau khi tang" "$(curl -s $API/me -H "Authorization: Bearer $SAT" | jq_ premiumActive)" "True"
curl -s -o /dev/null -X DELETE "$API/admin/entitlements/$ENT_ID?reason=e2e" -H "Authorization: Bearer $AAT"
check "premium tat sau thu hoi" "$(curl -s $API/me -H "Authorization: Bearer $SAT" | jq_ premiumActive)" "False"

# ---------------------------------------------------------------------
echo "== 7. Import Excel =="

python - "$SUF" <<'PYEOF' > /dev/null
import os, sys, zipfile
from xml.sax.saxutils import escape
suf = sys.argv[1]
ROWS = [
 ["code","part_code","component_code","title","difficulty","access_level",
  "instructions","prompt","option_a","option_b","correct_option","explanation"],
 [f"IMP_{suf}_1","VOCABULARY","GRAMMAR_VOCABULARY","PLAT import 1","2","FREE",
  "Chon dap an dung.","He ___ interested.","is","are","A","Chu ngu so it."],
 [f"IMP_{suf}_1","VOCABULARY","GRAMMAR_VOCABULARY","","","",
  "","They ___ at home.","was","were","B","Chu ngu so nhieu."],
 [f"IMP_{suf}_2","VOCABULARY","GRAMMAR_VOCABULARY","PLAT import 2","3","PREMIUM",
  "Chon dap an dung.","She has lived here ___ 2010.","since","for","A","since + moc."],
 [f"IMP_{suf}_BAD","VOCABULARY","GRAMMAR_VOCABULARY","PLAT loi","1","FREE",
  "Chon.","Cau loi","mot","hai","Z",""],
]
def cn(i):
    n=""; i+=1
    while i:
        i,r=divmod(i-1,26); n=chr(65+r)+n
    return n
def sheet(rows):
    p=['<?xml version="1.0" encoding="UTF-8"?>',
       '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>']
    for r,row in enumerate(rows,1):
        p.append(f'<row r="{r}">')
        for c,v in enumerate(row):
            if v=="": continue
            p.append(f'<c r="{cn(c)}{r}" t="inlineStr"><is><t>{escape(str(v))}</t></is></c>')
        p.append('</row>')
    p.append('</sheetData></worksheet>')
    return "".join(p)
CT='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'
RR='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
WB='<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Q" sheetId="1" r:id="rId1"/></sheets></workbook>'
WBR='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
with zipfile.ZipFile(os.environ["TMPDIR"] + "/e2e-import.xlsx","w",zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml",CT); z.writestr("_rels/.rels",RR)
    z.writestr("xl/workbook.xml",WB); z.writestr("xl/_rels/workbook.xml.rels",WBR)
    z.writestr("xl/worksheets/sheet1.xml",sheet(ROWS))
PYEOF

UP=$(curl -s -X POST $API/assets/upload-url -H "Authorization: Bearer $EAT" -H 'Content-Type: application/json' \
  -d "{\"assetType\":\"IMPORT_FILE\",\"mimeType\":\"$XLSX\",\"filename\":\"import.xlsx\",\"fileSize\":2100}")
ASSET=$(echo "$UP" | jq_ assetId)
check "xin duoc presigned upload URL" "$([ "$ASSET" != "null" ] && echo yes || echo no)" "yes"

curl -s -o /dev/null -X PUT "$(echo "$UP" | jq_ uploadUrl)" -H "Content-Type: $XLSX" \
  --data-binary "@$TMPDIR/e2e-import.xlsx"
check "asset READY sau upload" "$(curl -s -X POST $API/assets/$ASSET/complete -H "Authorization: Bearer $EAT" \
  -H 'Content-Type: application/json' -d '{}' | jq_ status)" "READY"

IJOB=$(curl -s -X POST $API/admin/import-jobs -H "Authorization: Bearer $EAT" -H 'Content-Type: application/json' \
  -d "{\"sourceAssetId\":\"$ASSET\"}" | jq_ id)
printf '  ...  cho import worker (toi da 60s)\n'
for i in $(seq 1 8); do
  S=$(curl -s $API/admin/import-jobs/$IJOB -H "Authorization: Bearer $EAT" | jq_ status)
  case "$S" in COMPLETED|PARTIALLY_FAILED|FAILED) break;; esac
  sleep 8
done
IRES=$(curl -s $API/admin/import-jobs/$IJOB -H "Authorization: Bearer $EAT")
check "import PARTIALLY_FAILED (1 dong loi)" "$(echo "$IRES" | jq_ status)" "PARTIALLY_FAILED"
check "2 bo cau hoi vao duoc" "$(echo "$IRES" | jq_ successRows)" "2"
check "co file bao loi" "$([ "$(echo "$IRES" | jq_ errorReportAssetId)" != "null" ] && echo yes || echo no)" "yes"
check "bo import o DRAFT" "$(mysql_ "SELECT DISTINCT status FROM question_sets WHERE code LIKE 'IMP\_${SUF}\_%';")" "DRAFT"
check "gop 2 dong cung code" "$(mysql_ "SELECT item_count FROM question_sets WHERE code='IMP_${SUF}_1';")" "2"

# ---------------------------------------------------------------------
echo "== 8. Export bao cao =="

for TYPE in REVENUE_REPORT USER_LIST; do
  JOB=$(curl -s -X POST $API/admin/export-jobs -H "Authorization: Bearer $AAT" \
    -H 'Content-Type: application/json' -d "{\"exportType\":\"$TYPE\"}" | jq_ id)
  eval "JOB_$TYPE=$JOB"
done
printf '  ...  cho export worker (toi da 60s)\n'
for i in $(seq 1 8); do
  S=$(curl -s $API/admin/export-jobs/$JOB_REVENUE_REPORT -H "Authorization: Bearer $AAT" | jq_ status)
  case "$S" in COMPLETED|FAILED) break;; esac
  sleep 8
done
REV=$(curl -s $API/admin/export-jobs/$JOB_REVENUE_REPORT -H "Authorization: Bearer $AAT")
check "export doanh thu COMPLETED" "$(echo "$REV" | jq_ status)" "COMPLETED"
check "co file ket qua" "$([ "$(echo "$REV" | jq_ resultAssetId)" != "null" ] && echo yes || echo no)" "yes"
check "file co han su dung" "$([ "$(echo "$REV" | jq_ expiresAt)" != "null" ] && echo yes || echo no)" "yes"

RASSET=$(echo "$REV" | jq_ resultAssetId)
RURL=$(curl -s $API/assets/$RASSET/signed-url -H "Authorization: Bearer $AAT" | jq_ signedUrl)
curl -s "$RURL" -o "$TMPDIR/e2e-revenue.xlsx"
check "tai duoc file bao cao" "$(python -c "
import os, zipfile
try: print('yes' if zipfile.ZipFile(os.environ['TMPDIR'] + '/e2e-revenue.xlsx').namelist() else 'no')
except Exception: print('no')")" "yes"
check "hoc vien khong tao duoc export" "$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/admin/export-jobs \
  -H "Authorization: Bearer $SAT" -H 'Content-Type: application/json' -d '{"exportType":"USER_LIST"}')" "403"

# ---------------------------------------------------------------------
echo "== 9. Giao vien cham lai =="

WQS=$(cat <<EOF
{"partId":"$PART_WRITING4","taskTypeId":"$TT_LONGTEXT","code":"PLAT_WR_$SUF",
 "title":"PLAT Writing","accessLevel":"FREE",
 "content":{"instructions":"Viet 120-150 tu.",
  "items":[{"id":"item_1","sequenceNo":1,"responseType":"LONG_TEXT","maxScore":25,
    "prompt":{"format":"PLAIN_TEXT","value":"Write an email."},
    "constraints":{"minWords":120,"maxWords":150,"register":"FORMAL"},
    "rubricCode":"APTIS_WRITING_PART_4_V1"}],
  "scoring":{"strategy":"RUBRIC","partialCredit":true}}}
EOF
)
WID=$(curl -s -X POST $API/admin/question-sets -H "Authorization: Bearer $EAT" \
  -H 'Content-Type: application/json' -d "$WQS" | jq_ id)
curl -s -o /dev/null -X POST $API/admin/question-sets/$WID/submit-review -H "Authorization: Bearer $EAT" \
  -H 'Content-Type: application/json' -d '{}'
curl -s -o /dev/null -X POST $API/admin/question-sets/$WID/publish -H "Authorization: Bearer $EAT" \
  -H 'Content-Type: application/json' -d '{}'

# Cô lập: chỉ bộ vừa tạo là ứng viên
mysql_ "UPDATE question_sets SET status='ARCHIVED'
        WHERE part_id='$PART_WRITING4' AND id <> '$WID' AND status='PUBLISHED';"

WATT=$(curl -s -X POST $API/practice/part-attempts -H "Authorization: Bearer $SAT" \
  -H 'Content-Type: application/json' -d "{\"partId\":\"$PART_WRITING4\",\"questionSetCount\":1}")
WAID=$(echo "$WATT" | jq_ id)
curl -s -o /dev/null -X POST $API/attempts/$WAID/start -H "Authorization: Bearer $SAT"

ESSAY=$(python -c "
import json
e=('Dear Sir or Madam, I am writing to express my concern about the changing rooms. '
   'Although I have been a member for three years, the facilities have deteriorated. '
   'The lockers are broken, and several showers do not produce hot water. Moreover, '
   'the floors are often wet, which creates a safety risk. Therefore, I would like to '
   'suggest improvements. Firstly, the lockers should be repaired. Secondly, the plumbing '
   'needs inspection. Finally, non-slip mats would reduce accidents. I would be grateful '
   'if you could consider these suggestions. Thank you. Yours sincerely, Test')
print(json.dumps({'itemResponses':[{'itemId':'item_1','responseType':'LONG_TEXT','textValue':e}],'timeSpentSeconds':900}))")
curl -s -o /dev/null -X PUT "$API/attempts/$WAID/responses/$WID" -H "Authorization: Bearer $SAT" \
  -H 'Content-Type: application/json' -d "$ESSAY"
check "nop Writing -> SCORING" "$(curl -s -X POST $API/attempts/$WAID/submit -H "Authorization: Bearer $SAT" | jq_ status)" "SCORING"

printf '  ...  cho AI cham (toi da 60s)\n'
for i in $(seq 1 8); do
  S=$(mysql_ "SELECT status FROM evaluation_jobs WHERE attempt_id='$WAID';")
  case "$S" in COMPLETED|FAILED) break;; esac
  sleep 8
done
check "AI cham xong" "$(mysql_ "SELECT status FROM evaluation_jobs WHERE attempt_id='$WAID';")" "COMPLETED"

EJOB=$(mysql_ "SELECT id FROM evaluation_jobs WHERE attempt_id='$WAID';")
AI_SCORE=$(mysql_ "SELECT total_score FROM evaluation_summaries WHERE attempt_id='$WAID' AND evaluator_type='AI';")
check "bai xuat hien trong danh sach cho review" "$(curl -s "$API/admin/evaluations/pending-review" \
  -H "Authorization: Bearer $AAT" | python -c "
import sys,json
d=json.load(sys.stdin)
print('yes' if any(r['evaluationJobId']=='$EJOB' for r in d['content']) else 'no')")" "yes"
check "xem duoc chi tiet kem diem AI" "$(curl -s $API/admin/evaluations/$EJOB -H "Authorization: Bearer $AAT" \
  | jq_ currentEvaluatorType)" "AI"

REVIEW='{"criteria":[
  {"code":"TASK_ACHIEVEMENT","name":"Task","score":4,"maxScore":5},
  {"code":"GRAMMAR","name":"Grammar","score":3,"maxScore":5},
  {"code":"VOCABULARY","name":"Vocab","score":4,"maxScore":5},
  {"code":"COHESION","name":"Cohesion","score":4,"maxScore":5},
  {"code":"REGISTER","name":"Register","score":3,"maxScore":5}],
  "cefrLevel":"B2","summary":"e2e teacher review"}'
check "giao vien cham 18/25" "$(curl -s -X POST $API/admin/evaluations/$EJOB/review \
  -H "Authorization: Bearer $AAT" -H 'Content-Type: application/json' -d "$REVIEW" | jq_ totalScore)" "18.0"
check "diem attempt cap nhat" "$(mysql_ "SELECT raw_score FROM test_attempts WHERE id='$WAID';")" "18.00"
check "ban AI van duoc giu" "$(mysql_ "SELECT total_score FROM evaluation_summaries
  WHERE attempt_id='$WAID' AND evaluator_type='AI';")" "$AI_SCORE"
check "ban AI khong con final" "$(mysql_ "SELECT is_final FROM evaluation_summaries
  WHERE attempt_id='$WAID' AND evaluator_type='AI';")" "0"
check "ban giao vien la final" "$(mysql_ "SELECT is_final FROM evaluation_summaries
  WHERE attempt_id='$WAID' AND evaluator_type='TEACHER';")" "1"
check "hoc vien chi thay 1 ban" "$(curl -s "$API/attempts/$WAID/evaluations" -H "Authorization: Bearer $SAT" \
  | python -c "import sys,json; print(len(json.load(sys.stdin)))")" "1"
check "hoc vien thay ban giao vien" "$(curl -s "$API/attempts/$WAID/evaluations" \
  -H "Authorization: Bearer $SAT" | jq_ 0.evaluatorType)" "TEACHER"

check "diem vuot maxScore bi chan" "$(curl -s -X POST $API/admin/evaluations/$EJOB/review \
  -H "Authorization: Bearer $AAT" -H 'Content-Type: application/json' \
  -d '{"criteria":[{"code":"G","name":"G","score":99,"maxScore":5}]}' | jq_ code)" "VALIDATION_FAILED"

check "cham lai cap nhat khong them dong" "$(curl -s -o /dev/null -X POST $API/admin/evaluations/$EJOB/review \
  -H "Authorization: Bearer $AAT" -H 'Content-Type: application/json' \
  -d '{"criteria":[{"code":"G","name":"G","score":5,"maxScore":10}],"cefrLevel":"B1"}';
  mysql_ "SELECT COUNT(*) FROM evaluation_summaries WHERE attempt_id='$WAID' AND evaluator_type='TEACHER';")" "1"
check "cham lai doi diem that" "$(mysql_ "SELECT total_score FROM evaluation_summaries
  WHERE attempt_id='$WAID' AND evaluator_type='TEACHER';")" "5.00"
check "hoc vien khong cham duoc" "$(curl -s -o /dev/null -w '%{http_code}' -X POST \
  $API/admin/evaluations/$EJOB/review -H "Authorization: Bearer $SAT" \
  -H 'Content-Type: application/json' -d '{"criteria":[{"code":"X","name":"X","score":1,"maxScore":5}]}')" "403"

# Trả lại nội dung đã cô lập
mysql_ "UPDATE question_sets SET status='PUBLISHED'
        WHERE part_id='$PART_WRITING4' AND status='ARCHIVED' AND published_at IS NOT NULL;"

echo
echo "================================"
printf "PASS=%d  FAIL=%d\n" "$pass" "$fail"
echo "================================"
[ "$fail" -eq 0 ]
