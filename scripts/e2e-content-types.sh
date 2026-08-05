#!/usr/bin/env bash
# Kiểm chứng end-to-end 5 phần bổ sung:
#   1. Import Excel đủ 5 dạng bài chấm tự động (không chỉ SINGLE_CHOICE)
#   2. Chấm điểm đúng cho từng dạng vừa import
#   3. Import ZIP audio/ảnh (kể cả chống zip slip và lọc định dạng)
#   4. Webhook hoàn tiền bất đồng bộ
#   5. Job dọn file báo cáo quá hạn khỏi MinIO
#
# Script tự chuẩn bị tài khoản và dọn dữ liệu nên chạy độc lập, lặp lại được.
#   bash scripts/e2e-content-types.sh
#
# Phần webhook hoàn tiền cần cổng sandbox chạy bất đồng bộ, phần dọn file cần
# chu kỳ ngắn — cả hai tự bỏ qua nếu chưa bật:
#   SANDBOX_ASYNC_REFUND=true EXPORT_PURGE_INTERVAL=PT20S \
#     EXPORT_PURGE_INITIAL_DELAY=PT10S docker compose up -d backend
#
# CHỈ dùng cho môi trường phát triển — nó ghi và xóa dữ liệu giao dịch.
set -uo pipefail

# Thư mục tạm cạnh script: /tmp không tồn tại khi chạy Git Bash trên Windows
TMPDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.e2e-tmp"
mkdir -p "$TMPDIR"
export TMPDIR

API=http://localhost:8080/api/v1
PW="MatKhau12345"

STUDENT=ct-student@test.local
EDITOR=ct-editor@test.local
ADMIN=ct-admin@test.local

PLAN_30=18000000-0000-4000-8000-000000000001
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
mysql_() {
  docker exec aptis-mysql mysql -uaptis -paptis aptis -N -e "$1" 2>&1 \
    | grep -v "Using a password on the command line" | tr -d '\r'
}
login() { curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$1\",\"password\":\"$PW\"}" | jq_ accessToken; }
sign() { python -c "import hmac,hashlib,sys; print(hmac.new(b'sandbox-secret', sys.argv[1].encode(), hashlib.sha256).hexdigest())" "$1"; }

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

mysql_ "DELETE es FROM evaluation_summaries es
          JOIN question_sets qs ON qs.id = es.question_set_id
         WHERE qs.code LIKE 'CT\_%';
        DELETE ej FROM evaluation_jobs ej
          JOIN question_sets qs ON qs.id = ej.question_set_id
         WHERE qs.code LIKE 'CT\_%';
        DELETE aqs FROM attempt_question_sets aqs
          JOIN question_sets qs ON qs.id = aqs.question_set_id
         WHERE qs.code LIKE 'CT\_%';
        DELETE uqs FROM user_question_stats uqs
          JOIN question_sets qs ON qs.id = uqs.question_set_id
         WHERE qs.code LIKE 'CT\_%';
        DELETE FROM question_sets WHERE code LIKE 'CT\_%';
        UPDATE user_entitlements SET revoked_at = UTC_TIMESTAMP()
         WHERE user_id IN (SELECT id FROM users WHERE email='$STUDENT')
           AND revoked_at IS NULL;
        DELETE FROM assets
         WHERE created_by IN (SELECT id FROM users WHERE email='$EDITOR')
           AND asset_type IN ('AUDIO','IMAGE');"
docker exec aptis-mongo mongosh aptis --quiet --eval \
  'db.question_set_documents.deleteMany({title: /^CT /})' >/dev/null 2>&1

ensure_user "$STUDENT" STUDENT
ensure_user "$EDITOR" CONTENT_EDITOR CONTENT_REVIEWER
ensure_user "$ADMIN" ADMIN FINANCE_MANAGER

SAT=$(login "$STUDENT"); EAT=$(login "$EDITOR"); AAT=$(login "$ADMIN")
check "dang nhap hoc vien" "$([ ${#SAT} -gt 20 ] && echo yes || echo no)" "yes"
check "dang nhap bien tap" "$([ ${#EAT} -gt 20 ] && echo yes || echo no)" "yes"
check "dang nhap quan tri" "$([ ${#AAT} -gt 20 ] && echo yes || echo no)" "yes"

# ---------------------------------------------------------------------
echo "== 1. Import 5 dang bai =="

python - "$SUF" <<'PYEOF' > /dev/null
import os, sys, zipfile
from xml.sax.saxutils import escape
suf = sys.argv[1]
H = ["code","part_code","component_code","title","difficulty","access_level",
     "instructions","prompt","task_type",
     "option_a","option_b","option_c","left_a","left_b",
     "correct_option","correct_matches","correct_order","accepted_answers",
     "case_sensitive","partial_credit","explanation"]

def r(**kw):
    return [kw.get(c, "") for c in H]

ROWS = [H,
  # Chon mot dap an — giu nguyen dinh dang cu, khong co cot task_type
  r(code=f"CT_{suf}_SINGLE", part_code="VOCABULARY", component_code="GRAMMAR_VOCABULARY",
    title=f"CT single {suf}", difficulty="2", access_level="FREE",
    prompt="He ___ interested.", option_a="is", option_b="are", correct_option="A"),
  # Chon nhieu dap an
  r(code=f"CT_{suf}_MULTI", part_code="PART_1", component_code="READING",
    title=f"CT multi {suf}", difficulty="3", access_level="FREE",
    prompt="Chon cac cau dung.", task_type="MULTIPLE_CHOICE",
    option_a="Trai dat quay quanh Mat troi", option_b="Mat troi quay quanh Trai dat",
    option_c="Trai dat co mot mat trang",
    correct_option="A,C", partial_credit="true"),
  # Noi cap
  r(code=f"CT_{suf}_MATCH", part_code="PART_3", component_code="READING",
    title=f"CT match {suf}", difficulty="3", access_level="FREE",
    prompt="Noi nguoi noi voi y kien.", task_type="MATCHING",
    left_a="An", left_b="Binh",
    option_a="Thich the thao", option_b="Thich am nhac",
    correct_matches="A=B, B=A", partial_credit="true"),
  # Sap xep cau
  r(code=f"CT_{suf}_ORDER", part_code="PART_2", component_code="READING",
    title=f"CT order {suf}", difficulty="3", access_level="FREE",
    prompt="Sap xep cac cau.", task_type="SENTENCE_ORDERING",
    option_a="Sau do toi an sang.", option_b="Dau tien toi thuc day.",
    option_c="Cuoi cung toi di lam.",
    correct_order="B,A,C"),
  # Tra loi ngan
  r(code=f"CT_{suf}_TEXT", part_code="PART_1", component_code="LISTENING",
    title=f"CT text {suf}", difficulty="2", access_level="FREE",
    prompt="Nghe va viet so ban nghe duoc.", task_type="SHORT_TEXT",
    accepted_answers="1,000 | one thousand", case_sensitive="false"),
  # Dang tu luan — phai bi tu choi, khong co answer key de cham
  r(code=f"CT_{suf}_ESSAY", part_code="PART_4", component_code="WRITING",
    title=f"CT essay {suf}", difficulty="4", access_level="FREE",
    prompt="Viet mot doan van.", task_type="LONG_TEXT"),
  # Answer key tro sai — phai bi tu choi
  r(code=f"CT_{suf}_BADKEY", part_code="PART_2", component_code="READING",
    title=f"CT bad {suf}", difficulty="2", access_level="FREE",
    prompt="Sap xep.", task_type="SENTENCE_ORDERING",
    option_a="mot", option_b="hai", correct_order="A,Z"),
]

def cn(i):
    n=""; i+=1
    while i:
        i,rr=divmod(i-1,26); n=chr(65+rr)+n
    return n
def sheet(rows):
    p=['<?xml version="1.0" encoding="UTF-8"?>',
       '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>']
    for ri,row in enumerate(rows,1):
        p.append(f'<row r="{ri}">')
        for c,v in enumerate(row):
            if v=="": continue
            p.append(f'<c r="{cn(c)}{ri}" t="inlineStr"><is><t>{escape(str(v))}</t></is></c>')
        p.append('</row>')
    p.append('</sheetData></worksheet>')
    return "".join(p)
CT='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'
RR='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
WB='<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Q" sheetId="1" r:id="rId1"/></sheets></workbook>'
WBR='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
with zipfile.ZipFile(os.environ["TMPDIR"] + "/ct-import.xlsx","w",zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml",CT); z.writestr("_rels/.rels",RR)
    z.writestr("xl/workbook.xml",WB); z.writestr("xl/_rels/workbook.xml.rels",WBR)
    z.writestr("xl/worksheets/sheet1.xml",sheet(ROWS))
PYEOF

UP=$(curl -s -X POST $API/assets/upload-url -H "Authorization: Bearer $EAT" -H 'Content-Type: application/json' \
  -d "{\"assetType\":\"IMPORT_FILE\",\"mimeType\":\"$XLSX\",\"filename\":\"ct-import.xlsx\",\"fileSize\":2600}")
ASSET=$(echo "$UP" | jq_ assetId)
curl -s -o /dev/null -X PUT "$(echo "$UP" | jq_ uploadUrl)" -H "Content-Type: $XLSX" \
  --data-binary "@$TMPDIR/ct-import.xlsx"
curl -s -o /dev/null -X POST $API/assets/$ASSET/complete -H "Authorization: Bearer $EAT" \
  -H 'Content-Type: application/json' -d '{}'

IJOB=$(curl -s -X POST $API/admin/import-jobs -H "Authorization: Bearer $EAT" -H 'Content-Type: application/json' \
  -d "{\"sourceAssetId\":\"$ASSET\"}" | jq_ id)
printf '  ...  cho import worker (toi da 60s)\n'
for i in $(seq 1 8); do
  S=$(curl -s $API/admin/import-jobs/$IJOB -H "Authorization: Bearer $EAT" | jq_ status)
  case "$S" in COMPLETED|PARTIALLY_FAILED|FAILED) break;; esac
  sleep 8
done
IRES=$(curl -s $API/admin/import-jobs/$IJOB -H "Authorization: Bearer $EAT")

check "import PARTIALLY_FAILED (2 dong loi)" "$(echo "$IRES" | jq_ status)" "PARTIALLY_FAILED"
check "5 dang bai vao duoc" "$(echo "$IRES" | jq_ successRows)" "5"
check "dang tu luan bi tu choi" \
  "$(mysql_ "SELECT COUNT(*) FROM question_sets WHERE code='CT_${SUF}_ESSAY';")" "0"
check "answer key tro sai bi tu choi" \
  "$(mysql_ "SELECT COUNT(*) FROM question_sets WHERE code='CT_${SUF}_BADKEY';")" "0"

# Task type phai gan dung, khong phai SINGLE_CHOICE cho tat ca
for PAIR in "MULTI:MULTIPLE_CHOICE" "MATCH:MATCHING" "ORDER:SENTENCE_ORDERING" "TEXT:SHORT_TEXT"; do
  SFX=${PAIR%%:*}; WANT=${PAIR##*:}
  check "task_type $SFX dung" "$(mysql_ "SELECT tt.code FROM question_sets qs
      JOIN task_types tt ON tt.id = qs.task_type_id WHERE qs.code='CT_${SUF}_${SFX}';")" "$WANT"
done

# ---------------------------------------------------------------------
echo "== 2. Cham diem tung dang =="

# Publish 5 bo vua import de hoc vien lam duoc
for SFX in SINGLE MULTI MATCH ORDER TEXT; do
  QID=$(mysql_ "SELECT id FROM question_sets WHERE code='CT_${SUF}_${SFX}';")
  eval "QS_$SFX=$QID"
  curl -s -o /dev/null -X POST $API/admin/question-sets/$QID/submit-review -H "Authorization: Bearer $EAT"
  curl -s -o /dev/null -X POST $API/admin/question-sets/$QID/publish -H "Authorization: Bearer $EAT"
done
check "5 bo da publish" \
  "$(mysql_ "SELECT COUNT(*) FROM question_sets WHERE code LIKE 'CT\_${SUF}\_%' AND status='PUBLISHED';")" "5"

# Nop dung dap an cho tung dang, ky vong diem tuyet doi.
# Day la phan quan trong nhat: answer key import sai thi hoc vien tra loi dung
# van bi 0 diem, va loi chi lo ra sau khi da publish.
#
# Luot luyen tao theo Part chu khong chon duoc bo cu the, ma mot Part co the co
# nhieu bo PUBLISHED (tu seed hoac lan chay khac). Nen lay ca Part roi doc diem
# dung o bo minh quan tam, thay vi gia dinh luot chi co mot bo.
attempt_score() {  # $1 = questionSetId, $2 = partId, $3 = responseType, $4 = JSON tra loi
  local qs="$1" part="$2" rtype="$3" resp="$4" att
  att=$(curl -s -X POST $API/practice/part-attempts -H "Authorization: Bearer $SAT" \
    -H 'Content-Type: application/json' \
    -d "{\"partId\":\"$part\",\"questionSetCount\":50}" | jq_ id)
  curl -s -o /dev/null -X POST $API/attempts/$att/start -H "Authorization: Bearer $SAT"
  curl -s -o /dev/null -X PUT $API/attempts/$att/responses/$qs -H "Authorization: Bearer $SAT" \
    -H 'Content-Type: application/json' \
    -d "{\"itemResponses\":[{\"itemId\":\"item_1\",\"responseType\":\"$rtype\",$resp}]}"
  curl -s -X POST $API/attempts/$att/submit -H "Authorization: Bearer $SAT" | python -c "
import sys, json
qs = sys.argv[1]
try: d = json.load(sys.stdin)
except Exception: print('PARSE_ERROR'); raise SystemExit
for s in d.get('questionSets') or []:
    if s.get('questionSetId') == qs:
        print(s.get('awardedScore')); raise SystemExit
print('KHONG_TIM_THAY_BO')
" "$qs"
}

P_VOCAB=$(mysql_ "SELECT p.id FROM parts p JOIN components c ON c.id=p.component_id
                   WHERE c.code='GRAMMAR_VOCABULARY' AND p.code='VOCABULARY';")
P_READ1=$(mysql_ "SELECT p.id FROM parts p JOIN components c ON c.id=p.component_id
                   WHERE c.code='READING' AND p.code='PART_1';")
P_READ2=$(mysql_ "SELECT p.id FROM parts p JOIN components c ON c.id=p.component_id
                   WHERE c.code='READING' AND p.code='PART_2';")
P_READ3=$(mysql_ "SELECT p.id FROM parts p JOIN components c ON c.id=p.component_id
                   WHERE c.code='READING' AND p.code='PART_3';")
P_LIST1=$(mysql_ "SELECT p.id FROM parts p JOIN components c ON c.id=p.component_id
                   WHERE c.code='LISTENING' AND p.code='PART_1';")

check "SINGLE_CHOICE cham dung" \
  "$(attempt_score "$QS_SINGLE" "$P_VOCAB" SINGLE_CHOICE '"selectedOptionId":"A"')" "1.0"
check "MULTIPLE_CHOICE cham dung" \
  "$(attempt_score "$QS_MULTI" "$P_READ1" MULTIPLE_CHOICE '"selectedOptionIds":["A","C"]')" "1.0"
# Noi cap tinh diem theo so cap nen diem toi da bang so cap (2)
check "MATCHING cham dung" \
  "$(attempt_score "$QS_MATCH" "$P_READ3" MATCHING '"matches":{"A":"B","B":"A"}')" "2.0"
check "SENTENCE_ORDERING cham dung" \
  "$(attempt_score "$QS_ORDER" "$P_READ2" SENTENCE_ORDERING '"orderedOptionIds":["B","A","C"]')" "1.0"
check "SHORT_TEXT cham dung" \
  "$(attempt_score "$QS_TEXT" "$P_LIST1" SHORT_TEXT '"textValue":"one thousand"')" "1.0"

# Tra loi sai phai ra 0 — chung minh diem tren khong phai do cham de
check "SINGLE_CHOICE sai -> 0" \
  "$(attempt_score "$QS_SINGLE" "$P_VOCAB" SINGLE_CHOICE '"selectedOptionId":"B"')" "0.0"
check "SENTENCE_ORDERING sai -> 0" \
  "$(attempt_score "$QS_ORDER" "$P_READ2" SENTENCE_ORDERING '"orderedOptionIds":["A","B","C"]')" "0.0"
# Noi cap bat partial_credit: dung 1/2 cap duoc 1 diem
check "MATCHING dung mot nua duoc diem phan" \
  "$(attempt_score "$QS_MATCH" "$P_READ3" MATCHING '"matches":{"A":"B","B":"B"}')" "1.0"
# SHORT_TEXT khai bao case_sensitive=false nen viet hoa van dung
check "SHORT_TEXT khong phan biet hoa thuong" \
  "$(attempt_score "$QS_TEXT" "$P_LIST1" SHORT_TEXT '"textValue":"ONE THOUSAND"')" "1.0"
# Dap an thu hai trong accepted_answers, chua dau phay
check "SHORT_TEXT nhan dap an co dau phay" \
  "$(attempt_score "$QS_TEXT" "$P_LIST1" SHORT_TEXT '"textValue":"1,000"')" "1.0"

# ---------------------------------------------------------------------
echo "== 3. Import ZIP audio/anh =="

python - <<'PYEOF' > /dev/null
import os, zipfile, struct

def wav(seconds=1, rate=8000):
    n = rate * seconds
    return (b'RIFF' + struct.pack('<I', 36 + n) + b'WAVEfmt ' +
            struct.pack('<IHHIIHH', 16, 1, 1, rate, rate, 1, 8) +
            b'data' + struct.pack('<I', n) + b'\x00' * n)

png = bytes.fromhex(
 '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4'
 '890000000a49444154789c630001000005000101'
 '0d0a2db40000000049454e44ae426082')

with zipfile.ZipFile(os.environ["TMPDIR"] + "/ct-assets.zip", 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('audio/listening-01.mp3', wav())
    z.writestr('images/pic-01.png', png)
    z.writestr('nested/deep/pic-02.png', png)
    # Zip slip: ten file co ../ phai bi lay lai thanh ten an toan
    z.writestr('../../etc/passwd.png', png)
    # Dinh dang khong duoc phep
    z.writestr('notes.txt', b'khong duoc phep')
    z.writestr('script.exe', b'MZ')
    # Rac cua trinh nen, khong tinh la file noi dung
    z.writestr('__MACOSX/._junk.png', b'junk')
PYEOF

ZSIZE=$(python -c "import os;print(os.path.getsize(os.environ['TMPDIR']+'/ct-assets.zip'))")
ZUP=$(curl -s -X POST $API/assets/upload-url -H "Authorization: Bearer $EAT" -H 'Content-Type: application/json' \
  -d "{\"assetType\":\"IMPORT_FILE\",\"mimeType\":\"application/zip\",\"filename\":\"assets.zip\",\"fileSize\":$ZSIZE}")
ZASSET=$(echo "$ZUP" | jq_ assetId)
curl -s -o /dev/null -X PUT "$(echo "$ZUP" | jq_ uploadUrl)" -H "Content-Type: application/zip" \
  --data-binary "@$TMPDIR/ct-assets.zip"
curl -s -o /dev/null -X POST $API/assets/$ZASSET/complete -H "Authorization: Bearer $EAT" \
  -H 'Content-Type: application/json' -d '{}'

ZJOB=$(curl -s -X POST $API/admin/import-jobs -H "Authorization: Bearer $EAT" -H 'Content-Type: application/json' \
  -d "{\"sourceAssetId\":\"$ZASSET\",\"importType\":\"ASSET_ZIP\"}" | jq_ id)
printf '  ...  cho import worker (toi da 60s)\n'
for i in $(seq 1 8); do
  S=$(curl -s $API/admin/import-jobs/$ZJOB -H "Authorization: Bearer $EAT" | jq_ status)
  case "$S" in COMPLETED|PARTIALLY_FAILED|FAILED) break;; esac
  sleep 8
done
ZRES=$(curl -s $API/admin/import-jobs/$ZJOB -H "Authorization: Bearer $EAT")

check "import ZIP PARTIALLY_FAILED" "$(echo "$ZRES" | jq_ status)" "PARTIALLY_FAILED"
check "4 file hop le vao duoc" "$(echo "$ZRES" | jq_ successRows)" "4"
check "2 dinh dang la bi tu choi" "$(echo "$ZRES" | jq_ failedRows)" "2"
check "rac trinh nen khong tinh la file" "$(echo "$ZRES" | jq_ totalRows)" "6"

EDID=$(mysql_ "SELECT id FROM users WHERE email='$EDITOR';")
check "audio nhan dung loai" \
  "$(mysql_ "SELECT asset_type FROM assets WHERE created_by='$EDID' AND original_filename='listening-01.mp3';")" "AUDIO"
check "anh nhan dung loai" \
  "$(mysql_ "SELECT asset_type FROM assets WHERE created_by='$EDID' AND original_filename='pic-01.png';")" "IMAGE"
# Ten file co ../ phai bi cat con ten thuan, object key sinh tu UUID
check "zip slip bi vo hieu hoa" \
  "$(mysql_ "SELECT COUNT(*) FROM assets WHERE created_by='$EDID' AND original_filename='passwd.png';")" "1"
check "khong co object key thoat thu muc" \
  "$(mysql_ "SELECT COUNT(*) FROM assets WHERE created_by='$EDID' AND object_key LIKE '%..%';")" "0"
check "file noi dung dung bucket rieng" \
  "$(mysql_ "SELECT DISTINCT bucket_name FROM assets WHERE created_by='$EDID' AND original_filename='pic-01.png';")" "aptis-content"

# ---------------------------------------------------------------------
echo "== 4. Webhook hoan tien bat dong bo =="

ASYNC=$(docker exec aptis-backend printenv SANDBOX_ASYNC_REFUND 2>/dev/null | tr -d '\r')
if [ "$ASYNC" = "true" ]; then
  ORD=$(curl -s -X POST $API/orders -H "Authorization: Bearer $SAT" -H 'Content-Type: application/json' \
    -H "Idempotency-Key: ct-order-$SUF" -d "{\"planId\":\"$PLAN_30\"}")
  OID=$(echo "$ORD" | jq_ id); OCODE=$(echo "$ORD" | jq_ orderCode)
  curl -s -o /dev/null -X POST $API/orders/$OID/payments -H "Authorization: Bearer $SAT" \
    -H 'Content-Type: application/json' -H "Idempotency-Key: ct-pay-$SUF" \
    -d '{"provider":"sandbox","returnUrl":"http://localhost/checkout"}'
  B="{\"eventId\":\"ct-pay-$SUF\",\"orderCode\":\"$OCODE\",\"transactionId\":\"cttx-$SUF\",\"amount\":199000,\"currency\":\"VND\",\"status\":\"SUCCESS\"}"
  curl -s -o /dev/null -X POST $API/payments/webhooks/sandbox -H 'Content-Type: application/json' \
    -H "x-signature: $(sign "$B")" -d "$B"
  check "premium bat sau mua" "$(curl -s $API/me -H "Authorization: Bearer $SAT" | jq_ premiumActive)" "True"

  RF=$(curl -s -X POST $API/admin/orders/$OID/refunds -H "Authorization: Bearer $AAT" \
    -H 'Content-Type: application/json' -d '{"reason":"ct hoan het"}')
  RFID=$(echo "$RF" | jq_ id)
  # Cong chua xac nhan: chua duoc thu hoi quyen, neu khong hoc vien bi khoa oan
  check "refund giu PROCESSING cho webhook" "$(echo "$RF" | jq_ status)" "PROCESSING"
  check "don chua REFUNDED" "$(mysql_ "SELECT status FROM orders WHERE id='$OID';")" "PAID"
  check "premium con giu khi chua xac nhan" "$(curl -s $API/me -H "Authorization: Bearer $SAT" | jq_ premiumActive)" "True"

  PRID=$(mysql_ "SELECT provider_refund_id FROM refunds WHERE id='$RFID';")
  RB="{\"eventId\":\"ct-rf-$SUF\",\"refundId\":\"$PRID\",\"amount\":199000,\"status\":\"SUCCESS\"}"

  # Chu ky sai phai bi tu choi
  check "chu ky sai bi tu choi" "$(curl -s -X POST $API/payments/webhooks/sandbox/refund-callbacks \
    -H 'Content-Type: application/json' -H "x-signature: sai" -d "$RB" | jq_ code)" "WEBHOOK_SIGNATURE_INVALID"
  check "chua thu hoi khi chu ky sai" "$(mysql_ "SELECT status FROM refunds WHERE id='$RFID';")" "PROCESSING"

  curl -s -o /dev/null -X POST $API/payments/webhooks/sandbox/refund-callbacks \
    -H 'Content-Type: application/json' -H "x-signature: $(sign "$RB")" -d "$RB"
  check "refund SUCCESS sau webhook" "$(mysql_ "SELECT status FROM refunds WHERE id='$RFID';")" "SUCCESS"
  check "don REFUNDED sau webhook" "$(mysql_ "SELECT status FROM orders WHERE id='$OID';")" "REFUNDED"
  check "subscription bi thu hoi" "$(mysql_ "SELECT status FROM user_subscriptions WHERE source_order_id='$OID';")" "REVOKED"
  check "premium tat sau webhook" "$(curl -s $API/me -H "Authorization: Bearer $SAT" | jq_ premiumActive)" "False"

  # Gui lai cung event: khong duoc thu hoi hai lan
  curl -s -o /dev/null -X POST $API/payments/webhooks/sandbox/refund-callbacks \
    -H 'Content-Type: application/json' -H "x-signature: $(sign "$RB")" -d "$RB"
  check "webhook gui lai khong tao ban ghi moi" \
    "$(mysql_ "SELECT COUNT(*) FROM refunds WHERE order_id='$OID';")" "1"
  check "so tien hoan khong bi cong doi" \
    "$(mysql_ "SELECT SUM(amount) FROM refunds WHERE order_id='$OID' AND status='SUCCESS';")" "199000"
else
  printf '  SKIP webhook hoan tien (SANDBOX_ASYNC_REFUND=true de test)\n'
fi

# ---------------------------------------------------------------------
echo "== 5. Don file bao cao qua han =="

EJOB=$(curl -s -X POST $API/admin/export-jobs -H "Authorization: Bearer $AAT" \
  -H 'Content-Type: application/json' -d '{"exportType":"USER_LIST"}' | jq_ id)
printf '  ...  cho export worker (toi da 60s)\n'
for i in $(seq 1 8); do
  S=$(curl -s $API/admin/export-jobs/$EJOB -H "Authorization: Bearer $AAT" | jq_ status)
  case "$S" in COMPLETED|FAILED) break;; esac
  sleep 8
done
check "export COMPLETED" "$(curl -s $API/admin/export-jobs/$EJOB -H "Authorization: Bearer $AAT" | jq_ status)" "COMPLETED"

# Lay bucket/key TRUOC khi don: sau khi don thi ban ghi asset khong con, bien
# rong se lam "mc ls local//" liet ke ca bucket va bao nham la file van con.
EASSET=$(mysql_ "SELECT result_asset_id FROM export_jobs WHERE id='$EJOB';")
EBUCKET=$(mysql_ "SELECT bucket_name FROM assets WHERE id='$EASSET';")
EKEY=$(mysql_ "SELECT object_key FROM assets WHERE id='$EASSET';")
check "doc duoc vi tri file trong DB" \
  "$([ -n "$EBUCKET" ] && [ -n "$EKEY" ] && echo yes || echo no)" "yes"
check "file ton tai tren MinIO" \
  "$(docker exec aptis-minio mc ls "local/$EBUCKET/$EKEY" >/dev/null 2>&1 && echo yes || echo no)" "yes"

PURGE=$(docker exec aptis-backend printenv EXPORT_PURGE_INTERVAL 2>/dev/null | tr -d '\r')
if [ "$PURGE" = "PT20S" ]; then
  # Day han ve qua khu de job don ngay o lan chay ke tiep
  mysql_ "UPDATE export_jobs SET expires_at = DATE_SUB(NOW(), INTERVAL 1 DAY) WHERE id='$EJOB';"
  printf '  ...  cho job don file (toi da 50s)\n'
  for i in $(seq 1 10); do
    [ "$(mysql_ "SELECT IFNULL(result_asset_id,'null') FROM export_jobs WHERE id='$EJOB';")" = "null" ] && break
    sleep 5
  done
  check "job da bo tham chieu asset" \
    "$(mysql_ "SELECT IFNULL(result_asset_id,'null') FROM export_jobs WHERE id='$EJOB';")" "null"
  check "ban ghi asset da xoa" "$(mysql_ "SELECT COUNT(*) FROM assets WHERE id='$EASSET';")" "0"
  check "file da xoa khoi MinIO" \
    "$(docker exec aptis-minio mc ls "local/$EBUCKET/$EKEY" 2>/dev/null | grep -c "$(basename "$EKEY")")" "0"
  # Ban ghi job van con de con biet ai da xuat gi
  check "van giu lich su job export" "$(mysql_ "SELECT COUNT(*) FROM export_jobs WHERE id='$EJOB';")" "1"
  check "job chua qua han khong bi don" \
    "$(mysql_ "SELECT COUNT(*) FROM export_jobs WHERE status='COMPLETED'
                AND expires_at > NOW() AND result_asset_id IS NULL;")" "0"
else
  printf '  SKIP don file (EXPORT_PURGE_INTERVAL=PT20S de test)\n'
fi

# ---------------------------------------------------------------------
printf '\nPASS=%d  FAIL=%d\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
