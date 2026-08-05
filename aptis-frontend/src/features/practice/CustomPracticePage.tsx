import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { practiceApi } from '@/api/endpoints';
import {
  useComponents,
  useExamVersions,
  useParts,
  useTopics,
} from '@/features/catalog/catalogQueries';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { PremiumGate } from '@/components/ui/PremiumGate';
import type { CefrLevel, CreateCustomAttemptRequest } from '@/types/api';

const CEFR_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function CustomPracticePage() {
  const navigate = useNavigate();

  const versionsQuery = useExamVersions();
  const examVersionId = versionsQuery.data?.[0]?.id;
  const componentsQuery = useComponents(examVersionId);
  const topicsQuery = useTopics();

  const [componentId, setComponentId] = useState<string>('');
  const partsQuery = useParts(componentId || undefined);

  const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [cefrMin, setCefrMin] = useState<CefrLevel | ''>('');
  const [cefrMax, setCefrMax] = useState<CefrLevel | ''>('');
  const [difficultyMax, setDifficultyMax] = useState<number | ''>('');
  const [questionSetCount, setQuestionSetCount] = useState(10);
  const [onlyNew, setOnlyNew] = useState(false);
  const [onlyIncorrect, setOnlyIncorrect] = useState(false);
  const [shuffle, setShuffle] = useState(true);
  const [timed, setTimed] = useState(false);
  const [premiumBlocked, setPremiumBlocked] = useState(false);

  const createAttempt = useMutation({
    mutationFn: (body: CreateCustomAttemptRequest) => practiceApi.createCustomAttempt(body),
    onSuccess: (attempt) => navigate(`/attempts/${attempt.id}`),
    onError: (error) => {
      if (error instanceof ApiError && error.isPremiumRequired) {
        setPremiumBlocked(true);
      }
    },
  });

  if (versionsQuery.isLoading || componentsQuery.isLoading) {
    return <LoadingBlock label="Đang tải bộ lọc…" />;
  }

  const toggle = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const errorMessage =
    createAttempt.error instanceof ApiError &&
    createAttempt.error.code === 'NOT_ENOUGH_QUESTION_SETS'
      ? 'Không có bộ câu hỏi khớp bộ lọc. Thử nới lỏng điều kiện.'
      : createAttempt.error instanceof ApiError && !createAttempt.error.isPremiumRequired
        ? createAttempt.error.message
        : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Luyện tùy chọn</h1>

      {premiumBlocked && (
        <PremiumGate message="Bộ câu hỏi khớp bộ lọc đều thuộc gói Premium." />
      )}

      <section className="card space-y-4">
        <div>
          <label htmlFor="component" className="label">
            Học phần
          </label>
          <select
            id="component"
            value={componentId}
            onChange={(e) => {
              setComponentId(e.target.value);
              setSelectedPartIds([]);
            }}
            className="input"
          >
            <option value="">Tất cả học phần</option>
            {(componentsQuery.data ?? []).map((component) => (
              <option key={component.id} value={component.id}>
                {component.name}
              </option>
            ))}
          </select>
        </div>

        {componentId && (partsQuery.data?.length ?? 0) > 0 && (
          <div>
            <span className="label">Part (bỏ trống = tất cả)</span>
            <div className="flex flex-wrap gap-2">
              {(partsQuery.data ?? []).map((part) => (
                <button
                  key={part.id}
                  type="button"
                  onClick={() => setSelectedPartIds((prev) => toggle(prev, part.id))}
                  className={
                    selectedPartIds.includes(part.id)
                      ? 'rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white'
                      : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200'
                  }
                >
                  {part.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <span className="label">Chủ đề (bỏ trống = tất cả)</span>
          <div className="flex flex-wrap gap-2">
            {(topicsQuery.data ?? []).map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => setSelectedTopicIds((prev) => toggle(prev, topic.id))}
                className={
                  selectedTopicIds.includes(topic.id)
                    ? 'rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white'
                    : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200'
                }
              >
                {topic.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cefrMin" className="label">
              CEFR từ
            </label>
            <select
              id="cefrMin"
              value={cefrMin}
              onChange={(e) => setCefrMin(e.target.value as CefrLevel | '')}
              className="input"
            >
              <option value="">—</option>
              {CEFR_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cefrMax" className="label">
              CEFR đến
            </label>
            <select
              id="cefrMax"
              value={cefrMax}
              onChange={(e) => setCefrMax(e.target.value as CefrLevel | '')}
              className="input"
            >
              <option value="">—</option>
              {CEFR_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="difficulty" className="label">
            Độ khó tối đa
          </label>
          <select
            id="difficulty"
            value={difficultyMax}
            onChange={(e) => setDifficultyMax(e.target.value ? Number(e.target.value) : '')}
            className="input"
          >
            <option value="">Không giới hạn</option>
            {[1, 2, 3, 4, 5].map((level) => (
              <option key={level} value={level}>
                {level}/5
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="count" className="label">
            Số bộ câu hỏi: {questionSetCount}
          </label>
          <input
            id="count"
            type="range"
            min={1}
            max={50}
            value={questionSetCount}
            onChange={(e) => setQuestionSetCount(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={onlyNew}
              onChange={(e) => {
                setOnlyNew(e.target.checked);
                if (e.target.checked) setOnlyIncorrect(false);
              }}
            />
            Chỉ bài chưa làm
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={onlyIncorrect}
              onChange={(e) => {
                setOnlyIncorrect(e.target.checked);
                if (e.target.checked) setOnlyNew(false);
              }}
            />
            Chỉ bài đã làm sai
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={shuffle}
              onChange={(e) => setShuffle(e.target.checked)}
            />
            Trộn thứ tự bài
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
            Tính thời gian
          </label>
        </div>

        {errorMessage && <ErrorBlock message={errorMessage} />}

        <button
          type="button"
          disabled={createAttempt.isPending}
          onClick={() => {
            setPremiumBlocked(false);
            createAttempt.mutate({
              componentIds: componentId ? [componentId] : undefined,
              partIds: selectedPartIds.length > 0 ? selectedPartIds : undefined,
              topicIds: selectedTopicIds.length > 0 ? selectedTopicIds : undefined,
              cefrMin: cefrMin || undefined,
              cefrMax: cefrMax || undefined,
              difficultyMax: difficultyMax || undefined,
              questionSetCount,
              onlyNew,
              onlyIncorrect,
              shuffle,
              timed,
            });
          }}
          className="btn-primary w-full"
        >
          {createAttempt.isPending ? 'Đang tạo bài…' : 'Tạo bài luyện'}
        </button>
      </section>
    </div>
  );
}
