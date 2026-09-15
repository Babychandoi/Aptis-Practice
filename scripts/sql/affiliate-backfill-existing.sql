-- Cấp mã giới thiệu cho những người đã đủ điều kiện từ trước.
--
-- Vì sao cần: ensureAccount() chỉ chạy khi người dùng tự mở trang giới thiệu,
-- nên ai mua trước khi có tính năng sẽ không bao giờ được cấp. Bản backend sắp
-- deploy có job làm việc này, nhưng cấp sẵn ở đây để không phải chờ.
--
-- Điều kiện: có đơn PAID, HOẶC đang có Premium không phải dùng thử (admin cấp
-- tay cũng tính). Tài khoản dùng thử không được cấp.
--
-- Mã sinh sẵn bằng cùng bộ ký tự với AffiliateService (bỏ 0/O/1/I/L).

INSERT INTO affiliate_accounts (id, user_id, code, status, total_earned, total_paid, created_at, updated_at)
SELECT UUID(), u.id, m.code, 'ACTIVE', 0, 0, NOW(), NOW()
FROM (
    SELECT DISTINCT o.user_id AS uid FROM orders o WHERE o.status = 'PAID'
    UNION
    SELECT DISTINCT ue.user_id FROM user_entitlements ue
    WHERE ue.entitlement_code = 'PREMIUM_CONTENT_ACCESS'
      AND ue.source_type <> 'TRIAL'
      AND ue.revoked_at IS NULL
      AND ue.starts_at <= NOW()
      AND (ue.ends_at IS NULL OR ue.ends_at > NOW())
) elig
JOIN users u ON u.id = elig.uid
JOIN (
    SELECT 'DS2CYTPF' AS code, 1 AS rn UNION ALL SELECT 'VC2DCNQ9', 2
    UNION ALL SELECT 'GPUCM6RV', 3 UNION ALL SELECT 'KERYZ2C9', 4
    UNION ALL SELECT '4ZGWPB8R', 5 UNION ALL SELECT 'PNYVRJ48', 6
    UNION ALL SELECT 'ZHDVEMWX', 7 UNION ALL SELECT 'FWYRCFHZ', 8
    UNION ALL SELECT 'EXN77RRX', 9 UNION ALL SELECT 'KVV4TFBE', 10
    UNION ALL SELECT 'PKGK5WTA', 11 UNION ALL SELECT 'XCUHE6GG', 12
) m ON m.rn = (
    SELECT COUNT(*) FROM (
        SELECT DISTINCT o2.user_id AS uid FROM orders o2 WHERE o2.status = 'PAID'
        UNION
        SELECT DISTINCT ue2.user_id FROM user_entitlements ue2
        WHERE ue2.entitlement_code = 'PREMIUM_CONTENT_ACCESS'
          AND ue2.source_type <> 'TRIAL'
          AND ue2.revoked_at IS NULL
          AND ue2.starts_at <= NOW()
          AND (ue2.ends_at IS NULL OR ue2.ends_at > NOW())
    ) e2 WHERE e2.uid <= elig.uid
)
WHERE NOT EXISTS (SELECT 1 FROM affiliate_accounts a WHERE a.user_id = u.id);
