/**
 * Khung trả lời chung cho Writing Part 3 và Part 4.
 *
 * <p>Soạn sau khi đọc hết ngân hàng đề (71 đề Part 3, 68 đề Part 4, 09/2026).
 * Câu hỏi Part 3 luôn thuộc một trong ba dạng, tình huống Part 4 luôn thuộc
 * một trong năm dạng — nên học một khung cho mỗi dạng là dùng được cho mọi đề.
 *
 * <p>Chỗ trong ngoặc vuông [ ] là phần học viên thay bằng ý của mình.
 */

export interface FrameExample {
  /** Câu hỏi hoặc tình huống thật lấy từ ngân hàng đề. */
  prompt: string;
  answer: string;
}

export interface Frame {
  id: string;
  name: string;
  /** Dấu hiệu nhận ra dạng này trong đề. */
  signals: string[];
  /** Khung câu, mỗi phần tử là một câu. */
  frame: string[];
  example: FrameExample;
}

// ---------------------------------------------------------------------------
// Writing Part 3 — trả lời 3 câu hỏi trên mạng xã hội, 30–40 từ mỗi câu
// ---------------------------------------------------------------------------

/**
 * Nhịp chung cho cả ba dạng: trả lời thẳng → lý do → ví dụ hoặc chi tiết →
 * câu kết. Bốn câu ngắn là vừa 30–40 từ, không cần nhớ thêm gì.
 */
export const PART3_RHYTHM = [
  'Trả lời thẳng câu hỏi ngay câu đầu',
  'Đưa một lý do (because / since)',
  'Thêm một ví dụ hoặc chi tiết cụ thể (for example / last month)',
  'Kết bằng cảm xúc, lời chúc hoặc câu hỏi ngược lại',
];

export const PART3_FRAMES: Frame[] = [
  {
    id: 'experience',
    name: 'Kể trải nghiệm hoặc thói quen',
    signals: ['Tell me about…', 'What about you?', 'How often…?', 'When and where do you…?', 'Describe…'],
    frame: [
      'Personally, I usually [thói quen / việc đã xảy ra] [khi nào / ở đâu].',
      'I like it because [lý do].',
      'For example, [chi tiết cụ thể: lần gần nhất, với ai, cảm giác thế nào].',
      'It always makes me feel [cảm xúc]. What about you?',
    ],
    example: {
      prompt: 'A: I usually write at the coffee shop. What about you?',
      answer:
        'Personally, I usually write at home in the early morning. I like it because it is quiet and I can focus better. For example, I finished a short story last week before breakfast. It always makes me feel productive.',
    },
  },
  {
    id: 'advice',
    name: 'Xin lời khuyên hoặc gợi ý',
    signals: ['Can you give me some advice?', 'What would you suggest?', 'What should I do?', 'Give me some suggestions'],
    frame: [
      'I think you should [lời khuyên chính].',
      'This is a good idea because [lợi ích].',
      'You could also [lời khuyên thứ hai] if [điều kiện].',
      'I hope this helps, and good luck!',
    ],
    example: {
      prompt: 'B: I have just moved to the city and want to make some friends. Can you give me some advice?',
      answer:
        'I think you should join a local club, such as a sports or book club. This is a good idea because you will meet people with the same interests. You could also try volunteering if you have free time at weekends. Good luck!',
    },
  },
  {
    id: 'opinion',
    name: 'Hỏi quan điểm',
    signals: ['Do you agree?', 'What do you think about…?', 'What is your opinion?', 'Should…?', 'Is this a good idea?'],
    frame: [
      'In my opinion, [đồng ý / không đồng ý / đồng ý một phần].',
      'The main reason is that [lý do].',
      'However, [mặt còn lại hoặc điều kiện].',
      'So I believe [kết luận ngắn].',
    ],
    example: {
      prompt: 'C: Some people say we don’t need cinemas anymore. What do you think about this?',
      answer:
        'In my opinion, we still need cinemas. The main reason is that watching a film on a big screen with friends is a special experience. However, streaming at home is cheaper and more convenient. So I believe both will continue to exist.',
    },
  },
];

// ---------------------------------------------------------------------------
// Writing Part 4 — email thân mật ~50 từ và email trang trọng 120–150 từ
// ---------------------------------------------------------------------------

/**
 * Khung chung áp cho mọi dạng tình huống. Chỉ phần thân (body) đổi theo dạng,
 * xem PART4_SITUATIONS.
 */
export const PART4_INFORMAL = [
  'Hi [tên bạn],',
  'Did you see the email from the club about [tình huống]? I [cảm xúc: can’t believe / am so excited / was a bit disappointed].',
  '[1–2 câu thân email theo dạng — nói thẳng ý của bạn]',
  'Let’s [đề xuất cùng làm]. What do you think?',
  'See you soon,',
  '[Tên bạn]',
];

export const PART4_FORMAL = [
  'Dear Sir or Madam,',
  'I am writing in response to your email regarding [tình huống].',
  '[Đoạn 1 — quan điểm hoặc cảm xúc chính, kèm lý do]',
  '[Đoạn 2 — đề xuất cụ thể, mỗi ý một lý do]',
  'I would be grateful if you could consider my suggestions.',
  'I look forward to hearing from you.',
  'Yours faithfully,',
  '[Họ tên đầy đủ]',
];

/**
 * Hai email khác nhau ở văn phong, không chỉ ở độ dài: email bạn được rút gọn
 * (I’m, can’t), email trang trọng tuyệt đối không. Đây là lỗi mất điểm Register
 * phổ biến nhất trong các bài đã chấm.
 */
export const PART4_REGISTER = [
  ['Mở đầu', 'Hi Nam, / Hey!', 'Dear Sir or Madam, / Dear Mr Smith,'],
  ['Rút gọn', 'I’m, can’t, it’s', 'I am, cannot, it is'],
  ['Cảm xúc', 'I was gutted / so excited!', 'I was rather disappointed / delighted'],
  ['Đề xuất', 'Why don’t we…? / Let’s…', 'I would like to suggest that… / It might be worth…'],
  ['Kết thư', 'See you soon, / Take care,', 'I look forward to hearing from you. Yours faithfully,'],
] as const;

export const PART4_SITUATIONS: Frame[] = [
  {
    id: 'cancelled',
    name: 'Bị huỷ, hoãn hoặc thay đổi',
    signals: ['cancelled', 'will be away', 'closed for repairs', 'earlier than planned', 'cannot give the talk', 'no refund'],
    frame: [
      'Although I understand that [lý do huỷ / thay đổi] was beyond your control, I was rather disappointed because [ảnh hưởng tới bạn].',
      'Instead of [cái bị huỷ], I would like to suggest [phương án thay thế 1]. This would allow members to [lợi ích].',
      'Alternatively, [phương án thay thế 2], which would be [rẻ hơn / dễ tổ chức hơn / hợp với nhiều người hơn].',
    ],
    example: {
      prompt: 'Movie Club: our meeting room will be closed for repairs for several weeks. Please suggest a venue, an online option or another activity.',
      answer:
        'Although I understand that the repairs are necessary, I was rather disappointed because our weekly meetings are the highlight of my week. Instead of cancelling, I would like to suggest meeting in the community centre, which has a projector. This would allow members to keep watching films together. Alternatively, we could hold online screenings followed by a video discussion, which would be free and easy for everyone to join.',
    },
  },
  {
    id: 'choice',
    name: 'Chọn một trong hai phương án',
    signals: ['Some members prefer… while others…', 'We are considering two…', 'which option', 'choose between'],
    frame: [
      'Having considered both options, I strongly prefer [phương án A].',
      'Firstly, [lý do 1]. Secondly, [lý do 2].',
      'Although [phương án B] has the advantage of [ưu điểm của B], I believe that [nhược điểm của B].',
      'To make [phương án A] successful, the club could [gợi ý tổ chức].',
    ],
    example: {
      prompt: 'Outdoor Club: choose between the mountains and the coast for the summer trip, suitable for young and older members.',
      answer:
        'Having considered both options, I strongly prefer the coast. Firstly, it offers activities for every age, from swimming to relaxing on the beach. Secondly, the journey is shorter and safer. Although the mountains have the advantage of fresh air and beautiful views, I believe the long hikes would be too tiring for older members. To make the trip successful, the club could book a hotel near the beach and organise a guided boat tour.',
    },
  },
  {
    id: 'suggestions',
    name: 'Góp ý tổ chức sự kiện hoặc cải thiện',
    signals: ['is planning', 'Please suggest', 'attract more members', 'young and older', 'improve the website', 'new library'],
    frame: [
      'I think this is an excellent idea, and I would like to share a few suggestions.',
      'First of all, [đề xuất 1], because [lý do / ai được lợi].',
      'In addition, [đề xuất 2] would [lợi ích], especially for [nhóm người].',
      'Finally, to [thu hút / quảng bá], the club could [đề xuất 3].',
    ],
    example: {
      prompt: 'Photography Club: suggest themes, displays and activities so the exhibition suits visitors of all ages.',
      answer:
        'I think this is an excellent idea, and I would like to share a few suggestions. First of all, the theme “Our City Through the Seasons” would appeal to everyone, because visitors can recognise familiar places. In addition, a hands-on corner with old film cameras would be fun, especially for children. Finally, to attract more visitors, the club could promote the exhibition on social media and offer free entry on the opening day.',
    },
  },
  {
    id: 'proposal',
    name: 'Nêu quan điểm về một đề xuất',
    signals: ['is considering', 'banning', 'entrance fee', 'demolish', 'real identity', 'give your opinion on this proposal'],
    frame: [
      'I [fully support / have serious concerns about] the proposal to [tóm tắt đề xuất].',
      'On the one hand, [ưu điểm]. On the other hand, [nhược điểm / rủi ro].',
      'Instead, I would recommend [giải pháp khác công bằng hơn].',
      'I am confident this would [kết quả] without [tác động xấu].',
    ],
    example: {
      prompt: 'Cinema Club: people keep using phones during films; the club is considering a complete ban.',
      answer:
        'I have some concerns about the proposal to ban mobile phones completely. On the one hand, it would stop the distracting lights and noise. On the other hand, some members need their phones for emergencies, such as parents with young children. Instead, I would recommend showing a short reminder before each film and asking staff to speak politely to anyone who ignores it. I am confident this would solve the problem without upsetting members.',
    },
  },
  {
    id: 'apply',
    name: 'Ứng tuyển hoặc tình nguyện',
    signals: ['looking for volunteers', 'guest speaker', 'explain why you are suitable', 'representatives', 'why you should be selected'],
    frame: [
      'I would like to apply to be [vai trò] for [sự kiện].',
      'I believe I am suitable because [kinh nghiệm / kỹ năng 1] and [kỹ năng 2].',
      'For example, [một lần đã làm việc tương tự].',
      'If I am selected, I would [việc sẽ làm / chủ đề đề xuất].',
    ],
    example: {
      prompt: 'Technology Club: looking for volunteers for the technology fair. Explain why you would be suitable.',
      answer:
        'I would like to apply to be a volunteer at next month’s technology fair. I believe I am suitable because I work in IT support and I enjoy explaining technical ideas in simple words. For example, I recently helped my grandparents set up video calls on their tablets. If I am selected, I would welcome visitors and help speakers with any technical problems during their talks.',
    },
  },
];
