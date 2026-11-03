@echo off
rem Task Scheduler gọi file này mỗi ngày để đồng bộ dự đoán đề từ aptisprep.com.
rem Không có thay đổi thì script tự bỏ qua; log nối vào logs\aptisprep-sync.log.
chcp 65001 >nul
cd /d "%~dp0.."
if not exist logs mkdir logs
"C:\Program Files\nodejs\node.exe" scripts\aptisprep-sync.mjs --apply >> logs\aptisprep-sync.log 2>&1
