@echo off
rem Chạy một script Node của repo trong container gắn mạng nội bộ Docker (aptis_default),
rem kết nối thẳng mysql/mongo/minio như backend. Không dùng cổng 3307/27017/9000 của
rem máy chủ: lần Docker Desktop khởi động lại 12/11/2026, bộ chuyển cổng (wslrelay)
rem hỏng và mọi job đồng bộ mất kết nối DB suốt 4 ngày mà web vẫn chạy bình thường.
rem   call scripts\run-node-in-docker.cmd scripts\aptisprep-sync.mjs --apply
pushd "%~dp0.."
"C:\Program Files\Docker\Docker\resources\bin\docker.exe" run --rm --network aptis_default -v "%CD%:/work" -w /work ^
  -e TZ=Asia/Ho_Chi_Minh -e MYSQL_HOST=mysql -e MYSQL_PORT=3306 ^
  -e MONGO_URI=mongodb://mongo:27017/aptis -e MINIO_ENDPOINT=http://minio:9000 ^
  node:22-alpine node %*
set RC=%ERRORLEVEL%
popd
exit /b %RC%
