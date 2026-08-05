import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { adminContentApi } from '@/api/adminEndpoints';
import { assetApi, catalogApi, uploadToPresignedUrl } from '@/api/endpoints';
import { ErrorBlock } from '@/components/ui/ErrorBlock';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import type {
  AccessLevel,
  AnswerKeyPayload,
  CreateQuestionSetRequest,
  QuestionContent,
  QuestionItemPayload,
  QuestionOptionPayload,
  UpdateQuestionSetRequest,
} from '@/types/admin';
import type { ResponseType } from '@/types/api';
import { PageHeader, ResultBanner } from './components/AdminUi';
import { usePermission } from './usePermission';

const CHOICE_TYPES = new Set<ResponseType>(['SINGLE_CHOICE', 'GAP_FILL_CHOICE', 'MULTIPLE_CHOICE']);
const ORDERING_TYPES = new Set<ResponseType>(['ORDERING', 'SENTENCE_ORDERING']);
const EDITOR_STEPS = [
  { number: 1, label: 'Thông tin', description: 'Phân loại bộ câu hỏi' },
  { number: 2, label: 'Đề bài', description: 'Hướng dẫn và tài liệu' },
  { number: 3, label: 'Câu hỏi', description: 'Nội dung và đáp án' },
  { number: 4, label: 'Hoàn tất', description: 'Thiết lập và kiểm tra' },
] as const;

const TASK_TYPES: Array<{ id: string; code: string; name: string; responseType: ResponseType }> = [
  { id: '12000000-0000-4000-8000-000000000001', code: 'SINGLE_CHOICE', name: 'Chọn một đáp án', responseType: 'SINGLE_CHOICE' },
  { id: '12000000-0000-4000-8000-000000000002', code: 'MULTIPLE_CHOICE', name: 'Chọn nhiều đáp án', responseType: 'MULTIPLE_CHOICE' },
  { id: '12000000-0000-4000-8000-000000000003', code: 'GAP_FILL_CHOICE', name: 'Điền khuyết có sẵn', responseType: 'SINGLE_CHOICE' },
  { id: '12000000-0000-4000-8000-000000000004', code: 'MATCHING', name: 'Nối cặp', responseType: 'MATCHING' },
  { id: '12000000-0000-4000-8000-000000000005', code: 'SPEAKER_MATCHING', name: 'Nối người nói', responseType: 'MATCHING' },
  { id: '12000000-0000-4000-8000-000000000006', code: 'HEADING_MATCHING', name: 'Nối tiêu đề', responseType: 'MATCHING' },
  { id: '12000000-0000-4000-8000-000000000007', code: 'SENTENCE_ORDERING', name: 'Sắp xếp câu', responseType: 'SENTENCE_ORDERING' },
  { id: '12000000-0000-4000-8000-000000000008', code: 'SHORT_TEXT', name: 'Trả lời ngắn', responseType: 'SHORT_TEXT' },
  { id: '12000000-0000-4000-8000-000000000009', code: 'LONG_TEXT', name: 'Viết đoạn/bài', responseType: 'LONG_TEXT' },
  { id: '12000000-0000-4000-8000-000000000010', code: 'AUDIO_RECORDING', name: 'Ghi âm', responseType: 'AUDIO_RECORDING' },
  { id: '12000000-0000-4000-8000-000000000011', code: 'IMAGE_DESCRIPTION', name: 'Miêu tả tranh', responseType: 'AUDIO_RECORDING' },
  { id: '12000000-0000-4000-8000-000000000012', code: 'IMAGE_COMPARISON', name: 'So sánh hai tranh', responseType: 'AUDIO_RECORDING' },
];

type EditorItem = QuestionItemPayload & {
  acceptedText: string;
  audioAssetId?: string;
  audioLabel?: string;
};

interface EditorForm {
  code: string;
  title: string;
  componentId: string;
  partId: string;
  taskTypeId: string;
  topicName: string;
  hotness: number;
  accessLevel: AccessLevel;
  instructions: string;
  stimulus: string;
  assets: Array<{ assetId: string; role: string; displayOrder: number; label: string }>;
  items: EditorItem[];
  shuffleOptions: boolean;
  shuffleItems: boolean;
  maxAudioPlays: number;
  allowReview: boolean;
  partialCredit: boolean;
}

const blankOption = (index: number): QuestionOptionPayload => ({
  id: String.fromCharCode(65 + index),
  code: String.fromCharCode(65 + index),
  content: '',
});

const blankItem = (sequenceNo: number, responseType: ResponseType = 'SINGLE_CHOICE'): EditorItem => ({
  id: `item_${sequenceNo}`,
  sequenceNo,
  prompt: { format: 'PLAIN_TEXT', value: '' },
  responseType,
  required: true,
  maxScore: 1,
  options: CHOICE_TYPES.has(responseType) || ORDERING_TYPES.has(responseType)
    ? [blankOption(0), blankOption(1), blankOption(2)]
    : [],
  leftItems: responseType === 'MATCHING' ? [blankOption(0), blankOption(1)] : [],
  rightItems: responseType === 'MATCHING' ? [blankOption(2), blankOption(3)] : [],
  constraints: {},
  answerKey: makeAnswerKey(responseType),
  explanation: { format: 'PLAIN_TEXT', value: '' },
  acceptedText: '',
  audioAssetId: undefined,
  audioLabel: undefined,
});

function makeAnswerKey(responseType: ResponseType): AnswerKeyPayload | undefined {
  if (responseType === 'LONG_TEXT' || responseType === 'AUDIO_RECORDING') return undefined;
  return {
    type: responseType,
    selectedOptionId: '',
    selectedOptionIds: [],
    matches: {},
    orderedOptionIds: [],
    acceptedValues: [],
    caseSensitive: false,
  };
}

const initialForm: EditorForm = {
  code: '', title: '', componentId: '', partId: '', taskTypeId: '', topicName: '',
  hotness: 3, accessLevel: 'FREE',
  instructions: '', stimulus: '', assets: [], items: [blankItem(1)], shuffleOptions: false,
  shuffleItems: false, maxAudioPlays: 3, allowReview: true, partialCredit: false,
};

export function QuestionSetEditorPage() {
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { has } = usePermission();
  const hydrated = useRef(false);
  const [form, setForm] = useState<EditorForm>(initialForm);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const versions = useQuery({ queryKey: ['exam-versions'], queryFn: () => catalogApi.examVersions() });
  const versionId = versions.data?.[0]?.id ?? '';
  const components = useQuery({
    queryKey: ['components', versionId], queryFn: () => catalogApi.components(versionId), enabled: Boolean(versionId),
  });
  const parts = useQuery({
    queryKey: ['parts', form.componentId], queryFn: () => catalogApi.parts(form.componentId), enabled: Boolean(form.componentId),
  });
  const taskTypes = { data: TASK_TYPES, isPending: false, error: null };
  const detail = useQuery({
    queryKey: ['admin', 'question-set', id], queryFn: () => adminContentApi.detail(id ?? ''), enabled: editing,
  });

  const selectedTask = taskTypes.data?.find((task) => task.id === form.taskTypeId);
  const responseType = selectedTask?.responseType ?? 'SINGLE_CHOICE';
  const selectedComponent = components.data?.find((component) => component.id === form.componentId);
  const selectedPart = parts.data?.find((part) => part.id === form.partId);
  const requiresItemAudio = selectedComponent?.code === 'LISTENING' && selectedPart?.code === 'PART_1';

  useEffect(() => {
    if (!editing && components.data?.length && !form.componentId) {
      const first = components.data[0];
      if (first) setForm((current) => ({ ...current, componentId: first.id }));
    }
  }, [components.data, editing, form.componentId]);

  useEffect(() => {
    if (!editing && parts.data?.length && !form.partId) {
      const first = parts.data[0];
      if (first) setForm((current) => ({ ...current, partId: first.id }));
    }
  }, [parts.data, editing, form.partId]);

  useEffect(() => {
    if (!editing && taskTypes.data?.length && !form.taskTypeId) {
      const task = taskTypes.data[0];
      if (task) setForm((current) => ({ ...current, taskTypeId: task.id, items: [blankItem(1, task.responseType)] }));
    }
  }, [editing, form.taskTypeId, taskTypes.data]);

  useEffect(() => {
    if (!editing || hydrated.current || !detail.data || !components.data || !taskTypes.data) return;
    const question = detail.data;
    const content = question.content;
    const component = components.data.find((entry) => entry.code === question.componentCode);
    const task = taskTypes.data.find((entry) => entry.code === question.taskTypeCode);
    if (!content || !component || !task) return;
    hydrated.current = true;
    setForm({
      code: question.code,
      title: question.title,
      componentId: component.id,
      partId: question.partId,
      taskTypeId: task.id,
      topicName: question.topicName ?? '',
      hotness: question.hotness ?? 3,
      accessLevel: question.accessLevel,
      instructions: content.instructions ?? '',
      stimulus: content.stimulus?.value ?? '',
      assets: (content.assets ?? []).map((asset, index) => ({
        assetId: asset.assetId,
        role: asset.role ?? 'ATTACHMENT',
        displayOrder: asset.displayOrder ?? index + 1,
        label: `Tệp ${index + 1}`,
      })),
      items: content.items.map((item) => {
        const itemAudio = (content.assets ?? []).find((asset) => asset.role === `ITEM_AUDIO:${item.id}`);
        const constraintAssetId = typeof item.constraints?.audioAssetId === 'string' ? item.constraints.audioAssetId : undefined;
        return {
          ...item,
          options: item.options ?? [], leftItems: item.leftItems ?? [], rightItems: item.rightItems ?? [],
          constraints: item.constraints ?? {},
          prompt: item.prompt ?? { format: 'PLAIN_TEXT', value: '' },
          acceptedText: item.answerKey?.acceptedValues?.join(' | ') ?? '',
          audioAssetId: itemAudio?.assetId ?? constraintAssetId,
          audioLabel: itemAudio ? `Audio câu ${item.sequenceNo}` : undefined,
        };
      }),
      shuffleOptions: content.settings?.shuffleOptions ?? false,
      shuffleItems: content.settings?.shuffleItems ?? false,
      maxAudioPlays: content.settings?.maxAudioPlays ?? 3,
      allowReview: content.settings?.allowReview ?? true,
      partialCredit: content.scoring?.partialCredit ?? false,
    });
  }, [components.data, detail.data, editing, taskTypes.data]);

  const save = useMutation({
    mutationFn: async () => {
      const validation = validateForm(form, responseType, requiresItemAudio);
      if (validation) throw new Error(validation);
      const content = toContent(form, responseType);
      if (editing && id) {
        const body: UpdateQuestionSetRequest = {
          topicName: form.topicName.trim(), title: form.title.trim(), hotness: form.hotness,
          accessLevel: form.accessLevel, content,
        };
        return adminContentApi.update(id, body);
      }
      const body: CreateQuestionSetRequest = {
        partId: form.partId, taskTypeId: form.taskTypeId, topicName: form.topicName.trim(),
        code: form.code.trim().toUpperCase().replace(/\s+/g, '_'), title: form.title.trim(),
        hotness: form.hotness,
        accessLevel: form.accessLevel, content,
      };
      return adminContentApi.create(body);
    },
    onSuccess: (question) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'question-sets'] });
      navigate(`/admin/question-sets/${question.id}`, { replace: true });
    },
    onError: (reason) => setError(reason instanceof ApiError || reason instanceof Error ? reason.message : 'Không lưu được bộ câu hỏi'),
  });

  const loading = versions.isPending || components.isPending || taskTypes.isPending || (editing && detail.isPending);
  const loadError = versions.error || components.error || taskTypes.error || detail.error;
  if (!has('question_set:write')) return <ErrorBlock message="Bạn không có quyền soạn câu hỏi." />;
  if (loading) return <LoadingBlock label="Đang chuẩn bị trình soạn…" />;
  if (loadError) return <ErrorBlock message={loadError instanceof Error ? loadError.message : 'Không tải được dữ liệu trình soạn'} />;

  const changeStep = (nextStep: number) => {
    setError(null);
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goNext = () => {
    const validation = validateStep(form, responseType, step, requiresItemAudio);
    if (validation) {
      setError(validation);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    changeStep(Math.min(4, step + 1));
  };

  return (
    <div className="pb-24">
      <PageHeader
        title={editing ? 'Chỉnh sửa bộ câu hỏi' : 'Tạo bộ câu hỏi'}
        description="Soạn nội dung trực tiếp, lưu nháp rồi kiểm tra trước khi gửi duyệt."
        actions={<Link to={editing && id ? `/admin/question-sets/${id}` : '/admin/question-sets'} className="btn-secondary">Hủy</Link>}
      />
      {error && <ResultBanner tone="danger" message={error} onDismiss={() => setError(null)} />}

      <WizardProgress currentStep={step} onSelect={(target) => target < step && changeStep(target)} />

      {step === 1 && <section className="card mb-5">
        <SectionTitle number="1" title="Thông tin bộ câu hỏi" subtitle="Chỉ phân loại nội dung tại đây. Thời gian được cấu hình khi ghép thành đề thi hoàn chỉnh." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Input label="Mã bộ câu hỏi" required value={form.code} disabled={editing} placeholder="LISTEN_P1_001" onChange={(code) => setForm((current) => ({ ...current, code }))} />
          <Input label="Tiêu đề" required value={form.title} placeholder="Listening Part 1 - Test 01" onChange={(title) => setForm((current) => ({ ...current, title }))} />
          <Select label="Kỹ năng" value={form.componentId} disabled={editing} options={(components.data ?? []).map((x) => ({ value: x.id, label: x.name }))} onChange={(componentId) => setForm((current) => current.componentId === componentId ? current : { ...current, componentId, partId: '' })} />
          <Select label="Part" value={form.partId} disabled={editing} options={(parts.data ?? []).map((x) => ({ value: x.id, label: x.name }))} onChange={(partId) => setForm((current) => ({ ...current, partId }))} />
          <Select label="Dạng bài" value={form.taskTypeId} disabled={editing} options={(taskTypes.data ?? []).map((x) => ({ value: x.id, label: x.name }))} onChange={(taskTypeId) => {
            const next = taskTypes.data?.find((x) => x.id === taskTypeId)?.responseType ?? 'SINGLE_CHOICE';
            setForm((current) => current.taskTypeId === taskTypeId
              ? current
              : { ...current, taskTypeId, items: [blankItem(1, next)] });
          }} />
          <Input label="Chủ đề hiển thị" required value={form.topicName} placeholder="Ví dụ: Du lịch, Công việc, Môi trường…" onChange={(topicName) => setForm((current) => ({ ...current, topicName }))} />
          <Select label="Quyền truy cập" value={form.accessLevel} options={[{ value: 'FREE', label: 'Miễn phí' }, { value: 'PREMIUM', label: 'Premium' }]} onChange={(accessLevel) => setForm((current) => ({ ...current, accessLevel: accessLevel as AccessLevel }))} />
          <Select label="Độ hot" value={String(form.hotness)} options={[
            { value: '1', label: '1/5 · Ít gặp' },
            { value: '2', label: '2/5 · Thỉnh thoảng' },
            { value: '3', label: '3/5 · Phổ biến' },
            { value: '4', label: '4/5 · Thi nhiều gần đây' },
            { value: '5', label: '5/5 · Rất hot' },
          ]} onChange={(hotness) => setForm((current) => ({ ...current, hotness: Number(hotness) }))} />
        </div>
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Một bộ câu hỏi có thể được tái sử dụng trong nhiều đề. Thời gian làm bài sẽ đặt ở màn tạo đề thi, không gắn vào từng bộ câu hỏi.
        </div>
      </section>}

      {step === 2 && <section className="card mb-5">
        <SectionTitle number="2" title="Đề bài chung" subtitle="Hướng dẫn là bắt buộc khi phát hành; ngữ liệu dùng cho đoạn văn hoặc bối cảnh chung." />
        <TextArea label="Hướng dẫn làm bài" required rows={3} value={form.instructions} placeholder="Đọc kỹ câu hỏi và chọn đáp án đúng nhất." onChange={(instructions) => setForm((current) => ({ ...current, instructions }))} />
        <div className="mt-4"><TextArea label="Ngữ liệu / bối cảnh chung" rows={5} value={form.stimulus} placeholder="Đoạn văn, hội thoại hoặc tình huống chung (không bắt buộc)…" onChange={(stimulus) => setForm((current) => ({ ...current, stimulus }))} /></div>
        <div className="mt-4">
          <AssetUploader
            assets={form.assets.filter((asset) => !asset.role.startsWith('ITEM_AUDIO:'))}
            allowAudio={!requiresItemAudio}
            onAdd={(asset) => setForm((current) => ({ ...current, assets: [...current.assets, { ...asset, displayOrder: current.assets.length + 1 }] }))}
            onRemove={(assetId) => setForm((current) => ({ ...current, assets: current.assets.filter((asset) => asset.assetId !== assetId) }))}
          />
        </div>
      </section>}

      {step === 3 && <section className="mb-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <SectionTitle number="3" title="Danh sách câu hỏi" subtitle={`${form.items.length} câu · ${selectedTask?.name ?? 'Dạng bài'}`} />
          <button type="button" className="btn-secondary" onClick={() => setForm((current) => ({ ...current, items: [...current.items, blankItem(current.items.length + 1, responseType)] }))}>+ Thêm câu hỏi</button>
        </div>
        <div className="space-y-4">
          {form.items.map((item, index) => (
            <QuestionCard key={item.id} item={item} index={index} responseType={responseType} requiresAudio={requiresItemAudio}
              onChange={(next) => setForm((current) => ({ ...current, items: current.items.map((entry, i) => i === index ? next : entry) }))}
              onAudioChange={(audioAssetId, audioLabel) => setForm((current) => ({
                ...current,
                items: current.items.map((entry, i) => i === index ? { ...entry, audioAssetId, audioLabel } : entry),
              }))}
              onRemove={() => setForm((current) => ({ ...current, items: renumber(current.items.filter((_, i) => i !== index)) }))} />
          ))}
        </div>
      </section>}

      {step === 4 && <section className="card mb-5">
        <SectionTitle number="4" title="Thiết lập và kiểm tra" subtitle="Rà lại thông tin trước khi lưu thành bản nháp." />
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Summary label="Bộ câu hỏi" value={form.title || 'Chưa đặt tiêu đề'} />
          <Summary label="Dạng bài" value={selectedTask?.name ?? '—'} />
          <Summary label="Số câu" value={`${form.items.length} câu`} />
          <Summary label="Truy cập" value={form.accessLevel === 'FREE' ? 'Miễn phí' : 'Premium'} />
        </div>
        <h3 className="mb-3 text-sm font-semibold text-stone-900">Tùy chọn luyện tập</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Check label="Trộn câu hỏi" checked={form.shuffleItems} onChange={(shuffleItems) => setForm((current) => ({ ...current, shuffleItems }))} />
          <Check label="Trộn đáp án" checked={form.shuffleOptions} onChange={(shuffleOptions) => setForm((current) => ({ ...current, shuffleOptions }))} />
          <Check label="Cho phép xem lại" checked={form.allowReview} onChange={(allowReview) => setForm((current) => ({ ...current, allowReview }))} />
          <Check label="Chấm điểm từng phần" checked={form.partialCredit} onChange={(partialCredit) => setForm((current) => ({ ...current, partialCredit }))} />
        </div>
        {form.componentId && components.data?.find((x) => x.id === form.componentId)?.code === 'LISTENING' && (
          <div className="mt-4 max-w-xs"><Input label="Số lần phát audio tối đa" type="number" value={String(form.maxAudioPlays)} onChange={(value) => setForm((current) => ({ ...current, maxAudioPlays: Math.max(1, Number(value)) }))} /></div>
        )}
        <div className="mt-5 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900">
          Sau khi lưu, bộ câu hỏi ở trạng thái <strong>Nháp</strong>. Bạn vẫn có thể chỉnh sửa, xem trước rồi mới gửi duyệt.
        </div>
      </section>}

      <div className="fixed bottom-0 right-0 z-20 flex w-full items-center justify-end gap-3 border-t border-stone-200 bg-white/95 px-6 py-3 shadow-[0_-8px_24px_rgba(28,38,32,0.08)] backdrop-blur md:w-[calc(100%-15rem)]">
        <span className="mr-auto hidden text-sm text-stone-500 sm:block">Bước {step}/4 · {EDITOR_STEPS[step - 1]?.description}</span>
        {step > 1 && <button type="button" className="btn-secondary" onClick={() => changeStep(step - 1)}>← Quay lại</button>}
        {step < 4 ? (
          <button type="button" className="btn-primary min-w-32" onClick={goNext}>Tiếp tục →</button>
        ) : (
          <button type="button" className="btn-primary min-w-32" disabled={save.isPending} onClick={() => { setError(null); save.mutate(); }}>
            {save.isPending ? 'Đang lưu…' : 'Lưu bản nháp'}
          </button>
        )}
      </div>
    </div>
  );
}

function QuestionCard({ item, index, responseType, requiresAudio, onChange, onAudioChange, onRemove }: { item: EditorItem; index: number; responseType: ResponseType; requiresAudio: boolean; onChange: (item: EditorItem) => void; onAudioChange: (assetId?: string, label?: string) => void; onRemove: () => void }) {
  const updateOptions = (options: QuestionOptionPayload[]) => onChange({ ...item, options });
  return (
    <article className="card border-l-4 !border-l-brand-600">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
        <div><span className="text-xs font-semibold uppercase tracking-wider text-brand-700">Câu {index + 1}</span><p className="mt-0.5 text-xs text-stone-500">{responseType.replaceAll('_', ' ')}</p></div>
        <button type="button" className="btn-ghost text-red-700" disabled={index === 0} onClick={onRemove}>Xóa câu</button>
      </div>
      {requiresAudio && <div className="mb-4">
        <ItemAudioUploader
          itemNumber={index + 1}
          assetId={item.audioAssetId}
          label={item.audioLabel}
          onChange={onAudioChange}
        />
      </div>}
      <TextArea label="Nội dung câu hỏi" required rows={3} value={item.prompt?.value ?? ''} placeholder="Nhập câu hỏi hoặc yêu cầu…" onChange={(value) => onChange({ ...item, prompt: { format: 'PLAIN_TEXT', value } })} />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Input label="Điểm" type="number" value={String(item.maxScore)} onChange={(value) => onChange({ ...item, maxScore: Math.max(0.25, Number(value)) })} />
        {(responseType === 'LONG_TEXT' || responseType === 'AUDIO_RECORDING') && <Input label="Mã rubric" required value={item.rubricCode ?? ''} placeholder={responseType === 'LONG_TEXT' ? 'APTIS_WRITING' : 'APTIS_SPEAKING'} onChange={(rubricCode) => onChange({ ...item, rubricCode })} />}
      </div>

      {(CHOICE_TYPES.has(responseType) || ORDERING_TYPES.has(responseType)) && (
        <OptionEditor groupName={`correct-${item.id}`} options={item.options} multiple={responseType === 'MULTIPLE_CHOICE'} ordering={ORDERING_TYPES.has(responseType)} answerKey={item.answerKey} onOptions={updateOptions} onAnswer={(answerKey) => onChange({ ...item, answerKey })} />
      )}
      {responseType === 'MATCHING' && <MatchingEditor item={item} onChange={onChange} />}
      {(responseType === 'SHORT_TEXT' || responseType === 'TEXT_EXACT') && (
        <div className="mt-4">
          <Input label="Đáp án được chấp nhận" required value={item.acceptedText} placeholder="answer | another answer" onChange={(acceptedText) => onChange({ ...item, acceptedText })} />
          <div className="mt-2"><Check label="Phân biệt chữ hoa/thường" checked={item.answerKey?.caseSensitive ?? false} onChange={(caseSensitive) => onChange({ ...item, answerKey: { ...(item.answerKey ?? { type: responseType }), caseSensitive } })} /></div>
        </div>
      )}
      <div className="mt-4"><TextArea label="Giải thích đáp án" rows={2} value={item.explanation?.value ?? ''} placeholder="Giải thích sau khi học viên hoàn thành…" onChange={(value) => onChange({ ...item, explanation: { format: 'PLAIN_TEXT', value } })} /></div>
    </article>
  );
}

function OptionEditor({ groupName, options, multiple, ordering, answerKey, onOptions, onAnswer }: { groupName: string; options: QuestionOptionPayload[]; multiple: boolean; ordering: boolean; answerKey?: AnswerKeyPayload; onOptions: (options: QuestionOptionPayload[]) => void; onAnswer: (key: AnswerKeyPayload) => void }) {
  const selected = new Set(answerKey?.selectedOptionIds ?? []);
  return <div className="mt-4 rounded-xl bg-stone-50 p-4">
    <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-stone-900">Phương án trả lời</h3><button type="button" className="btn-ghost !py-1 text-xs" onClick={() => onOptions([...options, blankOption(options.length)])}>+ Thêm phương án</button></div>
    <div className="space-y-2">{options.map((option, optionIndex) => <div key={option.id} className="flex items-center gap-2">
      {!ordering && <input aria-label={`Đáp án ${option.code}`} type={multiple ? 'checkbox' : 'radio'} name={multiple ? undefined : groupName} checked={multiple ? selected.has(option.id) : answerKey?.selectedOptionId === option.id} onChange={(event) => {
        if (multiple) {
          const next = new Set(selected); event.target.checked ? next.add(option.id) : next.delete(option.id);
          onAnswer({ ...(answerKey ?? { type: 'MULTIPLE_CHOICE' }), selectedOptionIds: [...next] });
        } else onAnswer({ ...(answerKey ?? { type: 'SINGLE_CHOICE' }), selectedOptionId: option.id });
      }} />}
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-semibold text-brand-700">{option.code}</span>
      <input className="input" value={option.content} placeholder={`Nội dung phương án ${option.code}`} onChange={(event) => onOptions(options.map((entry, i) => i === optionIndex ? { ...entry, content: event.target.value } : entry))} />
      <button type="button" className="btn-ghost !px-2 text-red-700" disabled={options.length <= 2} onClick={() => onOptions(relabel(options.filter((_, i) => i !== optionIndex)))}>×</button>
    </div>)}</div>
    {ordering && <div className="mt-3"><Input label="Thứ tự đúng (mã cách nhau bằng dấu phẩy)" required value={(answerKey?.orderedOptionIds ?? []).join(',')} placeholder="C,A,B" onChange={(value) => onAnswer({ ...(answerKey ?? { type: 'SENTENCE_ORDERING' }), orderedOptionIds: value.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean) })} /></div>}
  </div>;
}

function MatchingEditor({ item, onChange }: { item: EditorItem; onChange: (item: EditorItem) => void }) {
  const updateSide = (side: 'leftItems' | 'rightItems', values: QuestionOptionPayload[]) => onChange({ ...item, [side]: values });
  return <div className="mt-4 rounded-xl bg-stone-50 p-4">
    <h3 className="mb-3 text-sm font-semibold text-stone-900">Các cặp nối</h3>
    <div className="grid gap-4 lg:grid-cols-2">
      <OptionColumn title="Vế trái" options={item.leftItems} onChange={(values) => updateSide('leftItems', values)} />
      <OptionColumn title="Vế phải" options={item.rightItems} onChange={(values) => updateSide('rightItems', values)} />
    </div>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">{item.leftItems.map((left) => <label key={left.id} className="flex items-center gap-2 text-sm"><span className="min-w-20 font-medium">{left.code}</span><select className="input" value={item.answerKey?.matches?.[left.id] ?? ''} onChange={(event) => onChange({ ...item, answerKey: { ...(item.answerKey ?? { type: 'MATCHING' }), matches: { ...(item.answerKey?.matches ?? {}), [left.id]: event.target.value } } })}><option value="">Chọn vế phải</option>{item.rightItems.map((right) => <option key={right.id} value={right.id}>{right.code} — {right.content || 'Chưa nhập'}</option>)}</select></label>)}</div>
  </div>;
}

function OptionColumn({ title, options, onChange }: { title: string; options: QuestionOptionPayload[]; onChange: (options: QuestionOptionPayload[]) => void }) {
  return <div><div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-stone-500">{title}</span><button type="button" className="btn-ghost !p-1 text-xs" onClick={() => onChange([...options, nextOption(options)])}>+ Thêm</button></div><div className="space-y-2">{options.map((option, index) => <input key={option.id} className="input" value={option.content} placeholder={`${option.code} — Nội dung`} onChange={(event) => onChange(options.map((entry, i) => i === index ? { ...entry, content: event.target.value } : entry))} />)}</div></div>;
}

function AssetUploader({ assets, allowAudio = true, onAdd, onRemove }: {
  assets: EditorForm['assets'];
  allowAudio?: boolean;
  onAdd: (asset: Omit<EditorForm['assets'][number], 'displayOrder'>) => void;
  onRemove: (assetId: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const upload = useMutation({
    mutationFn: async (selected: File) => {
      const isAudio = selected.type.startsWith('audio/');
      const isImage = selected.type.startsWith('image/');
      if ((!allowAudio && isAudio) || (!isAudio && !isImage)) throw new Error(allowAudio ? 'Chỉ hỗ trợ tệp audio hoặc ảnh.' : 'Audio Part 1 phải tải riêng trong từng câu hỏi.');
      const request = await assetApi.createUploadUrl({
        assetType: isAudio ? 'AUDIO' : 'IMAGE',
        mimeType: selected.type,
        filename: selected.name,
        fileSize: selected.size,
      });
      await uploadToPresignedUrl(request.uploadUrl, selected, selected.type);
      const durationMs = isAudio ? await readAudioDuration(selected) : undefined;
      await assetApi.complete(request.assetId, durationMs ? { durationMs } : undefined);
      return {
        assetId: request.assetId,
        role: isAudio ? 'MAIN_AUDIO' : 'STIMULUS_IMAGE',
        label: selected.name,
      };
    },
    onSuccess: (asset) => { onAdd(asset); setFile(null); },
  });

  return <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4">
    <div className="flex flex-wrap items-end gap-3">
      <label className="min-w-64 flex-1"><span className="label">{allowAudio ? 'Audio hoặc hình ảnh dùng chung' : 'Hình ảnh dùng chung (nếu có)'}</span><input type="file" accept={allowAudio ? 'audio/*,image/*' : 'image/*'} className="input bg-white" disabled={upload.isPending} onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
      <button type="button" className="btn-secondary" disabled={!file || upload.isPending} onClick={() => file && upload.mutate(file)}>{upload.isPending ? 'Đang tải…' : 'Tải tệp lên'}</button>
    </div>
    {upload.error && <p className="mt-2 text-sm text-red-700">{upload.error instanceof Error ? upload.error.message : 'Không tải được tệp'}</p>}
    {assets.length > 0 && <ul className="mt-3 grid gap-2 sm:grid-cols-2">{assets.map((asset) => <li key={asset.assetId} className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><span className="min-w-0 truncate"><strong>{asset.role === 'MAIN_AUDIO' ? 'Audio' : 'Ảnh'}</strong> · {asset.label}</span><button type="button" className="text-red-700 hover:underline" onClick={() => onRemove(asset.assetId)}>Gỡ</button></li>)}</ul>}
    <p className="mt-2 text-xs text-stone-500">{allowAudio ? 'Audio được tự đọc thời lượng; ảnh và audio sẽ đi cùng bộ câu hỏi khi lưu.' : 'Listening Part 1: tải audio tại từng câu ở bước Câu hỏi.'}</p>
  </div>;
}

function ItemAudioUploader({ itemNumber, assetId, label, onChange }: {
  itemNumber: number;
  assetId?: string;
  label?: string;
  onChange: (assetId?: string, label?: string) => void;
}) {
  const upload = useMutation({
    mutationFn: async (selected: File) => {
      if (!selected.type.startsWith('audio/')) throw new Error('Vui lòng chọn đúng tệp audio.');
      const request = await assetApi.createUploadUrl({
        assetType: 'AUDIO', mimeType: selected.type, filename: selected.name, fileSize: selected.size,
      });
      await uploadToPresignedUrl(request.uploadUrl, selected, selected.type);
      const durationMs = await readAudioDuration(selected);
      await assetApi.complete(request.assetId, { durationMs });
      return { assetId: request.assetId, label: selected.name };
    },
    onSuccess: (audio) => onChange(audio.assetId, audio.label),
    onError: () => onChange(undefined, undefined),
  });

  return <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
    <div className="mb-3 flex items-center justify-between gap-3">
      <div><h3 className="text-sm font-semibold text-stone-900">Audio câu {itemNumber} <span className="text-red-600">*</span></h3><p className="mt-0.5 text-xs text-stone-500">Mỗi câu Listening Part 1 sử dụng một file audio riêng.</p></div>
      {assetId && <button type="button" className="btn-ghost text-red-700" onClick={() => onChange(undefined, undefined)}>Gỡ audio</button>}
    </div>
    {assetId ? (
      <div className="flex items-center gap-3 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm"><span aria-hidden="true">🔊</span><span className="min-w-0 truncate font-medium">{label ?? `Audio câu ${itemNumber}`}</span><span className="ml-auto text-xs font-semibold text-emerald-700">Đã tải lên</span></div>
    ) : (
      <div>
        <label className="block"><span className="label">{upload.isPending ? 'Đang tải audio lên…' : 'Chọn file audio — hệ thống sẽ tự tải lên'}</span><input type="file" accept="audio/*" className="input bg-white" disabled={upload.isPending} onChange={(event) => {
          const selected = event.target.files?.[0];
          if (!selected) return;
          onChange(undefined, selected.name);
          upload.mutate(selected);
        }} /></label>
        {upload.isPending && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sky-100"><div className="h-full w-2/3 animate-pulse rounded-full bg-sky-600" /></div>}
      </div>
    )}
    {upload.error && <p className="mt-2 text-sm text-red-700">{upload.error instanceof Error ? upload.error.message : 'Không tải được audio'}</p>}
  </div>;
}

function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const duration = Math.round(audio.duration * 1000);
      URL.revokeObjectURL(url);
      Number.isFinite(duration) && duration > 0 ? resolve(duration) : reject(new Error('Không đọc được thời lượng audio.'));
    };
    audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Tệp audio không hợp lệ.')); };
    audio.src = url;
  });
}

function toContent(form: EditorForm, responseType: ResponseType): QuestionContent {
  return {
    instructions: form.instructions.trim(),
    stimulus: form.stimulus.trim() ? { type: 'TEXT', format: 'PLAIN_TEXT', value: form.stimulus.trim() } : null,
    sections: [],
    assets: [
      ...form.assets.filter((asset) => !asset.role.startsWith('ITEM_AUDIO:')).map(({ assetId, role, displayOrder }) => ({ assetId, role, displayOrder })),
      ...form.items.flatMap((item, index) => item.audioAssetId ? [{ assetId: item.audioAssetId, role: `ITEM_AUDIO:item_${index + 1}`, displayOrder: index + 1 }] : []),
    ],
    items: form.items.map((editorItem, index) => {
      const { audioAssetId, audioLabel: _audioLabel, acceptedText, ...item } = editorItem;
      return {
        ...item, id: `item_${index + 1}`, sequenceNo: index + 1, responseType,
        constraints: audioAssetId ? { ...item.constraints, audioAssetId } : item.constraints,
        prompt: { format: 'PLAIN_TEXT', value: item.prompt.value.trim() },
        options: item.options.filter((x) => x.content.trim()), leftItems: item.leftItems.filter((x) => x.content.trim()), rightItems: item.rightItems.filter((x) => x.content.trim()),
        explanation: item.explanation?.value.trim() ? { format: 'PLAIN_TEXT', value: item.explanation.value.trim() } : undefined,
        answerKey: responseType === 'SHORT_TEXT' || responseType === 'TEXT_EXACT'
          ? { ...(item.answerKey ?? { type: responseType }), acceptedValues: acceptedText.split('|').map((x) => x.trim()).filter(Boolean) }
          : item.answerKey,
      };
    }),
    settings: { shuffleOptions: form.shuffleOptions, shuffleItems: form.shuffleItems, maxAudioPlays: form.maxAudioPlays, showAnswerAfterEachItem: false, allowReview: form.allowReview },
    scoring: { strategy: responseType === 'LONG_TEXT' || responseType === 'AUDIO_RECORDING' ? 'RUBRIC' : 'EXACT_MATCH', partialCredit: form.partialCredit },
  };
}

function validateStep(form: EditorForm, responseType: ResponseType, step: number, requiresItemAudio = false): string | null {
  if (step === 1) {
    if (!form.code.trim() || !form.title.trim()) return 'Vui lòng nhập mã và tiêu đề bộ câu hỏi.';
    if (!form.topicName.trim()) return 'Vui lòng nhập chủ đề sẽ hiển thị cho học viên.';
    if (!form.componentId || !form.partId || !form.taskTypeId) return 'Vui lòng chọn kỹ năng, Part và dạng bài.';
  }
  if (step === 2 && !form.instructions.trim()) return 'Vui lòng nhập hướng dẫn làm bài.';
  if (step === 3) return validateQuestions(form, responseType, requiresItemAudio);
  return null;
}

function validateForm(form: EditorForm, responseType: ResponseType, requiresItemAudio = false): string | null {
  for (const step of [1, 2, 3]) {
    const error = validateStep(form, responseType, step, requiresItemAudio);
    if (error) return error;
  }
  return null;
}

function validateQuestions(form: EditorForm, responseType: ResponseType, requiresItemAudio = false): string | null {
  if (form.items.length === 0) return 'Bộ câu hỏi phải có ít nhất một câu.';
  for (const [index, item] of form.items.entries()) {
    const label = `Câu ${index + 1}`;
    if (requiresItemAudio && !item.audioAssetId) return item.audioLabel ? `${label} đang tải audio, vui lòng chờ hoàn tất.` : `${label} chưa chọn audio.`;
    if (!item.prompt.value.trim()) return `${label} chưa có nội dung.`;
    if (CHOICE_TYPES.has(responseType)) {
      if (item.options.filter((x) => x.content.trim()).length < 2) return `${label} cần ít nhất hai phương án.`;
      if (responseType === 'MULTIPLE_CHOICE' ? !item.answerKey?.selectedOptionIds?.length : !item.answerKey?.selectedOptionId) return `${label} chưa chọn đáp án đúng.`;
    }
    if (ORDERING_TYPES.has(responseType) && item.answerKey?.orderedOptionIds?.length !== item.options.filter((x) => x.content.trim()).length) return `${label} chưa nhập đủ thứ tự đúng.`;
    if (responseType === 'MATCHING' && item.leftItems.some((x) => !item.answerKey?.matches?.[x.id])) return `${label} chưa nối đủ các cặp.`;
    if ((responseType === 'SHORT_TEXT' || responseType === 'TEXT_EXACT') && !item.acceptedText.trim()) return `${label} chưa có đáp án được chấp nhận.`;
    if ((responseType === 'LONG_TEXT' || responseType === 'AUDIO_RECORDING') && !item.rubricCode?.trim()) return `${label} chưa có mã rubric.`;
  }
  return null;
}

function renumber(items: EditorItem[]) { return items.map((item, index) => ({ ...item, id: `item_${index + 1}`, sequenceNo: index + 1 })); }
function relabel(options: QuestionOptionPayload[]) { return options.map((option, index) => ({ ...option, id: String.fromCharCode(65 + index), code: String.fromCharCode(65 + index) })); }
function nextOption(options: QuestionOptionPayload[]) {
  const highest = options.reduce((max, option) => Math.max(max, (option.code ?? option.id).charCodeAt(0)), 64);
  const code = String.fromCharCode(highest + 1);
  return { id: code, code, content: '' };
}

function WizardProgress({ currentStep, onSelect }: { currentStep: number; onSelect: (step: number) => void }) {
  return <nav aria-label="Các bước soạn bộ câu hỏi" className="card mb-5 !p-3">
    <ol className="grid gap-2 sm:grid-cols-4">
      {EDITOR_STEPS.map((item) => {
        const active = item.number === currentStep;
        const complete = item.number < currentStep;
        return <li key={item.number}>
          <button type="button" className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${active ? 'bg-brand-800 text-white' : complete ? 'bg-brand-50 text-brand-900 hover:bg-brand-100' : 'text-stone-400'}`} disabled={!complete} onClick={() => onSelect(item.number)}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${active ? 'bg-white text-brand-800' : complete ? 'bg-brand-700 text-white' : 'bg-stone-100 text-stone-500'}`}>{complete ? '✓' : item.number}</span>
            <span className="min-w-0"><strong className="block text-sm">{item.label}</strong><span className={`block truncate text-xs ${active ? 'text-brand-100' : 'text-stone-500'}`}>{item.description}</span></span>
          </button>
        </li>;
      })}
    </ol>
  </nav>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"><span className="text-xs uppercase tracking-wide text-stone-500">{label}</span><strong className="mt-1 block text-sm text-stone-950">{value}</strong></div>;
}

function SectionTitle({ number, title, subtitle }: { number: string; title: string; subtitle: string }) { return <div className="mb-4 flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-800">{number}</span><div><h2 className="font-semibold text-stone-950">{title}</h2><p className="mt-0.5 text-sm text-stone-500">{subtitle}</p></div></div>; }
function Input({ label, value, onChange, required, disabled, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; disabled?: boolean; placeholder?: string; type?: string }) { return <label className="block"><span className="label">{label}{required && <span className="text-red-600"> *</span>}</span><input type={type} className="input" value={value} disabled={disabled} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>; }
function TextArea({ label, value, onChange, required, placeholder, rows }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string; rows: number }) { return <label className="block"><span className="label">{label}{required && <span className="text-red-600"> *</span>}</span><textarea className="input resize-y" rows={rows} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>; }
function Select({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; disabled?: boolean }) { return <label className="block"><span className="label">{label}</span><select className="input" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-700"><input type="checkbox" className="h-4 w-4 rounded border-stone-300 text-brand-700" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>; }
