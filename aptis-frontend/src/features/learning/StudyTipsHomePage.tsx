import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useIsPremium } from '@/features/auth/authStore';
import { skillByCode } from '@/lib/skills';
import { Icon } from '@/components/shell/icons';

/**
 * Mục lục Mẹo học: mỗi kỹ năng mở ra ba mẹo cốt lõi, kèm đường sang trang chi
 * tiết. Đọc lướt được ngay mà không phải vào từng trang.
 */
const TIPS = [
  {
    code: 'LISTENING',
    to: '/meo-hoc/nghe-phan-3',
    parts: 'Phần 3',
    items: [
      ['Mã hoá người nói', 'Ghi mỗi người nói bằng 1 chữ số, đánh dấu ý kiến bằng +/−. Nhớ đáp án trong vài giây.'],
      ['Nghe từ phủ định', '"not really", "I doubt" thường đảo ngược ý của cả câu — bẫy phổ biến nhất.'],
      ['Dùng lượt nghe 2', 'Lượt 1 bắt ý chung, lượt 2 chỉ kiểm tra câu còn phân vân.'],
    ],
  },
  {
    code: 'READING',
    to: '/meo-hoc/doc',
    parts: 'Phần 1 · 2 · 3 · 4',
    items: [
      ['Chống paraphrase', 'Đáp án gần như không bao giờ lặp lại nguyên từ trong bài — cảnh giác từ trùng.'],
      ['Chuỗi đáp án Part 2', 'Tìm câu mở đầu (không có đại từ tham chiếu) trước, rồi nối theo "this/that/however".'],
      ['Part 4 đọc câu đầu–cuối', 'Ý chính thường nằm ở câu đầu hoặc câu cuối đoạn.'],
    ],
  },
  {
    code: 'WRITING',
    to: '/meo-hoc/viet',
    parts: 'Tổng quan · Phần 2 · 3 · 4',
    items: [
      ['Khung 20–30 từ', 'Trả lời – lý do – ví dụ. Đủ 3 ý là đạt độ dài Part 2 mà không lan man.'],
      ['Hai văn phong Part 4', 'Email thân mật dùng rút gọn, email trang trọng tuyệt đối không.'],
      ['Câu kết an toàn', '"I look forward to hearing from you." — học thuộc, dùng mọi đề.'],
    ],
  },
  {
    code: 'SPEAKING',
    to: '/meo-hoc/noi',
    parts: 'Tổng quan · Phần 1 · 2 · 3 · 4',
    items: [
      ['Khung nhịp theo giây', 'Part 2: 10 giây mô tả chung, 20 giây chi tiết, 15 giây cảm xúc hoặc suy đoán.'],
      ['Phrase bank', '"What strikes me is…", "It seems to me that…" giúp giữ nhịp khi bí ý.'],
      ['Part 4 gộp đề', 'Nhiều đề dùng chung ý — chuẩn bị một lần, dùng cho cả nhóm. Thử ở trang Công cụ.'],
    ],
  },
] as const;

export function StudyTipsHomePage() {
  const isPremium = useIsPremium();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-[920px] flex-col gap-6">
      <header className="animate-rise">
        <h1 className="page-title">Mẹo học</h1>
        <p className="page-description">Chiến lược ngắn gọn cho từng kỹ năng — đọc 2 phút, áp dụng ngay vào phòng thi.</p>
      </header>

      <div className="flex flex-col gap-3">
        {TIPS.map((tip, i) => {
          const skill = skillByCode(tip.code);
          const expanded = open === tip.code;
          return (
            <section key={tip.code} className="animate-rise overflow-hidden rounded-3xl border border-border bg-white" style={{ animationDelay: `${i * 60}ms` }}>
              <button
                type="button"
                // Chưa Premium: vẫn thấy tên kỹ năng để biết mình đang thiếu gì,
                // bấm thì sang trang gói thay vì mở nội dung.
                onClick={() => (isPremium ? setOpen(expanded ? null : tip.code) : undefined)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-4 p-5 text-left"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: skill.bg, color: skill.fg }}>
                  <Icon name={skill.icon} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold">{skill.nameVi}</span>
                  <span className="block text-sm text-ink-mute">{tip.parts}</span>
                </span>
                {isPremium ? (
                  <span className={clsx('grid h-8 w-8 place-items-center rounded-full bg-surface-muted transition-transform', expanded && 'rotate-180')}>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                  </span>
                ) : (
                  <Link to="/plans" className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                    <Icon name="lock" className="h-3.5 w-3.5" /> Premium
                  </Link>
                )}
              </button>
              {expanded && (
                <div className="border-t border-border-subtle px-5 pb-5">
                  <ol className="mt-4 grid gap-3 sm:grid-cols-3">
                    {tip.items.map(([h, b], j) => (
                      <li key={h} className="rounded-2xl bg-surface-paper p-4">
                        <span className="font-mono text-xs font-bold" style={{ color: skill.fg }}>0{j + 1}</span>
                        <p className="mt-1 text-sm font-bold">{h}</p>
                        <p className="mt-1 text-sm leading-6 text-ink-mute">{b}</p>
                      </li>
                    ))}
                  </ol>
                  <Link to={tip.to} className="btn-secondary mt-4">
                    Xem đầy đủ mẹo {skill.nameVi.toLowerCase()} <Icon name="arrow" className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
