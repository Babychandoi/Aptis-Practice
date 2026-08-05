#!/usr/bin/env bash
# Kiểm chứng end-to-end 4 phần bổ sung:
#   1. Admin API soạn/duyệt/publish câu hỏi
#   2. Mã giảm giá
#   3. Thi thử từ blueprint
#   4. Worker chấm AI Speaking/Writing
#
# Script tự chuẩn bị tài khoản và quyền cần thiết nên chạy độc lập được, không
# phụ thuộc thứ tự với scripts/e2e-smoke.sh.
#
#   bash scripts/e2e-admin-mock-ai.sh
#
# CHỈ dùng cho môi trường phát triển — nó ghi và xóa dữ liệu giao dịch.
set -uo pipefail

API=http://localhost:8080/api/v1
ADMIN=$API/admin/question-sets
PASS_WORD="MatKhau12345"

STUDENT=e2e@test.local
EDITOR=editor-e2e@test.local

PART_GRAMMAR=16000000-0000-4000-8000-000000000001
PART_VOCAB=16000000-0000-4000-8000-000000000002
PART_WRITING4=16000000-0000-4000-8000-000000000044
TT_SINGLE=12000000-0000-4000-8000-000000000001
TT_LONGTEXT=12000000-0000-4000-8000-000000000009
PLAN_30=18000000-0000-4000-8000-000000000001
PLAN_90=18000000-0000-4000-8000-000000000002
MOCK_SHORT=19000000-0000-4000-8000-000000000002

pass=0; fail=0
check() {
  if [ "$2" = "$3" ]; then printf '  OK   %-50s %s\n' "$1" "$2"; pass=$((pass+1))
  else printf '  FAIL %-50s got=%s want=%s\n' "$1" "$2" "$3"; fail=$((fail+1)); fi
}
jq_() { python -c "
import sys, json
try: d = json.load(sys.stdin)
except Exception: print('PARSE_ERROR'); raise SystemExit
for part in sys.argv[1].split('.'):
    if d is None: break
    if part.isdigit(): d = d[int(part)] if len(d) > int(part) else None
    elif isinstance(d, dict): d = d.get(part)
    else: d = None
print(d if d is not None else 'null')
" "$1"; }
mysql_() { docker exec aptis-mysql mysql -uaptis -paptis aptis -N -e "$1" 2>/dev/null | tr -d '\r'; }

login() {
  curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$PASS_WORD\"}" | jq_ accessToken
}

# ---------------------------------------------------------------------
echo "== 0. Chuan bi tai khoan =="

# Reset trạng thái mã giảm giá và lượt đã dùng để script chạy lại được nhiều lần.
# Không reset thì lần thứ hai sẽ fail vì max_uses_per_user đã hết.
mysql_ "DELETE FROM promotion_redemptions;
        UPDATE promotion_codes SET total_used_count = 0, status = 'ACTIVE'
        WHERE code IN ('WELCOME20','SAVE50K');" >/dev/null

# Dọn bộ câu hỏi do các lần chạy trước tạo (code bắt đầu bằng E2E_), để DB không
# phình và selector không lẫn giữa các lần chạy.
mysql_ "DELETE aqs FROM attempt_question_sets aqs
          JOIN question_sets qs ON qs.id = aqs.question_set_id
         WHERE qs.code LIKE 'E2E\_%';
        DELETE FROM question_sets WHERE code LIKE 'E2E\_%';" >/dev/null
docker exec aptis-mongo mongosh aptis --quiet --eval \
  'db.question_set_documents.deleteMany({title: /^E2E /});
   db.question_set_revisions.deleteMany({})' >/dev/null 2>&1

# Trả lại bộ Writing bị lưu trữ ở bước cô lập của lần chạy trước.
# Giới hạn đúng Part mà script này can thiệp để không đụng nội dung thật.
mysql_ "UPDATE question_sets SET status='PUBLISHED'
        WHERE part_id='$PART_WRITING4' AND status='ARCHIVED' AND published_at IS NOT NULL;" >/dev/null

# Học viên: đăng ký + xác thực nếu chưa có
if [ "$(mysql_ "SELECT COUNT(*) FROM users WHERE email='$STUDENT';")" = "0" ]; then
  curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"email\":\"$STUDENT\",\"password\":\"$PASS_WORD\",\"fullName\":\"E2E Student\"}"
  mysql_ "UPDATE users SET status='ACTIVE', email_verified_at=NOW() WHERE email='$STUDENT';"
fi

# Biên tập viên: có cả quyền soạn và quyền duyệt
if [ "$(mysql_ "SELECT COUNT(*) FROM users WHERE email='$EDITOR';")" = "0" ]; then
  curl -s -o /dev/null -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EDITOR\",\"password\":\"$PASS_WORD\",\"fullName\":\"E2E Editor\"}"
fi
mysql_ "UPDATE users SET status='ACTIVE', email_verified_at=NOW() WHERE email='$EDITOR';
        INSERT IGNORE INTO user_roles (user_id, role_id, assigned_at)
        SELECT u.id, r.id, NOW() FROM users u, roles r
        WHERE u.email='$EDITOR' AND r.code IN ('CONTENT_EDITOR','CONTENT_REVIEWER');"

# Cấp Premium trực tiếp cho học viên: bộ này kiểm tra admin/thi thử/chấm AI,
# còn luồng mua Premium đã có bộ e2e-smoke.sh phụ trách.
mysql_ "INSERT INTO user_entitlements
          (id, user_id, entitlement_code, source_type, source_id, starts_at, ends_at,
           created_at, updated_at)
        SELECT UUID(), u.id, 'PREMIUM_CONTENT_ACCESS', 'ADMIN_GRANT', NULL,
               UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY),
               UTC_TIMESTAMP(), UTC_TIMESTAMP()
        FROM users u
        WHERE u.email = '$STUDENT'
          AND NOT EXISTS (
            SELECT 1 FROM user_entitlements e
            WHERE e.user_id = u.id AND e.entitlement_code = 'PREMIUM_CONTENT_ACCESS'
              AND e.revoked_at IS NULL);" >/dev/null

SAT=$(login "$STUDENT")
EAT=$(login "$EDITOR")
check "student login" "$([ ${#SAT} -gt 50 ] && echo yes || echo no)" "yes"
check "editor login"  "$([ ${#EAT} -gt 50 ] && echo yes || echo no)" "yes"
check "editor co quyen publish" \
  "$(curl -s $API/me -H "Authorization: Bearer $EAT" | python -c "
import sys,json; print('yes' if 'question_set:publish' in json.load(sys.stdin)['permissions'] else 'no')")" "yes"

# ---------------------------------------------------------------------
echo "== 1. Admin API: soan cau hoi =="

SUFFIX=$(mysql_ "SELECT UNIX_TIMESTAMP();")
CODE="E2E_QS_$SUFFIX"

CREATE=$(cat <<EOF
{"partId":"$PART_VOCAB","taskTypeId":"$TT_SINGLE","code":"$CODE",
 "title":"E2E Vocabulary","difficulty":2,"accessLevel":"FREE","estimatedSeconds":60,
 "content":{"instructions":"Chon dap an dung.",
  "items":[
   {"id":"item_1","sequenceNo":1,"responseType":"SINGLE_CHOICE","maxScore":1,
    "prompt":{"format":"PLAIN_TEXT","value":"She ___ an interest in music."},
    "options":[{"id":"A","code":"A","content":"makes"},{"id":"B","code":"B","content":"takes"}],
    "answerKey":{"type":"SINGLE_CHOICE","selectedOptionId":"B"},
    "explanation":{"format":"PLAIN_TEXT","value":"take an interest in."}}],
  "settings":{"shuffleOptions":false},"scoring":{"strategy":"EXACT_MATCH"}}}
EOF
)
QS=$(curl -s -X POST $ADMIN -H "Authorization: Bearer $EAT" -H 'Content-Type: application/json' -d "$CREATE")
QSID=$(echo "$QS" | jq_ id)
check "tao duoc bo cau hoi" "$(echo "$QS" | jq_ status)" "DRAFT"
check "itemCount tu noi dung" "$(echo "$QS" | jq_ itemCount)" "1"
check "maxScore tu noi dung"  "$(echo "$QS" | jq_ maxScore)" "1.0"
check "code trung bi chan" "$(curl -s -X POST $ADMIN -H "Authorization: Bearer $EAT" \
  -H 'Content-Type: application/json' -d "$CREATE" | jq_ code)" "CONFLICT"

echo "== 2. Admin API: vong doi duyet =="
check "publish tu DRAFT bi chan" "$(curl -s -X POST $ADMIN/$QSID/publish -H "Authorization: Bearer $EAT" \
  -H 'Content-Type: application/json' -d '{}' | jq_ code)" "INVALID_CONTENT_STATE_TRANSITION"
check "submit-review" "$(curl -s -X POST $ADMIN/$QSID/submit-review -H "Authorization: Bearer $EAT" \
  -H 'Content-Type: application/json' -d '{"note":"xin duyet"}' | jq_ status)" "IN_REVIEW"

PUB=$(curl -s -X POST $ADMIN/$QSID/publish -H "Authorization: Bearer $EAT" \
  -H 'Content-Type: application/json' -d '{"note":"duyet"}')
check "publish thanh cong" "$(echo "$PUB" | jq_ status)" "PUBLISHED"
check "khong con loi validate" "$(echo "$PUB" | python -c "
import sys,json; print(len(json.load(sys.stdin)['errors']))")" "0"
check "co checksum" "$(echo "$PUB" | python -c "
import sys,json; print('yes' if json.load(sys.stdin)['contentChecksum'] else 'no')")" "yes"
check "sua khi PUBLISHED bi chan" "$(curl -s -X PATCH $ADMIN/$QSID -H "Authorization: Bearer $EAT" \
  -H 'Content-Type: application/json' -d '{"title":"x"}' | jq_ code)" "INVALID_CONTENT_STATE_TRANSITION"
check "revision history" "$(curl -s $ADMIN/$QSID/revisions -H "Authorization: Bearer $EAT" | jq_ 0.revision)" "1"

echo "== 3. Admin API: validate truoc publish =="
BADCODE="E2E_BAD_$SUFFIX"
BAD=$(cat <<EOF
{"partId":"$PART_VOCAB","taskTypeId":"$TT_SINGLE","code":"$BADCODE",
 "title":"Bo loi","accessLevel":"FREE",
 "content":{"items":[
   {"id":"item_1","sequenceNo":1,"responseType":"SINGLE_CHOICE","maxScore":1,
    "options":[{"id":"A","code":"A","content":"one"},{"id":"A","code":"B","content":"trung"}],
    "answerKey":{"type":"SINGLE_CHOICE","selectedOptionId":"Z"}},
   {"id":"item_2","sequenceNo":2,"responseType":"LONG_TEXT","maxScore":5}]}}
EOF
)
BADID=$(curl -s -X POST $ADMIN -H "Authorization: Bearer $EAT" -H 'Content-Type: application/json' -d "$BAD" | jq_ id)
curl -s -o /dev/null -X POST $ADMIN/$BADID/submit-review -H "Authorization: Bearer $EAT" \
  -H 'Content-Type: application/json' -d '{}'
BADPUB=$(curl -s -X POST $ADMIN/$BADID/publish -H "Authorization: Bearer $EAT" \
  -H 'Content-Type: application/json' -d '{}')
check "noi dung loi khong publish" "$(echo "$BADPUB" | jq_ status)" "IN_REVIEW"
check "bat >= 4 loi validate" "$(echo "$BADPUB" | python -c "
import sys,json; print('yes' if len(json.load(sys.stdin)['errors']) >= 4 else 'no')")" "yes"

echo "== 4. Admin API: preview khong lo dap an =="
check "preview an dap an" "$(curl -s "$ADMIN/$QSID/preview" -H "Authorization: Bearer $EAT" | python -c "
import sys,json
d=json.load(sys.stdin)
leak=[i for i in d['content']['items'] if i.get('answerKey') or i.get('explanation')]
print('leaked' if leak else 'hidden')")" "hidden"
check "preview reveal cho editor" "$(curl -s "$ADMIN/$QSID/preview?revealAnswers=true" \
  -H "Authorization: Bearer $EAT" | jq_ content.items.0.answerKey.selectedOptionId)" "B"
check "hoc vien khong vao duoc admin API" "$(curl -s -o /dev/null -w '%{http_code}' \
  "$ADMIN/$QSID" -H "Authorization: Bearer $SAT")" "403"

echo "== 5. Hoc vien thay bai vua publish =="
check "bai moi xuat hien" "$(curl -s "$API/parts/$PART_VOCAB/question-sets" \
  -H "Authorization: Bearer $SAT" | python -c "
import sys,json
qs=[q for q in json.load(sys.stdin) if q['code']=='$CODE']
print('yes' if qs and qs[0]['canAccess'] else 'no')")" "yes"

# ---------------------------------------------------------------------
echo "== 6. Ma giam gia: tinh tien =="
chkpromo() { curl -s -X POST $API/promotions/check -H "Authorization: Bearer $SAT" \
  -H 'Content-Type: application/json' -d "{\"planId\":\"$1\",\"promotionCode\":\"$2\"}"; }

check "WELCOME20 / 199k = 39800" "$(chkpromo $PLAN_30 WELCOME20 | jq_ discountAmount)" "39800"
check "WELCOME20 / 499k chan tran 100k" "$(chkpromo $PLAN_90 WELCOME20 | jq_ discountAmount)" "99800"
check "SAVE50K duoi min order" "$(chkpromo $PLAN_30 SAVE50K | jq_ errorCode)" "PROMOTION_CODE_INVALID"
check "SAVE50K dat min order" "$(chkpromo $PLAN_90 SAVE50K | jq_ discountAmount)" "50000"
check "ma khong ton tai" "$(chkpromo $PLAN_30 NOSUCHCODE | jq_ errorCode)" "PROMOTION_CODE_INVALID"
check "chuan hoa chu thuong" "$(chkpromo $PLAN_30 welcome20 | jq_ discountAmount)" "39800"

echo "== 7. Ma giam gia: ap vao don =="
ORD=$(curl -s -X POST $API/orders -H "Authorization: Bearer $SAT" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: e2e-promo-$SUFFIX" -d "{\"planId\":\"$PLAN_30\",\"promotionCode\":\"WELCOME20\"}")
OID=$(echo "$ORD" | jq_ id); OCODE=$(echo "$ORD" | jq_ orderCode)
check "don ap ma: total 159200" "$(echo "$ORD" | jq_ totalAmount)" "159200"
check "chua dot ma khi tao don" "$(mysql_ "SELECT total_used_count FROM promotion_codes WHERE code='WELCOME20';")" "0"

curl -s -o /dev/null -X POST $API/orders/$OID/payments -H "Authorization: Bearer $SAT" \
  -H 'Content-Type: application/json' -H "Idempotency-Key: e2e-promopay-$SUFFIX" \
  -d '{"provider":"sandbox","returnUrl":"http://localhost/checkout"}'

sign() { python -c "import hmac,hashlib,sys; print(hmac.new(b'sandbox-secret', sys.argv[1].encode(), hashlib.sha256).hexdigest())" "$1"; }
B="{\"eventId\":\"e2e-promo-orig-$SUFFIX\",\"orderCode\":\"$OCODE\",\"transactionId\":\"tx1\",\"amount\":199000,\"currency\":\"VND\",\"status\":\"SUCCESS\"}"
check "webhook gia GOC bi chan" "$(curl -s -X POST $API/payments/webhooks/sandbox \
  -H 'Content-Type: application/json' -H "x-signature: $(sign "$B")" -d "$B" | jq_ processed)" "False"

B="{\"eventId\":\"e2e-promo-ok-$SUFFIX\",\"orderCode\":\"$OCODE\",\"transactionId\":\"tx2\",\"amount\":159200,\"currency\":\"VND\",\"status\":\"SUCCESS\"}"
check "webhook gia DA GIAM ok" "$(curl -s -X POST $API/payments/webhooks/sandbox \
  -H 'Content-Type: application/json' -H "x-signature: $(sign "$B")" -d "$B" | jq_ processed)" "True"
check "dot ma sau thanh toan" "$(mysql_ "SELECT total_used_count FROM promotion_codes WHERE code='WELCOME20';")" "1"
check "ghi redemption" "$(mysql_ "SELECT COUNT(*) FROM promotion_redemptions;")" "1"
check "het luot / nguoi dung" "$(chkpromo $PLAN_30 WELCOME20 | jq_ errorCode)" "PROMOTION_CODE_EXHAUSTED"

# ---------------------------------------------------------------------
echo "== 8. Thi thu tu blueprint =="
MOCKS=$(curl -s $API/mock-tests -H "Authorization: Bearer $SAT")
check "co de thi thu" "$(echo "$MOCKS" | python -c "
import sys,json; print('yes' if len(json.load(sys.stdin)) >= 2 else 'no')")" "yes"
check "de day du co 18 Part" "$(echo "$MOCKS" | python -c "
import sys,json
m=[x for x in json.load(sys.stdin) if x['code']=='MOCK_FULL_V1']
print(len(m[0]['parts']) if m else 0)")" "18"

MATT=$(curl -s -X POST $API/mock-tests/$MOCK_SHORT/attempts -H "Authorization: Bearer $SAT")
MAID=$(echo "$MATT" | jq_ id)
check "tao luot thi thu" "$(echo "$MATT" | jq_ mode)" "MOCK_TEST"
check "thoi gian tu blueprint" "$(echo "$MATT" | jq_ durationSeconds)" "1800"
check "trang thai CREATED" "$(echo "$MATT" | jq_ status)" "CREATED"

curl -s -o /dev/null -X POST $API/attempts/$MAID/start -H "Authorization: Bearer $SAT"
QSFREE=$(echo "$MATT" | jq_ questionSets.0.questionSetId)
curl -s -o /dev/null -X PUT "$API/attempts/$MAID/responses/$QSFREE" -H "Authorization: Bearer $SAT" \
  -H 'Content-Type: application/json' \
  -d '{"itemResponses":[{"itemId":"item_1","responseType":"SINGLE_CHOICE","selectedOptionId":"B"},{"itemId":"item_2","responseType":"SINGLE_CHOICE","selectedOptionId":"B"}],"timeSpentSeconds":30}'
check "nop thi thu" "$(curl -s -X POST $API/attempts/$MAID/submit -H "Authorization: Bearer $SAT" | jq_ status)" "COMPLETED"
# Đếm theo Part/học phần thực sự có trong lượt, không giả định ngân hàng đề chỉ
# có mỗi bộ của script này — bộ khác (kể cả do script khác tạo) cũng vào đề thi
# thử nếu cùng blueprint.
MAPARTS=$(mysql_ "SELECT COUNT(DISTINCT p.id) FROM attempt_question_sets aqs
                    JOIN question_sets qs ON qs.id = aqs.question_set_id
                    JOIN parts p ON p.id = qs.part_id
                   WHERE aqs.attempt_id='$MAID';")
MACOMPS=$(mysql_ "SELECT COUNT(DISTINCT c.id) FROM attempt_question_sets aqs
                    JOIN question_sets qs ON qs.id = aqs.question_set_id
                    JOIN parts p ON p.id = qs.part_id
                    JOIN components c ON c.id = p.component_id
                   WHERE aqs.attempt_id='$MAID';")
check "co diem theo Part" "$(mysql_ "SELECT COUNT(*) FROM attempt_part_scores WHERE attempt_id='$MAID';")" "$MAPARTS"
check "co diem theo hoc phan" "$(mysql_ "SELECT COUNT(*) FROM attempt_component_scores WHERE attempt_id='$MAID';")" "$MACOMPS"
# CEFR của đúng học phần chứa bộ vừa trả lời đủ điểm
check "CEFR theo hoc phan" "$(mysql_ "SELECT acs.cefr_level FROM attempt_component_scores acs
                    JOIN components c ON c.id = acs.component_id
                    JOIN parts p ON p.component_id = c.id
                    JOIN question_sets qs ON qs.part_id = p.id
                   WHERE acs.attempt_id='$MAID' AND qs.id='$QSFREE' LIMIT 1;")" "C2"

# ---------------------------------------------------------------------
echo "== 9. Worker cham AI (Writing) =="
WCODE="E2E_WR_$SUFFIX"
WQS=$(cat <<EOF
{"partId":"$PART_WRITING4","taskTypeId":"$TT_LONGTEXT","code":"$WCODE",
 "title":"E2E Writing Part 4","accessLevel":"FREE","estimatedSeconds":1800,
 "content":{"instructions":"Viet email trang trong 120-150 tu.",
  "items":[{"id":"item_1","sequenceNo":1,"responseType":"LONG_TEXT","maxScore":25,
    "prompt":{"format":"PLAIN_TEXT","value":"Write an email to the club manager."},
    "constraints":{"minWords":120,"maxWords":150,"register":"FORMAL"},
    "rubricCode":"APTIS_WRITING_PART_4_V1"}],
  "scoring":{"strategy":"RUBRIC","partialCredit":true}}}
EOF
)
WID=$(curl -s -X POST $ADMIN -H "Authorization: Bearer $EAT" -H 'Content-Type: application/json' -d "$WQS" | jq_ id)
curl -s -o /dev/null -X POST $ADMIN/$WID/submit-review -H "Authorization: Bearer $EAT" \
  -H 'Content-Type: application/json' -d '{}'
check "publish bo Writing" "$(curl -s -X POST $ADMIN/$WID/publish -H "Authorization: Bearer $EAT" \
  -H 'Content-Type: application/json' -d '{}' | jq_ status)" "PUBLISHED"

# Selector ưu tiên bộ chưa làm, nên attempt có thể lấy bộ Writing của lần chạy
# trước chứ không phải bộ vừa tạo. Lưu trữ các bộ Writing cũ để chỉ còn bộ mới
# là ứng viên duy nhất — đây là hạn chế của test, không phải của selector.
mysql_ "UPDATE question_sets SET status='ARCHIVED'
        WHERE part_id='$PART_WRITING4' AND id <> '$WID';" >/dev/null

WATT=$(curl -s -X POST $API/practice/part-attempts -H "Authorization: Bearer $SAT" \
  -H 'Content-Type: application/json' -d "{\"partId\":\"$PART_WRITING4\",\"questionSetCount\":1}")
WAID=$(echo "$WATT" | jq_ id)
check "attempt dung bo vua publish" "$(echo "$WATT" | jq_ questionSets.0.questionSetId)" "$WID"
curl -s -o /dev/null -X POST $API/attempts/$WAID/start -H "Authorization: Bearer $SAT"

python -c "
import json, io
essay = ('Dear Sir or Madam, I am writing to express my concern about the changing rooms '
 'at the sports club. Although I have been a member for three years, the facilities have '
 'deteriorated noticeably. The lockers are frequently broken, and several showers do not '
 'produce hot water. Moreover, the floors are often wet and slippery, which creates a real '
 'safety risk. Therefore, I would like to suggest improvements. Firstly, the broken lockers '
 'should be repaired. Secondly, the plumbing needs inspection to restore hot water. Finally, '
 'installing non-slip mats would reduce accidents considerably. I would be grateful if you '
 'could consider these suggestions. Thank you for your attention. Yours sincerely, Test')
io.open('/tmp/e2e_essay.json','w',encoding='utf-8').write(json.dumps({
 'itemResponses':[{'itemId':'item_1','responseType':'LONG_TEXT','textValue':essay}],
 'timeSpentSeconds':900})) " 2>/dev/null || true

ESSAY_JSON=$(python -c "
import json
essay = ('Dear Sir or Madam, I am writing to express my concern about the changing rooms '
 'at the sports club. Although I have been a member for three years, the facilities have '
 'deteriorated noticeably. The lockers are frequently broken, and several showers do not '
 'produce hot water. Moreover, the floors are often wet and slippery, which creates a real '
 'safety risk. Therefore, I would like to suggest improvements. Firstly, the broken lockers '
 'should be repaired. Secondly, the plumbing needs inspection to restore hot water. Finally, '
 'installing non-slip mats would reduce accidents considerably. I would be grateful if you '
 'could consider these suggestions. Thank you for your attention. Yours sincerely, Test')
print(json.dumps({'itemResponses':[{'itemId':'item_1','responseType':'LONG_TEXT','textValue':essay}],'timeSpentSeconds':900}))")

curl -s -o /dev/null -X PUT "$API/attempts/$WAID/responses/$WID" -H "Authorization: Bearer $SAT" \
  -H 'Content-Type: application/json' -d "$ESSAY_JSON"

check "nop Writing -> SCORING" "$(curl -s -X POST $API/attempts/$WAID/submit \
  -H "Authorization: Bearer $SAT" | jq_ status)" "SCORING"
check "tao job WRITING_AI" "$(mysql_ "SELECT evaluation_type FROM evaluation_jobs WHERE attempt_id='$WAID';")" "WRITING_AI"

printf '  ...  cho worker cham (toi da 60s)\n'
for i in $(seq 1 8); do
  S=$(mysql_ "SELECT status FROM evaluation_jobs WHERE attempt_id='$WAID';")
  case "$S" in COMPLETED|FAILED) break;; esac
  sleep 8
done
check "job COMPLETED" "$(mysql_ "SELECT status FROM evaluation_jobs WHERE attempt_id='$WAID';")" "COMPLETED"
check "job khong retry" "$(mysql_ "SELECT retry_count FROM evaluation_jobs WHERE attempt_id='$WAID';")" "0"
check "attempt chot diem" "$(mysql_ "SELECT status FROM test_attempts WHERE id='$WAID';")" "COMPLETED"
check "mot summary / job" "$(mysql_ "SELECT COUNT(*) FROM evaluation_summaries WHERE attempt_id='$WAID';")" "1"

EVAL=$(curl -s "$API/attempts/$WAID/evaluations" -H "Authorization: Bearer $SAT")
check "API tra ket qua cham" "$(echo "$EVAL" | jq_ 0.evaluatorType)" "AI"
check "cham theo 5 tieu chi rubric" "$(echo "$EVAL" | python -c "
import sys,json; print(len(json.load(sys.stdin)[0]['criteria']))")" "5"
check "co CEFR" "$(echo "$EVAL" | python -c "
import sys,json; print('yes' if json.load(sys.stdin)[0]['cefrLevel'] else 'no')")" "yes"
check "co feedback" "$(echo "$EVAL" | python -c "
import sys,json; print('yes' if json.load(sys.stdin)[0]['feedback']['summary'] else 'no')")" "yes"

echo
echo "================================"
printf "PASS=%d  FAIL=%d\n" "$pass" "$fail"
echo "================================"
[ "$fail" -eq 0 ]
