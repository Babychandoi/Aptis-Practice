/**
 * Sinh ValidationMessages.properties — thông báo lỗi nhập liệu bằng tiếng Việt.
 *
 *   node scripts/gen-validation-messages.mjs
 *
 * Vì sao cần script: file .properties của Bean Validation được đọc bằng
 * ISO-8859-1, nên mọi ký tự tiếng Việt phải viết dưới dạng \uXXXX. Gõ tay thì
 * vừa khó đọc vừa dễ sai một ký tự mà không ai phát hiện ra.
 *
 * Sửa nội dung thông báo ở hằng MESSAGES bên dưới rồi chạy lại script.
 */
import { writeFileSync } from 'node:fs';

/**
 * Khoá là mã thông báo mặc định của Bean Validation. Đặt ở đây là áp cho toàn
 * bộ ràng buộc trong dự án, không phải sửa từng annotation @NotBlank/@Size.
 *
 * {min}, {max}, {value} là biến của chính Bean Validation, giữ nguyên.
 */
const MESSAGES = {
  'jakarta.validation.constraints.NotBlank.message': 'Không được để trống',
  'jakarta.validation.constraints.NotNull.message': 'Không được để trống',
  'jakarta.validation.constraints.NotEmpty.message': 'Không được để trống',
  'jakarta.validation.constraints.Size.message': 'Độ dài phải từ {min} đến {max} ký tự',
  'jakarta.validation.constraints.Min.message': 'Phải lớn hơn hoặc bằng {value}',
  'jakarta.validation.constraints.Max.message': 'Phải nhỏ hơn hoặc bằng {value}',
  'jakarta.validation.constraints.DecimalMin.message': 'Phải lớn hơn hoặc bằng {value}',
  'jakarta.validation.constraints.DecimalMax.message': 'Phải nhỏ hơn hoặc bằng {value}',
  'jakarta.validation.constraints.Email.message': 'Email không đúng định dạng',
  'jakarta.validation.constraints.Pattern.message': 'Giá trị không đúng định dạng cho phép',
  'jakarta.validation.constraints.Positive.message': 'Phải là số dương',
  'jakarta.validation.constraints.PositiveOrZero.message': 'Không được là số âm',
  'jakarta.validation.constraints.Negative.message': 'Phải là số âm',
  'jakarta.validation.constraints.NegativeOrZero.message': 'Không được là số dương',
  'jakarta.validation.constraints.Digits.message':
    'Sai định dạng số: tối đa {integer} chữ số phần nguyên và {fraction} chữ số thập phân',
  'jakarta.validation.constraints.Past.message': 'Phải là thời điểm trong quá khứ',
  'jakarta.validation.constraints.PastOrPresent.message': 'Không được là thời điểm tương lai',
  'jakarta.validation.constraints.Future.message': 'Phải là thời điểm trong tương lai',
  'jakarta.validation.constraints.FutureOrPresent.message': 'Không được là thời điểm quá khứ',
  'jakarta.validation.constraints.AssertTrue.message': 'Phải được bật',
  'jakarta.validation.constraints.AssertFalse.message': 'Phải được tắt',
};

/** Ký tự ngoài ASCII phải thành \uXXXX vì file đọc bằng ISO-8859-1. */
function escapeUnicode(text) {
  return [...text]
    .map((ch) => {
      const code = ch.charCodeAt(0);
      return code > 127 ? '\\u' + code.toString(16).padStart(4, '0') : ch;
    })
    .join('');
}

const header = [
  '# Thông báo lỗi nhập liệu bằng tiếng Việt cho toàn hệ thống.',
  '#',
  '# Bean Validation tự đọc file này, nên đặt ở đây là áp cho tất cả ràng buộc',
  '# @NotBlank/@Size/@Min… mà không phải sửa từng annotation — vốn là việc dễ sót',
  '# và dễ thành mỗi nơi viết một kiểu.',
  '#',
  '# KHÔNG sửa tay: file đọc bằng ISO-8859-1 nên tiếng Việt đang ở dạng \\uXXXX.',
  '# Sửa nội dung trong scripts/gen-validation-messages.mjs rồi chạy lại script đó.',
  '',
].join('\n');

const body = Object.entries(MESSAGES)
  .map(([key, value]) => `${key}=${escapeUnicode(value)}`)
  .join('\n');

// Escape cả phần chú thích: ghi latin1 mà để nguyên tiếng Việt thì comment
// biến thành ký tự rác, người mở file sau không đọc nổi lời dặn ở đầu file.
const headerAscii = escapeUnicodeComment(header);

/** Giữ chú thích đọc được: bỏ dấu thay vì escape, vì \uXXXX trong comment vô nghĩa. */
function escapeUnicodeComment(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

const target = new URL(
  '../aptis-backend/src/main/resources/ValidationMessages.properties',
  import.meta.url,
);

writeFileSync(target, `${headerAscii}${body}\n`, 'latin1');
console.log(`Đã sinh ${Object.keys(MESSAGES).length} thông báo vào ValidationMessages.properties`);
