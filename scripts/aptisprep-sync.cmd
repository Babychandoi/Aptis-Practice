@echo off
rem Task Scheduler gọi file này mỗi ngày để đồng bộ dự đoán đề từ aptisprep.com.
rem Chạy trong Docker (xem run-node-in-docker.cmd); log nối vào logs\aptisprep-sync.log.
chcp 65001 >nul
cd /d "%~dp0.."
if not exist logs mkdir logs
call scripts\run-node-in-docker.cmd scripts/aptisprep-sync.mjs --apply >> logs\aptisprep-sync.log 2>&1
