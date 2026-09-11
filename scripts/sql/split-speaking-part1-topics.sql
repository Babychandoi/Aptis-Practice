-- Tách 129 đề Speaking Part 1 khỏi chủ đề gộp "Đời sống hàng ngày".

-- Mỗi đề Part 1 thật ra là một chủ đề riêng (đi lại, sách, đi bộ...). Gộp chung
-- khiến tab "đề hot nhất" chỉ hiện 14 mục Speaking, và học viên bấm vào nhận
-- đề bất kỳ trong 129 đề thay vì thứ muốn luyện.

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-tro-choi-tuoi-tho', 'Trò chơi tuổi thơ', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Trò chơi tuổi thơ');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Trò chơi tuổi thơ' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000125','a7000000-0000-4000-8000-000000000123','a7000000-0000-4000-8000-000000000054','a7000000-0000-4000-8000-000000000149','a7000000-0000-4000-8000-000000000052','a7000000-0000-4000-8000-000000000124','a7000000-0000-4000-8000-000000000053','a7000000-0000-4000-8000-000000000150','a7000000-0000-4000-8000-000000000151');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-ngoai-ngu', 'Ngoại ngữ', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Ngoại ngữ');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Ngoại ngữ' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000113','a7000000-0000-4000-8000-000000000114','a7000000-0000-4000-8000-000000000136','a7000000-0000-4000-8000-000000000134','a7000000-0000-4000-8000-000000000112','a7000000-0000-4000-8000-000000000163','a7000000-0000-4000-8000-000000000161','a7000000-0000-4000-8000-000000000162');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-truyen-hinh', 'Truyền hình', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Truyền hình');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Truyền hình' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000078','a7000000-0000-4000-8000-000000000118','a7000000-0000-4000-8000-000000000076','a7000000-0000-4000-8000-000000000120','a7000000-0000-4000-8000-000000000119','a7000000-0000-4000-8000-000000000032','a7000000-0000-4000-8000-000000000077');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-hoc-tieng-anh', 'Học tiếng Anh', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Học tiếng Anh');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Học tiếng Anh' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000106','a7000000-0000-4000-8000-000000000135','a7000000-0000-4000-8000-000000000084','a7000000-0000-4000-8000-000000000082','a7000000-0000-4000-8000-000000000083','a7000000-0000-4000-8000-000000000030');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-sach', 'Sách', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Sách');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Sách' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000168','a7000000-0000-4000-8000-000000000099','a7000000-0000-4000-8000-000000000167','a7000000-0000-4000-8000-000000000156','a7000000-0000-4000-8000-000000000158','a7000000-0000-4000-8000-000000000033');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-ky-nghi', 'Kỳ nghỉ', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Kỳ nghỉ');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Kỳ nghỉ' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000075','a7000000-0000-4000-8000-000000000073','a7000000-0000-4000-8000-000000000140','a7000000-0000-4000-8000-000000000141','a7000000-0000-4000-8000-000000000074','a7000000-0000-4000-8000-000000000142');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-the-thao', 'Thể thao', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Thể thao');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Thể thao' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000139','a7000000-0000-4000-8000-000000000137','a7000000-0000-4000-8000-000000000146','a7000000-0000-4000-8000-000000000138','a7000000-0000-4000-8000-000000000165','a7000000-0000-4000-8000-000000000147');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-nha-o', 'Nhà ở', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Nhà ở');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Nhà ở' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000028','a7000000-0000-4000-8000-000000000092','a7000000-0000-4000-8000-000000000093','a7000000-0000-4000-8000-000000000029','a7000000-0000-4000-8000-000000000095');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-mau-sac', 'Màu sắc', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Màu sắc');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Màu sắc' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000062','a7000000-0000-4000-8000-000000000063','a7000000-0000-4000-8000-000000000127','a7000000-0000-4000-8000-000000000061','a7000000-0000-4000-8000-000000000126');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-an-uong', 'Ăn uống', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Ăn uống');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Ăn uống' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000121','a7000000-0000-4000-8000-000000000046','a7000000-0000-4000-8000-000000000122','a7000000-0000-4000-8000-000000000047','a7000000-0000-4000-8000-000000000048');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-thu-vien', 'Thư viện', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Thư viện');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Thư viện' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000066','a7000000-0000-4000-8000-000000000097','a7000000-0000-4000-8000-000000000064','a7000000-0000-4000-8000-000000000098','a7000000-0000-4000-8000-000000000065');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-am-nhac', 'Âm nhạc', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Âm nhạc');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Âm nhạc' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000081','a7000000-0000-4000-8000-000000000080','a7000000-0000-4000-8000-000000000079','a7000000-0000-4000-8000-000000000155');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-cong-viec', 'Công việc', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Công việc');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Công việc' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000115','a7000000-0000-4000-8000-000000000116','a7000000-0000-4000-8000-000000000117');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-tuoi-tho', 'Tuổi thơ', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Tuổi thơ');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Tuổi thơ' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000145','a7000000-0000-4000-8000-000000000143','a7000000-0000-4000-8000-000000000144');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-khu-pho-cua-ban', 'Khu phố của bạn', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Khu phố của bạn');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Khu phố của bạn' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000036','a7000000-0000-4000-8000-000000000072','a7000000-0000-4000-8000-000000000071');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-di-bo', 'Đi bộ', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Đi bộ');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Đi bộ' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000045','a7000000-0000-4000-8000-000000000044','a7000000-0000-4000-8000-000000000043');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-dien-thoai-di-dong', 'Điện thoại di động', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Điện thoại di động');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Điện thoại di động' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000133','a7000000-0000-4000-8000-000000000132','a7000000-0000-4000-8000-000000000131');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-ngon-ngu-co-the', 'Ngôn ngữ cơ thể', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Ngôn ngữ cơ thể');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Ngôn ngữ cơ thể' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000109','a7000000-0000-4000-8000-000000000110','a7000000-0000-4000-8000-000000000111');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-tieng-on', 'Tiếng ồn', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Tiếng ồn');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Tiếng ồn' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000057','a7000000-0000-4000-8000-000000000055','a7000000-0000-4000-8000-000000000056');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-thoi-tiet', 'Thời tiết', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Thời tiết');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Thời tiết' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000050','a7000000-0000-4000-8000-000000000049','a7000000-0000-4000-8000-000000000051');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-phong-van', 'Phỏng vấn', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Phỏng vấn');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Phỏng vấn' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000100','a7000000-0000-4000-8000-000000000102','a7000000-0000-4000-8000-000000000101');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-ngan-hang', 'Ngân hàng', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Ngân hàng');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Ngân hàng' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000103','a7000000-0000-4000-8000-000000000104','a7000000-0000-4000-8000-000000000105');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-di-choi', 'Đi chơi', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Đi chơi');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Đi chơi' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000037','a7000000-0000-4000-8000-000000000039','a7000000-0000-4000-8000-000000000038');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-tiec-tung', 'Tiệc tùng', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Tiệc tùng');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Tiệc tùng' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000067','a7000000-0000-4000-8000-000000000069','a7000000-0000-4000-8000-000000000068');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-nhiep-anh', 'Nhiếp ảnh', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Nhiếp ảnh');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Nhiếp ảnh' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000058','a7000000-0000-4000-8000-000000000060','a7000000-0000-4000-8000-000000000059');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-phim-anh', 'Phim ảnh', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Phim ảnh');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Phim ảnh' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000157','a7000000-0000-4000-8000-000000000159','a7000000-0000-4000-8000-000000000160');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-lich-sinh-hoat', 'Lịch sinh hoạt', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Lịch sinh hoạt');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Lịch sinh hoạt' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000153','a7000000-0000-4000-8000-000000000164','a7000000-0000-4000-8000-000000000027');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-chuyen-di', 'Chuyến đi', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Chuyến đi');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Chuyến đi' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000025','a7000000-0000-4000-8000-000000000042');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-tu-dien', 'Từ điển', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Từ điển');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Từ điển' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000108','a7000000-0000-4000-8000-000000000107');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-lang-truyen-thong', 'Làng truyền thống', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Làng truyền thống');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Làng truyền thống' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000090','a7000000-0000-4000-8000-000000000089');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-gioi-thieu-ban-than', 'Giới thiệu bản thân', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Giới thiệu bản thân');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Giới thiệu bản thân' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000017');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-ky-niem-dang-nho', 'Kỷ niệm đáng nhớ', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Kỷ niệm đáng nhớ');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Kỷ niệm đáng nhớ' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000022');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-quan-ao', 'Quần áo', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Quần áo');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Quần áo' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000026');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-phuong-tien-di-lai', 'Phương tiện đi lại', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Phương tiện đi lại');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Phương tiện đi lại' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000019');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-mua-yeu-thich', 'Mùa yêu thích', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Mùa yêu thích');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Mùa yêu thích' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000021');

INSERT INTO topics (id, code, name, created_at, updated_at)
SELECT UUID(), 'sp1-quan-ca-phe', 'Quán cà phê', NOW(), NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM topics t WHERE t.name = 'Quán cà phê');
UPDATE question_sets SET topic_id=(SELECT id FROM topics WHERE name='Quán cà phê' LIMIT 1), updated_at=NOW()
WHERE id IN ('a7000000-0000-4000-8000-000000000166');

SELECT COUNT(DISTINCT topic_id) AS so_chu_de, COUNT(*) AS so_de
FROM question_sets WHERE part_id='16000000-0000-4000-8000-000000000031' AND status='PUBLISHED';