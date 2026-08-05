package vn.weconex.aptis.asset.service;

import java.util.concurrent.TimeUnit;

import io.minio.BucketExistsArgs;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.RemoveObjectArgs;
import io.minio.StatObjectArgs;
import io.minio.StatObjectResponse;
import io.minio.errors.ErrorResponseException;
import io.minio.http.Method;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import vn.weconex.aptis.common.config.AptisProperties;
import vn.weconex.aptis.common.exception.ApiException;
import vn.weconex.aptis.common.exception.ErrorCode;

/**
 * Bọc MinIO SDK. Backend không proxy nội dung file — client upload/download
 * trực tiếp qua presigned URL (PHẦN III §28).
 */
@Slf4j
@Component
public class MinioStorageClient {

    /** MinIO không phân vùng region; giá trị nào cũng được, chỉ cần cố định. */
    private static final String DEFAULT_REGION = "us-east-1";

    private final MinioClient client;
    private final MinioClient publicClient;
    private final AptisProperties properties;

    public MinioStorageClient(AptisProperties properties) {
        this.properties = properties;
        AptisProperties.Minio config = properties.minio();

        this.client = MinioClient.builder()
                .endpoint(config.endpoint())
                .credentials(config.accessKey(), config.secretKey())
                .build();

        // Presigned URL phải ký với host mà TRÌNH DUYỆT truy cập được; trong
        // docker endpoint nội bộ (minio:9000) khác endpoint công khai
        // (localhost:9000).
        //
        // .region() là bắt buộc: không có nó, SDK gọi getBucketLocation tới
        // endpoint công khai trước khi ký — mà host đó thường không tới được từ
        // bên trong container, gây Connection refused.
        this.publicClient = config.publicEndpoint().equals(config.endpoint())
                ? this.client
                : MinioClient.builder()
                        .endpoint(config.publicEndpoint())
                        .credentials(config.accessKey(), config.secretKey())
                        .region(DEFAULT_REGION)
                        .build();
    }

    /**
     * Tạo bucket còn thiếu khi khởi động. Ở production nên làm bằng script hạ
     * tầng để backend không cần quyền tạo bucket.
     */
    @PostConstruct
    void ensureBuckets() {
        for (String bucket : properties.minio().buckets().all()) {
            try {
                boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
                if (!exists) {
                    client.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                    log.info("Đã tạo bucket MinIO: {}", bucket);
                }
            } catch (Exception ex) {
                log.warn("Không kiểm tra được bucket {}: {}", bucket, ex.getMessage());
            }
        }
    }

    public String presignedUploadUrl(String bucket, String objectKey) {
        return presign(Method.PUT, bucket, objectKey);
    }

    public String presignedDownloadUrl(String bucket, String objectKey) {
        return presign(Method.GET, bucket, objectKey);
    }

    private String presign(Method method, String bucket, String objectKey) {
        int expirySeconds = (int) properties.minio().presignedUrlTtl().toSeconds();
        try {
            return publicClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .method(method)
                    .bucket(bucket)
                    .object(objectKey)
                    .expiry(expirySeconds, TimeUnit.SECONDS)
                    .build());
        } catch (Exception ex) {
            log.error("Không tạo được presigned URL cho {}/{}", bucket, objectKey, ex);
            throw new ApiException(ErrorCode.STORAGE_ERROR, "Không tạo được URL truy cập file");
        }
    }

    /**
     * @return metadata thật của object, hoặc empty nếu chưa tồn tại
     */
    public java.util.Optional<ObjectStat> statObject(String bucket, String objectKey) {
        try {
            StatObjectResponse stat = client.statObject(StatObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectKey)
                    .build());
            return java.util.Optional.of(
                    new ObjectStat(stat.size(), stat.contentType(), stat.etag()));

        } catch (ErrorResponseException ex) {
            // NoSuchKey: client báo hoàn tất nhưng chưa upload xong
            return java.util.Optional.empty();
        } catch (Exception ex) {
            log.error("Không đọc được metadata {}/{}", bucket, objectKey, ex);
            throw new ApiException(ErrorCode.STORAGE_ERROR, "Không kiểm tra được file trên storage");
        }
    }

    /**
     * Tải nội dung object về bộ nhớ. Chỉ dùng cho file nhỏ (Excel import, báo
     * cáo) — audio và video phải đi qua presigned URL để không giữ trong heap.
     */
    public byte[] download(String bucket, String objectKey) {
        try (var stream = client.getObject(io.minio.GetObjectArgs.builder()
                .bucket(bucket)
                .object(objectKey)
                .build())) {

            return stream.readAllBytes();

        } catch (Exception ex) {
            log.error("Không tải được object {}/{}", bucket, objectKey, ex);
            throw new ApiException(ErrorCode.STORAGE_ERROR, "Không tải được file từ storage");
        }
    }

    /**
     * Ghi nội dung do backend sinh (báo cáo, file lỗi import) lên MinIO.
     */
    public void upload(String bucket, String objectKey, byte[] content, String contentType) {
        try (var input = new java.io.ByteArrayInputStream(content)) {
            client.putObject(io.minio.PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectKey)
                    .stream(input, content.length, -1)
                    .contentType(contentType)
                    .build());

        } catch (Exception ex) {
            log.error("Không ghi được object {}/{}", bucket, objectKey, ex);
            throw new ApiException(ErrorCode.STORAGE_ERROR, "Không ghi được file lên storage");
        }
    }

    public void removeObject(String bucket, String objectKey) {
        try {
            client.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectKey)
                    .build());
        } catch (Exception ex) {
            log.error("Không xóa được object {}/{}", bucket, objectKey, ex);
            throw new ApiException(ErrorCode.STORAGE_ERROR, "Không xóa được file");
        }
    }

    public record ObjectStat(long size, String contentType, String etag) {
    }
}
