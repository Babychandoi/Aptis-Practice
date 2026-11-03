import type { QuestionItem, QuestionSetContent, RichContent } from '@/types/api';
import type { MonthlyFocusItem, MonthlyFocusPageKey, MonthlyFocusTopic } from '@/types/monthlyFocus';

/**
 * Logic thuần của Đề trọng điểm tháng: chấm từng câu ngay trên trình duyệt, dựng
 * nội dung hộp "Đáp án", tách đáp án mẫu, gom phiên bản theo chủ đề. Tách khỏi
 * giao diện để kiểm thử được.
 */

export type Skill = 'listening' | 'reading' | 'speaking' | 'writing';

export interface PageMeta {
  key: MonthlyFocusPageKey;
  skill: Skill;
  /** Đoạn đường dẫn sau /de-trong-diem/<kỹ năng>/ */
  slug: string;
  title: string;
  description: string;
  /** Nhãn trong ngăn "Tiến độ học": "Listening · Part 1". */
  progressLabel: string;
  tone: Tone;
  icon: PartIcon;
}

export type Tone = 'blue' | 'green' | 'orange' | 'purple' | 'cyan' | 'red' | 'yellow' | 'pink';
export type PartIcon = 'book' | 'notebook' | 'users' | 'file' | 'mic' | 'list' | 'chat' | 'headphones' | 'pen';

/** Tiêu đề và mô tả từng trang — giữ đúng chữ của website. */
export const PAGES: PageMeta[] = [
  { key: 'listening-1', skill: 'listening', slug: '1', title: 'Phần 1: Câu 1-13', description: 'Nghe đoạn hội thoại ngắn và chọn đáp án đúng cho 13 câu hỏi.', progressLabel: 'Listening · Part 1', tone: 'blue', icon: 'headphones' },
  { key: 'listening-2', skill: 'listening', slug: '2', title: 'Phần 2: Câu 14', description: 'Nghe bốn người nói và ghép mỗi người với ý phù hợp.', progressLabel: 'Listening · Part 2', tone: 'green', icon: 'users' },
  { key: 'listening-3', skill: 'listening', slug: '3', title: 'Phần 3: Câu 15', description: 'Nghe hai người trao đổi và chọn ý kiến của người đàn ông, người phụ nữ hay cả hai.', progressLabel: 'Listening · Part 3', tone: 'orange', icon: 'chat' },
  { key: 'listening-4', skill: 'listening', slug: '4', title: 'Phần 4: Câu 16-17', description: 'Nghe bài nói dài và trả lời hai câu hỏi trắc nghiệm.', progressLabel: 'Listening · Part 4', tone: 'purple', icon: 'file' },
  { key: 'reading-1', skill: 'reading', slug: '1', title: 'Phần 1: Đọc hiểu câu', description: 'Đọc một note/email ngắn và chọn từ hoàn thành 5 câu.', progressLabel: 'Reading · Part 1', tone: 'blue', icon: 'book' },
  { key: 'reading-2-3', skill: 'reading', slug: '2-3', title: 'Phần 2 & 3: Sắp xếp câu', description: 'Sắp xếp 5 câu còn lại để tạo đoạn văn hoàn chỉnh.', progressLabel: 'Reading · Part 2-3', tone: 'green', icon: 'notebook' },
  { key: 'reading-4', skill: 'reading', slug: '4', title: 'Phần 4: Ghép ý kiến', description: 'Ghép 7 phát biểu với đúng người trong 4 đoạn quan điểm.', progressLabel: 'Reading · Part 4', tone: 'orange', icon: 'users' },
  { key: 'reading-5', skill: 'reading', slug: '5', title: 'Phần 5: Đọc hiểu văn bản dài', description: 'Ghép 7 tiêu đề với 7 đoạn trong bài đọc dài khoảng 750 từ.', progressLabel: 'Reading · Part 5', tone: 'purple', icon: 'file' },
  { key: 'speaking-1', skill: 'speaking', slug: '1', title: 'Phần 1: Câu hỏi ngắn (Sentence Comprehension)', description: 'Trả lời 3 câu hỏi cá nhân về bản thân và sở thích.', progressLabel: 'Speaking · Part 1', tone: 'blue', icon: 'mic' },
  { key: 'speaking-2', skill: 'speaking', slug: '2', title: 'Phần 2: Miêu tả & nêu ý kiến', description: 'Mô tả 1 tranh và trả lời 2 câu hỏi liên quan.', progressLabel: 'Speaking · Part 2', tone: 'green', icon: 'list' },
  { key: 'speaking-3', skill: 'speaking', slug: '3', title: 'Phần 3: So sánh & giải thích', description: 'So sánh 2 tranh và trả lời 2 câu hỏi liên quan.', progressLabel: 'Speaking · Part 3', tone: 'orange', icon: 'chat' },
  { key: 'speaking-4', skill: 'speaking', slug: '4', title: 'Phần 4: Thảo luận kinh nghiệm & ý kiến', description: 'Chuẩn bị 1 phút rồi trả lời 3 câu hỏi về một chủ đề trừu tượng.', progressLabel: 'Speaking · Part 4', tone: 'purple', icon: 'users' },
];

export const SKILLS: { skill: Skill; title: string; description: string; tone: Tone; icon: PartIcon }[] = [
  { skill: 'speaking', title: 'Đề trọng điểm tháng - Speaking', description: 'Các câu hỏi Speaking được chọn lọc trong tháng để luyện phản xạ và ý tưởng nhanh.', tone: 'orange', icon: 'mic' },
  { skill: 'listening', title: 'Đề trọng điểm tháng - Listening', description: 'Các set Listening tiêu biểu trong tháng, giúp bạn quen dạng câu hỏi và tốc độ nói.', tone: 'green', icon: 'headphones' },
  { skill: 'reading', title: 'Đề trọng điểm tháng - Reading', description: 'Các đề Reading được chọn lọc trong tháng, tập trung vào những dạng câu hỏi dễ mất điểm nhất.', tone: 'blue', icon: 'book' },
  { skill: 'writing', title: 'Đề trọng điểm tháng - Writing', description: 'Các đề Writing được chọn trong tháng, bám sát cấu trúc part 1-4 để bạn luyện nhanh và trúng trọng tâm.', tone: 'cyan', icon: 'pen' },
];

export const SKILL_SLUG: Record<Skill, string> = { listening: 'nghe', reading: 'doc', speaking: 'noi', writing: 'viet' };
export const SKILL_OF_SLUG: Record<string, Skill> = { nghe: 'listening', doc: 'reading', noi: 'speaking', viet: 'writing' };

export const pageMeta = (key: MonthlyFocusPageKey) => PAGES.find((p) => p.key === key);
export const pageBySlug = (skill: Skill, slug: string) => PAGES.find((p) => p.skill === skill && p.slug === slug);
export const pagesOf = (skill: Skill) => PAGES.filter((p) => p.skill === skill);
export const basePath = '/de-trong-diem';
export const pagePath = (p: PageMeta) => `${basePath}/${SKILL_SLUG[p.skill]}/${p.slug}`;

// ---------------------------------------------------------------------
// Trả lời và chấm
// ---------------------------------------------------------------------

/** Câu trả lời của một item: id phương án, thứ tự câu, hoặc map ghép (trái -> phải). */
export type Answer = string | string[] | Record<string, string>;
export type Answers = Record<string, Answer | undefined>;

export const isObjective = (content: QuestionSetContent) =>
  content.items.length > 0 && content.items.every((i) => i.answerKey && ['SINGLE_CHOICE', 'GAP_FILL_CHOICE', 'ORDERING', 'SENTENCE_ORDERING', 'MATCHING'].includes(i.responseType));

/** Đúng/sai từng item; null khi item chưa có đáp án để so (Speaking/Writing). */
export function gradeItem(item: QuestionItem, answer: Answer | undefined): boolean | null {
  const key = item.answerKey;
  if (!key) return null;
  switch (item.responseType) {
    case 'SINGLE_CHOICE':
    case 'GAP_FILL_CHOICE':
      return typeof answer === 'string' && answer === key.selectedOptionId;
    case 'ORDERING':
    case 'SENTENCE_ORDERING': {
      const expected = key.orderedOptionIds ?? [];
      return Array.isArray(answer) && answer.length === expected.length && answer.every((id, i) => id === expected[i]);
    }
    case 'MATCHING': {
      const expected = key.matches ?? {};
      const given = answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {};
      return Object.keys(expected).length > 0 && Object.entries(expected).every(([left, right]) => given[left] === right);
    }
    default:
      return null;
  }
}

/** Chấm cả đề: CORRECT khi mọi item đúng. */
export function gradeSet(content: QuestionSetContent, answers: Answers) {
  const perItem: Record<string, boolean> = {};
  for (const item of content.items) perItem[item.id] = gradeItem(item, answers[item.id]) === true;
  const correct = content.items.length > 0 && Object.values(perItem).every(Boolean);
  return { correct, perItem };
}

/** Một ô ghép (MATCHING) đúng hay sai — tô màu từng dòng sau khi Kiểm tra. */
export const matchCorrect = (item: QuestionItem, answer: Answer | undefined, left: string) =>
  !!answer && typeof answer === 'object' && !Array.isArray(answer) && answer[left] === item.answerKey?.matches?.[left];

/** Đã trả lời đủ để bật nút Kiểm tra chưa. */
export function isComplete(content: QuestionSetContent, answers: Answers) {
  return content.items.every((item) => {
    const a = answers[item.id];
    if (item.responseType === 'MATCHING') {
      return !!a && typeof a === 'object' && !Array.isArray(a) && item.leftItems.every((l) => (a as Record<string, string>)[l.id]);
    }
    if (item.responseType === 'ORDERING' || item.responseType === 'SENTENCE_ORDERING') {
      return Array.isArray(a) && a.length === item.options.length && a.every(Boolean);
    }
    return typeof a === 'string' && a.length > 0;
  });
}

/** Đáp án đúng điền sẵn — dùng cho Rush Mode (chế độ học chỉ hiện đáp án). */
export function correctAnswers(content: QuestionSetContent): Answers {
  const out: Answers = {};
  for (const item of content.items) {
    const key = item.answerKey;
    if (!key) continue;
    if (item.responseType === 'MATCHING') out[item.id] = { ...(key.matches ?? {}) };
    else if (item.responseType === 'ORDERING' || item.responseType === 'SENTENCE_ORDERING') out[item.id] = [...(key.orderedOptionIds ?? [])];
    else if (key.selectedOptionId) out[item.id] = key.selectedOptionId;
  }
  return out;
}

/** Nội dung hộp "Đáp án": mỗi dòng một câu. */
export function answerLines(content: QuestionSetContent): string[] {
  const lines: string[] = [];
  const many = content.items.length > 1;
  for (const [index, item] of content.items.entries()) {
    const key = item.answerKey;
    if (!key) continue;
    const prefix = many ? `${index + 1}. ` : '';
    if (item.responseType === 'MATCHING') {
      for (const left of item.leftItems) {
        const right = item.rightItems.find((r) => r.id === key.matches?.[left.id]);
        lines.push(`${left.code ?? ''} → ${right?.code ?? ''}${right && right.content !== right.code ? ` (${right.content})` : ''}`.trim());
      }
    } else if (item.responseType === 'ORDERING' || item.responseType === 'SENTENCE_ORDERING') {
      (key.orderedOptionIds ?? []).forEach((id, i) => {
        lines.push(`${i + 1}. ${item.options.find((o) => o.id === id)?.content ?? ''}`);
      });
    } else {
      const option = item.options.find((o) => o.id === key.selectedOptionId);
      lines.push(`${prefix}${option?.code ?? key.selectedOptionId ?? ''}`);
    }
  }
  return lines;
}

// ---------------------------------------------------------------------
// Đáp án mẫu (Speaking/Writing) và văn bản
// ---------------------------------------------------------------------

/**
 * Chữ thừa dính từ giao diện web cũ khi trích đáp án mẫu (nút giọng đọc, ô "tạo câu
 * trả lời bằng AI" — 35 đề Speaking trong kho có ba dòng sau).
 */
const NOISE = new Set([
  '👩', '👨', 'Nữ', 'Nam', 'Nghe',
  'Tạo câu trả lời cá nhân hóa bằng AI',
  'Nhập thông tin cá nhân của bạn, AI sẽ tạo câu trả lời hoàn chỉnh và tự nhiên cho bạn!',
  'Tạo câu trả lời',
]);

/**
 * Tách đáp án mẫu thành các mức: "Đáp án mẫu B1:\n…\n\nĐáp án mẫu B2–C1:\n…".
 * Không có nhãn mức thì trả một bản duy nhất.
 */
export function splitSamples(explanation: RichContent | null | undefined): { label: string; text: string }[] {
  const raw = (explanation?.value ?? '').split('\n').filter((line) => !NOISE.has(line.trim())).join('\n').trim();
  if (!raw) return [];
  const parts = raw.split(/(?:^|\n)\s*Đáp án mẫu\s+([^:\n]+):\s*\n/u);
  if (parts.length < 3) return [{ label: 'Đáp án mẫu', text: raw }];
  const out: { label: string; text: string }[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const text = (parts[i + 1] ?? '').trim();
    if (text) out.push({ label: `Đáp án ${parts[i]!.trim().replace('–', '-')}`, text });
  }
  return out;
}

/** Đoạn văn Reading 1 tách quanh chỗ trống "___1___"/"___": [chữ, chỗ trống 0, chữ, chỗ trống 1, …]. */
export function passageSegments(text: string): ({ kind: 'text'; value: string } | { kind: 'gap'; index: number })[] {
  const out: ({ kind: 'text'; value: string } | { kind: 'gap'; index: number })[] = [];
  let gap = 0;
  let last = 0;
  for (const m of text.matchAll(/_{2,}(?:\s*\d+\s*_+)?/g)) {
    if (m.index! > last) out.push({ kind: 'text', value: text.slice(last, m.index) });
    out.push({ kind: 'gap', index: gap++ });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out;
}

/** "Topic: Childhood\n\nPerson A:\n…" -> chủ đề và đoạn của từng người. */
export function opinionBlocks(stimulus: string) {
  const topic = stimulus.match(/^\s*Topic:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const people: { label: string; text: string }[] = [];
  const re = /(?:^|\n)\s*(Person\s+[A-Z])\s*:\s*\n?([\s\S]*?)(?=\n\s*Person\s+[A-Z]\s*:|$)/g;
  for (const m of stimulus.matchAll(re)) people.push({ label: m[1]!.trim(), text: m[2]!.trim() });
  return { topic, people };
}

/** Bỏ "Topic: " của stimulus và ghi chú "(Đề mới …)" đầu câu. */
export const topicOf = (content: QuestionSetContent | null | undefined) =>
  content?.stimulus?.value?.match(/^\s*Topic:\s*(.+)$/m)?.[1]?.trim() ?? null;

export const stripHtml = (html: string) => html.replace(/<\/(p|h\d|li|div)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/\n{3,}/g, '\n\n').trim();

export const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

// ---------------------------------------------------------------------
// Gom phiên bản theo chủ đề, trộn câu
// ---------------------------------------------------------------------

export interface TopicGroup {
  topic: MonthlyFocusTopic;
  versions: MonthlyFocusItem[];
}

/** Gom đề theo chủ đề (Listening 2-4, Reading 2-5); chủ đề nhiều sao lên trước, như website. */
export function groupByTopic(items: MonthlyFocusItem[], topics: MonthlyFocusTopic[]): TopicGroup[] {
  const byKey = new Map(topics.map((t) => [t.topicKey, t]));
  const groups = new Map<string, TopicGroup>();
  for (const item of items) {
    const topic = byKey.get(item.topicKey) ?? { topicKey: item.topicKey, title: item.title ?? item.topicKey };
    const group = groups.get(item.topicKey) ?? { topic, versions: [] };
    group.versions.push(item);
    groups.set(item.topicKey, group);
  }
  const list = [...groups.values()];
  for (const g of list) g.versions.sort((a, b) => (b.version ?? 0) - (a.version ?? 0));
  return list.sort((a, b) =>
    (b.topic.stars ?? 0) - (a.topic.stars ?? 0)
    || (a.topic.rank ?? 99) - (b.topic.rank ?? 99)
    || topics.indexOf(a.topic) - topics.indexOf(b.topic));
}

/** Trộn ổn định theo hạt (Auto shuffle): cùng hạt thì cùng thứ tự khi tải lại trang. */
export function seededShuffle<T>(list: T[], seed: number): T[] {
  const copy = list.slice();
  let s = seed >>> 0 || 1;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    const j = s % (i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/** "(Đề mới cập nhật tháng 10/2026) Where…" -> giữ nguyên, website hiện cả ghi chú. Chỉ cắt cho ô chọn câu. */
export const clip = (text: string, max = 60) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
