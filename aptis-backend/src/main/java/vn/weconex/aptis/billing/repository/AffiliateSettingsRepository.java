package vn.weconex.aptis.billing.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.weconex.aptis.billing.domain.AffiliateEntities.AffiliateSettings;

/** Cấu hình hoa hồng — bảng chỉ có một dòng, id = 1. */
public interface AffiliateSettingsRepository extends JpaRepository<AffiliateSettings, Byte> {
}
