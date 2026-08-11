# Full system backup — 2026-08-12 01:20:29 (Asia/Saigon)

Backup này phục vụ chuyển toàn bộ Aptis Practice sang máy chủ khác. Repository phải luôn ở chế độ private vì `runtime/.env` có thể chứa thông tin nhạy cảm.

## Phạm vi

- MySQL `aptis`: 57 bảng, 607 question set, 316 asset, 2 user.
- MongoDB `aptis`: 650 document trong 5 collection.
- Redis: RDB hợp lệ, hiện có 0 key.
- MinIO: toàn bộ volume `aptis_minio-data`, gồm metadata, 6 bucket và 333 object (khoảng 129 MiB).
- Cấu hình runtime: `.env` tại thời điểm backup.

## File và checksum SHA-256

| File | Bytes | SHA-256 |
|---|---:|---|
| `mysql/aptis-full.sql` | 638129 | `066b6c0b453540c0f01ab0f6ce765293129d4939f6fc1f17f61a57d97ec6c3c6` |
| `mongodb/aptis.archive.gz` | 387989 | `91cfa92e70f6114c156abb4951801ea66fae66c321bc26f419551a31381a16d1` |
| `redis/dump.rdb` | 89 | `a8be1f37e0c43bb044c5f8f220976813aed5dacb8dee1c36404c170f6bf49cab` |
| `runtime/.env` | 417 | `f3d49049438698961127868d3a220d97e433439e322a118939c79c2868c63806` |
| `minio/minio-data.tar.gz.part001` | 67108864 | `234ab3239f1c95087f51f7f9222f7a2cd0084db48915337d09bce47092ec5f1b` |
| `minio/minio-data.tar.gz.part002` | 67108864 | `1f3dc9090e804f39b3df141855fc438d2955cb605a30e7baf11732b41f934839` |
| `minio/minio-data.tar.gz.part003` | 305283 | `0b586b60cb965dec8f543ae24dbf576b9b263fd40fa3c4a8f038657d5ab39ef1` |

Ba phần MinIO ghép lại phải có SHA-256:

`973d6c24ce1a3fab6b2d461544c5921cd46c0d473284975c2210c848ce094a8f`

## Khôi phục trên máy mới

1. Clone repository private, copy `runtime/.env` thành `.env`, sau đó khởi tạo Docker volume bằng `docker compose up -d`.
2. Ghép archive MinIO bằng PowerShell:

```powershell
$parts = Get-ChildItem -LiteralPath '.\backups\20260812-012029\minio' -Filter 'minio-data.tar.gz.part*' | Sort-Object Name
$output = [IO.File]::Create((Join-Path $parts[0].DirectoryName 'minio-data.tar.gz'))
try {
    foreach ($part in $parts) {
        $input = [IO.File]::OpenRead($part.FullName)
        try { $input.CopyTo($output) } finally { $input.Dispose() }
    }
} finally { $output.Dispose() }
Get-FileHash '.\backups\20260812-012029\minio\minio-data.tar.gz' -Algorithm SHA256
```

3. Trên máy mới, dừng MinIO và giải nén archive vào volume trống `aptis_minio-data`:

```powershell
docker compose stop minio
docker run --rm --entrypoint sh -v aptis_minio-data:/target -v "${PWD}/backups/20260812-012029/minio:/backup:ro" mongo:7 -c "tar -xzf /backup/minio-data.tar.gz -C /target"
docker compose start minio
```

4. Khôi phục MySQL và MongoDB:

```powershell
docker cp .\backups\20260812-012029\mysql\aptis-full.sql aptis-mysql:/tmp/aptis-full.sql
docker exec aptis-mysql sh -c "MYSQL_PWD=root mysql -uroot < /tmp/aptis-full.sql"

docker cp .\backups\20260812-012029\mongodb\aptis.archive.gz aptis-mongo:/tmp/aptis.archive.gz
docker exec aptis-mongo mongorestore --drop --gzip --archive=/tmp/aptis.archive.gz
```

5. Redis hiện không có key. Nếu cần khôi phục đúng snapshot, dừng Redis, chép `redis/dump.rdb` vào `/data/dump.rdb`, rồi khởi động lại.

Chỉ giải nén archive MinIO nguyên volume vào volume trống trên máy mới. Với máy đã có dữ liệu, hãy backup riêng trước khi khôi phục.
