import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { practiceApi } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { PremiumGate } from '@/components/ui/PremiumGate';
import { MicCheck } from '@/features/practice/MicCheck';
import { useComponents, useExamVersions, usePart, useParts } from '@/features/catalog/catalogQueries';
import { componentDisplayName, findComponentBySlug, findPartBySlug } from '@/features/catalog/catalogRoutes';

/**
 * Màn chuẩn bị trước khi vào luyện một Part.
 *
 * Trước đây trang này tạo lượt luyện ngay trong useEffect rồi chuyển thẳng sang
 * màn làm bài, nên học viên bị đẩy vào phần ghi âm mà chưa biết Part có bao
 * nhiêu câu, mỗi câu bao nhiêu giây, hay cần bật microphone. Giờ chỉ tạo lượt
 * khi bấm "Bắt đầu làm bài".
 */
export function PartPage() {
  const { partId, componentSlug, partSlug } = useParams<{
    partId?: string;
    componentSlug?: string;
    partSlug?: string;
  }>();
  const navigate = useNavigate();
  // Speaking chèn thêm bước kiểm tra micro trước khi tạo lượt luyện, vì bài nói
  // do AI chấm nên một bản ghi không thu được tiếng sẽ ra điểm thấp oan.
  const [step, setStep] = useState<'intro' | 'mic-check'>('intro');

  const versionsQuery = useExamVersions();
  const componentsQuery = useComponents(versionsQuery.data?.[0]?.id);
  const semanticComponent = componentSlug
    ? findComponentBySlug(componentsQuery.data ?? [], componentSlug)
    : undefined;
  const partsQuery = useParts(semanticComponent?.id);
  const semanticPart = partSlug ? findPartBySlug(partsQuery.data ?? [], partSlug) : undefined;
  const resolvedPartId = partId ?? semanticPart?.id;
  const partQuery = usePart(resolvedPartId);


  const createAttempt = useMutation({
    mutationFn: async () => {
      const attempt = await practiceApi.createPartAttempt({
        // Bỏ trống questionSetCount = lấy toàn bộ Part. Trước đây gửi số đề rồi
        // cắt còn 50, nên Part nhiều hơn 50 bộ (Listening Part 1 có 260) có
        // những đề không bao giờ xuất hiện. Giao diện đã phân trang từng đề.
        partId: resolvedPartId!,
        onlyNew: false,
        onlyIncorrect: false,
        timed: false,
      });
      await practiceApi.start(attempt.id);
      return attempt;
    },
    onSuccess: (attempt) => navigate(`/attempts/${attempt.id}`, { replace: true }),
  });

  const loading = versionsQuery.isLoading
    || componentsQuery.isLoading
    || Boolean(componentSlug && partsQuery.isLoading)
    || partQuery.isLoading;
  const loadError = versionsQuery.error || componentsQuery.error || partsQuery.error || partQuery.error;

  if (loading) return <LoadingBlock label="Đang tải thông tin Part…" />;

  if (loadError || !partQuery.data) {
    return <ErrorBlock message="Không tải được Part này" onRetry={() => void partQuery.refetch()} />;
  }

  const part = partQuery.data;

  if (part.publishedQuestionSetCount === 0) {
    return (
      <div className="space-y-4">
        <ErrorBlock message="Part này chưa có bài nào được phát hành." />
        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>← Quay lại</button>
      </div>
    );
  }

  const premiumBlocked = createAttempt.error instanceof ApiError && createAttempt.error.isPremiumRequired;
  // Vào bằng /parts/:partId thì không có component trong URL, nên suy kỹ năng từ
  // mã Part (SPEAKING_P2, READING_PART_2…) — PartSummary không trả componentId.
  const skillName = semanticComponent
    ? componentDisplayName(semanticComponent)
    : skillFromComponentCode(part.componentCode);
  const tips = tipsFor(part.componentCode, part.displayOrder, skillName);
  const needsMicCheck = part.componentCode.toUpperCase() === 'SPEAKING';

  // Lỗi tạo lượt (premium, hết đề…) chỉ hiện ở màn intro, nên quay về đó để
  // học viên đọc được thông báo thay vì đứng im ở bước kiểm tra micro.
  if (step === 'mic-check' && !createAttempt.error) {
    return (
      <MicCheck
        onContinue={() => createAttempt.mutate()}
        continueLabel="Bắt đầu làm bài"
        continuePending={createAttempt.isPending}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-4">
      {premiumBlocked && <PremiumGate message="Các bài trong Part này cần gói Premium." />}
      {createAttempt.error && !premiumBlocked && (
        <ErrorBlock
          message={createAttempt.error instanceof ApiError
            ? createAttempt.error.code === 'NOT_ENOUGH_QUESTION_SETS'
              ? 'Part này hiện chưa có bài phù hợp để luyện.'
              : createAttempt.error.message
            : 'Không tạo được lượt luyện.'}
          onRetry={() => createAttempt.mutate()}
        />
      )}

      <section className="mt-4 rounded-xl border border-stone-200 bg-white p-5 shadow-[0_8px_24px_rgba(43,39,30,.08)] sm:p-7">
        <div className="text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#e6f1ec] text-brand-800">
            <SkillIcon skill={skillName} />
          </span>
          <p className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
            <span className="rounded-md bg-[#f5f3ec] px-2 py-0.5 text-stone-600">
              {skillName ? `Aptis ${skillName}` : 'Aptis'}
            </span>
            <span className="rounded-md bg-brand-800 px-2 py-0.5 text-white">Luyện theo Part</span>
          </p>
          <h1 className="mt-3 rounded-lg border border-stone-900 px-4 py-2 text-xl font-semibold sm:text-2xl">
            {readyHeadline(skillName)}
          </h1>
          <p className="mt-2 text-sm text-stone-500">Bài luyện mô phỏng theo format Aptis chuẩn</p>
        </div>

        <div className="mt-6 space-y-2">
          <InfoRow
            icon={<ListIcon />}
            title="Số lượng câu hỏi"
            value={`${part.name} · ${part.publishedQuestionSetCount} đề`}
          />
          {part.instructions && (
            <InfoRow icon={<HelpIcon />} title="Cách trả lời" value={part.instructions} />
          )}
          <InfoRow
            icon={<ClockIcon />}
            title="Giới hạn thời gian"
            value={durationLabel(part.defaultDurationSeconds, skillName)}
          />
        </div>

        {tips.length > 0 && (
          <div className="mt-4 rounded-xl bg-[#fdf6e7] p-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-[#8a6b1f]">
              💡 Mẹo làm bài
            </h2>
            <ul className="mt-2 space-y-1">
              {tips.map((tip) => (
                <li key={tip} className="flex gap-2 text-xs leading-5 text-[#6f5716]">
                  <span aria-hidden="true">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>← Quay lại</button>
          <button
            type="button"
            className="btn-primary"
            disabled={createAttempt.isPending}
            onClick={() => (needsMicCheck ? setStep('mic-check') : createAttempt.mutate())}
          >
            {createAttempt.isPending ? 'Đang mở bài luyện…' : '▷ Bắt đầu làm bài'}
          </button>
        </div>
      </section>
    </div>
  );
}

/** Tên kỹ năng khi URL không mang componentSlug (vào bằng /parts/:partId). */
function skillFromComponentCode(code: string): string | null {
  const byCode: Record<string, string> = {
    SPEAKING: 'Speaking',
    LISTENING: 'Listening',
    READING: 'Reading',
    WRITING: 'Writing',
    GRAMMAR_VOCABULARY: 'Grammar & Vocabulary',
  };
  return byCode[code.toUpperCase()] ?? null;
}

/** Tiêu đề đổi theo kỹ năng: "làm bài nói" tự nhiên hơn "làm bài" chung. */
function readyHeadline(skill: string | null) {
  if (!skill) return 'Sẵn sàng làm bài?';
  const lowered = skill.toLowerCase();
  if (lowered.includes('speaking') || lowered.includes('nói')) return 'Sẵn sàng làm bài nói?';
  if (lowered.includes('writing') || lowered.includes('viết')) return 'Sẵn sàng làm bài viết?';
  if (lowered.includes('listening') || lowered.includes('nghe')) return 'Sẵn sàng làm bài nghe?';
  if (lowered.includes('reading') || lowered.includes('đọc')) return 'Sẵn sàng làm bài đọc?';
  return 'Sẵn sàng làm bài?';
}

function durationLabel(seconds: number | null, skill: string | null) {
  const base = seconds ? `${Math.round(seconds / 60)} phút` : 'Không giới hạn';
  const lowered = (skill ?? '').toLowerCase();
  if (lowered.includes('speaking') || lowered.includes('nói')) return `${base} · luyện theo part, cần microphone`;
  if (lowered.includes('listening') || lowered.includes('nghe')) return `${base} · luyện theo part, cần tai nghe`;
  return `${base} · luyện theo part`;
}

/**
 * Mẹo theo cặp (mã kỹ năng, thứ tự Part) — mã Part chỉ là PART_1..PART_4 và lặp
 * lại ở mọi kỹ năng nên không dùng làm khoá được. Part chưa có mẹo riêng thì
 * dùng mẹo chung của kỹ năng.
 */
function tipsFor(componentCode: string, displayOrder: number, skill: string | null): string[] {
  const byPart: Record<string, string[]> = {
    'SPEAKING:1': [
      'Test microphone trước — nói thử 1 câu, nghe lại',
      'Mỗi câu chỉ 30 giây: trả lời trực tiếp, đừng mở bài dài',
      'Nói 2–3 câu là đủ, thêm một lý do hoặc ví dụ ngắn',
    ],
    'SPEAKING:2': [
      'Test microphone trước — nói thử 1 câu, nghe lại',
      'Câu 1 miêu tả tranh: nói vị trí, người, hành động, không đoán quá xa',
      'Câu 2 kể trải nghiệm bản thân, câu 3 nêu ý kiến chung',
      'Tận dụng đủ thời gian — ngắn quá AI sẽ chấm thấp',
    ],
    'SPEAKING:3': [
      'Test microphone trước — nói thử 1 câu, nghe lại',
      'So sánh hai tranh chứ đừng miêu tả tách rời từng tranh',
      'Dùng từ so sánh: whereas, while, on the other hand',
    ],
    'SPEAKING:4': [
      'Test microphone trước — nói thử 1 câu, nghe lại',
      'Có 1 phút chuẩn bị: ghi 3–4 ý chính, đừng viết cả bài',
      'Nói 180–240 từ, kể một trải nghiệm cụ thể rồi rút ra bài học',
      'Tận dụng đủ thời gian — ngắn quá AI sẽ chấm thấp',
    ],
    'READING:1': ['Đọc cả câu trước khi chọn từ, để ý thời và giới từ'],
    'READING:2': [
      'Tìm câu mở đầu trước, thường không có từ nối hay đại từ thay thế',
      'Dựa vào từ nối và đại từ (this, they, however) để lần ra thứ tự',
    ],
    'READING:3': ['Đọc hết bốn ý kiến trước, rồi tìm từ khoá riêng của từng người'],
    'READING:4': ['Đọc tiêu đề trước, sau đó tìm ý chính của từng đoạn'],
  };

  const key = `${componentCode.toUpperCase()}:${displayOrder}`;
  if (byPart[key]) return byPart[key];

  const lowered = (skill ?? '').toLowerCase();
  if (lowered.includes('speaking') || lowered.includes('nói')) {
    return [
      'Test microphone trước — nói thử 1 câu, nghe lại',
      'Tốc độ ổn định 100–130 từ/phút, không nói quá nhanh',
      'Nếu bí từ: dùng synonym hoặc paraphrase, đừng dừng',
      'Tận dụng đủ thời gian — ngắn quá AI sẽ chấm thấp',
    ];
  }
  if (lowered.includes('listening') || lowered.includes('nghe')) {
    return [
      'Dùng tai nghe và kiểm tra âm lượng trước khi bắt đầu',
      'Đọc câu hỏi trước khi bật audio để biết cần nghe gì',
      'Số lần phát lại có giới hạn — đừng phát khi chưa tập trung',
    ];
  }
  if (lowered.includes('writing') || lowered.includes('viết')) {
    return [
      'Đọc kỹ yêu cầu độ dài, viết thiếu từ sẽ bị trừ điểm',
      'Dành 1–2 phút cuối đọc lại, lỗi chính tả và thời rất dễ mất điểm',
    ];
  }
  return ['Tiến độ được lưu tự động, bạn có thể nộp từng đề để xem kết quả ngay'];
}

function InfoRow({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[#f5f3ec] px-4 py-3">
      <span className="mt-0.5 shrink-0 text-brand-800">{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-stone-800">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-stone-600">{value}</span>
      </span>
    </div>
  );
}

function SkillIcon({ skill }: { skill: string | null }) {
  const lowered = (skill ?? '').toLowerCase();
  if (lowered.includes('speaking') || lowered.includes('nói')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    );
  }
  if (lowered.includes('listening') || lowered.includes('nghe')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
        <path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="m8 12 2 2 5-5M8 18h8" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.3M12 17h.01" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
