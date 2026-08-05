# Database backup và khôi phục

Schema và dữ liệu tham chiếu an toàn của hệ thống được quản lý bằng Flyway tại:

```text
aptis-backend/src/main/resources/db/migration/
```

MongoDB được khởi tạo bằng script tại:

```text
aptis-backend/src/main/resources/db/mongo/
```

## Backup đầy đủ local

Backup đầy đủ được lưu trong `backups/<timestamp>/` và bị loại khỏi Git bằng `.gitignore` vì chứa:

- email, số điện thoại và password hash;
- refresh token hash, IP, user-agent và thiết bị;
- đơn hàng, giao dịch, mã chuyển khoản và audit log;
- bài làm, response, bản ghi âm và kết quả chấm.

Mỗi bộ backup gồm:

```text
mysql/aptis-full.sql          # schema + toàn bộ dữ liệu MySQL
mongodb/aptis.archive.gz      # toàn bộ database MongoDB, dạng archive gzip
mongodb/json/*.json           # từng collection, JSON dễ kiểm tra
```

Không đưa thư mục `backups/` lên repository công khai.

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

## Tạo môi trường sạch từ migration

Nếu không cần dữ liệu người dùng, cách an toàn nhất là tạo lại volume và để Flyway/Mongo init chạy từ source:

```bash
docker compose down -v
docker compose up -d --build
```

Lệnh trên xóa toàn bộ dữ liệu local hiện có.
