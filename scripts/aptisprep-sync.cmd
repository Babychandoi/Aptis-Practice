@echo off
rem Task Scheduler gọi file này mỗi ngày (07:00 và 21:30) để đồng bộ dự đoán đề và bài khởi động từ aptisprep.com.
rem Mỗi bước chạy qua run-job-step.cmd: tự bật Docker, thử lại khi lỗi, ghi kết quả cho backend
rem theo dõi. Log nối vào logs\aptisprep-sync.log. Bước nào hỏng thì file trả mã 1.
chcp 65001 >nul
cd /d "%~dp0.."
if not exist logs mkdir logs
set FAIL=0
call scripts\run-job-step.cmd scripts/aptisprep-sync.mjs --apply >> logs\aptisprep-sync.log 2>&1 || set FAIL=1
call scripts\run-job-step.cmd scripts/aptisprep-warmup.mjs --apply >> logs\aptisprep-sync.log 2>&1 || set FAIL=1
exit /b %FAIL%
