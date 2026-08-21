import { Link } from 'react-router-dom';

/**
 * Danh sách 5 kỹ năng Aptis.
 *
 * <p>Có trang này vì thanh nav dưới trên điện thoại không đủ chỗ cho từng kỹ
 * năng — sidebar desktop liệt kê cả 5, còn mobile chỉ vào được qua một mục.
 *
 * <p>Danh sách để cứng thay vì gọi API: cấu trúc Aptis General cố định 5 kỹ
 * năng, và trang này chỉ là mục lục điều hướng — thêm một lượt chờ tải chỉ làm
 * chậm việc bấm sang trang kỹ năng.
 */

const SKILLS = [
  {
    to: '/luyen-tap/nghe',
    name: 'Nghe',
    en: 'Listening',
    parts: '4 Part',
    text: 'Nghe hội thoại, độc thoại và ghép ý kiến người nói.',
  },
  {
    to: '/luyen-tap/doc',
    name: 'Đọc',
    en: 'Reading',
    parts: '4 Part',
    text: 'Điền từ, sắp xếp câu, đọc hiểu và ghép tiêu đề.',
  },
  {
    to: '/luyen-tap/viet',
    name: 'Viết',
    en: 'Writing',
    parts: '4 Part',
    text: 'Trả lời tin nhắn ngắn, điền đơn và viết email.',
  },
  {
    to: '/luyen-tap/noi',
    name: 'Nói',
    en: 'Speaking',
    parts: '4 Part',
    text: 'Trả lời câu hỏi cá nhân, miêu tả tranh và thuyết trình.',
  },
  {
    to: '/luyen-tap/ngu-phap-tu-vung',
    name: 'Ngữ pháp & Từ vựng',
    en: 'Grammar & Vocabulary',
    parts: '2 Part',
    text: 'Phần thi ngắn quyết định band điểm khởi điểm.',
  },
] as const;

export function SkillListPage() {
  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-stone-500" aria-label="Đường dẫn">
        <Link to="/" className="hover:text-brand-800">Trang chủ</Link>
        <span aria-hidden="true">›</span>
        <span className="font-semibold text-stone-800">Kỹ năng</span>
      </nav>

      <header className="rounded-xl bg-brand-900 px-5 py-5 text-white shadow-[0_10px_28px_rgba(5,63,53,.14)] sm:px-7">
        <p className="text-[10px] font-semibold uppercase tracking-wide">
          <span className="rounded-md bg-white/10 px-2 py-0.5">Aptis General · 5 kỹ năng</span>
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">Luyện theo kỹ năng</h1>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-[#c4e1d8]">
          Chọn kỹ năng để làm bài test đầy đủ hoặc luyện từng Part.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {SKILLS.map((skill) => (
          <Link
            key={skill.to}
            to={skill.to}
            className="rounded-xl border border-border bg-white p-5 transition hover:border-brand-400 hover:shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{skill.name}</h2>
              <span aria-hidden className="text-brand-700">→</span>
            </div>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-brand-800">
              {skill.en} · {skill.parts}
            </span>
            <p className="mt-1.5 text-xs leading-5 text-slate-600">{skill.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
