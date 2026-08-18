/**
 * Mẹo học Speaking, soạn tay theo tài liệu biên tập.
 *
 * Cấu trúc khác Writing: mỗi Part là một trang có khung nhịp (đánh số bước),
 * phrase bank, checklist và — tuỳ Part — ngân hàng câu hỏi theo nhóm chủ đề hoặc
 * bảng mốc thời gian từng giây.
 */

/** Một nhịp trong khung trả lời, ví dụ 01 Trả lời → "Nói rõ ý chính…". */
export interface SpeakingStep {
  number: string;
  title: string;
  note: string;
}

/** Một nhóm chủ đề Part 1 kèm câu hỏi thường gặp. */
export interface SpeakingPromptGroup {
  title: string;
  note: string;
  questions: string[];
}

/** Bảng mốc giây của một câu, ví dụ 0–7s → "Nêu bối cảnh". */
export interface SpeakingTimingColumn {
  label: string;
  rows: { range: string; text: string }[];
}

/** Khung câu kèm sơ đồ mũi tên và phrase bank riêng. */
export interface SpeakingFramework {
  tag: string;
  title: string;
  /** Các chặng nối bằng mũi tên khi hiển thị. */
  flow: string[];
  phrases: string[];
}

/** Bài mẫu dài kèm lời khuyên kéo dài ý. */
export interface SpeakingModelLab {
  tag: string;
  title: string;
  note?: string;
  model: string;
  extendTitle: string;
  extendText: string;
}

/** Thẻ hướng dẫn riêng cho câu 2 hoặc câu 3. */
export interface SpeakingDetailCard {
  tag: string;
  title: string;
  flow: string[];
  phrases: string[];
  model: string;
  /** Câu cứu khi chưa từng có trải nghiệm được hỏi. */
  rescueLabel?: string;
  rescueText?: string;
}

/** Mã viết tắt để nhớ khung, ví dụ SEE = See → Explain → Estimate. */
export interface SpeakingMemoryCode {
  code: string;
  expansion: string;
  text: string;
}

/** Cặp "tránh → nên dùng". */
export interface SpeakingFix {
  avoid: string;
  prefer: string;
}

/** Một mốc thời gian của dải so sánh Part 3. */
export interface SpeakingCompareStep {
  range: string;
  title: string;
  phrase: string;
}

/** Một khía cạnh để quét khi bí ý so sánh. */
export interface SpeakingDimension {
  title: string;
  question: string;
}

/** Một bài gộp trong thư viện Part 4. */
export interface SpeakingTopicEntry {
  title: string;
  /** Từ khoá để tìm kiếm — cũng là các cách đề bài có thể hỏi. */
  tags: string[];
  /** Bài mẫu chia đoạn, giữ nguyên cách ngắt đoạn của bản gốc. */
  paragraphs: string[];
}

/** Nhánh ghi ý trong một phút chuẩn bị. */
export interface SpeakingPrepBranch {
  code: string;
  title: string;
  text: string;
}

export interface SpeakingSection {
  key: string;
  label: string;
  eyebrow: string;
  /** Tiêu đề; phần trong <em> của bản gốc để ở `titleEm`. */
  title: string;
  titleEm: string;
  lead: string;
  /** Thẻ nhỏ bên phải tiêu đề: một hoặc nhiều cặp con số + chú thích. */
  badge?: { value: string; note: string } | { value: string; note: string }[];
  /** Nguyên tắc nổi bật (Tổng quan, Part 3). */
  principle?: { label: string; title: string; text: string };
  /** Bản đồ 4 Part (chỉ tab Tổng quan). */
  formatCards?: { part: string; title: string; time: string; text: string }[];
  formula?: { eyebrow: string; title: string; steps: SpeakingStep[]; example?: string };
  frameworks?: SpeakingFramework[];
  timing?: { title: string; note: string; columns: SpeakingTimingColumn[] };
  /** Dải mốc thời gian một hàng (Part 3) + các cặp tương phản gợi ý. */
  compareTrack?: {
    title: string;
    note: string;
    steps: SpeakingCompareStep[];
    contrastPairs: string[];
  };
  dimensions?: { title: string; note: string; items: SpeakingDimension[] };
  promptBank?: { title: string; note: string; groups: SpeakingPromptGroup[] };
  modelLab?: SpeakingModelLab;
  /** Khung mẫu ngắn một câu hai vế (Part 3). */
  compareModel?: { title: string; text: string; note: string };
  detailCards?: SpeakingDetailCard[];
  memoryCodes?: { title: string; items: SpeakingMemoryCode[] };
  fixes?: { title: string; items: SpeakingFix[] };
  phraseBank?: { title: string; phrases: string[] };
  /** Phrase bank chia nhóm chức năng (Part 4). */
  phraseLibrary?: { title: string; groups: { label: string; phrases: string[] }[] };
  /** Cảnh báo nổi bật đầu Part. */
  examNote?: { title: string; text: string };
  /** Kế hoạch ghi ý trong một phút chuẩn bị (Part 4). */
  prepPlan?: {
    title: string;
    note: string;
    branches: SpeakingPrepBranch[];
    example: { title: string; lines: { label: string; text: string }[]; note: string };
  };
  /** Chiến lược tái dùng một câu chuyện cho nhiều đề (Part 4). */
  topicWeave?: {
    title: string;
    note: string;
    steps: SpeakingStep[];
    exampleTitle: string;
    exampleText: string;
  };
  /** Ba hướng mở rộng để nói đủ thời lượng. */
  lengthen?: { title: string; items: { title: string; question: string; text: string }[] };
  /** Timeline chạy hết 2 phút (Part 4). */
  runTrack?: { title: string; note: string; steps: SpeakingCompareStep[] };
  /** Sáu ngân hàng câu chuyện đa năng. */
  storyBanks?: { title: string; note: string; items: SpeakingDimension[] };
  /** Thư viện bài gộp có tìm kiếm (Part 4). */
  topicLibrary?: { title: string; note: string; entries: SpeakingTopicEntry[] };
  checklist?: { title: string; items: string[] };
}

export const SPEAKING_SECTIONS: SpeakingSection[] = [
  {
    key: 'overview',
    label: 'Tổng quan',
    eyebrow: 'Aptis Speaking · Bản đồ làm bài',
    title: 'Nói có cấu trúc,',
    titleEm: 'không học thuộc',
    lead:
      'Aptis Speaking đánh giá khả năng trả lời đúng trọng tâm, phát triển ý rõ ràng và nói dễ '
      + 'hiểu. Hãy nhớ khung ý, sau đó dùng trải nghiệm và từ ngữ của chính bạn.',
    principle: {
      label: 'Nguyên tắc xuyên suốt',
      title: 'Rõ ý trước, hay sau',
      text: 'Mỗi ý chính nên có một lý do hoặc một ví dụ đủ cụ thể.',
    },
    formatCards: [
      {
        part: 'Part 1',
        title: 'Về bản thân',
        time: '3 câu · 30 giây/câu',
        text: 'Trả lời trực tiếp và thêm một chi tiết thật.',
      },
      {
        part: 'Part 2',
        title: 'Một bức ảnh',
        time: '3 câu · 45 giây/câu',
        text: 'Mô tả có chọn lọc rồi trả lời câu hỏi liên quan.',
      },
      {
        part: 'Part 3',
        title: 'Hai bức ảnh',
        time: '3 câu · 45 giây/câu',
        text: 'So sánh trực tiếp bằng điểm giống và khác.',
      },
      {
        part: 'Part 4',
        title: 'Ảnh & chủ đề trừu tượng',
        time: '1 phút chuẩn bị · 2 phút nói',
        text: 'Kết nối một câu chuyện với hai câu hỏi quan điểm.',
      },
    ],
    formula: {
      eyebrow: 'Công thức chung',
      title: 'Bốn nhịp để phát triển một câu trả lời',
      steps: [
        { number: '01', title: 'Trả lời', note: 'Nói rõ ý chính ngay từ câu đầu.' },
        { number: '02', title: 'Giải thích', note: 'Thêm một lý do cụ thể.' },
        { number: '03', title: 'Minh hoạ', note: 'Dùng chi tiết hoặc trải nghiệm thật.' },
        { number: '04', title: 'Khép ý', note: 'Kết luận ngắn hoặc mở rộng hợp lý.' },
      ],
    },
    phraseBank: {
      title: 'Cụm nối ý linh hoạt',
      phrases: [
        'Well, I’d say...',
        'The main reason is that...',
        'For example...',
        'Another point is that...',
        'Overall, I think...',
      ],
    },
    checklist: {
      title: 'Trước khi bắt đầu luyện',
      items: [
        'Trả lời đúng câu hỏi ngay từ câu đầu.',
        'Mỗi ý có lý do hoặc ví dụ.',
        'Nói với tốc độ tự nhiên, không cố kéo dài.',
        'Tự sửa lỗi nhỏ rồi tiếp tục, không dừng quá lâu.',
        'Luyện bằng từ khoá, không học thuộc cả bài.',
      ],
    },
  },
  {
    key: 'part1',
    label: 'Phần 1',
    eyebrow: 'Part 1 · 3 câu · 30 giây mỗi câu',
    title: 'Nói về chính bạn bằng',
    titleEm: 'chi tiết thật',
    lead:
      'Bạn sẽ gặp câu hỏi về gia đình, sở thích, học tập, công việc hoặc thói quen. Trong 30 '
      + 'giây, ba đến bốn câu rõ ràng tốt hơn một câu trả lời dài và lan man.',
    badge: { value: '45–60', note: 'từ là mục tiêu an toàn' },
    formula: {
      eyebrow: 'Khung 30 giây',
      title: 'Một ý chính, một lý do, một chi tiết',
      steps: [
        { number: '01', title: 'Câu trả lời', note: 'Chọn một ý chính.' },
        { number: '02', title: 'Lý do', note: 'Giải thích bằng because.' },
        { number: '03', title: 'Chi tiết cá nhân', note: 'Thêm ví dụ hoặc thói quen thật.' },
        { number: '04', title: 'Cảm nhận', note: 'Nêu lợi ích hoặc cảm xúc.' },
      ],
      example:
        'I prefer travelling with friends because it is more enjoyable. For example, we can share '
        + 'costs and create memories together. That’s why I rarely travel alone.',
    },
    promptBank: {
      title: 'Chuẩn bị ý, không học thuộc bài mẫu',
      note: 'Với mỗi nhóm, ghi sẵn hai trải nghiệm thật và vài từ khoá cá nhân.',
      groups: [
        {
          title: 'Sở thích & thời gian rảnh',
          note: 'Nói về điều bạn thích làm và lý do.',
          questions: [
            'What are your hobbies?',
            'What do you do in your free time?',
            'Do you prefer to relax alone or with friends?',
          ],
        },
        {
          title: 'Gia đình',
          note: 'Chọn một hoặc hai chi tiết nổi bật, không cần kể hết.',
          questions: [
            'Tell me about your family.',
            'Who do you spend most time with?',
            'Do you have any brothers or sisters?',
          ],
        },
        {
          title: 'Công việc & học tập',
          note: 'Nêu vai trò hiện tại, điều bạn thích và mục tiêu.',
          questions: [
            'What do you do?',
            'What do you like about your studies?',
            'Why are you learning English?',
          ],
        },
        {
          title: 'Du lịch',
          note: 'Dùng một chuyến đi thật để câu trả lời tự nhiên.',
          questions: [
            'Do you like travelling?',
            'Tell me about the last place you visited.',
            'Where would you like to go in the future?',
          ],
        },
        {
          title: 'Thời tiết',
          note: 'Kết nối thời tiết với cảm xúc hoặc hoạt động.',
          questions: [
            'What is the weather like today?',
            'What is your favourite season?',
            'What do you do when it rains?',
          ],
        },
        {
          title: 'Thói quen hằng ngày',
          note: 'Dùng trạng từ tần suất và mốc thời gian rõ.',
          questions: [
            'What do you do in the evening?',
            'Do you exercise regularly?',
            'What do you usually do at the weekend?',
          ],
        },
      ],
    },
    phraseBank: {
      title: 'Cụm câu dễ cá nhân hoá',
      phrases: [
        'My favourite ... is ...',
        'I usually ...',
        'I prefer ... because ...',
        'It helps me ...',
        'For example, I often ...',
        'That’s why ...',
      ],
    },
    checklist: {
      title: 'Câu trả lời đã tự nhiên chưa?',
      items: [
        'Chỉ chọn một ý chính thay vì liệt kê.',
        'Có một chi tiết đúng với bản thân.',
        'Hiện tại cho thói quen, quá khứ cho trải nghiệm.',
        'Không dùng nguyên bài mẫu nếu thông tin không đúng.',
      ],
    },
  },
  {
    key: 'part2',
    label: 'Phần 2',
    eyebrow: 'Part 2 · 1 ảnh · 45 giây mỗi câu',
    title: 'Mô tả ảnh',
    titleEm: 'có chọn lọc',
    lead:
      'Hãy nói điều bạn nhìn thấy trước, sau đó mới suy đoán. Chọn ba đến năm chi tiết nổi bật; '
      + 'bạn không cần mô tả mọi vật trong ảnh.',
    badge: { value: '3–5', note: 'chi tiết nổi bật là đủ' },
    formula: {
      eyebrow: 'Câu 1 · Mô tả ảnh',
      title: 'Đi từ toàn cảnh đến chi tiết',
      steps: [
        { number: '01', title: 'Tổng quan', note: 'Ai đang làm gì và ở đâu?' },
        { number: '02', title: 'Con người', note: 'Trang phục, hành động, biểu cảm.' },
        { number: '03', title: 'Vị trí', note: 'Tiền cảnh, hậu cảnh, trái và phải.' },
        { number: '04', title: 'Suy đoán', note: 'Dựa vào dấu hiệu có thể nhìn thấy.' },
        { number: '05', title: 'Khép ảnh', note: 'Nhận xét cụ thể về không khí.' },
      ],
    },
    frameworks: [
      {
        tag: 'Câu 1',
        title: 'Khung mô tả ảnh',
        flow: ['Tổng quan', 'Người & hành động', 'Vị trí', 'Suy đoán', 'Khép ảnh'],
        phrases: [
          'Looking at this picture, I can see ...',
          'In the foreground / background ...',
          'On the left / right ...',
          'They seem to be ...',
          'Judging by ..., they might be ...',
          'Overall, the scene looks ...',
        ],
      },
      {
        tag: 'Câu 2–3',
        title: 'Khung câu hỏi liên quan',
        flow: ['Quan điểm', 'Lý do', 'Ví dụ cá nhân', 'Mở rộng'],
        phrases: [
          'In my opinion ...',
          'The reason is that ...',
          'For example, when I ...',
          'In the past ..., but now ...',
          'Personally, I also think ...',
        ],
      },
    ],
    timing: {
      title: 'Mỗi câu có một nhịp nói riêng',
      note:
        'Đừng chờ đến khi bí ý mới thêm câu. Dùng các mốc thời gian để biết phần nào cần mở rộng.',
      columns: [
        {
          label: 'Câu 1 · Ảnh',
          rows: [
            { range: '0–7s', text: 'Nêu bối cảnh và hoạt động chung.' },
            { range: '7–22s', text: 'Chọn người/vật chính và hành động.' },
            { range: '22–34s', text: 'Thêm vị trí cùng 2 chi tiết rõ nhất.' },
            { range: '34–45s', text: 'Không khí, thời tiết hoặc suy đoán có căn cứ.' },
          ],
        },
        {
          label: 'Câu 2 · Trải nghiệm',
          rows: [
            { range: '0–8s', text: 'Trả lời trực tiếp: “One time I remember…”' },
            { range: '8–20s', text: 'Khi nào, ở đâu và cùng ai.' },
            { range: '20–34s', text: 'Một diễn biến hoặc chi tiết đáng nhớ.' },
            { range: '34–45s', text: 'Cảm xúc và lý do nó đáng nhớ.' },
          ],
        },
        {
          label: 'Câu 3 · Quan điểm',
          rows: [
            { range: '0–8s', text: 'Nói quan điểm ngay, không vòng vo.' },
            { range: '8–22s', text: 'Giải thích một lý do chính.' },
            { range: '22–35s', text: 'Đưa ví dụ gần gũi hoặc hệ quả.' },
            { range: '35–45s', text: 'Thêm ý thứ hai hoặc chốt ý.' },
          ],
        },
      ],
    },
    modelLab: {
      tag: "Model · adapt, don't memorise",
      title: 'Một ảnh, một mạch nói tự nhiên',
      note: 'Học cách nối ý, rồi thay người, nơi chốn và chi tiết theo đúng bức ảnh của bạn.',
      model:
        'This picture shows a family having a picnic in a park. In the foreground, two adults are '
        + 'sitting on a blanket with some food and drinks, while two children are playing nearby. '
        + 'In the background, there are trees and other visitors enjoying the sunny weather. '
        + 'Everyone looks relaxed, so they might be spending the weekend together. Overall, it '
        + 'seems like a pleasant place to spend time outdoors.',
      extendTitle: 'Khi còn thời gian:',
      extendText:
        'thêm because / which means / for example để giải thích một chi tiết vừa nói — không mở '
        + 'một câu chuyện mới.',
    },
    detailCards: [
      {
        tag: 'Câu 2 · personal story',
        title: 'Biến trải nghiệm thành một câu chuyện ngắn',
        flow: ['Trả lời', 'Khi & ở đâu', 'Điều xảy ra', 'Cảm xúc'],
        phrases: [
          'I remember a time when ...',
          'One experience that comes to mind is ...',
          'What I remember most is ...',
          'It was memorable because ...',
        ],
        model:
          'I remember having a picnic with close friends last summer. We went to a park near my '
          + 'city and everyone brought some food. After lunch, we played badminton and took photos '
          + 'together. I enjoyed it because we are normally busy with work and study.',
        rescueLabel: 'Nếu chưa từng trải nghiệm:',
        rescueText: "I haven't had exactly that experience, but something similar happened when ...",
      },
      {
        tag: 'Câu 3 · opinion',
        title: 'Nêu ý kiến rồi chứng minh bằng một ví dụ',
        flow: ['Quan điểm', 'Lý do', 'Ví dụ', 'Kết luận'],
        phrases: [
          'Personally, I think ...',
          'One important reason is that ...',
          'This means that ...',
          'Overall, I believe ...',
        ],
        model:
          'I think public parks are important, especially in large cities. They give people '
          + 'somewhere to exercise and relax without spending money. For example, families can take '
          + 'children there while older people can go for a walk. Overall, every neighbourhood '
          + 'should have some green space.',
      },
    ],
    memoryCodes: {
      title: 'Ba mã để không bí ý',
      items: [
        {
          code: 'SEE',
          expansion: 'See → Explain → Estimate',
          text: 'Câu 1: nhìn thấy gì, chi tiết nào nổi bật, suy đoán có căn cứ.',
        },
        {
          code: 'STORY',
          expansion: 'When → Where → What → Feeling',
          text: 'Câu 2: chọn một trải nghiệm thật hoặc gần giống.',
        },
        {
          code: 'PRE',
          expansion: 'Point → Reason → Example',
          text: 'Câu 3: ý kiến rõ ràng, lý do và ví dụ ngắn.',
        },
      ],
    },
    fixes: {
      title: 'Ba lỗi làm phần mô tả thiếu tự nhiên',
      items: [
        { avoid: 'I can see, a woman is walking.', prefer: 'I can see a woman walking.' },
        {
          avoid: 'This is a nice picture.',
          prefer: 'Overall, the scene looks calm and friendly.',
        },
        { avoid: 'Kể mọi chi tiết', prefer: 'Chọn 3–5 chi tiết mạnh' },
      ],
    },
    checklist: {
      title: 'Tả đúng trước, suy đoán sau',
      items: [
        'Dùng hiện tại tiếp diễn cho hành động.',
        'Nêu vị trí để người nghe dễ hình dung.',
        'Dùng might, may, could khi suy đoán.',
        'Không biến suy đoán thành câu chuyện phức tạp.',
      ],
    },
  },
  {
    key: 'part3',
    label: 'Phần 3',
    eyebrow: 'Part 3 · 2 ảnh · 45 giây mỗi câu',
    title: 'So sánh,',
    titleEm: 'không mô tả riêng lẻ',
    lead:
      'Nêu chủ đề chung, một điểm giống và hai đến ba điểm khác rõ nhất. So sánh trực tiếp hai ảnh '
      + 'thay vì kể hết ảnh thứ nhất rồi mới chuyển sang ảnh thứ hai.',
    principle: {
      label: 'Nhịp so sánh',
      title: 'Giống 1 · Khác 2–3',
      text: 'Chỉ chọn những điểm nhìn thấy rõ và dễ diễn đạt.',
    },
    formula: {
      eyebrow: 'Khung 45 giây',
      title: 'Đặt hai ảnh trong cùng một câu',
      steps: [
        { number: '01', title: 'Chủ đề chung', note: 'Hai ảnh cùng nói về điều gì?' },
        { number: '02', title: 'Điểm giống', note: 'Chọn một nét chung rõ nhất.' },
        { number: '03', title: 'Điểm khác', note: 'So sánh trực tiếp hai hoặc ba khía cạnh.' },
        { number: '04', title: 'Kết luận', note: 'Nêu lựa chọn hoặc cảm nhận cá nhân.' },
      ],
    },
    compareTrack: {
      title: 'Đặt hai ảnh cạnh nhau ngay từ đầu',
      note:
        'Đừng tách thành hai bài miêu tả. Hãy dùng một tiêu chí để nối hai ảnh trong cùng một câu.',
      steps: [
        { range: '0–5s', title: 'Chủ đề chung', phrase: 'Both pictures show…' },
        { range: '5–18s', title: 'Ảnh trái', phrase: 'In the left-hand picture…' },
        { range: '18–31s', title: 'Ảnh phải', phrase: 'Whereas in the right-hand picture…' },
        { range: '31–45s', title: 'So sánh & kết', phrase: 'The main difference is…' },
      ],
      contrastPairs: [
        'crowded ↔ quiet',
        'indoors ↔ outdoors',
        'together ↔ alone',
        'formal ↔ casual',
      ],
    },
    dimensions: {
      title: 'Quét nhanh sáu khía cạnh',
      note: 'Chọn hai hoặc ba khía cạnh mạnh nhất, không cần dùng cả sáu.',
      items: [
        { title: 'Hành động', question: 'Họ đang làm gì?' },
        { title: 'Địa điểm', question: 'Không gian trong nhà hay ngoài trời?' },
        { title: 'Số lượng', question: 'Có bao nhiêu người hoặc vật?' },
        { title: 'Trang phục', question: 'Trang trọng, thường ngày hay thể thao?' },
        { title: 'Biểu cảm', question: 'Không khí sôi động hay yên tĩnh?' },
        { title: 'Thời tiết', question: 'Nắng, mưa hay thời điểm trong ngày?' },
      ],
    },
    compareModel: {
      title: 'Một câu, hai vế so sánh',
      text:
        'In the left-hand picture, several people are relaxing on a crowded beach, whereas in the '
        + 'right-hand picture, one person is enjoying a quiet view.',
      note: 'Dùng cùng cấu trúc ngữ pháp ở hai vế để câu dễ kiểm soát.',
    },
    modelLab: {
      tag: 'Model · comparison',
      title: 'Mẫu đủ thời lượng, không kể ảnh rời rạc',
      model:
        'Both pictures show people studying, but the situations are quite different. In the '
        + 'left-hand picture, several students are sitting around a table in what looks like a '
        + 'library. They seem to be discussing their work together. In contrast, the right-hand '
        + 'picture shows one person studying alone at home on a laptop. Both methods can be useful, '
        + 'but the first one is more social, whereas the second is probably more flexible and '
        + 'independent.',
      extendTitle: 'Kéo dài đúng cách:',
      extendText:
        'chọn một trục so sánh nữa — place, number of people, atmosphere hoặc activity — rồi nói '
        + 'cả hai vế.',
    },
    detailCards: [
      {
        tag: 'Câu 2 · compare',
        title: 'So sánh lợi thế theo từng cặp',
        flow: ['Điểm chung', 'Lợi thế A', 'Lợi thế B', 'Kết luận'],
        phrases: [
          'In both cases ...',
          'On the other hand ...',
          'Compared with ...',
          'More suitable for ...',
        ],
        model:
          'Studying with other people can be useful because students can exchange ideas. On the '
          + 'other hand, studying online offers more flexibility because you can choose your own '
          + 'schedule. Group study is better for interaction, whereas online learning is more '
          + 'convenient.',
      },
      {
        tag: 'Câu 3 · choose / speculate',
        title: 'Chọn một bên, rồi cân bằng ý kiến',
        flow: ['Lựa chọn', 'Lý do', 'Đối chiếu', 'Ví dụ'],
        phrases: [
          "If I had to choose, I'd ...",
          'They might / may be ...',
          'That said, ...',
          'It depends on ...',
        ],
        model:
          'If I had to choose, I would prefer studying with other people because I stay motivated '
          + 'when everyone around me is working. Online study is convenient for busy people, but I '
          + 'get distracted at home. For me, a small group would be more effective.',
      },
    ],
    fixes: {
      title: 'Bốn lỗi làm phần so sánh mất điểm',
      items: [
        {
          avoid: 'Picture one is ... Picture two is ...',
          prefer: 'Both pictures show ..., but while the first ..., the second ...',
        },
        { avoid: 'more easier / more better', prefer: 'easier / better' },
        {
          avoid: 'Chọn một bên nhưng không giải thích',
          prefer: 'Lựa chọn + because + ví dụ hoặc hệ quả',
        },
        { avoid: 'Dùng “maybe” trong mọi câu', prefer: 'may, might, could, seem, probably' },
      ],
    },
    phraseBank: {
      title: 'Từ nối đúng chức năng',
      phrases: [
        'Both pictures are about ...',
        'One thing they have in common is that ...',
        'The most noticeable difference is ...',
        'In the left-hand picture ..., whereas ...',
        'In contrast ...',
        'Overall, I would prefer ... because ...',
      ],
    },
  },
  {
    key: 'part4',
    label: 'Phần 4',
    eyebrow: 'Part 4 · 1 ảnh gợi ý · 1 phút chuẩn bị · 2 phút nói',
    title: 'Lập ý nhanh,',
    titleEm: 'kết nối ba câu',
    lead:
      'Sau khi xem ảnh và ba câu hỏi cùng chủ đề, chỉ ghi từ khoá trong phút chuẩn bị. Câu đầu '
      + 'thường phù hợp với một câu chuyện; hai câu sau cần quan điểm, lý do và ví dụ.',
    badge: [
      { value: '35–45s', note: 'Câu chuyện' },
      { value: '30–35s', note: 'Mỗi câu quan điểm' },
    ],
    examNote: {
      title: 'Ưu tiên ba câu hỏi:',
      text:
        'ảnh ở Part 4 chỉ giúp gợi chủ đề. Đừng dành lượt nói để mô tả ảnh; hãy dùng nó để tìm ý '
        + 'cho câu chuyện và quan điểm của bạn.',
    },
    prepPlan: {
      title: 'Ghi ý theo từng câu hỏi',
      note: 'Chỉ viết bốn đến năm từ khoá cho mỗi nhánh.',
      branches: [
        {
          code: 'Q1',
          title: 'Câu chuyện',
          text: 'Khi nào? Ở đâu? Với ai? Chuyện gì xảy ra? Kết quả?',
        },
        { code: 'Q2', title: 'Quan điểm', text: 'Ý kiến → Lý do → Một ví dụ cụ thể.' },
        {
          code: 'Q3',
          title: 'Mở rộng',
          text: 'Ý kiến → Lý do → So sánh hoặc góc nhìn xã hội.',
        },
      ],
      example: {
        title: 'Ví dụ ghi ý · Learning new things',
        lines: [
          { label: 'Q1', text: 'cooking · university · friend taught me · difficult → improve' },
          { label: 'Q2', text: 'nervous · mistakes · proud · confidence' },
          { label: 'Q3', text: 'jobs change · technology · opportunities' },
        ],
        note: 'Chỉ ghi keyword; đừng viết cả câu trong một phút chuẩn bị.',
      },
    },
    topicWeave: {
      title: 'Một câu chuyện, ba hướng trả lời',
      note:
        'Không học 16 bài tách rời. Chuẩn bị vài “hạt nhân” có thể đổi trọng tâm theo câu hỏi.',
      steps: [
        {
          number: '01',
          title: 'Sự kiện',
          note: 'Chuyến đi, dự án nhóm, một lần mua đồ hoặc giúp ai đó.',
        },
        {
          number: '02',
          title: 'Chi tiết neo',
          note: 'Thời gian · nơi chốn · người cùng tham gia · một khó khăn.',
        },
        {
          number: '03',
          title: 'Đổi ống kính',
          note: 'Q1 kể chuyện · Q2 nêu lợi ích · Q3 so sánh quá khứ, hiện tại hoặc xã hội.',
        },
      ],
      exampleTitle: 'Ví dụ “chuyến đi cùng bạn”:',
      exampleText:
        'có thể trả lời travel, teamwork, planning, spending money, solving a problem hoặc '
        + 'friendship. Giữ sự kiện, thay lý do và bài học để khớp câu hỏi.',
    },
    frameworks: [
      {
        tag: 'Story',
        title: 'Khung kể chuyện',
        flow: ['Mở bài', 'Bối cảnh', 'Diễn biến', 'Kết quả', 'Bài học'],
        phrases: [],
      },
      {
        tag: 'Opinion',
        title: 'Khung nêu quan điểm',
        flow: ['Quan điểm', 'Lý do', 'Ví dụ', 'So sánh hoặc mở rộng'],
        phrases: [],
      },
    ],
    lengthen: {
      title: 'Mở rộng theo “chi tiết → ảnh hưởng → suy ngẫm”',
      items: [
        {
          title: 'Chi tiết',
          question: 'What happened exactly?',
          text: 'Thêm một việc cụ thể thay vì một tính từ chung chung.',
        },
        {
          title: 'Ảnh hưởng',
          question: 'Why did it matter?',
          text: 'Nói điều đó thay đổi cảm xúc, lựa chọn hoặc kết quả ra sao.',
        },
        {
          title: 'Suy ngẫm',
          question: 'What did you learn?',
          text: 'Chốt bằng điều bạn sẽ làm khác đi hoặc quan điểm hiện tại.',
        },
      ],
    },
    runTrack: {
      title: 'Đi qua cả ba câu hỏi trong một lượt nói',
      note: 'Trả lời đủ ba câu quan trọng hơn một câu kết thật dài.',
      steps: [
        {
          range: '0–10s',
          title: 'Mở chủ đề',
          phrase: 'One experience that comes to mind is ...',
        },
        {
          range: '10–45s',
          title: 'Q1 · Câu chuyện',
          phrase: 'When → Why → What happened → Result',
        },
        { range: '45–75s', title: 'Q2 · Cảm xúc', phrase: 'As for how I felt about it ...' },
        { range: '75–110s', title: 'Q3 · Góc nhìn chung', phrase: 'Hai lý do + một ví dụ' },
        { range: '110–120s', title: 'Khép ý nếu còn thời gian', phrase: 'So overall ...' },
      ],
    },
    phraseLibrary: {
      title: 'Chọn câu đúng chức năng, đừng lặp “for question two”',
      groups: [
        {
          label: 'Bắt đầu & kể chuyện',
          phrases: [
            'This happened when ...',
            'At first, ...',
            'After a while, ...',
            'Eventually, ...',
          ],
        },
        {
          label: 'Cảm xúc & suy ngẫm',
          phrases: [
            'I was quite nervous because ...',
            'Gradually, I became ...',
            'Looking back, I feel ...',
            'It gave me a sense of ...',
          ],
        },
        {
          label: 'Chuyển ý',
          phrases: [
            'As for how I felt, ...',
            'More generally, ...',
            'Looking at the wider issue, ...',
          ],
        },
        {
          label: 'Quan điểm & cân bằng',
          phrases: [
            'From my point of view, ...',
            'Another point is that ...',
            'That said, ...',
            'It depends to some extent on ...',
          ],
        },
      ],
    },
    modelLab: {
      tag: 'Model · reuse one story',
      title: 'Một câu chuyện, ba câu trả lời liền mạch',
      note: 'Mẫu này để học khung chuyển ý; hãy thay chi tiết bằng trải nghiệm của chính bạn.',
      model:
        'One experience that comes to mind is learning how to cook when I started university. '
        + 'Before that, my parents usually prepared meals, so I only knew how to make instant '
        + 'noodles. A friend taught me a few simple dishes, and although I made mistakes at first, '
        + 'I became more confident after practising. As for how I felt, I was initially nervous '
        + 'about wasting food, but I felt proud when I prepared a good meal for friends. More '
        + 'generally, I think adults should continue learning because technology and jobs change '
        + 'quickly. Learning also makes people more confident and independent.',
      extendTitle: 'Khi bí ý, quét 5 hướng:',
      extendText:
        'People · Past · Present · Reason · Example. Mỗi hướng thêm một chi tiết liên quan, không '
        + 'nhắc lại câu cũ.',
    },
    storyBanks: {
      title: 'Sáu ngân hàng câu chuyện đa năng',
      note: 'Giữ khung sự kiện, nhưng luôn đổi trọng tâm để trả lời đúng đề.',
      items: [
        {
          title: 'Du lịch & địa điểm',
          question: 'Chuyến đi, thành phố mới, kỳ nghỉ, toà nhà hoặc thời tiết xấu.',
        },
        {
          title: 'Làm việc nhóm & giúp đỡ',
          question: 'Vai trò, khó khăn, cách phối hợp và kết quả.',
        },
        {
          title: 'Nỗ lực & thành tích',
          question: 'Mục tiêu, áp lực thời gian, hành động và thành quả.',
        },
        {
          title: 'Thử thách & tình huống khó',
          question: 'Sự việc, cảm xúc, cách xử lý và bài học.',
        },
        {
          title: 'Bạn bè & giải trí',
          question: 'Một buổi gặp gỡ, lễ hội, trận đấu hoặc khoảnh khắc vui.',
        },
        { title: 'Đồ vật & mua sắm', question: 'Món đồ, lựa chọn, quyết định mua và cảm nhận.' },
      ],
    },
    phraseBank: {
      title: 'Câu chuyển giúp ba phần liền mạch',
      phrases: [
        'One experience that comes to mind is ...',
        'It happened when ...',
        'What made it memorable was ...',
        'Looking back, I realised that ...',
        'Moving on to the second question ...',
        'Compared with the past ...',
      ],
    },
    topicLibrary: {
      title: '16 bài gộp để lấy ý tưởng',
      note:
        'Tìm theo chủ đề, mở một bài và rút ra bốn đến năm ý. Không học thuộc nguyên văn: hãy thay '
        + 'người, nơi chốn và chi tiết bằng trải nghiệm của bạn.',
      entries: [
        {
          title: 'A difficult question / job interview / challenge / achievement',
          tags: [
            'difficult question',
            'job interview',
            'challenge you have faced',
            'challenge you faced',
          ],
          paragraphs: [
            'I would like to talk about a time when I received a difficult question during a job '
            + 'interview.',
            'It happened about a year ago when I applied for a part-time position at a small '
            + 'company. Before the interview, I had prepared answers about my education, strengths, '
            + 'and previous experience, so I felt quite confident. However, near the end of the '
            + 'interview, the manager suddenly asked me, "What is your biggest weakness, and how '
            + 'are you trying to improve it?"',
            'At that moment, I felt nervous because I did not want to make a bad impression. My '
            + 'mind went blank for a few seconds, and I was not sure how to answer. However, I took '
            + 'a deep breath and decided to be honest. I explained that I sometimes paid too much '
            + 'attention to small details, which could slow me down when completing a task. I also '
            + 'said that I was working on this weakness by setting priorities and managing my time '
            + 'more effectively.',
            'After listening to my answer, the interviewer asked me a follow-up question about '
            + 'teamwork. By then, I felt much more relaxed and confident. A few days later, I was '
            + 'delighted to learn that I had been offered the job. For me, this was not only the '
            + 'result of a successful interview but also an important personal achievement because '
            + 'I had spent weeks preparing for the position and improving my communication skills.',
            'Looking back, I learned several valuable lessons from this experience. It taught me '
            + 'that difficult questions are not only used to test our knowledge but also to see how '
            + 'we react under pressure. I also realized that good preparation and a positive '
            + 'attitude can help us overcome challenges and achieve our goals. Since then, I have '
            + 'become much more confident when facing interviews, unexpected questions, and other '
            + 'difficult situations in life.',
          ],
        },
        {
          title: 'Learning English / learning a new skill / English course / great effort',
          tags: ['learning english', 'learned a new skill', 'learn a new skill', 'english course'],
          paragraphs: [
            'I would like to talk about a time when I learned a new skill. The skill was speaking '
            + 'English more confidently. In the past, I could read and understand English quite '
            + 'well, but I was not confident when speaking. Every time I had to speak English in '
            + 'front of other people, I felt nervous and worried about making grammar mistakes.',
            'To improve this skill, I decided to join an English course after work. At first, it '
            + 'was quite difficult for me because I had to study in the evening, when I was already '
            + 'tired. In class, the teacher asked us to speak a lot, record our answers, and give '
            + 'comments to each other. I felt embarrassed at the beginning because my pronunciation '
            + 'was not very good. However, I did not give up.',
            'Every day, I spent about thirty minutes practicing. I watched short English videos, '
            + 'repeated useful sentences, and tried to answer common speaking questions. I also '
            + 'wrote down new words and used them in my own answers. After a few weeks, I noticed '
            + 'that I could speak more naturally and organize my ideas better.',
            'The biggest result was that I became less afraid of speaking English. I still made '
            + 'mistakes, but I could continue speaking instead of stopping completely. I felt very '
            + 'proud because this improvement came from my own effort.',
            'This experience taught me that learning a new skill is often more difficult than '
            + 'people expect. Many people want quick results, but real improvement usually takes '
            + 'time and consistent practice. In my opinion, patience and determination are just as '
            + 'important as talent. If we keep practicing and stay motivated, we can gradually '
            + 'achieve our goals.',
          ],
        },
        {
          title: 'A long trip / holiday / vacation / new city / place you travelled to',
          tags: ['long trip', 'holiday', 'vacation', 'new city'],
          paragraphs: [
            'I would like to talk about a long trip I had with my friends. It was a trip to Da '
            + 'Nang, a beautiful coastal city in Vietnam. We went there during our summer holiday '
            + 'because we wanted to relax after a long period of studying and working.',
            'The trip was quite long because we traveled from Hanoi to Da Nang by train. It took '
            + 'many hours, so at first I felt a little tired. However, I was also very excited '
            + 'because it was my first time visiting that city. Before the trip, we spent a lot of '
            + 'time planning everything, such as booking tickets, finding a hotel, choosing places '
            + 'to visit, and preparing clothes.',
            'When we arrived, the weather was nice and the city looked very clean and modern. We '
            + 'visited My Khe Beach, Dragon Bridge, and Ba Na Hills. My favorite moment was walking '
            + 'along the beach in the evening. The air was fresh, the view was peaceful, and I felt '
            + 'completely relaxed. We also tried many local dishes, especially seafood and Mi Quang. '
            + 'They were delicious and quite different from the food in my hometown.',
            'During the trip, we took many photos, laughed a lot, and shared many interesting '
            + 'stories. It was not only a holiday but also a chance for us to become closer.',
            'This trip was memorable because it helped me reduce stress and enjoy life more. It '
            + 'also reminded me of the importance of taking a break from daily responsibilities and '
            + 'spending quality time with friends. In my opinion, traveling is one of the best ways '
            + 'to learn about new places, different lifestyles, and even ourselves. That is why I '
            + 'would love to visit Da Nang again in the future.',
          ],
        },
        {
          title: 'Got lost / bad weather / in a hurry',
          tags: ['got lost', 'bad weather', 'encountered bad weather', 'were in a hurry'],
          paragraphs: [
            'I would like to talk about a time when I got lost during a trip. It happened when I '
            + 'visited a new city with my friends. We planned to go to a famous local market in the '
            + 'afternoon, but unfortunately, the weather suddenly became very bad. It started '
            + 'raining heavily, and the sky became dark.',
            'At first, we thought it was not a big problem, so we continued walking. However, after '
            + 'a while, we realized that we had taken the wrong road. Our phones had low battery, '
            + 'and the internet connection was not stable because of the rain. I felt quite worried '
            + 'because we did not know exactly where we were, and we also had to hurry back to the '
            + 'hotel before dinner.',
            'I tried to stay calm and asked a local person for help. Luckily, he was very kind. He '
            + 'showed us the correct direction and told us which bus we should take. We followed '
            + 'his advice and finally found our way back. Although our clothes were wet and we were '
            + 'quite tired, we felt relieved when we arrived safely.',
            'Looking back, it was a stressful but memorable experience. I learned that unexpected '
            + 'problems can happen at any time, especially when we travel to a new place. Since '
            + 'then, I have learned to keep my phone fully charged, save the hotel address, and '
            + 'check the weather forecast before going out. Good preparation is important, but I '
            + 'also realized that staying calm is just as important. This experience made me feel '
            + 'more confident about dealing with similar situations in the future.',
          ],
        },
        {
          title: 'Helped someone / teamwork / busy time / effort',
          tags: ['helped someone', 'worked in a team', 'work in a team', 'teamwork'],
          paragraphs: [
            'I would like to talk about a time when I helped someone. It happened when one of my '
            + 'classmates had difficulty finishing a group presentation at university. We had to '
            + 'prepare a presentation about technology, and the deadline was very close. '
            + 'Unfortunately, one member of our group was sick for a few days, so he could not '
            + 'complete his part on time.',
            'At that time, I was also very busy with my own work, but I decided to help him because '
            + 'I knew the presentation was important for the whole group. First, I asked him what '
            + 'problems he was facing. He told me that he did not know how to organize his ideas '
            + 'clearly. Then I helped him divide his part into three smaller sections: '
            + 'introduction, main points, and conclusion. I also helped him correct some grammar '
            + 'mistakes and choose better examples.',
            'We worked together in the evening for several hours. It was quite tiring, but I felt '
            + 'happy because we were making progress. The next day, our group practiced together, '
            + 'and the presentation went quite well. Our teacher gave us positive feedback and said '
            + 'that our ideas were clear.',
            'I felt proud because I had helped both my friend and my team. This experience taught '
            + 'me that teamwork is not only about completing my own tasks. It is also about '
            + 'supporting other people when they face difficulties. In my opinion, a successful '
            + 'team is not made up of perfect individuals but of people who are willing to '
            + 'cooperate and help each other. Since then, I have believed that helping others often '
            + 'leads to better results for everyone.',
          ],
        },
        {
          title: 'Visited a friend / met a new friend / were helped / laughed with a friend',
          tags: [
            'visited a friend',
            'met a new friend',
            'were helped',
            'laughed out loud with a friend',
          ],
          paragraphs: [
            'I would like to talk about a time when I met some new people during a visit to a '
            + 'friend in another city. It happened last year when one of my close friends moved to '
            + 'another city for work. We had not met each other for a long time, so I decided to '
            + 'visit him on the weekend.',
            'At first, I felt excited but also a little nervous because I was not familiar with '
            + 'that city. When I arrived at the bus station, I did not know which direction to go. '
            + 'I tried using Google Maps, but I still felt confused because there were many small '
            + 'streets. Luckily, my friend came to pick me up. He helped me carry my bag and took '
            + 'me to his apartment.',
            'During my visit, he introduced me to some of his new friends. At first, I was quite '
            + 'shy, but they were friendly and easy to talk to. In the evening, we went to a small '
            + 'restaurant and had dinner together. We talked about our old memories, our school '
            + 'life, and funny things that had happened in the past. There was one story about our '
            + 'university days that made all of us laugh out loud. It was such a simple moment, but '
            + 'I felt very happy.',
            'The next day, my friend showed me around the city. We visited a park, took some '
            + 'photos, and tried local food. The trip was short, but it was very meaningful.',
            'This experience reminded me that friendship is very important. Even when people live '
            + 'far away from each other, spending time together can help them stay connected and '
            + 'strengthen their relationship. I also realized that meeting new people can be an '
            + 'enjoyable experience because it gives us a chance to learn different perspectives '
            + 'and make new memories. That is why this visit remains one of my favorite '
            + 'experiences.',
          ],
        },
        {
          title: "Saved money / wanted to buy something but couldn't / many choices",
          tags: [
            'saved money',
            "wanted to buy something but couldn't",
            "wanted something but couldn't get it",
            "wanted something but couldn't",
          ],
          paragraphs: [
            'I would like to talk about a time when I wanted to buy something but could not get it '
            + 'immediately. The thing I wanted was a new laptop. At that time, my old laptop was '
            + 'slow and sometimes stopped working when I was studying or doing my projects. I '
            + 'really needed a better one, but the laptop I liked was quite expensive.',
            'At first, I felt disappointed because I did not have enough money. I also had many '
            + 'choices, so I did not know which laptop was the best for me. Some laptops had good '
            + 'performance but were too expensive. Others were cheaper but not powerful enough. '
            + 'After thinking carefully, I decided not to buy one immediately. Instead, I made a '
            + 'plan to save money for a few months.',
            'I reduced unnecessary spending, such as eating out too often or buying small things '
            + 'online. I also compared different models and watched review videos to understand '
            + 'which laptop was suitable for my needs. It was not easy because sometimes I wanted '
            + 'to give up and buy a cheaper one. However, I tried to be patient.',
            'After several months, I finally saved enough money and bought a laptop that was both '
            + 'powerful and affordable. I felt extremely happy and proud because I had achieved my '
            + 'goal by myself.',
            'This experience taught me an important lesson about money management. I learned that '
            + 'making a good decision often requires patience and careful planning. In my opinion, '
            + 'people sometimes spend money too quickly because they focus on what they want at the '
            + 'moment instead of thinking about their long-term needs. Since then, I have tried to '
            + 'be more responsible with my spending and avoid making impulsive purchases.',
          ],
        },
        {
          title: 'Planning something / many options / busy time / hurried',
          tags: [
            'spent a lot of time planning',
            'planning something',
            'many options',
            'many choices',
          ],
          paragraphs: [
            'I would like to talk about a time when I spent a lot of time planning something. It '
            + 'was a birthday party for one of my close friends. Our group wanted to make it a '
            + 'surprise, so we had to prepare everything carefully without letting him know.',
            'At first, it seemed simple, but later we realized that there were many things to '
            + 'decide. We had to choose a restaurant, buy a birthday cake, prepare a gift, invite '
            + 'friends, and decide the time. There were also many options, so it was difficult to '
            + 'make a final decision. Some people wanted to eat hotpot, while others preferred '
            + 'barbecue. Some restaurants were nice but too expensive, and some were cheap but far '
            + 'away.',
            'I was responsible for making the plan, so I felt quite busy. I created a group chat, '
            + "collected everyone's opinions, compared prices, and booked a table. On the day of "
            + 'the party, I was in a hurry because I had to pick up the cake after work and arrive '
            + 'at the restaurant before my friend came. Luckily, everything went smoothly.',
            'When my friend arrived and saw the surprise, he looked very happy. Everyone sang a '
            + 'birthday song, took photos, and enjoyed the meal together. I felt tired but very '
            + 'satisfied.',
            'This experience taught me that good planning plays an important role in the success of '
            + 'any event. It also showed me that having many options can sometimes make decisions '
            + 'more difficult rather than easier. In my opinion, the best approach is to listen to '
            + 'different opinions, consider the advantages and disadvantages of each option, and '
            + 'then make a practical decision. Since then, I have become more confident when '
            + 'organizing activities and managing my time.',
          ],
        },
        {
          title: 'Activity for children / elderly people / volunteering / helping someone',
          tags: [
            'activity for children',
            'elderly people and children',
            'volunteer',
            'volunteering',
          ],
          paragraphs: [
            'I would like to talk about a time when I participated in an activity for children. It '
            + 'was a volunteer event organized by my university. We visited a small community '
            + 'center and spent one day helping children with their studies and organizing games '
            + 'for them.',
            'Before the event, I felt both excited and nervous. I had never joined this kind of '
            + 'activity before, so I was not sure whether I could communicate well with the '
            + 'children. My team prepared some simple English games, small gifts, and colorful '
            + 'pictures. We wanted the children to learn and have fun at the same time.',
            'When we arrived, the children looked shy at first, but after a few minutes, they '
            + 'became more active. I helped a small group practice basic English words about '
            + 'animals, colors, and food. Then we played some games together. Some children made '
            + 'mistakes, but they laughed and tried again. Their energy made me feel very happy.',
            'In the afternoon, we also visited some elderly people who lived near the center and '
            + 'gave them small gifts. Although the gifts were not expensive, they smiled and '
            + 'thanked us warmly. That moment made me feel that our work was meaningful.',
            'After the event, I was quite tired, but I felt proud and grateful. I realized that '
            + 'helping other people does not always require a lot of money. Sometimes, spending '
            + 'time, showing care, and sharing knowledge can be just as valuable. In my opinion, '
            + 'volunteer activities benefit not only the people who receive help but also the '
            + 'volunteers themselves because they learn important life lessons and develop a '
            + 'stronger sense of responsibility. This experience encouraged me to join more '
            + 'volunteer activities in the future.',
          ],
        },
        {
          title: 'Sports match / music festival / amusement park / funny moment with friends',
          tags: ['sports match', 'music festival', 'amusement park', 'funny moment with friends'],
          paragraphs: [
            'I would like to talk about a time when I went to a sports match with my friends. It '
            + 'was a football match between two local teams. One of my friends invited me because '
            + 'he had extra tickets, and I decided to go even though I was not a huge football fan.',
            'When we arrived at the stadium, I was surprised by the atmosphere. There were many '
            + 'people wearing team shirts, waving flags, and singing loudly. The energy was '
            + 'amazing. At first, I did not understand all the rules clearly, but my friend '
            + 'explained them to me. After a while, I became more interested in the game.',
            'The funniest moment happened when one of my friends celebrated too early. He thought '
            + 'our team had scored a goal, so he jumped up and shouted loudly. However, a few '
            + 'seconds later, we realized that the ball had missed the goal. Everyone around us '
            + 'laughed, and we laughed out loud too. My friend felt a little embarrassed, but it '
            + 'became the most memorable part of the day.',
            'In the end, our team won the match, so the atmosphere became even more exciting. After '
            + 'the game, we went to a small restaurant to have dinner and talk about the match.',
            'This experience was special because I had a lot of fun with my friends. It taught me '
            + 'that sometimes the most enjoyable moments are not carefully planned. In my opinion, '
            + 'unexpected situations often become the memories that people remember the longest. '
            + 'Although the football match was exciting, the funny moment with my friends was what '
            + 'made the day truly memorable.',
          ],
        },
        {
          title: 'Tall building / old building / work of art / museum',
          tags: ['tall building', 'old building', 'work of art', 'museum'],
          paragraphs: [
            'I would like to talk about a time when I visited an old building. It was a historical '
            + 'museum in Hanoi. I went there with two friends on a weekend because we wanted to do '
            + 'something different instead of just going to a cafe or watching a movie.',
            'When we arrived, I was impressed by the building. It was not very modern, but it had a '
            + 'classic and peaceful beauty. The walls, windows, and decorations made me feel like I '
            + 'was looking at a part of the past. Inside the museum, there were many old photos, '
            + 'traditional objects, and works of art. Some paintings showed daily life in Vietnam '
            + 'many years ago, while some objects were related to history and culture.',
            'At first, I thought the visit might be boring, but I was wrong. The more I looked '
            + 'around, the more interested I became. One painting especially caught my attention. '
            + 'It showed a small village with farmers working in the field. The colors were simple, '
            + 'but the feeling was very warm and peaceful.',
            'My friends and I took many photos and discussed what we saw. We also read the '
            + 'information on the walls to understand the meaning behind each object. After the '
            + 'visit, I felt that I had learned something useful about Vietnamese culture.',
            'This experience was memorable because it completely changed my opinion about museums '
            + 'and old buildings. Before that visit, I thought they were mainly places for history '
            + 'lovers, but I realized that they can be interesting for anyone who wants to learn '
            + 'something new. In my opinion, museums are valuable because they help us understand '
            + 'not only historical events but also the culture, creativity, and daily lives of '
            + 'people in the past.',
          ],
        },
        {
          title: 'Forest / extreme sport / outdoor challenge',
          tags: ['explored a forest', 'forest', 'extreme sport', 'outdoor challenge'],
          paragraphs: [
            'I would like to talk about a time when I explored a forest with my friends. It '
            + 'happened during a short trip to a mountain area. One of my friends suggested going '
            + 'trekking because he wanted to try something adventurous. At first, I was not very '
            + 'confident because I had never done this kind of outdoor activity before.',
            'We started early in the morning. The weather was cool, and the air was very fresh. At '
            + 'the beginning, the path was easy, so everyone felt excited. However, after about one '
            + 'hour, the road became steeper and more difficult. There were many rocks, trees, and '
            + 'small muddy areas. I felt tired and a little scared because I was afraid of falling.',
            'Luckily, my friends encouraged me a lot. We walked slowly, helped each other, and took '
            + 'short breaks when necessary. At one point, we reached a beautiful viewpoint where we '
            + 'could see the mountains and trees below. The view was amazing, and I felt that all '
            + 'the effort was worth it.',
            'After finishing the trip, my legs were tired, but I felt extremely proud of myself. It '
            + 'was not an extreme sport like skydiving or mountain climbing, but for me, it was '
            + 'still a real challenge.',
            'This experience taught me that I should not avoid challenges simply because they seem '
            + 'difficult at first. I also realized that personal growth often comes from stepping '
            + 'outside my comfort zone and trying something new. In addition, spending time in '
            + 'nature helped me relax and appreciate the beauty of the environment. Since then, I '
            + 'have become more interested in outdoor activities and more confident when facing '
            + 'challenges.',
          ],
        },
        {
          title: 'Good news / received a gift / achievement',
          tags: ['good news', 'received a gift', 'achieved something', 'achievement'],
          paragraphs: [
            'I would like to talk about a time when I received good news. It happened when I passed '
            + 'an important English test. Before the test, I had spent several weeks preparing for '
            + 'it. I practiced listening, reading, speaking, and writing almost every day. Sometimes '
            + 'I felt tired and worried because I was not sure whether I could get the score I '
            + 'wanted.',
            'On the day I received the result, I was at home. I opened the website to check my '
            + 'score, and my heart was beating very fast. When I saw that I had passed with a good '
            + 'result, I felt extremely happy and relieved. I immediately told my family and close '
            + 'friends. They congratulated me and said that my effort had paid off.',
            'A few days later, my parents gave me a small gift to celebrate. It was not very '
            + 'expensive, but it was meaningful to me. They said they were proud of me, and that '
            + 'made me feel even happier than the gift itself.',
            'This experience was memorable because it showed me the value of hard work. I realized '
            + 'that success is usually the result of consistent effort rather than luck. Daily '
            + 'practice, patience, and determination played an important role in helping me achieve '
            + 'my goal. Since then, whenever I face a new challenge, I try to remember this '
            + 'experience because it reminds me that progress takes time. I believe that if I make '
            + 'a clear plan and stay committed to it, I can achieve many other goals in the future.',
          ],
        },
        {
          title:
            "Did something you didn't want to do / broke a rule / someone asked you to stop",
          tags: [
            "did something you didn't want to do",
            'broke a rule',
            'asked you to stop doing something',
            'asked you to stop',
          ],
          paragraphs: [
            'I would like to talk about a time when I did something I did not want to do. It '
            + 'happened at university when my group had to give a presentation in front of the '
            + 'class. To be honest, I did not want to be the presenter because I was quite shy and '
            + 'afraid of speaking in public.',
            'At first, I tried to avoid the task and asked another member to present instead. '
            + 'However, my group leader said that everyone should take responsibility for one part. '
            + 'I knew he was right, so I agreed to present the introduction. I still felt nervous, '
            + 'but I decided to prepare carefully.',
            'Before the presentation day, our group wanted to practice in an empty classroom after '
            + 'lessons. According to university rules, students were not supposed to use the '
            + 'classroom without permission after a certain time. However, because we were worried '
            + 'about the presentation, we decided to stay and practice for a little longer.',
            'After about thirty minutes, a security guard came into the room and asked us to stop '
            + 'using the classroom and leave the building. At that moment, I realized that we had '
            + 'broken the rule. I felt embarrassed because we had not followed the regulations, '
            + 'even though we did not intend to cause any problems.',
            'In the end, my part was not perfect, but it was better than I expected. My teacher '
            + 'said our group did a good job, and my classmates gave us positive comments. I felt '
            + 'relieved and proud because I had overcome my fear.',
            'This experience taught me that sometimes we have to do things we do not like because '
            + 'they help us grow. If I always avoid uncomfortable tasks, I will never improve. '
            + 'Since then, I have become more willing to try difficult things.',
          ],
        },
        {
          title: 'Someone was rude to you / uncomfortable situation',
          tags: ['rude to you', 'someone was rude', 'uncomfortable situation'],
          paragraphs: [
            'I would like to talk about a time when someone was rude to me. It happened in a coffee '
            + 'shop near my school. I went there to buy a drink after a long day, and there were '
            + 'many people waiting in line. I stood in the queue for about ten minutes.',
            'When it was almost my turn, a man suddenly stepped in front of me and tried to order '
            + 'first. I politely told him that I had been waiting in line. However, he answered in '
            + 'an unfriendly way and said that he was in a hurry. His voice was quite loud, so I '
            + 'felt embarrassed because other people were looking at us.',
            'At that moment, I was angry, but I tried to stay calm. I did not want to argue in a '
            + 'public place. Luckily, the cashier noticed the situation and asked the man to wait '
            + 'for his turn. He looked annoyed, but he moved back. After I ordered my drink, I left '
            + 'the shop and tried not to think about it too much.',
            'Although it was not a big problem, it was still an uncomfortable experience. I learned '
            + 'that rude people can appear anywhere, and I cannot control their behavior. What I '
            + 'can control is my own reaction. This experience taught me the importance of staying '
            + 'polite and calm, even when other people are not respectful. In my opinion, '
            + 'responding aggressively often makes a situation worse, while remaining calm helps '
            + 'people solve problems more effectively and avoid unnecessary conflict.',
          ],
        },
        {
          title: 'Sleeping habits / favourite outfit / personal routine',
          tags: ['sleeping habits', 'favorite outfit', 'personal routine'],
          paragraphs: [
            'I would like to talk about my sleeping habits. In general, I think sleep is very '
            + 'important because it affects my health, mood, and work performance. On weekdays, I '
            + "usually try to go to bed at around ten o'clock at night and wake up at about six "
            + "o'clock in the morning. I prefer sleeping early because I feel more energetic the "
            + 'next day.',
            'However, my sleeping habits are not always perfect. Sometimes, when I have a lot of '
            + 'work or when I use my phone too much at night, I go to bed later than planned. If I '
            + 'sleep late, I often feel tired in the morning and find it difficult to focus. '
            + 'Because of that, I am trying to build better habits.',
            'Before going to bed, I usually take a shower, prepare my clothes for the next day, and '
            + 'listen to some relaxing music. My favorite outfit for sleeping is a simple T-shirt '
            + 'and comfortable shorts because they make me feel relaxed. Choosing soft and '
            + 'breathable fabrics is essential for me to get a good night\'s sleep. I do not like '
            + 'wearing tight clothes during the night.',
            'On weekends, I sometimes sleep a little longer, but I try not to wake up too late. If '
            + 'I sleep until noon, I feel lazy and waste a lot of time. So I usually get up, have '
            + 'breakfast, and do some light exercise.',
            'Overall, I believe good sleeping habits can improve my quality of life significantly. '
            + 'When I sleep well, I feel happier, healthier, and more productive during the day. In '
            + 'my opinion, sleep is just as important as a healthy diet and regular exercise '
            + 'because it affects both physical and mental well-being. That is why I am trying to '
            + 'maintain a more consistent daily routine and avoid staying up too late.',
          ],
        },
      ],
    },
  },
];
