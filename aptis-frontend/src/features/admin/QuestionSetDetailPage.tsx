import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { adminContentApi } from '@/api/adminEndpoints';
import { assetApi } from '@/api/endpoints';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { SafeContent } from '@/components/ui/SafeContent';
import { AudioPlayer } from '@/features/practice/AudioPlayer';
import { ItemRenderer } from '@/features/practice/renderers/ItemRenderer';
import { formatDateTime } from '@/lib/format';
import { usePermission } from './usePermission';
import { DataTable, PageHeader, ResultBanner, StatusBadge } from './components/AdminUi';
import type { AccessLevel, AdminQuestionSet, PublishResult } from '@/types/admin';
import type { AssetRef, QuestionItem, QuestionSetContent, RichContent } from '@/types/api';
import type { Tone } from './components/AdminUi';

const ACCESS_LABELS: Record<AccessLevel, string> = {
  FREE: 'Miễn phí',
  PREMIUM: 'Premium',
};

/** Kết quả hiển thị sau một hành động; `errors` chỉ có ở publish không đạt. */
interface ActionResult {
  tone: Tone;
  message: string;
  errors?: string[];
}

export function QuestionSetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { has } = usePermission();

  const [result, setResult] = useState<ActionResult | null>(null);
  const [revealAnswers, setRevealAnswers] = useState(true);
  const [reason, setReason] = useState('');

  const canWrite = has('question_set:write');
  const canReview = has('question_set:review');
  const canPublish = has('question_set:publish');
  const canArchive = has('question_set:archive');

  const detailQuery = useQuery({
    queryKey: ['admin', 'question-set', id],
    queryFn: () => adminContentApi.detail(id ?? ''),
    enabled: Boolean(id),
  });

  const revisionsQuery = useQuery({
    queryKey: ['admin', 'question-set', id, 'revisions'],
    queryFn: () => adminContentApi.revisions(id ?? ''),
    enabled: Boolean(id),
  });

  const previewQuery = useQuery({
    queryKey: ['admin', 'question-set', id, 'preview', revealAnswers],
    queryFn: () => adminContentApi.preview(id ?? '', revealAnswers),
    enabled: Boolean(id),
    placeholderData: (prev) => prev,
  });

  /**
   * Mọi hành động vòng đời đi chung một mutation: khác nhau chỉ ở lời gọi API và
   * câu báo thành công, còn phần làm mới dữ liệu và báo lỗi thì giống hệt nhau.
   */
  const runAction = useMutation({
    mutationFn: (action: {
      run: () => Promise<AdminQuestionSet | PublishResult>;
      successMessage: string;
    }) => action.run().then((data) => ({ data, successMessage: action.successMessage })),
    onSuccess: ({ data, successMessage }) => {
      // Publish trả 200 kèm errors khi chưa đạt điều kiện — không phải lỗi HTTP
      if ('errors' in data && data.errors.length > 0) {
        setResult({
          tone: 'danger',
          message: 'Chưa phát hành được. Cần xử lý các vấn đề sau:',
          errors: data.errors,
        });
      } else {
        setResult({ tone: 'success', message: successMessage });
        setReason('');
      }
      void queryClient.invalidateQueries({ queryKey: ['admin', 'question-set', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'question-sets'] });
    },
    onError: (error) => {
      setResult({
        tone: 'danger',
        message:
          error instanceof ApiError
            ? `${error.message} (${error.code})`
            : 'Thao tác không thành công',
      });
    },
  });

  if (!id) {
    return <ErrorBlock message="Thiếu mã bộ câu hỏi trong đường dẫn" />;
  }

  if (detailQuery.isPending) {
    return <LoadingBlock label="Đang tải bộ câu hỏi…" />;
  }

  if (detailQuery.error || !detailQuery.data) {
    return (
      <ErrorBlock
        message={
          detailQuery.error instanceof ApiError
            ? detailQuery.error.message
            : 'Không tải được bộ câu hỏi'
        }
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  const questionSet = detailQuery.data;
  const componentId = searchParams.get('componentId');
  const partId = searchParams.get('partId') ?? questionSet.partId;
  const hierarchyQuery = searchParams.toString();
  const listUrl = componentId
    ? `/admin/question-sets/skills/${componentId}/parts/${partId}`
    : '/admin/question-sets';
  const { status } = questionSet;

  const showSubmit =
    canWrite && (status === 'DRAFT' || status === 'CHANGES_REQUESTED');
  const showRequestChanges = canReview && status === 'IN_REVIEW';
  const showPublish = canPublish && status === 'IN_REVIEW';
  const showSuspend = canPublish && status === 'PUBLISHED';
  const showArchive = canArchive && status !== 'PUBLISHED';
  const hasAnyAction =
    showSubmit || showRequestChanges || showPublish || showSuspend || showArchive;
  // Hai hành động này bắt buộc nêu lý do, dùng chung một ô nhập
  const needsReason = showRequestChanges || showSuspend;
  const trimmedReason = reason.trim();
  const busy = runAction.isPending;

  return (
    <div>
      <PageHeader
        title={questionSet.title}
        description={`${questionSet.code} · ${questionSet.partName}`}
        actions={
          <div className="flex gap-2">
            {canWrite && (status === 'DRAFT' || status === 'CHANGES_REQUESTED') && (
              <Link to={`/admin/question-sets/${id}/edit${hierarchyQuery ? `?${hierarchyQuery}` : ''}`} className="btn-primary">
                Chỉnh sửa
              </Link>
            )}
            <Link to={listUrl} className="btn-secondary">
              Về Part đang chọn
            </Link>
          </div>
        }
      />

      {result && (
        <ResultBanner
          tone={result.tone}
          message={result.message}
          errors={result.errors}
          onDismiss={() => setResult(null)}
        />
      )}

      <section className="card mb-4">
        <div className="mb-3 flex items-center gap-2">
          <StatusBadge status={status} />
          <span className="text-xs text-slate-500">
            Bản hiện tại: {questionSet.currentRevision}
          </span>
        </div>

        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Mã" value={questionSet.code} mono />
          <Field label="Tiêu đề" value={questionSet.title} />
          <Field label="Part" value={questionSet.partName} />
          <Field label="Kỹ năng" value={questionSet.componentCode} />
          <Field label="Dạng bài" value={questionSet.taskTypeCode} />
          <Field label="Chủ đề" value={questionSet.topicName ?? '—'} />
          <Field label="Độ hot" value={questionSet.hotness === null ? '—' : `${questionSet.hotness}/5`} />
          <Field label="Mức truy cập" value={ACCESS_LABELS[questionSet.accessLevel]} />
          <Field label="Số câu" value={String(questionSet.itemCount)} />
          <Field label="Điểm tối đa" value={String(questionSet.maxScore)} />
          <Field label="Phát hành lúc" value={formatDateTime(questionSet.publishedAt)} />
          <Field label="Người tạo" value={questionSet.createdBy ?? '—'} />
          <Field label="Người sửa gần nhất" value={questionSet.updatedBy ?? '—'} />
          <Field label="Tạo lúc" value={formatDateTime(questionSet.createdAt)} />
          <Field label="Cập nhật lúc" value={formatDateTime(questionSet.updatedAt)} />
        </dl>
      </section>

      {hasAnyAction && (
        <section className="card mb-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Hành động</h2>

          {needsReason && (
            <div className="mb-3">
              <label htmlFor="reason" className="label">
                Lý do
              </label>
              <textarea
                id="reason"
                rows={3}
                className="input"
                placeholder="Nêu rõ lý do để người soạn biết cần sửa gì"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {showSubmit && (
              <button
                type="button"
                className="btn-primary"
                disabled={busy}
                onClick={() =>
                  runAction.mutate({
                    run: () => adminContentApi.submitForReview(id),
                    successMessage: 'Đã gửi bộ câu hỏi đi duyệt.',
                  })
                }
              >
                Gửi duyệt
              </button>
            )}

            {showPublish && (
              <button
                type="button"
                className="btn-primary"
                disabled={busy}
                onClick={() =>
                  runAction.mutate({
                    run: () => adminContentApi.publish(id),
                    successMessage: 'Đã phát hành bộ câu hỏi.',
                  })
                }
              >
                Phát hành
              </button>
            )}

            {showRequestChanges && (
              <button
                type="button"
                className="btn-secondary"
                disabled={busy || trimmedReason === ''}
                onClick={() =>
                  runAction.mutate({
                    run: () => adminContentApi.requestChanges(id, trimmedReason),
                    successMessage: 'Đã yêu cầu chỉnh sửa.',
                  })
                }
              >
                Yêu cầu sửa
              </button>
            )}

            {showSuspend && (
              <button
                type="button"
                className="btn-secondary"
                disabled={busy || trimmedReason === ''}
                onClick={() =>
                  runAction.mutate({
                    run: () => adminContentApi.suspend(id, trimmedReason),
                    successMessage: 'Đã tạm ẩn bộ câu hỏi.',
                  })
                }
              >
                Tạm ẩn
              </button>
            )}

            {showArchive && (
              <button
                type="button"
                className="btn-ghost"
                disabled={busy}
                onClick={() =>
                  runAction.mutate({
                    run: () => adminContentApi.archive(id),
                    successMessage: 'Đã lưu trữ bộ câu hỏi.',
                  })
                }
              >
                Lưu trữ
              </button>
            )}
          </div>

          {needsReason && trimmedReason === '' && (
            <p className="mt-2 text-xs text-slate-500">
              Cần nhập lý do trước khi yêu cầu sửa hoặc tạm ẩn.
            </p>
          )}
        </section>
      )}

      <section className="card mb-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="text-sm font-semibold text-slate-900">Câu hỏi, lựa chọn và đáp án</h2><p className="mt-0.5 text-xs text-slate-500">Nội dung đầy đủ của đề theo thứ tự học viên sẽ làm</p></div>

          {canWrite && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
                checked={revealAnswers}
                onChange={(e) => setRevealAnswers(e.target.checked)}
              />
              Hiện đáp án
            </label>
          )}
        </div>

        {previewQuery.isPending ? (
          <LoadingBlock label="Đang tải bản xem trước…" />
        ) : previewQuery.error || !previewQuery.data ? (
          <ErrorBlock
            message={
              previewQuery.error instanceof ApiError
                ? previewQuery.error.message
                : 'Không tải được bản xem trước'
            }
            onRetry={() => void previewQuery.refetch()}
          />
        ) : (
          <QuestionSetPreview
            content={previewQuery.data.content}
            revision={previewQuery.data.revision}
            showAnswers={!previewQuery.data.answersHidden}
          />
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Lịch sử phiên bản</h2>

        {revisionsQuery.isPending ? (
          <LoadingBlock label="Đang tải lịch sử phiên bản…" />
        ) : revisionsQuery.error || !revisionsQuery.data ? (
          <ErrorBlock
            message={
              revisionsQuery.error instanceof ApiError
                ? revisionsQuery.error.message
                : 'Không tải được lịch sử phiên bản'
            }
            onRetry={() => void revisionsQuery.refetch()}
          />
        ) : (
          <DataTable
            headers={['Bản', 'Tóm tắt thay đổi', 'Người tạo', 'Thời gian']}
            isEmpty={revisionsQuery.data.length === 0}
            empty="Chưa có phiên bản nào được ghi nhận."
          >
            {revisionsQuery.data.map((revision) => (
              <tr key={revision.revision}>
                <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900">
                  {revision.revision}
                </td>
                <td className="px-4 py-2.5 text-slate-600">
                  {revision.changeSummary ?? '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                  {revision.createdBy ?? '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                  {formatDateTime(revision.createdAt)}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </section>
    </div>
  );
}

function QuestionSetPreview({ content, revision, showAnswers }: {
  content: QuestionSetContent;
  revision: number;
  showAnswers: boolean;
}) {
  const commonAudio = content.assets.filter((asset) => asset.role === 'MAIN_AUDIO');
  const images = content.assets.filter((asset) => asset.role.includes('IMAGE'));

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
      <header className="bg-gradient-to-r from-brand-900 to-brand-700 px-5 py-5 text-white sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">
              Bản xem trước · Phiên bản {revision}
            </p>
            <h3 className="mt-2 text-2xl font-semibold">{content.title || 'Bộ câu hỏi chưa đặt tiêu đề'}</h3>
            <p className="mt-1 text-sm text-emerald-100">
              {content.items.length} câu hỏi · {content.taskTypeCode.replaceAll('_', ' ')}
            </p>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/25">
            {showAnswers ? 'Đang hiện đáp án' : 'Giao diện học viên'}
          </span>
        </div>
      </header>

      <div className="space-y-5 p-4 sm:p-6">
        {content.instructions && (
          <div className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-700">Hướng dẫn</p>
            <p className="whitespace-pre-wrap text-sm leading-6 text-brand-950">{content.instructions}</p>
          </div>
        )}

        {commonAudio.length > 0 && (
          <AudioPlayer assets={commonAudio} maxAudioPlays={null} initialPlayCount={0} disabled={false} />
        )}

        {images.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {images.map((asset) => <PreviewImage key={asset.assetId} asset={asset} />)}
          </div>
        )}

        {content.stimulus?.value && (
          <div className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Ngữ liệu chung</p>
            <RichContentBlock content={content.stimulus} className="text-sm leading-7 text-stone-800" />
          </div>
        )}

        {content.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-10 text-center text-sm text-stone-500">
            Bộ câu hỏi này chưa có câu nào.
          </div>
        ) : (
          <div className="space-y-4">
            {content.items.map((item) => {
              const itemAudio = content.assets.filter((asset) => asset.role === `ITEM_AUDIO:${item.id}`);
              return (
                <article key={item.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
                      {item.sequenceNo}
                    </span>
                    <span className="text-xs text-stone-500">{item.maxScore} điểm</span>
                  </div>

                  {itemAudio.length > 0 && (
                    <AudioPlayer assets={itemAudio} maxAudioPlays={null} initialPlayCount={0} disabled={false} />
                  )}

                  {item.prompt?.value && (
                    <RichContentBlock content={item.prompt} className="mb-4 text-base font-medium leading-7 text-stone-900" />
                  )}

                  <ItemRenderer
                    item={item}
                    sections={content.sections}
                    attemptId="admin-preview"
                    questionSetId={content.questionSetId}
                    draft={{}}
                    disabled
                    showAnswer={showAnswers}
                    onChange={() => undefined}
                  />

                  {showAnswers && <AnswerSummary item={item} />}

                  {showAnswers && item.explanation?.value && (
                    <div className="mt-4 rounded-lg bg-sky-50 px-3 py-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-700">Giải thích</p>
                      <RichContentBlock content={item.explanation} className="text-sm leading-6 text-sky-950" />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function RichContentBlock({ content, className }: { content: RichContent; className: string }) {
  return <SafeContent content={content} className={`question-content ${className}`} />;
}

function AnswerSummary({ item }: { item: QuestionItem }) {
  const answer = item.answerKey;
  const optionLabel = (id: string) => {
    const option = [...item.options, ...item.rightItems].find((entry) => entry.id === id);
    return option ? `${option.code ? `${option.code}. ` : ''}${option.content}` : id;
  };

  let summary: string | null = null;
  if (answer?.selectedOptionId) summary = optionLabel(answer.selectedOptionId);
  else if (answer?.selectedOptionIds?.length) summary = answer.selectedOptionIds.map(optionLabel).join(' · ');
  else if (answer?.orderedOptionIds?.length) summary = answer.orderedOptionIds.map(optionLabel).join(' → ');
  else if (answer?.acceptedValues?.length) summary = answer.acceptedValues.join(' / ');
  else if (answer?.matches && Object.keys(answer.matches).length > 0) {
    summary = Object.entries(answer.matches).map(([leftId, rightId]) => {
      const left = item.leftItems.find((entry) => entry.id === leftId);
      return `${left?.code ?? leftId} → ${optionLabel(rightId)}`;
    }).join(' · ');
  } else if (item.rubricCode) summary = `Chấm theo rubric ${item.rubricCode}`;

  if (!summary) return null;
  return (
    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
      <span className="font-semibold">Đáp án:</span> {summary}
    </div>
  );
}

function PreviewImage({ asset }: { asset: AssetRef }) {
  const imageQuery = useQuery({
    queryKey: ['asset', asset.assetId, 'preview'],
    queryFn: () => assetApi.signedUrl(asset.assetId),
    staleTime: 5 * 60 * 1000,
  });

  if (imageQuery.isPending) return <div className="h-48 animate-pulse rounded-xl bg-stone-200" />;
  if (!imageQuery.data?.signedUrl) return null;
  return <img src={imageQuery.data.signedUrl} alt="Tài liệu minh họa của bộ câu hỏi" className="max-h-96 w-full rounded-xl border border-stone-200 bg-white object-contain" />;
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd
        className={
          mono
            ? 'mt-0.5 font-mono text-sm text-slate-800'
            : 'mt-0.5 text-sm text-slate-800'
        }
      >
        {value}
      </dd>
    </div>
  );
}
