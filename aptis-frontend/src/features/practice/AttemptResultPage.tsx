import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { practiceApi, teacherClassroomApi } from '@/api/endpoints';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { EvaluationFeedbackCard } from '@/features/practice/EvaluationFeedbackCard';
import { AptisScoreReportCard } from '@/features/practice/AptisScoreReportCard';
import { useComponents, useExamVersions, useParts, usePartsOfComponents } from '@/features/catalog/catalogQueries';
import { formatDuration, formatPercent } from '@/lib/format';
import { formatScoreLine } from './scoreDisplay';
import { AttemptQuestionSet, PartSummary } from '@/types/api';
import { cefrFromScore50, skillByCode } from '@/lib/skills';
import { componentPath } from '@/features/catalog/catalogRoutes';

interface SkillGroup {
  componentCode: string;
  nameVi: string;
  nameEn: string;
  icon: string;
  totalAwarded: number;
  totalMax: number;
  cefrLevel: string | null;
  parts: {
    partId: string;
    partNumber: number;
    partTitle: string;
    description: string;
    awardedScore: number;
    maxScore: number;
    sets: AttemptQuestionSet[];
  }[];
}

const SKILL_ORDER: Record<string, { order: number; icon: string; nameVi: string; nameEn: string }> = {
  SPEAKING: { order: 1, icon: '🎙️', nameVi: 'Kỹ năng Nói', nameEn: 'Speaking' },
  LISTEN: { order: 2, icon: '🎧', nameVi: 'Kỹ năng Nghe', nameEn: 'Listening' },
  LISTENING: { order: 2, icon: '🎧', nameVi: 'Kỹ năng Nghe', nameEn: 'Listening' },
  GRAMMAR_VOCABULARY: { order: 3, icon: '📖', nameVi: 'Ngữ pháp & Từ vựng', nameEn: 'Grammar & Vocabulary' },
  GRAMMAR: { order: 3, icon: '📖', nameVi: 'Ngữ pháp & Từ vựng', nameEn: 'Grammar & Vocabulary' },
  READING: { order: 4, icon: '📚', nameVi: 'Kỹ năng Đọc', nameEn: 'Reading' },
  READ: { order: 4, icon: '📚', nameVi: 'Kỹ năng Đọc', nameEn: 'Reading' },
  WRITING: { order: 5, icon: '✍️', nameVi: 'Kỹ năng Viết', nameEn: 'Writing' },
  WRIT: { order: 5, icon: '✍️', nameVi: 'Kỹ năng Viết', nameEn: 'Writing' },
};

function getStandardPartTitle(componentCode: string, partNumber: number, fallbackName?: string): string {
  const code = componentCode.toUpperCase();
  if (code.includes('SPEAK')) {
    if (partNumber === 1) return 'Phần 1: Trả lời 3 câu hỏi cá nhân';
    if (partNumber === 2) return 'Phần 2: Miêu tả bức tranh';
    if (partNumber === 3) return 'Phần 3: So sánh 2 bức tranh & thảo luận';
    if (partNumber === 4) return 'Phần 4: Thuyết trình theo chủ đề';
  } else if (code.includes('LISTEN')) {
    if (partNumber === 1) return 'Phần 1: Nghe tranh & thông tin ngắn (13 câu)';
    if (partNumber === 2) return 'Phần 2: Ghép người nói với quan điểm (4 người)';
    if (partNumber === 3) return 'Phần 3: Thảo luận ý kiến nam / nữ (4 câu)';
    if (partNumber === 4) return 'Phần 4: Nghe 2 đoạn độc thoại dài (4 câu)';
  } else if (code.includes('GRAMMAR') || code.includes('VOCAB')) {
    if (partNumber === 1) return 'Phần 1: Ngữ pháp (Grammar - 25 câu)';
    if (partNumber === 2) return 'Phần 2: Từ vựng (Vocabulary - 25 câu)';
  } else if (code.includes('READ')) {
    if (partNumber === 1) return 'Phần 1: Chọn từ hoàn thành câu';
    if (partNumber === 2) return 'Phần 2: Sắp xếp câu thành đoạn văn';
    if (partNumber === 3) return 'Phần 3: Đọc hiểu văn bản ngắn';
    if (partNumber === 4) return 'Phần 4: Đọc văn bản dài & ghép tiêu đề';
  } else if (code.includes('WRIT')) {
    if (partNumber === 1) return 'Phần 1: Trả lời 5 tin nhắn ngắn';
    if (partNumber === 2) return 'Phần 2: Điền đơn đăng ký (20-30 từ)';
    if (partNumber === 3) return 'Phần 3: Trả lời 3 câu hỏi diễn đàn (30-40 từ/câu)';
    if (partNumber === 4) return 'Phần 4: Viết 2 email thân mật và trang trọng';
  }
  return fallbackName ?? `Phần ${partNumber}`;
}

/**
 * Kết quả một lượt làm bài.
 *
 * <p>Giáo viên xem bài của học viên lớp mình dùng đúng trang này, chỉ khác chỗ
 * lấy dữ liệu: route có studentUserId thì gọi API phía giáo viên, vốn kiểm em
 * đó có nằm trong lớp mình không.
 */
export function AttemptResultPage() {
  const { attemptId, studentUserId } = useParams<{
    attemptId: string;
    studentUserId?: string;
  }>();
  const navigate = useNavigate();

  const attemptQuery = useQuery({
    queryKey: ['attempt', attemptId, studentUserId],
    queryFn: () =>
      studentUserId
        ? teacherClassroomApi.studentAttemptDetail(studentUserId, attemptId!)
        : practiceApi.getAttempt(attemptId!),
    enabled: Boolean(attemptId),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: (query) => (query.state.data?.status === 'SCORING' ? 1000 : false),
  });

  const attemptStatus = attemptQuery.data?.status;
  // Bài Speaking/Writing dừng ở SCORING cho tới khi job chấm xong, nên phải hỏi
  // trong lúc đó chứ không chỉ khi đã COMPLETED.
  const isScoring = attemptStatus === 'SCORING';

  const evaluationsQuery = useQuery({
    queryKey: ['attempt-evaluations', attemptId, studentUserId],
    queryFn: () =>
      studentUserId
        ? teacherClassroomApi.studentAttemptEvaluations(studentUserId, attemptId!)
        : practiceApi.evaluations(attemptId!),
    enabled: Boolean(attemptId) && (attemptStatus === 'COMPLETED' || isScoring),
    refetchInterval: isScoring ? 1000 : false,
  });

  const versionsQuery = useExamVersions();
  const componentsQuery = useComponents(versionsQuery.data?.[0]?.id);
  const partsQuery = useParts(attemptQuery.data?.componentId ?? undefined);
  const allPartsQuery = usePartsOfComponents(
    attemptQuery.data?.componentId ? [] : (componentsQuery.data ?? []).map((entry) => entry.id),
  );
  const parts = attemptQuery.data?.componentId ? partsQuery.data : allPartsQuery.data;

  const rawAttempt = attemptQuery.data;

  // Group QuestionSets by Skill & Part
  const groupedSkills: SkillGroup[] = useMemo(() => {
    if (!rawAttempt?.questionSets) return [];

    const partMap = new Map<string, PartSummary>();
    for (const p of parts ?? []) partMap.set(p.id, p);

    // Group sets by Part ID
    const setsByPart = new Map<string, AttemptQuestionSet[]>();
    for (const set of rawAttempt.questionSets) {
      const partId = set.content.partId;
      setsByPart.set(partId, [...(setsByPart.get(partId) ?? []), set]);
    }

    // Group parts by Component Code
    const skillsMap = new Map<string, SkillGroup>();

    setsByPart.forEach((sets, partId) => {
      const metadata = partMap.get(partId);
      const componentCode = (metadata?.componentCode ?? 'OTHER').toUpperCase();
      const meta = SKILL_ORDER[componentCode] ?? {
        order: 99,
        icon: '📝',
        nameVi: metadata?.name ?? 'Kỹ năng khác',
        nameEn: componentCode,
      };

      if (!skillsMap.has(componentCode)) {
        const compScore = rawAttempt.componentScores?.find((cs) =>
          cs.componentCode.toUpperCase() === componentCode
          || cs.componentName.toUpperCase() === meta.nameEn.toUpperCase(),
        );

        skillsMap.set(componentCode, {
          componentCode,
          nameVi: meta.nameVi,
          nameEn: meta.nameEn,
          icon: meta.icon,
          totalAwarded: 0,
          totalMax: 0,
          cefrLevel: compScore?.cefrLevel ?? null,
          parts: [],
        });
      }

      const skillGroup = skillsMap.get(componentCode)!;
      const partNumber = metadata?.displayOrder ?? (skillGroup.parts.length + 1);
      const partTitle = getStandardPartTitle(componentCode, partNumber, metadata?.name);

      const partAwarded = sets.reduce((sum, s) => sum + (s.awardedScore ?? 0), 0);
      const partMax = sets.reduce((sum, s) => sum + (s.maxScore ?? 0), 0);

      skillGroup.totalAwarded += partAwarded;
      skillGroup.totalMax += partMax;

      const totalItemsInPart = sets.reduce((sum, s) => sum + s.content.items.length, 0);
      const taskType = sets[0]?.content.taskTypeCode ?? '';

      skillGroup.parts.push({
        partId,
        partNumber,
        partTitle,
        description: `${totalItemsInPart} câu · ${taskType}`,
        awardedScore: partAwarded,
        maxScore: partMax,
        sets,
      });
    });

    // Sort parts inside each skill by partNumber
    skillsMap.forEach((skill) => {
      skill.parts.sort((a, b) => a.partNumber - b.partNumber);
    });

    // Sort skills by official Aptis order: Speaking -> Listening -> Grammar/Vocab -> Reading -> Writing
    return Array.from(skillsMap.values()).sort((a, b) => {
      const orderA = SKILL_ORDER[a.componentCode]?.order ?? 99;
      const orderB = SKILL_ORDER[b.componentCode]?.order ?? 99;
      return orderA - orderB;
    });
  }, [rawAttempt?.questionSets, rawAttempt?.componentScores, parts]);

  if (attemptQuery.isLoading) {
    return <LoadingBlock label="Đang tổng hợp kết quả bài làm…" />;
  }

  if (attemptQuery.error || !attemptQuery.data) {
    return (
      <ErrorBlock
        message="Không tải được kết quả"
        onRetry={() => void attemptQuery.refetch()}
      />
    );
  }

  const attempt = attemptQuery.data;
  const scoring = attempt.status === 'SCORING';
  // Writing không có audio nên đừng nói "nhận diện âm thanh" với người viết bài.
  const hasSpeaking = (attempt.questionSets ?? []).some((entry) =>
    (entry.content?.items ?? []).some((item) => item.responseType === 'AUDIO_RECORDING'),
  );
  // Ghi âm nhóm theo questionSetId để gắn đúng bản ghi vào thẻ nhận xét của
  // chính bộ đó. Giữ thứ tự itemResponses vì đó là thứ tự câu trong đề.
  const recordingsByQuestionSet = new Map<string, string[]>();
  for (const entry of attempt.questionSets ?? []) {
    const ids = (entry.savedResponse?.itemResponses ?? [])
      .map((item) => item.recordingAssetId)
      .filter((id): id is string => Boolean(id));
    if (ids.length > 0) {
      recordingsByQuestionSet.set(entry.questionSetId, ids);
    }
  }

  const isPartPractice = attempt.mode === 'PART_PRACTICE' || Boolean(attempt.partId);

  const currentPart = parts?.find((p) => p.id === attempt.partId);
  const currentPartTitle = currentPart
    ? getStandardPartTitle(currentPart.componentCode, currentPart.displayOrder, currentPart.name)
    : (attempt.questionSets[0]?.content.title ?? 'Luyện tập theo Part');

  const totalAwarded = attempt.questionSets.reduce((sum, s) => sum + (s.awardedScore ?? 0), 0);
  const totalMax = attempt.questionSets.reduce((sum, s) => sum + (s.maxScore ?? 0), 0);

  /**
   * Luyện theo Part nạp CẢ NGÂN HÀNG đề rồi để học viên làm dần, nên
   * attempt.maxScore là điểm tối đa của hàng trăm câu — không phải của phần
   * học viên vừa làm. Chia cho nó thì làm 30/295 câu đúng hết vẫn ra 9%, và
   * học viên tưởng mình làm sai gần hết.
   *
   * Chỉ tính trên những bộ ĐÃ LÀM: đúng 25/30 câu thì hiện 83%.
   */
  const attemptedSets = attempt.questionSets.filter(
    (set) => set.status === 'SCORED' || set.status === 'ANSWERED',
  );
  const attemptedAwarded = attemptedSets.reduce((sum, s) => sum + (s.awardedScore ?? 0), 0);
  const attemptedMax = attemptedSets.reduce((sum, s) => sum + (s.maxScore ?? 0), 0);

  // Thi thử vẫn dùng điểm toàn đề: ở đó bỏ trống câu nào là mất điểm câu đó,
  // đúng như thi thật.
  const displayedAwarded = isPartPractice
    ? attemptedAwarded
    : (attempt.rawScore ?? totalAwarded);
  const displayedMax = isPartPractice ? attemptedMax : (attempt.maxScore ?? totalMax);

  const partPercentage = isPartPractice
    ? (attemptedMax > 0 ? (attemptedAwarded / attemptedMax) * 100 : null)
    : (attempt.percentageScore
        ?? (displayedMax > 0 ? (displayedAwarded / displayedMax) * 100 : null));


  return (
    <div className="space-y-8 max-w-5xl mx-auto px-3 sm:px-4 py-4">
      {/* Nói rõ đang xem bài người khác, để khỏi tưởng là bài của chính mình. */}
      {studentUserId && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
          <p className="text-sm font-semibold text-amber-900">
            Bạn đang xem bài làm của học viên
          </p>
        </div>
      )}

      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(studentUserId ? '/giang-day' : '/history')}
          className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-brand-600 transition-colors"
        >
          ← {studentUserId ? 'Lớp học của tôi' : 'Lịch sử làm bài'}
        </button>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-brand-600 transition-colors"
        >
          Về bảng điều khiển →
        </Link>
      </div>

      {/* Scoring In-Progress Banner */}
      {scoring && (
        <div className="rounded-2xl border-2 border-amber-400/80 bg-amber-50/90 p-5 text-amber-900 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full bg-amber-500 animate-ping" />
            <h2 className="text-base font-bold">Đang chấm bài thi…</h2>
          </div>
          <p className="mt-1.5 text-xs text-amber-800">
            {hasSpeaking
              ? 'Hệ thống đang nhận diện âm thanh và đánh giá theo tiêu chí CEFR. Thường mất khoảng 1 phút.'
              : 'Giám khảo AI đang đánh giá bài viết của bạn theo tiêu chí CEFR. Thường mất khoảng 15 giây.'}
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Kết quả tự hiện, bạn không cần tải lại trang.{' '}
            <strong>Rời trang cũng không mất bài</strong> — hệ thống vẫn chấm và
            gửi email cho bạn khi xong, kết quả luôn nằm trong Lịch sử làm bài.
          </p>
        </div>
      )}

      {/* 1. KHI LUYỆN TẬP THEO TỪNG PART: Hiện Hero Card gọn gàng, tập trung đúng Part vừa làm */}
      {isPartPractice ? (
        <PartResultHero
          skillCode={currentPart?.componentCode}
          title={currentPartTitle}
          scoring={scoring}
          percentage={partPercentage}
          correct={attempt.correctItems ?? 0}
          answered={attempt.answeredItems ?? 0}
          total={attempt.totalItems}
          timeSpent={formatDuration(attempt.timeSpentSeconds)}
          summary={attemptedSets.length > 0
            ? `Đạt ${displayedAwarded.toFixed(1)} / ${displayedMax.toFixed(1)} điểm trên ${attemptedSets.length} đề đã làm`
            : studentUserId
              ? 'Em chưa làm đề nào trong lượt này'
              : 'Bạn chưa làm đề nào trong lượt này'}
          showActions={!studentUserId}
        />
      ) : (
        /* 2. KHI THI THỬ FULL KỸ NĂNG (MOCK TEST): Hiện Bảng điểm chuẩn Aptis British Council */
        <>
          {/* Official Aptis Scorecard Card (Form chuẩn Aptis British Council) */}
          <AptisScoreReportCard attempt={attempt} />

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl border border-border bg-white p-4 sm:p-5 shadow-sm text-center">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">TỔNG SỐ CÂU</p>
              <p className="mt-1 font-mono text-lg font-extrabold text-slate-900 sm:text-2xl">{attempt.totalItems}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">ĐÃ LÀM</p>
              <p className="mt-1 font-mono text-lg font-extrabold text-slate-900 sm:text-2xl">{attempt.answeredItems} câu</p>
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700">SỐ CÂU ĐÚNG</p>
              <p className="mt-1 font-mono text-lg font-extrabold text-emerald-600 sm:text-2xl">
                {scoring ? 'Đang chấm' : `${attempt.correctItems ?? 0} câu`}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">THỜI GIAN LÀM</p>
              <p className="mt-1 font-mono text-lg font-extrabold text-slate-900 sm:text-2xl">
                {formatDuration(attempt.timeSpentSeconds)}
              </p>
            </div>
          </div>

          {/* Detailed Skill & Part Breakdown (Sắp xếp gom theo từng kỹ năng và từng Part) */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">Chi tiết điểm theo kỹ năng & từng phần thi</h2>
                <p className="text-xs text-slate-500 mt-0.5">Phân tích kết quả chi tiết từng Part theo thang điểm chuẩn Aptis</p>
              </div>
            </div>

            <div className="space-y-6">
              {groupedSkills.map((skill) => {
                const skillRatio = skill.totalMax > 0 ? (skill.totalAwarded / skill.totalMax) : 0;
                return (
                  <div
                    key={skill.componentCode}
                    className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition hover:shadow-md"
                  >
                    {/* Skill Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{skill.icon}</span>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            {skill.nameVi}
                            <span className="text-xs font-normal text-slate-400 uppercase">({skill.nameEn})</span>
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">
                            {skill.parts.length} phần thi
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {skill.cefrLevel && (
                          <span className="rounded-full bg-brand-100 px-3 py-1 font-mono text-xs font-bold text-brand-800 uppercase">
                            CEFR: {skill.cefrLevel}
                          </span>
                        )}
                        <div className="text-right">
                          <p className="font-mono text-base font-extrabold text-slate-900">
                            {skill.totalAwarded.toFixed(1)} / {skill.totalMax.toFixed(1)}
                          </p>
                          <p className="font-mono text-[11px] font-semibold text-slate-500">
                            {formatPercent(skillRatio * 100)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Parts in this skill */}
                    <div className="divide-y divide-slate-100 p-2 sm:p-3">
                      {skill.parts.map((part) => {
                        const hasScore = part.maxScore > 0;
                        const partRatio = hasScore ? (part.awardedScore / part.maxScore) : 0;
                        const scoreLine = formatScoreLine(part.awardedScore, part.maxScore);

                        return (
                          <div
                            key={part.partId}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl p-3.5 hover:bg-slate-50/80 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                                {part.partTitle}
                              </h4>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {part.description}
                              </p>

                              {/* Multiple Sub-sets (ví dụ Listening Part 4 gồm 2 đoạn nói) */}
                              {part.sets.length > 1 && (
                                <div className="mt-2 space-y-1 pl-3 border-l-2 border-slate-200">
                                  {part.sets.map((subSet, sIdx) => {
                                    const subLine = formatScoreLine(subSet.awardedScore, subSet.maxScore);
                                    return (
                                      <div key={subSet.attemptQuestionSetId} className="flex items-center justify-between text-xs text-slate-600">
                                        <span className="truncate pr-2">
                                          • {subSet.content.title ?? `Đoạn ${sIdx + 1}`} ({subSet.content.items.length} câu)
                                        </span>
                                        <span className="font-mono font-medium shrink-0">
                                          {subLine ?? 'Đang chấm'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            <div className="shrink-0 text-left sm:text-right flex items-center sm:flex-col justify-between sm:justify-center gap-2">
                              {scoreLine === null ? (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-500 font-medium">
                                  Đang chấm
                                </span>
                              ) : (
                                <>
                                  <span className="font-mono text-sm font-bold text-slate-900">
                                    {scoreLine}
                                  </span>
                                  <span
                                    className={clsx(
                                      'rounded-md px-2 py-0.5 font-mono text-[11px] font-bold',
                                      partRatio >= 0.8 ? 'bg-emerald-50 text-emerald-700' :
                                      partRatio >= 0.5 ? 'bg-amber-50 text-amber-700' :
                                      'bg-slate-100 text-slate-600',
                                    )}
                                  >
                                    {formatPercent(partRatio * 100)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* AI Evaluations Feedback for Speaking & Writing */}
      {evaluationsQuery.data && evaluationsQuery.data.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Nhận xét chi tiết từ Giám khảo AI</h2>
              <p className="text-xs text-slate-500 mt-0.5">Đánh giá 4 tiêu chí ngữ pháp, từ vựng, phát âm và độ mạch lạc theo khung CEFR</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-bold text-slate-600 uppercase">
              Rubric CEFR
            </span>
          </div>
          {/* Gom nhận xét theo kỹ năng rồi theo part, cùng thứ tự với bảng điểm
              phía trên. Để phẳng thì bài full test ra cả chục thẻ lẫn lộn Speaking
              với Writing, không biết thẻ nào của part nào. */}
          <div className="space-y-8">
            {groupedSkills.map((skill) => {
              const partsWithFeedback = skill.parts
                .map((part) => ({
                  part,
                  evaluations: part.sets.flatMap((set) =>
                    evaluationsQuery.data!.filter((e) => e.questionSetId === set.questionSetId),
                  ),
                }))
                .filter((entry) => entry.evaluations.length > 0);
              if (partsWithFeedback.length === 0) return null;

              return (
                <div key={skill.componentCode} className="space-y-4">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <span>{skill.icon}</span>
                    {skill.nameVi}
                    <span className="text-xs font-normal uppercase text-slate-400">({skill.nameEn})</span>
                  </h3>

                  {partsWithFeedback.map(({ part, evaluations }) => (
                    <div key={part.partId} className="space-y-3 border-l-2 border-brand-200 pl-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-800">{part.partTitle}</h4>
                        {evaluations.length > 1 && (
                          <span className="text-xs text-slate-500">{evaluations.length} câu</span>
                        )}
                      </div>
                      {evaluations.map((evaluation, index) => (
                        <div key={evaluation.questionSetId}>
                          {/* Speaking Part 1 có 3 câu riêng, mỗi câu một thẻ; đánh số
                              để biết đang đọc nhận xét câu nào. */}
                          {evaluations.length > 1 && (
                            <p className="mb-1.5 text-xs font-semibold uppercase text-slate-500">
                              Câu {index + 1}
                            </p>
                          )}
                          <EvaluationFeedbackCard
                            result={evaluation}
                            recordingAssetIds={recordingsByQuestionSet.get(evaluation.questionSetId) ?? []}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Khối hành động cuối trang.

          Giáo viên xem bài học viên thì thay hết: "Xem lại bài làm" của học
          viên trỏ vào trang LÀM BÀI, còn "Luyện tiếp" tạo lượt của chính giáo
          viên — bấm nhầm là hỏng dữ liệu của em. */}
      {studentUserId ? (
        <div className="flex flex-col gap-3 pt-6 sm:flex-row border-t border-slate-200">
          <Link
            to={`/giang-day/hoc-vien/${studentUserId}/bai-lam/${attempt.id}/chi-tiet`}
            className="flex-1 rounded-xl bg-brand-600 px-5 py-3 text-center text-sm font-bold text-white shadow-sm hover:bg-brand-700 transition-colors"
          >
            Xem chi tiết từng câu →
          </Link>
          <Link
            to="/giang-day"
            className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            ← Về lớp học của tôi
          </Link>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-200">
          <Link
            to={`/attempts/${attempt.id}`}
            className="flex-1 rounded-xl bg-brand-600 px-5 py-3 text-center text-sm font-bold text-white shadow-sm hover:bg-brand-700 transition-colors"
          >
            Xem lại bài làm và đáp án chi tiết →
          </Link>
          {attempt.partId ? (
            <>
              <Link
                to={`/parts/${attempt.partId}`}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Luyện tiếp Part này
              </Link>
              {currentPart?.componentId && (
                <Link
                  to={`/components/${currentPart.componentId}/parts`}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Chọn Part khác
                </Link>
              )}
            </>
          ) : (
            <Link
              to="/mock-tests"
              className="flex-1 rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Làm bài thi thử khác
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

const CEFR_STEPS = ['A1', 'A2', 'B1', 'B2', 'C'];

/**
 * Đầu trang kết quả luyện theo Part, theo mock: vòng điểm quy về thang 50,
 * số câu đúng và thanh CEFR ước tính. Thang 50 để khớp điểm ở trang chủ.
 */
function PartResultHero({ skillCode, title, scoring, percentage, correct, answered, total, timeSpent, summary, showActions }: {
  skillCode?: string;
  title: string;
  scoring: boolean;
  percentage: number | null;
  correct: number;
  answered: number;
  total: number;
  timeSpent: string;
  summary: string;
  showActions: boolean;
}) {
  const skill = skillByCode(skillCode);
  const score50 = percentage != null ? percentage / 2 : null;
  const level = score50 != null ? cefrFromScore50(score50) : null;
  const levelIndex = level ? Math.max(0, CEFR_STEPS.indexOf(level.startsWith('C') ? 'C' : level)) : -1;
  const r = 84;
  const c = 2 * Math.PI * r;
  return (
    <section className="flex flex-col items-center rounded-3xl border border-border bg-white px-4 py-8 text-center sm:px-8">
      <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: skill.bg, color: skill.fg }}>
        {skill.nameEn} · Kết quả
      </span>
      <h1 className="mt-3 text-balance text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
      <svg viewBox="0 0 200 200" className="mt-5 h-44 w-44" role="img" aria-label={score50 != null ? `${Math.round(score50)} trên 50 điểm` : 'Đang chấm'}>
        <circle cx="100" cy="100" r={r} fill="none" stroke="#F1F5F9" strokeWidth="14" />
        {score50 != null && (
          <circle cx="100" cy="100" r={r} fill="none" stroke={skill.fg} strokeWidth="14" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, score50 / 50))} transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)' }} />
        )}
        <text x="100" y="108" textAnchor="middle" fontSize="52" fontWeight="800" fill="#0F172A">{scoring ? '…' : score50 != null ? Math.round(score50) : '—'}</text>
        <text x="100" y="134" textAnchor="middle" fontSize="13" fill="#64748B">/ 50 điểm</text>
      </svg>
      <p className="mt-4 text-2xl font-bold tabular-nums text-ink">{scoring ? 'Đang chấm…' : `${correct}/${answered} câu đúng`}</p>
      <p className="mt-1 text-sm text-ink-mute">{scoring ? 'Bài làm đang được chấm tự động.' : summary}</p>

      <div className="mt-6 w-full max-w-2xl rounded-2xl border border-border p-4 text-left">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Trình độ CEFR ước tính</span>
          <span className="text-sm font-bold text-ink">{level ?? '—'}</span>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {CEFR_STEPS.map((step, i) => (
            <div key={step} className="flex flex-col items-center gap-1.5">
              <span className={clsx('h-1.5 w-full rounded-full', i <= levelIndex ? 'bg-ink' : 'bg-surface-muted')} />
              <span className={clsx('text-xs', i === levelIndex ? 'font-bold text-ink' : 'text-ink-faint')}>{step}</span>
            </div>
          ))}
        </div>
      </div>

      <dl className="mt-4 grid w-full max-w-2xl grid-cols-3 gap-2 text-center">
        {[['Tổng số câu', String(total)], ['Đã làm', `${answered} câu`], ['Thời gian', timeSpent]].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-surface-muted px-2 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</dt>
            <dd className="mt-1 text-base font-bold tabular-nums text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      {showActions && skillCode && (
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Link to={componentPath(skillCode)} className="btn-primary">Luyện tiếp {skill.nameEn}</Link>
          <Link to="/history" className="btn-secondary">Kết quả của tôi</Link>
        </div>
      )}
    </section>
  );
}
