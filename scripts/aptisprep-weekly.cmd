@echo off
rem Task Scheduler gọi file này mỗi Chủ nhật: nhập đề mới từ aptisprep.com, đồng bộ
rem Đề trọng điểm tháng, ẩn đề không còn trên trang luyện của web, rồi cho bài test theo kỹ năng dùng đề chuẩn.
rem Mỗi bước chạy qua run-job-step.cmd: tự bật Docker, thử lại khi lỗi, ghi kết quả cho backend
rem theo dõi. Log nối vào logs\aptisprep-weekly.log. Bước nào hỏng thì file trả mã 1.
chcp 65001 >nul
cd /d "%~dp0.."
if not exist logs mkdir logs
set FAIL=0
call scripts\run-job-step.cmd scripts/aptisprep-weekly.mjs --apply >> logs\aptisprep-weekly.log 2>&1 || set FAIL=1
call scripts\run-job-step.cmd scripts/aptisprep-monthly-focus.mjs --apply >> logs\aptisprep-weekly.log 2>&1 || set FAIL=1
call scripts\run-job-step.cmd scripts/aptisprep-practice-curate.mjs --apply --no-import --dir=today >> logs\aptisprep-weekly.log 2>&1 || set FAIL=1
call scripts\run-job-step.cmd scripts/rebuild-skill-mocks.mjs --apply --dir=today >> logs\aptisprep-weekly.log 2>&1 || set FAIL=1
exit /b %FAIL%
