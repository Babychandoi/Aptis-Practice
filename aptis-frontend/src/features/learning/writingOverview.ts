/**
 * Tab Tổng quan của Mẹo học Writing.
 *
 * Không cùng cấu trúc thẻ với các Part (xem writingPartTips.ts) vì đây là bản đồ
 * làm bài: tiêu chí chấm, thời lượng từng Part, lỗi hay gặp và bộ từ nối.
 */

export interface ScoreCriterion {
  number: string;
  title: string;
  text: string;
  note: string;
}

export interface PartMapEntry {
  part: string;
  minutes: string;
  title: string;
  highlight: string;
  text: string;
  /** Ví dụ ngắn (Part 1) — Part khác dùng nút mở tab tương ứng. */
  example?: string;
  /** Khoá tab để nhảy sang, ví dụ 'part2'. */
  tabKey?: string;
}

export interface NumberedNote {
  number: string;
  title: string;
  text: string;
}

export interface LinkingGroup {
  label: string;
  words: string;
}

export const WRITING_OVERVIEW = {
  kicker: 'Aptis Writing · Bản đồ làm bài',
  headline: 'Không cần từ quá khó. Chỉ cần Đúng · Đủ · Đẹp.',
  lead:
    'Điểm Writing đến từ việc trả lời đúng yêu cầu, triển khai đủ ý và nối câu rõ ràng. '
    + 'Viết vừa đủ nhưng chính xác luôn hiệu quả hơn viết dài mà lạc đề.',
  formula: [
    { word: 'Đúng', note: 'bám sát đề' },
    { word: 'Đủ', note: 'trả lời hết ý' },
    { word: 'Đẹp', note: 'mạch lạc, ít lỗi' },
  ],
  keyRule: {
    title: 'Nguyên tắc quan trọng nhất',
    text:
      'Đề hỏi 3 ý thì bài phải trả lời đủ cả 3. Thiếu một ý là mất điểm Task Fulfilment dù câu '
      + 'chữ có hay.',
  },

  criteria: [
    {
      number: '01',
      title: 'Task Fulfilment',
      text: 'Đúng câu hỏi, đủ mọi ý, đúng kiểu văn bản và đúng văn phong formal hoặc informal.',
      note: 'Không lạc đề · Không bỏ sót ý',
    },
    {
      number: '02',
      title: 'Coherence',
      text: 'Ý đi theo trình tự logic, chia đoạn hợp lý và các câu có liên kết với nhau.',
      note: 'Rõ mở bài · Thân bài · Kết bài',
    },
    {
      number: '03',
      title: 'Grammar',
      text: 'Ít lỗi cơ bản, chia thì đúng, câu hoàn chỉnh và có sự đa dạng vừa đủ.',
      note: 'Câu đơn đúng tốt hơn câu khó sai',
    },
    {
      number: '04',
      title: 'Vocabulary',
      text: 'Dùng đúng từ, đúng ngữ cảnh, hạn chế lặp và biết diễn đạt một ý theo cách khác.',
      note: 'bad → disappointing · unpleasant',
    },
  ] satisfies ScoreCriterion[],

  partMap: [
    {
      part: 'Part 1',
      minutes: '3 phút',
      title: 'Text messages',
      highlight: 'Ngắn, tự nhiên, trả lời đủ',
      text: 'Không cần viết dài nhưng tránh câu trả lời chỉ có một từ.',
      example: "How are you? → I'm fine, thanks.",
    },
    {
      part: 'Part 2',
      minutes: '7 phút',
      title: 'Form filling',
      highlight: 'Khoảng 20-30 từ',
      text: 'Viết thành câu hoàn chỉnh, đúng trọng tâm và soát kỹ chính tả.',
      tabKey: 'part2',
    },
    {
      part: 'Part 3',
      minutes: '10 phút',
      title: 'Social questions',
      highlight: 'Answer · Support · Comment',
      text: 'Trả lời đủ 3 câu, mỗi câu có ý chính và lý do hoặc ví dụ ngắn.',
      tabKey: 'part3',
    },
    {
      part: 'Part 4',
      minutes: '30 phút',
      title: 'Two emails',
      highlight: 'Casual 50 từ · Formal 150 từ',
      text: 'Đổi giọng văn đúng người nhận và bắt buộc đưa giải pháp cho vấn đề.',
      tabKey: 'part4',
    },
  ] satisfies PartMapEntry[],

  mistakes: [
    {
      number: '01',
      title: 'Viết lan man',
      text: 'Gạch chân câu hỏi và yêu cầu solutions trước khi gõ.',
    },
    {
      number: '02',
      title: 'Câu rời rạc',
      text: 'Dùng từ nối và để ý sau kết nối tự nhiên với ý trước.',
    },
    {
      number: '03',
      title: 'Sai ngữ pháp cơ bản',
      text: 'Soát nhanh s/es, thì, mạo từ, viết hoa và dấu câu.',
    },
    {
      number: '04',
      title: 'Viết như nhắn tin',
      text: 'Tránh u, thx, pls, btw, gonna và viết tắt trong email formal.',
    },
    {
      number: '05',
      title: 'Chỉ học form',
      text: 'Dùng template làm khung, nhưng phải luyện thay ý theo từng đề.',
    },
  ] satisfies NumberedNote[],

  linking: [
    { label: 'Thêm ý', words: 'Moreover · Furthermore · In addition' },
    { label: 'Đối lập', words: 'However · On the other hand · Although' },
    { label: 'Kết quả', words: 'Therefore · As a result · Consequently' },
    { label: 'Ví dụ', words: 'For instance · Specifically · To illustrate' },
  ] satisfies LinkingGroup[],

  linkingWarning: 'Đừng nhồi từ nối. Chỉ dùng khi quan hệ giữa hai ý thực sự rõ ràng.',
};
