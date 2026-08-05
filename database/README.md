# Database backup và khôi phục

Schema và dữ liệu tham chiếu an toàn của hệ thống được quản lý bằng Flyway tại:

```text
aptis-backend/src/main/resources/db/migration/
```

MongoDB được khởi tạo bằng script tại:

```text
aptis-backend/src/main/resources/db/mongo/
```

## Backup migration đầy đủ

Backup đầy đủ được lưu trong `backups/<timestamp>/`. Repository phải luôn để ở chế độ **private** vì backup chứa:

- email, số điện thoại và password hash;
- refresh token hash, IP, user-agent và thiết bị;
- đơn hàng, giao dịch, mã chuyển khoản và audit log;
- bài làm, response, bản ghi âm và kết quả chấm.

Mỗi bộ backup gồm:

```text
mysql/aptis-full.sql          # schema + toàn bộ dữ liệu MySQL
mongodb/aptis.archive.gz      # toàn bộ database MongoDB, dạng archive gzip
mongodb/json/*.json           # từng collection, JSON dễ kiểm tra
minio/aptis-minio-data.tar.gz # toàn bộ audio, tài liệu và object trong MinIO
redis/dump.rdb                # snapshot Redis tại thời điểm backup
MANIFEST.md                   # kích thước và SHA-256 để kiểm tra toàn vẹn
```

Không chuyển repository sang public hoặc chia sẻ các file này ra ngoài.

## Khôi phục MySQL

PowerShell:

```powershell
docker cp backups/<timestamp>/mysql/aptis-full.sql aptis-mysql:/tmp/aptis-full.sql
docker exec aptis-mysql mysql -uroot -proot -e "DROP DATABASE IF EXISTS aptis;"
docker exec aptis-mysql mysql -uroot -proot -e "CREATE DATABASE aptis CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
docker exec aptis-mysql sh -c "mysql -uroot -proot < /tmp/aptis-full.sql"
```

Thao tác này ghi đè database đích. Chỉ chạy khi đã xác nhận đúng môi trường.

## Khôi phục MongoDB

```powershell
docker cp backups/<timestamp>/mongodb/aptis.archive.gz aptis-mongo:/tmp/aptis.archive.gz
docker exec aptis-mongo mongorestore --drop --gzip --archive=/tmp/aptis.archive.gz
```

`--drop` xóa collection đích trước khi phục hồi.

## Khôi phục MinIO

Khởi động hạ tầng trước, sau đó giải nén archive vào volume MinIO bằng container tạm:

```powershell
docker compose up -d minio
docker run --rm --mount "type=volume,source=aptis_minio-data,target=/data" --mount "type=bind,source=${PWD}\backups\<timestamp>\minio,target=/backup,readonly" alpine:3.20 sh -c "rm -rf /data/* && tar -xzf /backup/aptis-minio-data.tar.gz -C /data"
docker compose restart minio
```

Lệnh trên ghi đè dữ liệu MinIO của môi trường đích. Tên volume mặc định là `aptis_minio-data`; kiểm tra bằng `docker volume ls` nếu project Compose dùng tên khác.

## Khôi phục Redis

Redis chỉ lưu trạng thái tạm, nên có thể bỏ qua khi chuyển máy. Nếu muốn phục hồi đúng snapshot:

```powershell
docker compose up -d redis
docker compose stop redis
docker cp backups/<timestamp>/redis/dump.rdb aptis-redis:/data/dump.rdb
docker compose start redis
```

Compose hiện không đặt tên volume Redis cố định. Có thể chỉ cần chạy Redis mới vì dữ liệu chính nằm trong MySQL, MongoDB và MinIO.

## Tạo môi trường sạch từ migration

Nếu không cần dữ liệu người dùng, cách an toàn nhất là tạo lại volume và để Flyway/Mongo init chạy từ source:

```bash
docker compose down -v
docker compose up -d --build
```

Lệnh trên xóa toàn bộ dữ liệu local hiện có.
