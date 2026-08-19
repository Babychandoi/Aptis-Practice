import clsx from 'clsx';
import { Attempt, ComponentScore } from '@/types/api';

interface AptisScoreReportCardProps {
  attempt: Attempt;
}

const CEFR_LEVELS = ['C1', 'B2', 'B1', 'A2', 'A1', 'A0'] as const;
type CefrGrade = typeof CEFR_LEVELS[number] | 'C2';

const CEFR_HEIGHT_MAP: Record<string, number> = {
  C2: 100,
  C1: 84,
  B2: 68,
  B1: 52,
  A2: 36,
  A1: 20,
  A0: 6,
};

function normalizeCefr(level?: string | null, percentage?: number | null): CefrGrade {
  if (level) {
    const upper = level.toUpperCase();
    if (upper === 'C2' || upper === 'C1' || upper === 'B2' || upper === 'B1' || upper === 'A2' || upper === 'A1' || upper === 'A0') {
      return upper as CefrGrade;
    }
  }
  if (percentage == null) return 'A0';
  if (percentage >= 90) return 'C1';
  if (percentage >= 75) return 'C1';
  if (percentage >= 60) return 'B2';
  if (percentage >= 45) return 'B1';
  if (percentage >= 28) return 'A2';
  if (percentage >= 15) return 'A1';
  return 'A0';
}

export function AptisScoreReportCard({ attempt }: AptisScoreReportCardProps) {
  const componentScores = attempt.componentScores ?? [];

  const getComp = (code: string): ComponentScore | undefined => {
    return componentScores.find((c) =>
      c.componentCode.toUpperCase().includes(code.toUpperCase())
      || c.componentName.toUpperCase().includes(code.toUpperCase()),
    );
  };

  const listening = getComp('LISTEN');
  const reading = getComp('READ');
  const speaking = getComp('SPEAK');
  const writing = getComp('WRIT');
  const grammar = getComp('GRAMMAR') ?? getComp('VOCAB');

  const listeningScore = listening?.rawScore != null ? Math.round(listening.rawScore) : 0;
  const readingScore = reading?.rawScore != null ? Math.round(reading.rawScore) : 0;
  const speakingScore = speaking?.rawScore != null ? Math.round(speaking.rawScore) : 0;
  const writingScore = writing?.rawScore != null ? Math.round(writing.rawScore) : 0;
  const grammarScore = grammar?.rawScore != null ? Math.round(grammar.rawScore) : 0;

  const fourSkillsTotal = listeningScore + readingScore + speakingScore + writingScore;
  const overallPercentage = attempt.percentageScore
    ?? (attempt.maxScore && attempt.maxScore > 0 ? ((attempt.rawScore ?? 0) / attempt.maxScore) * 100 : null);
  const overallCefr = normalizeCefr(attempt.cefrLevel, overallPercentage);

  const listeningCefr = normalizeCefr(listening?.cefrLevel, listening?.percentageScore);
  const readingCefr = normalizeCefr(reading?.cefrLevel, reading?.percentageScore);
  const speakingCefr = normalizeCefr(speaking?.cefrLevel, speaking?.percentageScore);
  const writingCefr = normalizeCefr(writing?.cefrLevel, writing?.percentageScore);

  const chartColumns = [
    { label: 'Listening', cefr: listeningCefr },
    { label: 'Reading', cefr: readingCefr },
    { label: 'Speaking', cefr: speakingCefr },
    { label: 'Writing', cefr: writingCefr },
    { label: 'Overall\nCEFR grade', cefr: overallCefr, isOverall: true },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border-[3px] border-[#002d62] bg-white p-5 shadow-lg sm:p-8">
      {/* Background Watermark Pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] select-none"
        style={{
          backgroundImage: 'radial-gradient(#002d62 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* Top Header: Overall CEFR Level */}
      <div className="relative border-b-2 border-[#002d62]/30 pb-4">
        <h2 className="text-2xl font-extrabold tracking-tight text-[#d9222a] sm:text-3xl">
          Overall CEFR level: {overallCefr}
        </h2>
      </div>

      {/* Main Content: Scale score (left) & CEFR skill profile (right) */}
      <div className="relative mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10 items-start">
        {/* Left Section: Scale score Table */}
        <div className="lg:col-span-6">
          <h3 className="text-xl font-bold text-[#002d62] tracking-tight">Scale score</h3>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-[#002d62]">
                  <th className="py-2.5 px-4 font-bold">Skill name</th>
                  <th className="py-2.5 px-4 text-right font-bold">Skill score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-4 font-medium">Listening</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">
                    {listeningScore}/50
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-4 font-medium">Reading</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">
                    {readingScore}/50
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-4 font-medium">Speaking</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">
                    {speakingScore}/50
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-4 font-medium">Writing</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">
                    {writingScore}/50
                  </td>
                </tr>
                <tr className="bg-slate-100/90 font-bold text-[#002d62]">
                  <td className="py-3 px-4 font-bold text-slate-900">Final Scale Score</td>
                  <td className="py-3 px-4 text-right font-mono font-extrabold text-[#d9222a] text-base">
                    {fourSkillsTotal}/200
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-4 font-medium">Grammar and Vocabulary</td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">
                    {grammarScore}/50
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Section: CEFR skill profile Bar Chart */}
        <div className="lg:col-span-6">
          <h3 className="text-xl font-bold text-[#002d62] tracking-tight">CEFR skill profile</h3>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-600">CEFR grade</p>

          {/* Chart Container */}
          <div className="mt-3 relative h-72 w-full pt-4 pb-12 pl-10 pr-2">
            {/* Horizontal Gridlines & Y-Axis Labels */}
            <div className="absolute inset-x-0 top-4 bottom-12 flex flex-col justify-between pointer-events-none">
              {CEFR_LEVELS.map((level) => (
                <div key={level} className="relative flex items-center w-full">
                  <span className="absolute -left-9 w-7 text-right font-mono text-xs font-bold text-[#002d62]">
                    {level}
                  </span>
                  <div className="w-full border-b border-slate-300" />
                </div>
              ))}
            </div>

            {/* 5 Vertical Bar Columns */}
            <div className="relative h-full flex items-end justify-between px-3 z-10">
              {chartColumns.map((col) => {
                const heightPct = CEFR_HEIGHT_MAP[col.cefr] ?? 10;
                return (
                  <div key={col.label} className="group relative flex flex-col items-center h-full justify-end flex-1 max-w-[64px]">
                    {/* Grade Text above the Bar */}
                    <div className="mb-1 text-center font-mono text-xs font-bold text-slate-800 transition-transform group-hover:scale-110">
                      {col.cefr}
                    </div>

                    {/* The Red Bar */}
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={clsx(
                        'w-7 sm:w-8 rounded-t-sm bg-[#d9222a] shadow-sm transition-all duration-500 hover:brightness-110',
                        col.isOverall && 'ring-2 ring-[#002d62]/20',
                      )}
                    />

                    {/* Bottom Label under each column */}
                    <div className="absolute -bottom-10 w-20 text-center text-[10px] sm:text-[11px] font-semibold leading-tight text-slate-700 whitespace-pre-line">
                      {col.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
