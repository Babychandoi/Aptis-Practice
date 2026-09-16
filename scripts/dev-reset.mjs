/**
 * Dựng lại dữ liệu mẫu cho bản dev.
 *
 * Tạo tài khoản qua API (để mật khẩu được băm đúng cách backend đang dùng) rồi
 * chạy scripts/sql/dev-seed.sql để gán vai trò, tạo lớp và xếp học viên.
 *
 *   node scripts/dev-reset.mjs
 *
 * Chạy lại được nhiều lần: tài khoản đã tồn tại thì bỏ qua, phần SQL dùng
 * INSERT IGNORE nên không tạo trùng.
 *
 * Chỉ dùng cho dev. Script từ chối chạy nếu API không phải cổng dev.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const API = process.env.DEV_API ?? 'http://localhost:8091/api/v1';

// Chặn nhầm tay: gọi nhầm vào production là tạo tài khoản rác trên trang thật.
if (!API.includes('8091') && !API.includes('localhost')) {
  console.error(`API "${API}" không giống bản dev — dừng để tránh đụng production.`);
  process.exit(1);
}

const TAI_KHOAN = [
  { email: 'admin@dev.local', password: 'Admin@12345', fullName: 'Quản trị Dev' },
  { email: 'teacher@dev.local', password: 'Teacher@12345', fullName: 'Cô Nguyễn Lan Phương' },
  { email: 'teacher2@dev.local', password: 'Teacher@12345', fullName: 'Cô Trịnh Bảo Yến' },
  { email: 'student@dev.local', password: 'Student@12345', fullName: 'Nguyễn Thu Hà' },
  { email: 'student2@dev.local', password: 'Student@12345', fullName: 'Trần Minh Quân' },
  { email: 'student3@dev.local', password: 'Student@12345', fullName: 'Lê Bảo Ngọc' },
  { email: 'outsider@dev.local', password: 'Student@12345', fullName: 'Người ngoài' },
];

async function dangKy({ email, password, fullName }) {
  const r = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, fullName }),
  });

  if (r.ok) return 'tạo mới';
  const text = await r.text();
  // Đã có sẵn thì thôi — script phải chạy lại được nhiều lần.
  if (r.status === 409 || text.includes('EMAIL_ALREADY_USED')) return 'đã có';
  throw new Error(`${email}: HTTP ${r.status} ${text.slice(0, 160)}`);
}

console.log(`Tạo tài khoản trên ${API}`);
for (const tk of TAI_KHOAN) {
  const ketQua = await dangKy(tk);
  console.log(`  ${tk.email.padEnd(22)} ${ketQua}`);
}

console.log('\nChạy dev-seed.sql (vai trò, lớp học, Premium)…');
execFileSync(
  'docker',
  ['exec', '-i', 'aptis-dev-mysql', 'mysql', '-uroot', '-proot',
   '--default-character-set=utf8mb4', 'aptis'],
  {
    stdio: ['pipe', 'inherit', 'inherit'],
    // Truyền qua stdin chứ không qua -e: tiếng Việt có dấu đi qua tham số dòng
    // lệnh trên Windows bị vỡ mã.
    input: readFileSync(new URL('./sql/dev-seed.sql', import.meta.url), 'utf8'),
  },
);

console.log('\nXong. Tài khoản:');
console.log('  admin@dev.local    / Admin@12345    (quản trị)');
console.log('  teacher@dev.local  / Teacher@12345  (giáo viên, lớp DEV123)');
console.log('  teacher2@dev.local / Teacher@12345  (giáo viên lớp khác)');
console.log('  student@dev.local  / Student@12345  (trong lớp, có Premium)');
console.log('  student2@dev.local / Student@12345  (trong lớp)');
console.log('  student3@dev.local / Student@12345  (chưa vào lớp, thử mã DEV123)');
console.log('  outsider@dev.local / Student@12345  (ngoài mọi lớp)');
