import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { adminContentApi, adminScoringApi } from '@/api/adminEndpoints';
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
  PartScoringRule,
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

interface PartTemplate {
  taskTypeCode: string;
  name: string;
  instructions: string;
  note: string;
  initialItemTypes?: ResponseType[];
  stimulus?: { label: string; placeholder: string; required?: boolean; rows?: number };
  sharedMedia?: { type: 'AUDIO' | 'IMAGE'; label: string; help: string; required?: boolean; maxFiles?: number };
  audioGroups?: number[];
  itemPromptLabel?: string;
  optionCount?: number;
  matchingCounts?: { left: number; right: number };
  matchingScoring?: { pointsPerCorrect: number; perfectBonus: number };
  /**
   * Tự sinh nhãn cho vế trái ("Speaker" -> Speaker A, Speaker B...) và ẩn ô
   * nhập nội dung: với Listening Part 2 thì vế trái luôn là người nói theo thứ
   * tự cố định, gõ tay chỉ tốn thời gian.
   */
  autoLeftLabel?: string;
  /**
   * Part mà mỗi câu là một bộ độc lập: biên tập viên nhập liên tiếp nhiều câu
   * trong một màn, khi lưu hệ thống tách thành nhiều bộ một-câu. Backend tự gom
   * lại đủ số câu khi tạo đề (aptis.practice.merge-item-parts).
   */
  bulkSingleItem?: boolean;
  /**
   * Số câu của MỘT đề ở Part nhập hàng loạt — phải khớp
   * aptis.practice.merge-item-parts ở backend. Dùng làm mẫu số khi chia điểm:
   * mỗi bộ chỉ có một câu nên không thể suy ra từ form.items.
   */
  bulkItemsPerTest?: number;
  itemMaxScore?: number;
  fixedFirstOption?: boolean;
}

const repeatType = (type: ResponseType, count: number): ResponseType[] =>
  Array.from({ length: count }, () => type);

/** Cấu trúc Aptis ESOL General theo hướng dẫn chính thức của British Council. */
const PART_TEMPLATES: Record<string, PartTemplate> = {
  'GRAMMAR_VOCABULARY:GRAMMAR': {
    taskTypeCode: 'SINGLE_CHOICE', name: 'Hoàn thành câu · 3 lựa chọn',
    instructions: 'Chọn từ hoặc cụm từ đúng nhất để hoàn thành câu.',
    note: 'Grammar gồm câu hỏi trắc nghiệm 3 lựa chọn.',
    initialItemTypes: repeatType('SINGLE_CHOICE', 25),
  },
  'GRAMMAR_VOCABULARY:VOCABULARY': {
    taskTypeCode: 'MATCHING', name: 'Từ vựng tổng hợp · Ghép và hoàn thành câu',
    instructions: 'Ghép từ với nghĩa phù hợp hoặc chọn từ phù hợp với ngữ cảnh.',
    note: 'Vocabulary gồm ghép từ đồng nghĩa, ghép định nghĩa, dùng từ trong câu và kết hợp từ.',
    initialItemTypes: ['MATCHING', 'MATCHING', 'SINGLE_CHOICE', 'MATCHING'],
  },
  'READING:PART_1': {
    taskTypeCode: 'GAP_FILL_CHOICE', name: 'Hoàn thành câu · Danh sách lựa chọn',
    instructions: 'Đọc đoạn văn ngắn và chọn từ phù hợp để hoàn thành mỗi câu.',
    note: 'Reading Part 1 kiểm tra khả năng hiểu câu bằng các ô chọn từ.',
    initialItemTypes: repeatType('SINGLE_CHOICE', 5),
    itemMaxScore: 2,
    stimulus: { label: 'Note / email chung', placeholder: 'Nhập toàn bộ note hoặc email có 5 vị trí cần hoàn thành…', required: true, rows: 8 },
    itemPromptLabel: 'Câu chứa chỗ trống',
  },
  'READING:PART_2': {
    taskTypeCode: 'SENTENCE_ORDERING', name: 'Sắp xếp câu thành đoạn văn',
    instructions: 'Sắp xếp các câu theo đúng thứ tự để tạo thành một đoạn văn hoàn chỉnh.',
    note: 'Reading Part 2 gồm các câu bị xáo trộn và yêu cầu sắp xếp lại. Đề thi thử lấy hai bộ từ Part này, mỗi bộ 5 điểm.',
    initialItemTypes: repeatType('SENTENCE_ORDERING', 1),
    itemPromptLabel: 'Tiêu đề / bối cảnh của đoạn',
    optionCount: 6,
    itemMaxScore: 5,
    fixedFirstOption: true,
  },
  'READING:PART_3': {
    taskTypeCode: 'SPEAKER_MATCHING', name: 'Ghép ý kiến với người nói',
    instructions: 'Đọc ý kiến của bốn người và ghép mỗi nhận định với người phù hợp.',
    note: 'Reading Part 3 ghép các nhận định với bốn người đưa ra ý kiến.',
    initialItemTypes: ['MATCHING'],
    stimulus: { label: 'Bài đọc chung — 4 đoạn ý kiến', placeholder: 'Nhập đoạn A, B, C, D; mỗi đoạn là ý kiến của một người…', required: true, rows: 12 },
    itemPromptLabel: 'Yêu cầu ghép 7 nhận định',
    matchingCounts: { left: 7, right: 4 },
    matchingScoring: { pointsPerCorrect: 2, perfectBonus: 2 },
  },
  'READING:PART_4': {
    taskTypeCode: 'HEADING_MATCHING', name: 'Ghép tiêu đề với đoạn văn',
    instructions: 'Đọc bài văn và ghép tiêu đề phù hợp với từng đoạn.',
    note: 'Reading Part 4 ghép tiêu đề với các đoạn trong một bài đọc dài.',
    initialItemTypes: ['MATCHING'],
    stimulus: { label: 'Bài đọc dài — 8 đoạn', placeholder: 'Nhập bài đọc khoảng 750 từ và đánh dấu rõ các đoạn A–H…', required: true, rows: 16 },
    itemPromptLabel: 'Yêu cầu ghép 7 đoạn với tiêu đề',
    matchingCounts: { left: 7, right: 8 },
    matchingScoring: { pointsPerCorrect: 2, perfectBonus: 0 },
  },
  'LISTENING:PART_1': {
    taskTypeCode: 'SINGLE_CHOICE', name: 'Nhận biết thông tin · 3 lựa chọn',
    instructions: 'Nghe đoạn ghi âm ngắn và chọn đáp án đúng. Mỗi đoạn được nghe tối đa hai lần.',
    note: 'Mỗi câu sử dụng một audio riêng để nhận biết số, thời gian, địa điểm hoặc thông tin cụ thể.',
    initialItemTypes: repeatType('SINGLE_CHOICE', 13),
    audioGroups: repeatType('SINGLE_CHOICE', 13).map(() => 1),
  },
  'LISTENING:PART_2': {
    taskTypeCode: 'SPEAKER_MATCHING', name: 'Ghép người nói với thông tin',
    instructions: 'Nghe bốn người nói về cùng một chủ đề và ghép mỗi người với thông tin phù hợp.',
    note: 'Nhập 6 mẩu thông tin MỘT LẦN, dùng chung cho cả 4 người nói. Nhãn Speaker A–D tự sinh, không phải nhập.',
    // MATCHING thay vì 4 câu SINGLE_CHOICE: 4 người và 6 thông tin dùng chung
    // một danh sách, nhập một lần thay vì lặp 6 lựa chọn cho từng người.
    initialItemTypes: ['MATCHING'],
    sharedMedia: { type: 'AUDIO', label: 'Audio bốn người nói', help: 'Một audio chung cho cả bốn người nói.', required: true, maxFiles: 1 },
    itemPromptLabel: 'Yêu cầu ghép 4 người nói',
    matchingCounts: { left: 4, right: 6 },
    matchingScoring: { pointsPerCorrect: 2, perfectBonus: 0 },
    autoLeftLabel: 'Speaker',
  },
  'LISTENING:PART_3': {
    taskTypeCode: 'SPEAKER_MATCHING', name: 'Ghép ý kiến với người nói',
    instructions: 'Nghe cuộc hội thoại và xác định người nói thể hiện từng ý kiến.',
    note: 'Listening Part 3 kiểm tra khả năng nhận diện quan điểm của hai người nói.',
    initialItemTypes: ['MATCHING'],
    sharedMedia: { type: 'AUDIO', label: 'Audio cuộc hội thoại', help: 'Một audio chung giữa một nam và một nữ; thí sinh được nghe tối đa 2 lần.', required: true, maxFiles: 1 },
    itemPromptLabel: 'Các nhận định cần ghép',
    matchingCounts: { left: 4, right: 3 },
  },
  'LISTENING:PART_4': {
    taskTypeCode: 'SINGLE_CHOICE', name: 'Suy luận từ bài độc thoại · 3 lựa chọn',
    instructions: 'Nghe bài độc thoại và chọn đáp án thể hiện đúng thái độ, ý định hoặc quan điểm của người nói.',
    note: 'Listening Part 4 là trắc nghiệm suy luận từ các bài độc thoại dài.',
    initialItemTypes: repeatType('SINGLE_CHOICE', 4),
    audioGroups: [2, 2],
  },
  'SPEAKING:PART_1': {
    taskTypeCode: 'AUDIO_RECORDING', name: 'Trả lời thông tin cá nhân · Ghi âm',
    instructions: 'Trả lời câu hỏi về bản thân. Ghi âm tối đa 30 giây.',
    note: 'Nhập LIÊN TIẾP nhiều câu rồi lưu một lần — mỗi câu được tách thành một câu độc lập trong ngân hàng. Khi học viên vào thi, hệ thống tự lấy ngẫu nhiên 3 câu ghép thành một đề.',
    initialItemTypes: repeatType('AUDIO_RECORDING', 1),
    bulkSingleItem: true,
    bulkItemsPerTest: 3,
  },
  'SPEAKING:PART_2': {
    taskTypeCode: 'IMAGE_DESCRIPTION', name: 'Miêu tả ảnh và nêu ý kiến · Ghi âm',
    instructions: 'Miêu tả bức ảnh, sau đó trả lời hai câu hỏi liên quan. Ghi âm tối đa 45 giây cho mỗi câu.',
    note: 'Speaking Part 2 dùng một ảnh và ba câu hỏi có độ khó tăng dần.',
    initialItemTypes: repeatType('AUDIO_RECORDING', 3),
    sharedMedia: { type: 'IMAGE', label: 'Ảnh dùng cho cả 3 câu', help: 'Speaking Part 2 chỉ dùng 1 ảnh.', required: true, maxFiles: 1 },
  },
  'SPEAKING:PART_3': {
    taskTypeCode: 'IMAGE_COMPARISON', name: 'So sánh hai ảnh · Ghi âm',
    instructions: 'Miêu tả và so sánh hai bức ảnh, sau đó trả lời hai câu hỏi liên quan.',
    note: 'Speaking Part 3 dùng hai ảnh và ba câu hỏi ghi âm.',
    initialItemTypes: repeatType('AUDIO_RECORDING', 3),
    sharedMedia: { type: 'IMAGE', label: 'Hai ảnh để miêu tả và so sánh', help: 'Tải đúng 2 ảnh của cùng một chủ đề.', required: true, maxFiles: 2 },
  },
  'SPEAKING:PART_4': {
    taskTypeCode: 'AUDIO_RECORDING', name: 'Thảo luận chủ đề trừu tượng · Ghi âm',
    instructions: 'Chuẩn bị trong một phút, sau đó trả lời ba câu hỏi trong một bài nói tối đa hai phút.',
    note: 'Ba câu hỏi được trả lời chung trong một bản ghi âm có cấu trúc.',
    initialItemTypes: ['AUDIO_RECORDING'],
  },
  'WRITING:PART_1': {
    taskTypeCode: 'SHORT_TEXT', name: 'Trả lời bằng từ hoặc cụm từ ngắn',
    instructions: 'Trả lời bằng một đến năm từ.',
    note: 'Nhập LIÊN TIẾP nhiều câu hỏi về bản thân rồi lưu một lần — mỗi câu được tách thành một câu độc lập trong ngân hàng. Khi học viên vào thi, hệ thống tự lấy ngẫu nhiên 5 câu ghép thành một đề.',
    initialItemTypes: repeatType('SHORT_TEXT', 1),
    bulkSingleItem: true,
    bulkItemsPerTest: 5,
    // Không có stimulus: 5 câu Part 1 hỏi thông tin cá nhân, độc lập nhau.
    // Bối cảnh club/course/group là của Writing Part 2.
  },
  'WRITING:PART_2': {
    taskTypeCode: 'LONG_TEXT', name: 'Viết đoạn ngắn · 20–30 từ',
    instructions: 'Trả lời yêu cầu bằng các câu hoàn chỉnh trong khoảng 20 đến 30 từ.',
    note: 'Writing Part 2 là một đoạn văn ngắn cung cấp thông tin cá nhân.',
    initialItemTypes: ['LONG_TEXT'],
    stimulus: { label: 'Yêu cầu cung cấp thông tin', placeholder: 'Nhập bối cảnh và yêu cầu từ club / course / group…', required: true, rows: 6 },
  },
  'WRITING:PART_3': {
    taskTypeCode: 'LONG_TEXT', name: 'Ba phản hồi mạng xã hội · 30–40 từ',
    instructions: 'Trả lời ba câu hỏi trên giao diện mạng xã hội, mỗi câu khoảng 30 đến 40 từ.',
    note: 'Writing Part 3 gồm ba phản hồi viết riêng trên cùng một chủ đề.',
    initialItemTypes: repeatType('LONG_TEXT', 3),
    stimulus: { label: 'Bối cảnh cuộc trao đổi', placeholder: 'Nhập bối cảnh mạng xã hội chung cho 3 câu hỏi…', required: true, rows: 6 },
  },
  'WRITING:PART_4': {
    taskTypeCode: 'LONG_TEXT', name: 'Email thân mật và trang trọng',
    instructions: 'Viết một email thân mật 40–50 từ và một email trang trọng 120–150 từ về cùng một tình huống.',
    note: 'Writing Part 4 gồm hai email với văn phong và độ dài khác nhau.',
    initialItemTypes: repeatType('LONG_TEXT', 2),
    stimulus: { label: 'Thông tin / tình huống nhận được', placeholder: 'Nhập thông báo chung mà thí sinh phải phản hồi bằng hai email…', required: true, rows: 8 },
  },
};

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
  /** Năm ra thi, '' nếu chưa rõ. Giữ dạng chuỗi cho khớp <Select>. */
  examYear: string;
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
  rubricCode: responseType === 'LONG_TEXT'
    ? 'APTIS_WRITING'
    : responseType === 'AUDIO_RECORDING' ? 'APTIS_SPEAKING' : undefined,
  answerKey: makeAnswerKey(responseType),
  explanation: { format: 'PLAIN_TEXT', value: '' },
  acceptedText: '',
  audioAssetId: undefined,
  audioLabel: undefined,
});

const blankTemplateItem = (sequenceNo: number, responseType: ResponseType, template: PartTemplate): EditorItem => {
  const item = blankItem(sequenceNo, responseType);
  if ((CHOICE_TYPES.has(responseType) || ORDERING_TYPES.has(responseType)) && template.optionCount) {
    item.options = Array.from({ length: template.optionCount }, (_, index) => blankOption(index));
  }
  if (responseType === 'MATCHING' && template.matchingCounts) {
    item.leftItems = Array.from({ length: template.matchingCounts.left }, (_, index) => {
      const left = blankOption(index);
      // Vế trái cố định (Speaker A, B, C...) thì điền sẵn để khỏi phải gõ
      return template.autoLeftLabel
        ? { ...left, content: `${template.autoLeftLabel} ${String.fromCharCode(65 + index)}` }
        : left;
    });
    item.rightItems = Array.from({ length: template.matchingCounts.right }, (_, index) => ({
      ...blankOption(index), id: `R${index + 1}`, code: String.fromCharCode(65 + index),
    }));
  }
  return item;
};

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
  hotness: 3, examYear: '', accessLevel: 'FREE',
  instructions: '', stimulus: '', assets: [], items: [blankItem(1)], shuffleOptions: false,
  shuffleItems: false, maxAudioPlays: 3, allowReview: true, partialCredit: false,
};

export function QuestionSetEditorPage() {
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hierarchyQuery = searchParams.toString();
  const hierarchyComponentId = searchParams.get('componentId');
  const hierarchyPartId = searchParams.get('partId');
  const hierarchyListUrl = hierarchyComponentId && hierarchyPartId
    ? `/admin/question-sets/skills/${hierarchyComponentId}/parts/${hierarchyPartId}`
    : '/admin/question-sets';
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
  const scoringRules = useQuery({
    queryKey: ['admin', 'scoring-rules'], queryFn: adminScoringApi.list,
  });

  const selectedTask = taskTypes.data?.find((task) => task.id === form.taskTypeId);
  const responseType = selectedTask?.responseType ?? 'SINGLE_CHOICE';
  const selectedComponent = components.data?.find((component) => component.id === form.componentId);
  const selectedPart = parts.data?.find((part) => part.id === form.partId);
  const partTemplate = selectedComponent && selectedPart
    ? PART_TEMPLATES[`${selectedComponent.code}:${selectedPart.code}`]
    : undefined;
  const partScoringRule = scoringRules.data?.find((rule) => rule.partId === form.partId);
  const requiresItemAudio = Boolean(partTemplate?.audioGroups?.length);

  useEffect(() => {
    if (!editing && components.data?.length && !form.componentId) {
      const requested = searchParams.get('componentId');
      const selected = components.data.find((component) => component.id === requested) ?? components.data[0];
      if (selected) setForm((current) => ({ ...current, componentId: selected.id }));
    }
  }, [components.data, editing, form.componentId, searchParams]);

  useEffect(() => {
    if (!editing && parts.data?.length && !form.partId) {
      const requested = searchParams.get('partId');
      const selected = parts.data.find((part) => part.id === requested) ?? parts.data[0];
      if (selected) setForm((current) => ({ ...current, partId: selected.id }));
    }
  }, [parts.data, editing, form.partId, searchParams]);

  useEffect(() => {
    if (editing || !selectedComponent || !selectedPart || !partTemplate) return;
    const task = TASK_TYPES.find((entry) => entry.code === partTemplate.taskTypeCode);
    if (!task) return;
    setForm((current) => {
      const blankQuestions = current.items.length === 1 && !current.items[0]?.prompt.value.trim();
      const generatedCode = `${selectedComponent.code.replace('GRAMMAR_VOCABULARY', 'CORE').slice(0, 8)}_${selectedPart.code}_${Date.now().toString(36).slice(-6)}`.toUpperCase();
      return {
        ...current,
        code: current.code || generatedCode,
        taskTypeId: task.id,
        instructions: current.instructions || partTemplate.instructions,
        maxAudioPlays: selectedComponent.code === 'LISTENING' ? 2 : current.maxAudioPlays,
        items: blankQuestions
          ? (partTemplate.initialItemTypes?.length
              ? partTemplate.initialItemTypes.map((type, index) => blankTemplateItem(index + 1, type, partTemplate))
              : [blankTemplateItem(1, task.responseType, partTemplate)])
          : current.items,
      };
    });
  }, [editing, partTemplate, selectedComponent, selectedPart]);

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
      examYear: question.examYear == null ? '' : String(question.examYear),
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
          rubricCode: item.rubricCode ?? (item.responseType === 'LONG_TEXT'
            ? 'APTIS_WRITING'
            : item.responseType === 'AUDIO_RECORDING' ? 'APTIS_SPEAKING' : undefined),
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
      const validation = validateForm(form, responseType, partTemplate);
      if (validation) throw new Error(validation);
      const content = toContent(form, partTemplate, partScoringRule);
      if (editing && id) {
        const body: UpdateQuestionSetRequest = {
          topicName: form.topicName.trim(), title: form.title.trim(), hotness: form.hotness,
          examYear: form.examYear === '' ? null : Number(form.examYear),
          accessLevel: form.accessLevel, content,
        };
        return adminContentApi.update(id, body);
      }
      const baseCode = form.code.trim().toUpperCase().replace(/\s+/g, '_');

      // Part nhập hàng loạt: mỗi câu thành một bộ riêng để backend gom lại theo
      // số câu của đề. Lưu tuần tự vì code phải duy nhất, chạy song song dễ
      // đụng nhau ở ràng buộc unique.
      if (partTemplate?.bulkSingleItem && form.items.length > 1) {
        let created: Awaited<ReturnType<typeof adminContentApi.create>> | undefined;
        for (const [index, singleItem] of form.items.entries()) {
          const singleContent = toContent(
            { ...form, items: [singleItem] }, partTemplate, partScoringRule);
          const suffix = String(index + 1).padStart(2, '0');
          created = await adminContentApi.create({
            partId: form.partId, taskTypeId: form.taskTypeId, topicName: form.topicName.trim(),
            code: `${baseCode}_${suffix}`,
            title: singleItem.prompt?.value?.trim() || `${form.title.trim()} ${suffix}`,
            hotness: form.hotness,
            examYear: form.examYear === '' ? null : Number(form.examYear),
            accessLevel: form.accessLevel, content: singleContent,
          });
        }
        return created!;
      }

      const body: CreateQuestionSetRequest = {
        partId: form.partId, taskTypeId: form.taskTypeId, topicName: form.topicName.trim(),
        code: baseCode, title: form.title.trim(),
        hotness: form.hotness,
        examYear: form.examYear === '' ? null : Number(form.examYear),
        accessLevel: form.accessLevel, content,
      };
      return adminContentApi.create(body);
    },
    onSuccess: (question) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'question-sets'] });
      navigate(`/admin/question-sets/${question.id}${hierarchyQuery ? `?${hierarchyQuery}` : ''}`, { replace: true });
    },
    onError: (reason) => setError(reason instanceof ApiError || reason instanceof Error ? reason.message : 'Không lưu được bộ câu hỏi'),
  });

  const loading = versions.isPending || components.isPending || taskTypes.isPending || scoringRules.isPending || (editing && detail.isPending);
  const loadError = versions.error || components.error || taskTypes.error || scoringRules.error || detail.error;
  if (!has('question_set:write')) return <ErrorBlock message="Bạn không có quyền soạn câu hỏi." />;
  if (loading) return <LoadingBlock label="Đang chuẩn bị trình soạn…" />;
  if (loadError) return <ErrorBlock message={loadError instanceof Error ? loadError.message : 'Không tải được dữ liệu trình soạn'} />;

  const changeStep = (nextStep: number) => {
    setError(null);
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goNext = () => {
    const validation = validateStep(form, responseType, step, partTemplate);
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
        title={editing ? 'Chỉnh sửa đề' : 'Tạo đề mới'}
        description="Kỹ năng, Part và dạng câu hỏi đã được xác định tự động từ vị trí bạn chọn."
        actions={<Link to={editing && id ? `/admin/question-sets/${id}${hierarchyQuery ? `?${hierarchyQuery}` : ''}` : hierarchyListUrl} className="btn-secondary">Hủy</Link>}
      />
      {error && <ResultBanner tone="danger" message={error} onDismiss={() => setError(null)} />}

      <WizardProgress currentStep={step} onSelect={(target) => target < step && changeStep(target)} />

      {step === 1 && <section className="card mb-5">
        <SectionTitle number="1" title="Thông tin đề" subtitle="Chỉ nhập thông tin riêng của đề; cấu trúc bài đã lấy tự động theo Part." />

        <div className="mb-5 rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Phân loại tự động</p><p className="mt-1 text-sm text-brand-950">Không cần chọn lại, tránh tạo sai cấu trúc Aptis.</p></div>
            <span className="rounded-full bg-white px-3 py-1 font-mono text-[11px] font-semibold text-brand-800">{form.code || 'Đang tạo mã…'}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <ReadOnlyClassification label="Kỹ năng" value={selectedComponent?.name ?? 'Đang tải…'} />
            <ReadOnlyClassification label="Part" value={selectedPart?.name ?? 'Đang tải…'} />
            <ReadOnlyClassification label="Dạng câu hỏi chuẩn" value={partTemplate?.name ?? selectedTask?.name ?? 'Đang xác định…'} />
          </div>
          {partTemplate && <p className="mt-3 text-xs leading-5 text-brand-800">{partTemplate.note}</p>}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="md:col-span-2 xl:col-span-1"><Input label="Tiêu đề đề" required value={form.title} placeholder={`${selectedPart?.name ?? 'Aptis'} · Chủ đề 01`} onChange={(title) => setForm((current) => ({ ...current, title }))} /></div>
          <Input label="Chủ đề hiển thị" required value={form.topicName} placeholder="Ví dụ: Du lịch, Công việc, Môi trường…" onChange={(topicName) => setForm((current) => ({ ...current, topicName }))} />
          <Select label="Quyền truy cập" value={form.accessLevel} options={[{ value: 'FREE', label: 'Miễn phí' }, { value: 'PREMIUM', label: 'Premium' }]} onChange={(accessLevel) => setForm((current) => ({ ...current, accessLevel: accessLevel as AccessLevel }))} />
          <Select label="Độ hot" value={String(form.hotness)} options={[
            { value: '1', label: '1/5 · Ít gặp' },
            { value: '2', label: '2/5 · Thỉnh thoảng' },
            { value: '3', label: '3/5 · Phổ biến' },
            { value: '4', label: '4/5 · Thi nhiều gần đây' },
            { value: '5', label: '5/5 · Rất hot' },
          ]} onChange={(hotness) => setForm((current) => ({ ...current, hotness: Number(hotness) }))} />
          <Select label="Năm ra thi" value={form.examYear} options={[
            { value: '', label: 'Chưa rõ' },
            { value: '2026', label: '2026' },
            { value: '2025', label: '2025' },
            { value: '2024', label: '2024' },
          ]} onChange={(examYear) => setForm((current) => ({ ...current, examYear }))} />
        </div>
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Thời gian làm bài được cấu hình khi ghép bài test hoàn chỉnh, không nhập lại tại đây.
        </div>
      </section>}

      {step === 2 && <section className="card mb-5">
        <SectionTitle number="2" title="Đề bài chung" subtitle="Hướng dẫn chuẩn đã lấy theo Part; bạn chỉ cần nhập ngữ liệu hoặc bối cảnh của đề." />
        {partTemplate ? (
          <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Hướng dẫn làm bài tự động</p>
            <p className="mt-1 text-sm leading-6 text-brand-950">{partTemplate.instructions}</p>
          </div>
        ) : (
          <TextArea label="Hướng dẫn làm bài" required rows={3} value={form.instructions} placeholder="Đọc kỹ câu hỏi và chọn đáp án đúng nhất." onChange={(instructions) => setForm((current) => ({ ...current, instructions }))} />
        )}
        {partTemplate?.stimulus && <div className="mt-4"><TextArea
          label={partTemplate.stimulus.label}
          required={partTemplate.stimulus.required}
          rows={partTemplate.stimulus.rows ?? 6}
          value={form.stimulus}
          placeholder={partTemplate.stimulus.placeholder}
          onChange={(stimulus) => setForm((current) => ({ ...current, stimulus }))}
        /></div>}
        {partTemplate?.sharedMedia && <div className="mt-4">
          <AssetUploader
            assets={form.assets.filter((asset) => !asset.role.startsWith('ITEM_AUDIO:'))}
            media={partTemplate.sharedMedia}
            onAdd={(asset) => setForm((current) => ({ ...current, assets: [...current.assets, { ...asset, displayOrder: current.assets.length + 1 }] }))}
            onRemove={(assetId) => setForm((current) => ({ ...current, assets: current.assets.filter((asset) => asset.assetId !== assetId) }))}
          />
        </div>}
        {!partTemplate?.stimulus && !partTemplate?.sharedMedia && <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
          Part này không có ngữ liệu, audio hoặc hình ảnh dùng chung. Nội dung được nhập trực tiếp theo từng câu ở bước tiếp theo.
        </div>}
      </section>}

      {step === 3 && <section className="mb-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <SectionTitle number="3" title="Danh sách câu hỏi" subtitle={`${form.items.length} câu · ${selectedTask?.name ?? 'Dạng bài'}`} />
          {(!partTemplate?.initialItemTypes?.length || partTemplate?.bulkSingleItem) && <button type="button" className="btn-secondary" onClick={() => setForm((current) => ({
            ...current,
            items: [...current.items, partTemplate
              ? blankTemplateItem(current.items.length + 1, responseType, partTemplate)
              : blankItem(current.items.length + 1, responseType)],
          }))}>+ Thêm câu hỏi</button>}
        </div>
        <div className="space-y-4">
          {form.items.map((item, index) => {
            const audioGroup = getAudioGroup(partTemplate?.audioGroups, index);
            const isGroupStart = audioGroup?.start === index;
            const audioTitle = audioGroup && audioGroup.size > 1
              ? `Audio bài nghe ${audioGroup.number}`
              : `Audio câu ${index + 1}`;
            const audioHelp = audioGroup && audioGroup.size > 1
              ? `Audio này dùng chung cho câu ${audioGroup.start + 1}–${audioGroup.end + 1}.`
              : 'Mỗi câu dùng một file audio riêng.';
            return <QuestionCard key={item.id} item={item} index={index} responseType={item.responseType}
              promptLabel={partTemplate?.itemPromptLabel}
              fixedFirstOption={partTemplate?.fixedFirstOption}
              autoLeftLabel={partTemplate?.autoLeftLabel}
              requiresAudio={Boolean(requiresItemAudio && isGroupStart)} audioTitle={audioTitle} audioHelp={audioHelp}
              allowRemove={!partTemplate?.initialItemTypes?.length || Boolean(partTemplate?.bulkSingleItem)}
              onChange={(next) => setForm((current) => ({ ...current, items: current.items.map((entry, i) => i === index ? next : entry) }))}
              onAudioChange={(audioAssetId, audioLabel) => setForm((current) => ({
                ...current,
                items: current.items.map((entry, i) => audioGroup && i >= audioGroup.start && i <= audioGroup.end
                  ? { ...entry, audioAssetId, audioLabel }
                  : entry),
              }))}
              onRemove={() => setForm((current) => ({ ...current, items: renumber(current.items.filter((_, i) => i !== index)) }))} />;
          })}
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

function QuestionCard({ item, index, responseType, promptLabel, fixedFirstOption, autoLeftLabel, requiresAudio, audioTitle, audioHelp, allowRemove, onChange, onAudioChange, onRemove }: {
  item: EditorItem;
  index: number;
  responseType: ResponseType;
  promptLabel?: string;
  fixedFirstOption?: boolean;
  autoLeftLabel?: string;
  requiresAudio: boolean;
  audioTitle: string;
  audioHelp: string;
  allowRemove: boolean;
  onChange: (item: EditorItem) => void;
  onAudioChange: (assetId?: string, label?: string) => void;
  onRemove: () => void;
}) {
  const updateOptions = (options: QuestionOptionPayload[]) => onChange({ ...item, options });
  return (
    <article className="card border-l-4 !border-l-brand-600">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
        <div><span className="text-xs font-semibold uppercase tracking-wider text-brand-700">Câu {index + 1}</span><p className="mt-0.5 text-xs text-stone-500">{responseType.replaceAll('_', ' ')}</p></div>
        {allowRemove && <button type="button" className="btn-ghost text-red-700" disabled={index === 0} onClick={onRemove}>Xóa câu</button>}
      </div>
      {requiresAudio && <div className="mb-4">
        <ItemAudioUploader
          itemNumber={index + 1}
          title={audioTitle}
          help={audioHelp}
          assetId={item.audioAssetId}
          label={item.audioLabel}
          onChange={onAudioChange}
        />
      </div>}
      <TextArea label={promptLabel ?? 'Nội dung câu hỏi'} required rows={3} value={item.prompt?.value ?? ''} placeholder="Nhập câu hỏi hoặc yêu cầu…" onChange={(value) => onChange({ ...item, prompt: { format: 'PLAIN_TEXT', value } })} />
      {(responseType === 'LONG_TEXT' || responseType === 'AUDIO_RECORDING') && <div className="mt-4">
        <ReadOnlyClassification label="Cách chấm" value={responseType === 'LONG_TEXT' ? 'Rubric Aptis Writing' : 'Rubric Aptis Speaking'} />
      </div>}

      {(CHOICE_TYPES.has(responseType) || ORDERING_TYPES.has(responseType)) && (
        <OptionEditor groupName={`correct-${item.id}`} options={item.options} multiple={responseType === 'MULTIPLE_CHOICE'} ordering={ORDERING_TYPES.has(responseType)} fixedFirstOption={fixedFirstOption} answerKey={item.answerKey} onOptions={updateOptions} onAnswer={(answerKey) => onChange({ ...item, answerKey })} />
      )}
      {responseType === 'MATCHING' && <MatchingEditor item={item} autoLeftLabel={autoLeftLabel} onChange={onChange} />}
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

function OptionEditor({ groupName, options, multiple, ordering, fixedFirstOption, answerKey, onOptions, onAnswer }: { groupName: string; options: QuestionOptionPayload[]; multiple: boolean; ordering: boolean; fixedFirstOption?: boolean; answerKey?: AnswerKeyPayload; onOptions: (options: QuestionOptionPayload[]) => void; onAnswer: (key: AnswerKeyPayload) => void }) {
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
    {ordering && <div className="mt-3">
      {fixedFirstOption && <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Mã đầu tiên trong thứ tự đúng là câu mẫu cố định; học viên chỉ sắp xếp 5 câu còn lại.</p>}
      <Input label="Thứ tự đúng (mã cách nhau bằng dấu phẩy)" required value={(answerKey?.orderedOptionIds ?? []).join(',')} placeholder="C,A,B,D,E,F" onChange={(value) => onAnswer({ ...(answerKey ?? { type: 'SENTENCE_ORDERING' }), orderedOptionIds: value.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean) })} />
    </div>}
  </div>;
}

function MatchingEditor({ item, autoLeftLabel, onChange }: { item: EditorItem; autoLeftLabel?: string; onChange: (item: EditorItem) => void }) {
  const updateSide = (side: 'leftItems' | 'rightItems', values: QuestionOptionPayload[]) => onChange({ ...item, [side]: values });
  return <div className="mt-4 rounded-xl bg-stone-50 p-4">
    <h3 className="mb-3 text-sm font-semibold text-stone-900">{autoLeftLabel ? 'Các mẩu thông tin' : 'Các cặp nối'}</h3>
    <div className={clsx('grid gap-4', !autoLeftLabel && 'lg:grid-cols-2')}>
      {/* autoLeftLabel: vế trái đã điền sẵn (Speaker A, B…) nên không cần ô nhập */}
      {!autoLeftLabel && <OptionColumn title="Vế trái" options={item.leftItems} onChange={(values) => updateSide('leftItems', values)} />}
      <OptionColumn title={autoLeftLabel ? 'Nhập các mẩu thông tin (dùng chung cho tất cả)' : 'Vế phải'} options={item.rightItems} onChange={(values) => updateSide('rightItems', values)} />
    </div>
    <div className="mt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Đáp án</p>
      <div className="grid gap-2 sm:grid-cols-2">{item.leftItems.map((left) => <label key={left.id} className="flex items-center gap-2 text-sm"><span className="min-w-24 font-medium">{autoLeftLabel ? left.content : left.code}</span><select className="input" value={item.answerKey?.matches?.[left.id] ?? ''} onChange={(event) => onChange({ ...item, answerKey: { ...(item.answerKey ?? { type: 'MATCHING' }), matches: { ...(item.answerKey?.matches ?? {}), [left.id]: event.target.value } } })}><option value="">Chọn đáp án</option>{item.rightItems.map((right) => <option key={right.id} value={right.id}>{right.code} — {right.content || 'Chưa nhập'}</option>)}</select></label>)}</div>
    </div>
  </div>;
}

function OptionColumn({ title, options, onChange }: { title: string; options: QuestionOptionPayload[]; onChange: (options: QuestionOptionPayload[]) => void }) {
  return <div><div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-stone-500">{title}</span><button type="button" className="btn-ghost !p-1 text-xs" onClick={() => onChange([...options, nextOption(options)])}>+ Thêm</button></div><div className="space-y-2">{options.map((option, index) => <input key={option.id} className="input" value={option.content} placeholder={`${option.code} — Nội dung`} onChange={(event) => onChange(options.map((entry, i) => i === index ? { ...entry, content: event.target.value } : entry))} />)}</div></div>;
}

function AssetUploader({ assets, media, onAdd, onRemove }: {
  assets: EditorForm['assets'];
  media: NonNullable<PartTemplate['sharedMedia']>;
  onAdd: (asset: Omit<EditorForm['assets'][number], 'displayOrder'>) => void;
  onRemove: (assetId: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const upload = useMutation({
    mutationFn: async (selected: File) => {
      const isAudio = selected.type.startsWith('audio/');
      const isImage = selected.type.startsWith('image/');
      if ((media.type === 'AUDIO' && !isAudio) || (media.type === 'IMAGE' && !isImage)) {
        throw new Error(media.type === 'AUDIO' ? 'Vui lòng chọn đúng tệp audio.' : 'Vui lòng chọn đúng tệp hình ảnh.');
      }
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
      <label className="min-w-64 flex-1"><span className="label">{media.label}{media.required && <span className="text-red-600"> *</span>}</span><input type="file" accept={media.type === 'AUDIO' ? 'audio/*' : 'image/*'} className="input bg-white" disabled={upload.isPending || assets.length >= (media.maxFiles ?? 1)} onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
      <button type="button" className="btn-secondary" disabled={!file || upload.isPending || assets.length >= (media.maxFiles ?? 1)} onClick={() => file && upload.mutate(file)}>{upload.isPending ? 'Đang tải…' : 'Tải tệp lên'}</button>
    </div>
    {upload.error && <p className="mt-2 text-sm text-red-700">{upload.error instanceof Error ? upload.error.message : 'Không tải được tệp'}</p>}
    {assets.length > 0 && <ul className="mt-3 grid gap-2 sm:grid-cols-2">{assets.map((asset) => <li key={asset.assetId} className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><span className="min-w-0 truncate"><strong>{asset.role === 'MAIN_AUDIO' ? 'Audio' : 'Ảnh'}</strong> · {asset.label}</span><button type="button" className="text-red-700 hover:underline" onClick={() => onRemove(asset.assetId)}>Gỡ</button></li>)}</ul>}
    <p className="mt-2 text-xs text-stone-500">{media.help}</p>
  </div>;
}

function ItemAudioUploader({ itemNumber, title, help, assetId, label, onChange }: {
  itemNumber: number;
  title: string;
  help: string;
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
      <div><h3 className="text-sm font-semibold text-stone-900">{title} <span className="text-red-600">*</span></h3><p className="mt-0.5 text-xs text-stone-500">{help}</p></div>
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

function toContent(form: EditorForm, template?: PartTemplate, scoringRule?: PartScoringRule): QuestionContent {
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
      const configuredPoints = scoringRule?.pointsPerCorrect ?? template?.matchingScoring?.pointsPerCorrect;
      const configuredBonus = scoringRule?.perfectBonus ?? template?.matchingScoring?.perfectBonus ?? 0;
      const isStructuredMatching = item.responseType === 'MATCHING' && Boolean(template?.matchingCounts);
      const itemMaxScore = isStructuredMatching && configuredPoints
        ? item.leftItems.filter((entry) => entry.content.trim()).length * configuredPoints + configuredBonus
        : scoringRule
          // Part nhập hàng loạt: mỗi bộ chỉ một câu nên phải chia theo số câu
          // của ĐỀ (bulkItemsPerTest), không theo số câu đang có trong form.
          ? splitPartScore(
              scoringRule.maxScore,
              template?.bulkItemsPerTest ?? form.items.length,
              template?.bulkItemsPerTest ? 0 : index)
          : template?.itemMaxScore ?? 1;
      return {
        ...item, id: `item_${index + 1}`, sequenceNo: index + 1, responseType: item.responseType, maxScore: itemMaxScore,
        constraints: {
          ...item.constraints,
          ...(audioAssetId ? { audioAssetId } : {}),
          ...(isStructuredMatching && configuredPoints ? { pointsPerCorrect: configuredPoints, perfectBonus: configuredBonus } : {}),
          ...(template?.fixedFirstOption && ORDERING_TYPES.has(item.responseType) && item.answerKey?.orderedOptionIds?.[0]
            ? { fixedFirstOptionId: item.answerKey.orderedOptionIds[0], pointsPerCorrect: configuredPoints ?? 1 }
            : {}),
        },
        prompt: { format: 'PLAIN_TEXT', value: item.prompt.value.trim() },
        options: item.options.filter((x) => x.content.trim()), leftItems: item.leftItems.filter((x) => x.content.trim()), rightItems: item.rightItems.filter((x) => x.content.trim()),
        explanation: item.explanation?.value.trim() ? { format: 'PLAIN_TEXT', value: item.explanation.value.trim() } : undefined,
        answerKey: item.responseType === 'SHORT_TEXT' || item.responseType === 'TEXT_EXACT'
          ? { ...(item.answerKey ?? { type: item.responseType }), acceptedValues: acceptedText.split('|').map((x) => x.trim()).filter(Boolean) }
          : item.answerKey,
      };
    }),
    settings: { shuffleOptions: form.shuffleOptions, shuffleItems: form.shuffleItems, maxAudioPlays: form.maxAudioPlays, showAnswerAfterEachItem: false, allowReview: form.allowReview },
    scoring: {
      strategy: form.items.every((item) => item.responseType === 'LONG_TEXT' || item.responseType === 'AUDIO_RECORDING') ? 'RUBRIC' : 'EXACT_MATCH',
      partialCredit: form.items.some((item) => item.responseType === 'MATCHING' || ORDERING_TYPES.has(item.responseType)),
    },
  };
}

function splitPartScore(total: number, itemCount: number, index: number): number {
  if (itemCount <= 1) return total;
  const regular = Math.floor((total / itemCount) * 100) / 100;
  return index === itemCount - 1 ? Number((total - regular * (itemCount - 1)).toFixed(2)) : regular;
}

function validateStep(form: EditorForm, responseType: ResponseType, step: number, template?: PartTemplate): string | null {
  if (step === 1) {
    if (!form.code.trim() || !form.title.trim()) return 'Vui lòng nhập mã và tiêu đề bộ câu hỏi.';
    if (!form.topicName.trim()) return 'Vui lòng nhập chủ đề sẽ hiển thị cho học viên.';
    if (!form.componentId || !form.partId || !form.taskTypeId) return 'Vui lòng chọn kỹ năng, Part và dạng bài.';
  }
  if (step === 2) {
    if (!form.instructions.trim()) return 'Vui lòng nhập hướng dẫn làm bài.';
    if (template?.stimulus?.required && !form.stimulus.trim()) return `Vui lòng nhập ${template.stimulus.label.toLowerCase()}.`;
    if (template?.sharedMedia?.required) {
      const expectedRole = template.sharedMedia.type === 'AUDIO' ? 'MAIN_AUDIO' : 'STIMULUS_IMAGE';
      const uploaded = form.assets.filter((asset) => asset.role === expectedRole).length;
      if (uploaded < (template.sharedMedia.maxFiles ?? 1)) return `Vui lòng tải đủ ${template.sharedMedia.maxFiles ?? 1} ${template.sharedMedia.type === 'AUDIO' ? 'tệp audio' : 'hình ảnh'}.`;
    }
  }
  if (step === 3) {
    // Part nhập hàng loạt: initialItemTypes chỉ là số câu khởi tạo, biên tập
    // viên thêm bao nhiêu câu tuỳ ý rồi lưu một lần.
    const expectedItems = template?.bulkSingleItem ? undefined : template?.initialItemTypes?.length;
    if (expectedItems && form.items.length !== expectedItems) return `Part này phải có đúng ${expectedItems} câu / nhóm câu.`;
    return validateQuestions(form, responseType, Boolean(template?.audioGroups?.length));
  }
  return null;
}

function validateForm(form: EditorForm, responseType: ResponseType, template?: PartTemplate): string | null {
  for (const step of [1, 2, 3]) {
    const error = validateStep(form, responseType, step, template);
    if (error) return error;
  }
  return null;
}

function getAudioGroup(groups: number[] | undefined, itemIndex: number) {
  if (!groups?.length) return undefined;
  let start = 0;
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const size = groups[groupIndex] ?? 0;
    const end = start + size - 1;
    if (itemIndex >= start && itemIndex <= end) return { number: groupIndex + 1, start, end, size };
    start = end + 1;
  }
  return undefined;
}

function validateQuestions(form: EditorForm, responseType: ResponseType, requiresItemAudio = false): string | null {
  if (form.items.length === 0) return 'Bộ câu hỏi phải có ít nhất một câu.';
  for (const [index, item] of form.items.entries()) {
    const label = `Câu ${index + 1}`;
    const itemResponseType = item.responseType || responseType;
    if (requiresItemAudio && !item.audioAssetId) return item.audioLabel ? `${label} đang tải audio, vui lòng chờ hoàn tất.` : `${label} chưa chọn audio.`;
    if (!item.prompt.value.trim()) return `${label} chưa có nội dung.`;
    if (CHOICE_TYPES.has(itemResponseType)) {
      if (item.options.filter((x) => x.content.trim()).length < 2) return `${label} cần ít nhất hai phương án.`;
      if (itemResponseType === 'MULTIPLE_CHOICE' ? !item.answerKey?.selectedOptionIds?.length : !item.answerKey?.selectedOptionId) return `${label} chưa chọn đáp án đúng.`;
    }
    if (ORDERING_TYPES.has(itemResponseType) && item.answerKey?.orderedOptionIds?.length !== item.options.filter((x) => x.content.trim()).length) return `${label} chưa nhập đủ thứ tự đúng.`;
    if (itemResponseType === 'MATCHING' && item.leftItems.some((x) => !item.answerKey?.matches?.[x.id])) return `${label} chưa nối đủ các cặp.`;
    if ((itemResponseType === 'SHORT_TEXT' || itemResponseType === 'TEXT_EXACT') && !item.acceptedText.trim()) return `${label} chưa có đáp án được chấp nhận.`;
    if ((itemResponseType === 'LONG_TEXT' || itemResponseType === 'AUDIO_RECORDING') && !item.rubricCode?.trim()) return `${label} chưa có mã rubric.`;
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

function ReadOnlyClassification({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-brand-100 bg-white px-4 py-3"><span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span><strong className="mt-1 block text-sm text-slate-900">{value}</strong></div>;
}

function SectionTitle({ number, title, subtitle }: { number: string; title: string; subtitle: string }) { return <div className="mb-4 flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-800">{number}</span><div><h2 className="font-semibold text-stone-950">{title}</h2><p className="mt-0.5 text-sm text-stone-500">{subtitle}</p></div></div>; }
function Input({ label, value, onChange, required, disabled, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; disabled?: boolean; placeholder?: string; type?: string }) { return <label className="block"><span className="label">{label}{required && <span className="text-red-600"> *</span>}</span><input type={type} className="input" value={value} disabled={disabled} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>; }
function TextArea({ label, value, onChange, required, placeholder, rows }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string; rows: number }) { return <label className="block"><span className="label">{label}{required && <span className="text-red-600"> *</span>}</span><textarea className="input resize-y" rows={rows} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>; }
function Select({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; disabled?: boolean }) { return <label className="block"><span className="label">{label}</span><select className="input" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-700"><input type="checkbox" className="h-4 w-4 rounded border-stone-300 text-brand-700" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>; }
