@echo off
rem Task Scheduler gọi file này mỗi Chủ nhật: nhập đề mới từ aptisprep.com, rồi đồng bộ
rem Đề trọng điểm tháng. Chạy trong Docker (xem run-node-in-docker.cmd);
rem log nối vào logs\aptisprep-weekly.log.
chcp 65001 >nul
cd /d "%~dp0.."
if not exist logs mkdir logs
call scripts\run-node-in-docker.cmd scripts/aptisprep-weekly.mjs --apply >> logs\aptisprep-weekly.log 2>&1
call scripts\run-node-in-docker.cmd scripts/aptisprep-monthly-focus.mjs --apply >> logs\aptisprep-weekly.log 2>&1
