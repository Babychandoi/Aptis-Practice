package vn.weconex.aptis.asset.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.weconex.aptis.common.util.BaseEntity;
import vn.weconex.aptis.common.util.Enums.AccessScope;
import vn.weconex.aptis.common.util.Enums.AssetStatus;
import vn.weconex.aptis.common.util.Enums.AssetType;

/**
 * Metadata file; nội dung nằm trên MinIO. Object key luôn do backend sinh —
 * không dùng filename người dùng gửi lên (PHẦN VII §51).
 */
@Entity
@Table(name = "assets")
@Getter
@Setter
@NoArgsConstructor
public class Asset extends BaseEntity {

    @Column(name = "bucket_name", length = 100, nullable = false)
    private String bucketName;

    @Column(name = "object_key", length = 1000, nullable = false)
    private String objectKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_type", length = 20, nullable = false)
    private AssetType assetType;

    @Column(name = "mime_type", length = 100, nullable = false)
    private String mimeType;

    @Column(name = "original_filename", length = 500)
    private String originalFilename;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "checksum_sha256", length = 128)
    private String checksumSha256;

    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "width")
    private Integer width;

    @Column(name = "height")
    private Integer height;

    @Enumerated(EnumType.STRING)
    @Column(name = "access_scope", length = 16, nullable = false)
    private AccessScope accessScope = AccessScope.SIGNED_URL;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 16, nullable = false)
    private AssetStatus status = AssetStatus.UPLOADING;

    /** Chủ sở hữu với file ghi âm / avatar; NULL với asset nội dung. */
    @Column(name = "owner_user_id", columnDefinition = "CHAR(36)")
    private String ownerUserId;

    @Column(name = "created_by", columnDefinition = "CHAR(36)")
    private String createdBy;

    public boolean isReady() {
        return status == AssetStatus.READY;
    }

    public void markReady(Long fileSize, String checksum) {
        this.status = AssetStatus.READY;
        if (fileSize != null) {
            this.fileSize = fileSize;
        }
        if (checksum != null) {
            this.checksumSha256 = checksum;
        }
    }

    public void markFailed() {
        this.status = AssetStatus.FAILED;
    }
}
