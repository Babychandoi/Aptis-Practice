# Manifest backup Aptis Practice

- Thời điểm tạo: `2026-08-05 11:23:19 GMT+7`
- Phạm vi: MySQL, MongoDB, MinIO và Redis
- Cảnh báo: chứa dữ liệu người dùng và thông tin vận hành; chỉ lưu trong repository private.

| File | Kích thước (byte) | SHA-256 |
|---|---:|---|
| `minio/aptis-minio-data.tar.gz` | 1,209,229 | `CA5F7B7A9700F5471FF5E93072C700314BA8B1A2BF35C02EC1E3ACDFB4097CD1` |
| `mongodb/aptis.archive.gz` | 11,401 | `261417B8B5EB594778F6F251C93F47FA7F7A58D4D4ACE7FC14C7051B7D5C5F21` |
| `mongodb/json/attempt_documents.json` | 24,381 | `B4E2227DEC41E813E59F4DB98107C5C33998D287486859F226D8CE57F94419A8` |
| `mongodb/json/evaluation_documents.json` | 3 | `37517E5F3DC66819F61F5A7BB8ACE1921282415F10551D2DEFA5C3EB0985B570` |
| `mongodb/json/question_set_documents.json` | 74,483 | `B4790AE09E3AEA5ACC0A7B34A4AD7D1EE2572E8E1E94A5AB9ECF09130E7AA9A7` |
| `mongodb/json/question_set_revisions.json` | 15,160 | `656B251483D91F7975B360D841801183E998D1E5BDC14C82A3BF45A5C5127594` |
| `mongodb/json/rubric_definitions.json` | 3,788 | `E422D952DC07C630F4A0FD40C8774A5B1E149CED25EA0EA99576891C89F70156` |
| `mysql/aptis-full.sql` | 699,920 | `265BD38F21ADA6188004EAE7E4A930BD39102C41C6DD4020424047B732AED409` |
| `redis/dump.rdb` | 89 | `9434025EF1F2C4533AD740BA4FBFD888D7087B9DC45622F28AB59F5170C14D6C` |

Kiểm tra một file trên PowerShell:

```powershell
Get-FileHash backups/20260805-112319/mysql/aptis-full.sql -Algorithm SHA256
```
