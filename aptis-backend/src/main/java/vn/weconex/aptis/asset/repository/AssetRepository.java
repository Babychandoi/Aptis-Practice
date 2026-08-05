package vn.weconex.aptis.asset.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.asset.domain.Asset;
import vn.weconex.aptis.common.util.Enums.AssetStatus;

public interface AssetRepository extends JpaRepository<Asset, String> {

    Optional<Asset> findByBucketNameAndObjectKey(String bucketName, String objectKey);

    /**
     * Asset kẹt ở UPLOADING quá lâu — client bỏ dở, cần dọn.
     */
    List<Asset> findByStatusAndCreatedAtBefore(AssetStatus status, Instant before);
}
