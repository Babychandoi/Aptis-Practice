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
    <div className="mx-auto max-w-2xl py-4 space-y-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-brand-600"
      >
        ← Đổi cách luyện
      </button>

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

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        {/* Top Header Card */}
        <div className="bg-dark p-6 text-white sm:p-8">
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-accent">
            Luyện theo Part · {skillName ? `Aptis ${skillName}` : 'Aptis General'}
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {part.name}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {part.description || 'Luyện tập theo đúng dạng bài thi thật · Kết quả tự lưu sau mỗi câu'}
          </p>
        </div>

        {/* Facts & Guidelines */}
        <div className="p-6 space-y-6 sm:p-8">
          {/* 3 Facts Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-surface p-3.5 sm:p-4 text-center sm:text-left">
              <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                SỐ ĐỀ
              </span>
              <span className="mt-1 block font-mono text-lg font-bold text-slate-900 sm:text-xl">
                {part.publishedQuestionSetCount} đề
              </span>
            </div>
            <div className="rounded-xl bg-surface p-3.5 sm:p-4 text-center sm:text-left">
              <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                THỜI GIAN
              </span>
              <span className="mt-1 block font-mono text-lg font-bold text-slate-900 sm:text-xl">
                {part.defaultDurationSeconds ? `${Math.round(part.defaultDurationSeconds / 60)} ph` : 'Linh hoạt'}
              </span>
            </div>
            <div className="rounded-xl bg-surface p-3.5 sm:p-4 text-center sm:text-left">
              <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                THIẾT BỊ
              </span>
              <span className="mt-1 block font-mono text-lg font-bold text-slate-900 sm:text-xl truncate">
                {needsMicCheck ? 'Micro' : 'Tai nghe/Loa'}
              </span>
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-3 divide-y divide-border-subtle pt-2">
            <div className="flex items-start gap-3 pt-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold">✓</span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Tự động lưu câu trả lời</p>
                <p className="text-xs text-slate-500">Tiến độ được cập nhật liên tục, không lo mất bài khi mất mạng.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pt-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold">✓</span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Xem giải thích & chấm điểm sau khi nộp</p>
                <p className="text-xs text-slate-500">Xem đáp án chi tiết và feedback từng tiêu chí sau khi hoàn thành bài.</p>
              </div>
            </div>
          </div>

          {tips.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-amber-800">
                💡 Mẹo làm bài hiệu quả
              </h2>
              <ul className="mt-2 space-y-1.5">
                {tips.map((tip) => (
                  <li key={tip} className="flex gap-2 text-xs leading-relaxed text-amber-900">
                    <span aria-hidden="true">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(-1)}
            >
              ← Quay lại
            </button>
            <button
              type="button"
              className="btn-primary min-w-[200px]"
              disabled={createAttempt.isPending}
              onClick={() => (needsMicCheck ? setStep('mic-check') : createAttempt.mutate())}
            >
              {createAttempt.isPending ? 'Đang khởi tạo bài…' : 'Bắt đầu làm bài →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


/** Tên kỹ năng khi URL không mang componentSlug (vào bằng /parts/:partId). */
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

