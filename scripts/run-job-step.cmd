@echo off
rem Chạy một bước của job đồng bộ cho chắc ăn:
rem   1. Docker chưa chạy thì bật Docker Desktop, chờ MySQL sẵn sàng.
rem   2. Lỗi thì thử lại, tối đa 3 lần, cách nhau 5 phút (mạng chập chờn, aptisprep chậm…).
rem   3. Ghi kết quả vào bảng sync_job_runs — backend đọc bảng này để báo khi job hỏng.
rem   4. Trả mã lỗi thật để file gọi (và Task Scheduler) biết bước này thất bại.
rem Vì sao: 12–16/11/2026 job lỗi kết nối suốt 4 ngày mà Task Scheduler vẫn báo thành công.
rem
rem   call scripts\run-job-step.cmd scripts/aptisprep-sync.mjs --apply
rem Tên bước lấy theo tên file script (aptisprep-sync). Không dùng shift vì cmd tách
rem "--dir=today" thành hai tham số; %* thì giữ nguyên.
setlocal EnableDelayedExpansion
set "JOB=%~n1"
set DOCKER="C:\Program Files\Docker\Docker\resources\bin\docker.exe"
set N=0
set RC=1

call :ensure_docker
if errorlevel 1 goto record

:try
set /a N+=1
call "%~dp0run-node-in-docker.cmd" %*
set RC=!ERRORLEVEL!
if !RC! EQU 0 goto record
if !N! GEQ 3 goto record
echo   * bước %JOB% lỗi mã !RC! (lần !N!/3), thử lại sau 5 phút
rem ping thay cho timeout: timeout báo lỗi khi chạy không có bàn phím (Task Scheduler).
ping -n 301 127.0.0.1 >nul
call :ensure_docker
goto try

:record
if !RC! EQU 0 (set ST=OK) else (set ST=FAILED)
%DOCKER% exec aptis-mysql mysql -uroot -proot aptis -e "INSERT INTO sync_job_runs (job, status, attempts, finished_at) VALUES ('%JOB%', '!ST!', !N!, CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00'))" >nul 2>&1
if !RC! NEQ 0 echo   LỖI: bước %JOB% THẤT BẠI sau !N! lần, backend sẽ gửi mail cảnh báo
endlocal & exit /b %RC%

:ensure_docker
%DOCKER% info >nul 2>&1
if not errorlevel 1 goto wait_mysql
echo   * Docker chưa chạy, bật Docker Desktop
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
for /l %%i in (1,1,36) do (
    ping -n 6 127.0.0.1 >nul
    %DOCKER% info >nul 2>&1
    if not errorlevel 1 goto wait_mysql
)
echo   LỖI: Docker không lên sau 3 phút
exit /b 1

:wait_mysql
for /l %%i in (1,1,36) do (
    %DOCKER% inspect -f "{{.State.Health.Status}}" aptis-mysql 2>nul | findstr /b /c:"healthy" >nul
    if not errorlevel 1 exit /b 0
    ping -n 6 127.0.0.1 >nul
)
echo   LỖI: aptis-mysql chưa sẵn sàng sau 3 phút
exit /b 1
