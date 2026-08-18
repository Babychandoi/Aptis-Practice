# Full system backup — 2026-08-18 00:14 (Asia/Saigon)

Backup phục vụ chuyển toàn bộ Aptis Practice sang máy chủ khác.
Repository phải luôn ở chế độ **private**: `runtime/.env` chứa khoá API và mật
khẩu SMTP.

## Phạm vi

- **MySQL `aptis`**: 58 bảng — 1439 question set, 135 blueprint, 693 asset,
  3 user, 45 dòng `attempt_component_progress`.
- **MongoDB `aptis`**: 1570 document trong 5 collection
  (question_set_documents 1426, attempt_documents 104, question_set_revisions 23,
  evaluation_documents 9, rubric_definitions 8).
- **Redis**: RDB hợp lệ, 0 key (chỉ dùng làm cache nên không có dữ liệu bền).
- **MinIO**: toàn bộ volume `aptis_minio-data` — 2 bucket
  (`aptis-content`, `aptis-user-recordings`), 710 object, 52 bản ghi Speaking.
- **Cấu hình runtime**: `.env` tại thời điểm backup.

## Cấu trúc

```
mysql/aptis-full.sql              mysqldump --single-transaction --routines --triggers
mongodb/aptis.archive.gz          mongodump --archive --gzip
minio/minio-data.tar.gz.part000   tar volume, chia 90 MB/part (GitHub giới hạn 100 MB)
  … .part004                      5 part, tarball gốc 417.658.406 bytes
redis/dump.rdb                    redis-cli save
runtime/.env
```

`minio-data.tar.gz` **không** được commit (xem `.gitignore`) — chỉ commit các
`.partNNN`. Ghép lại rồi mới giải nén.

## Đã kiểm chứng

- MySQL dump: 58 `CREATE TABLE`, có đủ `question_sets`, `test_blueprints`,
  `attempt_component_progress`, `users`.
- MongoDB archive: `mongorestore --dryRun` chạy sạch.
- MinIO: ghép 5 part lại cho **đúng checksum** sha256
  `b5ea2fab6d53a9e69e847fa2…` và `tar tzf` đọc được 2924 entry.

## Khôi phục

```bash
# MinIO — ghép part trước khi giải nén
cat minio/minio-data.tar.gz.part* > minio-data.tar.gz
sha256sum minio-data.tar.gz     # phải khớp b5ea2fab6d53a9e69e847fa2…
docker volume create aptis_minio-data
docker run --rm -v aptis_minio-data:/data -v "$PWD:/in" alpine \
  tar xzf /in/minio-data.tar.gz -C /data

# MySQL — nạp với utf8mb4, thiếu cờ này là hỏng tiếng Việt
docker compose exec -T mysql \
  mysql -uroot -proot --default-character-set=utf8mb4 aptis < mysql/aptis-full.sql

# MongoDB
docker compose exec -T mongo \
  mongorestore --archive --gzip --drop --nsInclude='aptis.*' < mongodb/aptis.archive.gz

# Redis (tuỳ chọn, chỉ là cache)
docker compose cp redis/dump.rdb aptis-redis:/data/dump.rdb

cp runtime/.env .env
docker compose up -d --build
```

## Lưu ý

`.env` vừa được **gỡ khỏi git tracking** trong lần commit này. Mật khẩu SMTP
`MAIL_PASSWORD` đã từng nằm trong history của các commit trước — nên đổi App
Password của Gmail. Khoá `AI_EVAL_API_KEY` chưa bao giờ được commit.
