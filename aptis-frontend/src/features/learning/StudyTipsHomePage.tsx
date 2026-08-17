import { Link } from 'react-router-dom';

/**
 * Mục lục Mẹo học: chọn kỹ năng trước khi vào trang chi tiết.
 *
 * Trước đây menu trỏ thẳng sang Listening Part 3 vì đó là trang mẹo duy nhất;
 * nay đủ bốn kỹ năng nên cần một chỗ chọn.
 */

const SKILLS = [
  {
    to: '/meo-hoc/nghe-phan-3',
    label: 'Nghe',
    parts: 'Phần 3',
    text: 'Mã hóa người nói thành 4 chữ số để nhớ đáp án trong vài giây.',
  },
  {
    to: '/meo-hoc/doc',
    label: 'Đọc',
    parts: 'Phần 1 · 2 · 3 · 4',
    text: 'Chống paraphrase: bảng dấu hiệu, chuỗi đáp án và bẫy của từng đề.',
  },
  {
    to: '/meo-hoc/viet',
    label: 'Viết',
    parts: 'Tổng quan · Phần 2 · 3 · 4',
    text: 'Tiêu chí chấm, khung câu 20–30 từ và email mẫu chép được ngay.',
  },
  {
    to: '/meo-hoc/noi',
    label: 'Nói',
    parts: 'Tổng quan · Phần 1 · 2 · 3 · 4',
    text: 'Khung nhịp theo giây, phrase bank và 16 bài gộp để lấy ý tưởng.',
  },
] as const;

export function StudyTipsHomePage() {
  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-2 text-xs text-stone-500">
        <Link to="/">Trang chủ</Link><span>›</span>
        <strong className="text-stone-800">Mẹo học</strong>
      </nav>

      <header className="rounded-xl bg-brand-900 px-6 py-5 text-white shadow-[0_10px_28px_rgba(5,63,53,.14)]">
        <p className="text-[10px] font-semibold uppercase tracking-wide">
          <span className="rounded-md bg-white/10 px-2 py-0.5">Aptis · 4 kỹ năng</span>
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Mẹo học</h1>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-[#c4e1d8]">
          Chiến lược ngắn gọn cho nghe, đọc, viết và nói — áp dụng ngay vào phòng thi.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {SKILLS.map((skill) => (
          <Link
            key={skill.to}
            to={skill.to}
            className="rounded-xl border border-[#dfe5dd] bg-white p-5 transition hover:border-brand-400 hover:shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{skill.label}</h2>
              <span aria-hidden className="text-brand-700">→</span>
            </div>
            <span className="text-[11px] font-semibold text-brand-800">{skill.parts}</span>
            <p className="mt-1.5 text-xs leading-5 text-stone-600">{skill.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
