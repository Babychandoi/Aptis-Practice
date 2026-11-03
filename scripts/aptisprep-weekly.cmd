@echo off
rem Task Scheduler gọi file này mỗi Chủ nhật để nhập đề mới từ aptisprep.com.
rem Chỉ thêm đề chưa có; log nối vào logs\aptisprep-weekly.log.
chcp 65001 >nul
cd /d "%~dp0.."
if not exist logs mkdir logs
"C:\Program Files\nodejs\node.exe" scripts\aptisprep-weekly.mjs --apply >> logs\aptisprep-weekly.log 2>&1
