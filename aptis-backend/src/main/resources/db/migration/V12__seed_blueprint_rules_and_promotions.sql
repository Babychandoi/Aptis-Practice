-- =====================================================================
-- V12 : Cấu hình đề thi thử và mã giảm giá mẫu
--
-- V10 đã tạo hai blueprint nhưng chưa có rule nào, nên chúng không dùng được.
-- File này bổ sung rule cho từng Part, publish blueprint, và thêm hai mã giảm
-- giá để thử luồng thanh toán.
-- =====================================================================

-- ---------- Đề thi thử đầy đủ ----------
-- Theo cấu trúc Aptis General: Grammar/Vocabulary + 4 Part mỗi kỹ năng.
SET @mock_full  = '19000000-0000-4000-8000-000000000001';
SET @mock_short = '19000000-0000-4000-8000-000000000002';

INSERT INTO blueprint_part_rules
    (id, blueprint_id, part_id, question_set_count, difficulty_min, difficulty_max,
     selection_strategy, allow_free_content, allow_premium_content, display_order)
VALUES
    -- Grammar & Vocabulary
    ('1a000000-0000-4000-8000-000000000001', @mock_full,
     '16000000-0000-4000-8000-000000000001', 1, NULL, NULL, 'RANDOM', TRUE, TRUE, 1),
    ('1a000000-0000-4000-8000-000000000002', @mock_full,
     '16000000-0000-4000-8000-000000000002', 1, NULL, NULL, 'RANDOM', TRUE, TRUE, 2),

    -- Reading Part 1-4
    ('1a000000-0000-4000-8000-000000000011', @mock_full,
     '16000000-0000-4000-8000-000000000011', 1, NULL, NULL, 'RANDOM', TRUE, TRUE, 3),
    ('1a000000-0000-4000-8000-000000000012', @mock_full,
     '16000000-0000-4000-8000-000000000012', 1, NULL, NULL, 'RANDOM', TRUE, TRUE, 4),
    ('1a000000-0000-4000-8000-000000000013', @mock_full,
     '16000000-0000-4000-8000-000000000013', 1, NULL, NULL, 'RANDOM', TRUE, TRUE, 5),
    ('1a000000-0000-4000-8000-000000000014', @mock_full,
     '16000000-0000-4000-8000-000000000014', 1, NULL, NULL, 'RANDOM', TRUE, TRUE, 6),

    -- Listening Part 1-4
    ('1a000000-0000-4000-8000-000000000021', @mock_full,
     '16000000-0000-4000-8000-000000000021', 1, NULL, NULL, 'RANDOM', TRUE, TRUE, 7),
    ('1a000000-0000-4000-8000-000000000022', @mock_full,
     '16000000-0000-4000-8000-000000000022', 1, NULL, NULL, 'RANDOM', TRUE, TRUE, 8),
    ('1a000000-0000-4000-8000-000000000023', @mock_full,
     '16000000-0000-4000-8000-000000000023', 1, NULL, NULL, 'RANDOM', TRUE, TRUE, 9),
    ('1a000000-0000-4000-8000-000000000024', @mock_full,
     '16000000-0000-4000-8000-000000000024', 1, NULL, NULL, 'RANDOM', TRUE, TRUE, 10),

    -- Speaking Part 1-4
    ('1a000000-0000-4000-8000-000000000031', @mock_full,
     '16000000-0000-4000-8000-000000000031', 1, NULL, NULL, 'RANDOM', TRUE, TRUE, 11),
    ('1a000000-0000-4000-8000-000000000032', @mock_full,
     '16000000-0000-4000-8000-000000000032', 1, NULL, NULL, 'RANDOM', TRUE, TRUE, 12),
    ('1a000000-0000-4000-8000-000000000033', @mock_full,
     '16000000-0000-4000-8000-000000000033', 1, NULL, NULL, 'RANDOM', TRUE, TRUE, 13),
    ('1a000000-0000-4000-8000-000000000034', @mock_full,
     '16000000-0000-4000-8000-000000000034', 1, NULL, NULL, 'RANDOM', TRUE, TRUE, 14),

    -- Writing Part 1-4
    ('1a000000-0000-4000-8000-000000000041', @mock_full,
     '16000000-0000-4000-8000-000000000041', 1, NULL, NULL, 'RANDOM', TRUE, TRUE, 15),
    ('1a000000-0000-4000-8000-000000000042', @mock_full,
     '16000000-0000-4000-8000-000000000042', 1, NULL, NULL, 'RANDOM', TRUE, TRUE, 16),
    ('1a000000-0000-4000-8000-000000000043', @mock_full,
     '16000000-0000-4000-8000-000000000043', 1, NULL, NULL, 'RANDOM', TRUE, TRUE, 17),
    ('1a000000-0000-4000-8000-000000000044', @mock_full,
     '16000000-0000-4000-8000-000000000044', 1, NULL, NULL, 'RANDOM', TRUE, TRUE, 18),

    -- Đề rút gọn miễn phí: chỉ Grammar + Reading Part 1, và chỉ nội dung FREE
    ('1b000000-0000-4000-8000-000000000001', @mock_short,
     '16000000-0000-4000-8000-000000000001', 1, NULL, NULL, 'RANDOM', TRUE, FALSE, 1),
    ('1b000000-0000-4000-8000-000000000002', @mock_short,
     '16000000-0000-4000-8000-000000000011', 1, NULL, NULL, 'RANDOM', TRUE, FALSE, 2);

-- Blueprint đã có rule nên publish được
UPDATE test_blueprints
SET status = 'PUBLISHED', updated_at = NOW()
WHERE id IN (@mock_full, @mock_short);

-- ---------- Mã giảm giá mẫu ----------
INSERT INTO promotion_codes
    (id, code, discount_type, discount_value, max_discount_amount, min_order_amount,
     max_total_uses, max_uses_per_user, total_used_count, starts_at, ends_at,
     status, created_at, updated_at)
VALUES
    -- Giảm 20%, tối đa 100k
    ('1c000000-0000-4000-8000-000000000001', 'WELCOME20', 'PERCENTAGE', 20,
     100000, 199000, 1000, 1, 0, NOW(), DATE_ADD(NOW(), INTERVAL 365 DAY),
     'ACTIVE', NOW(), NOW()),
    -- Giảm cố định 50k cho đơn từ 499k
    ('1c000000-0000-4000-8000-000000000002', 'SAVE50K', 'FIXED_AMOUNT', 50000,
     NULL, 499000, 500, 2, 0, NOW(), DATE_ADD(NOW(), INTERVAL 180 DAY),
     'ACTIVE', NOW(), NOW());
