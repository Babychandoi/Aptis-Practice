/**
 * Mẹo học Writing, soạn tay theo tài liệu biên tập.
 *
 * Khác Reading: Writing không có đáp án cố định để backend sinh, nên toàn bộ nội
 * dung nằm ở đây. Mỗi Part gồm các thẻ; thẻ hoặc là danh sách mẹo (bullet), hoặc
 * là bộ khung câu mẫu (deck) để học viên chép thẳng vào bài.
 */

/** Một mẹo: tiêu đề ngắn + giải thích. */
export interface WritingTipItem {
  title: string;
  text: string;
}

/** Một khung mẫu: tên khung + các dòng "nhãn → nội dung". */
export interface WritingFormCard {
  head: string;
  lines: { label: string; text: string }[];
}

/** Một bài mẫu dài (email Part 4) — text giữ nguyên xuống dòng. */
export interface WritingArticle {
  head: string;
  text: string;
}

export type WritingCard =
  | { kind: 'tips'; heading: string; items: WritingTipItem[] }
  | { kind: 'forms'; heading: string; cards: WritingFormCard[] }
  | { kind: 'articles'; heading: string; articles: WritingArticle[] };

export interface WritingPartTip {
  /** Khoá tab, ví dụ 'part3'. */
  key: string;
  /** Nhãn tab hiển thị. */
  label: string;
  /** Mô tả ngắn dưới tiêu đề Part. */
  intro: string;
  cards: WritingCard[];
}

export const WRITING_PART_TIPS: WritingPartTip[] = [
  {
    key: 'part2',
    label: 'Phần 2',
    intro:
      'Điền form, khoảng 20-30 từ. Đúng trọng tâm và ít lỗi quan trọng hơn câu dài hay từ khó.',
    cards: [
      {
        kind: 'tips',
        heading: 'Hiểu đề và tiêu chí chấm',
        items: [
          {
            title: 'Đúng nhiệm vụ trước',
            text:
              'Ưu tiên trả lời đúng câu hỏi, đúng chủ đề và đủ thông tin trước khi cố viết câu '
              + 'quá hay hoặc quá dài.',
          },
          {
            title: 'Giữ bài ngắn và an toàn',
            text:
              'Part 2 chỉ cần 20-30 từ. Viết quá dài thường làm tăng lỗi ngữ pháp, chính tả và '
              + 'dấu câu.',
          },
          {
            title: 'Câu rõ hơn câu khó',
            text:
              'Hai câu ngắn, rõ ý thường hiệu quả hơn một câu dài có nhiều mệnh đề nhưng dễ sai.',
          },
          {
            title: 'Có liên kết tối thiểu',
            text:
              'Chỉ cần một từ nối đơn giản như and, but, because, so hoặc also là đã tăng cohesion.',
          },
          {
            title: 'Tránh kiểu nhắn tin',
            text:
              'Đừng viết kiểu SMS, viết tắt tùy tiện hoặc bỏ dấu chấm, vì tiêu chí chấm vẫn tính '
              + 'câu hoàn chỉnh và dấu câu.',
          },
        ],
      },
      {
        kind: 'forms',
        heading: 'Công thức trả lời 20-30 từ',
        cards: [
          {
            head: 'Công thức 1',
            lines: [
              { label: 'Khung', text: 'Direct answer + extra detail' },
              { label: 'Mẫu', text: 'I usually...' },
              { label: 'Mẫu', text: 'I prefer... because...' },
            ],
          },
          {
            head: 'Công thức 2',
            lines: [
              { label: 'Khung', text: 'Main information + reason + small extra' },
              { label: 'Mẫu', text: "I'm interested in joining the club because..." },
              { label: 'Mẫu', text: 'I can attend on..., and I especially enjoy...' },
            ],
          },
          {
            head: 'Công thức 3',
            lines: [
              { label: 'Khung', text: 'Availability + preference + reason' },
              { label: 'Mẫu', text: "I'm free on..." },
              { label: 'Mẫu', text: "I'd like to..., because..." },
            ],
          },
        ],
      },
      {
        kind: 'forms',
        heading: 'Biến tấu khung nhanh',
        cards: [
          { head: 'Sở thích', lines: [{ label: 'Khung', text: 'I enjoy + noun/V-ing because...' }] },
          {
            head: 'Kinh nghiệm',
            lines: [{ label: 'Khung', text: 'I have + past participle / I have been to...' }],
          },
          {
            head: 'Thời gian rảnh',
            lines: [{ label: 'Khung', text: "I'm available on... / I can join after..." }],
          },
          {
            head: 'Lý do tham gia',
            lines: [{ label: 'Khung', text: "I'd like to join because..." }],
          },
          {
            head: 'Mục tiêu',
            lines: [{ label: 'Khung', text: 'I want to improve / learn / meet...' }],
          },
        ],
      },
      {
        kind: 'tips',
        heading: 'Mẹo chốt điểm Part 2',
        items: [
          {
            title: 'Đếm từ theo cụm',
            text: 'Hãy đếm từ trong đầu theo cụm ý thay vì viết xong mới cắt bớt.',
          },
          {
            title: 'Ưu tiên từ nối đơn giản',
            text:
              'And, but, because, so, also là đủ dùng và ít rủi ro hơn các cấu trúc phức tạp.',
          },
          {
            title: 'Bí ý thì theo thứ tự what - when - why',
            text:
              'Khi bí ý, hãy trả lời lần lượt bạn thích gì, khi nào tham gia được và vì sao bạn '
              + 'muốn tham gia.',
          },
          {
            title: 'Giữ 10 giây cuối để soát lỗi',
            text: 'Soát nhanh -s, -ed, a/an, viết hoa đầu câu và dấu chấm cuối câu.',
          },
          {
            title: 'Đúng đề quan trọng hơn phô diễn',
            text:
              'Aptis chấm relevance, accuracy, punctuation, vocabulary và cohesion, không yêu cầu '
              + 'câu quá khó.',
          },
        ],
      },
      {
        kind: 'forms',
        heading: 'Mẫu Part 2 dễ bắt chước',
        cards: [
          {
            head: 'Hobby + join club',
            lines: [
              { label: 'Đề', text: 'Tell us about your hobbies and why you want to join the club.' },
              { label: 'Mẫu', text: 'I enjoy swimming and reading in my free time.' },
              {
                label: 'Mẫu',
                text:
                  "I want to join the club because I'd like to make new friends and stay active.",
              },
            ],
          },
        ],
      },
      {
        kind: 'tips',
        heading: 'Quản lý thời gian Part 2',
        items: [
          {
            title: 'Mốc thời gian an toàn',
            text:
              'Nếu nhắm điểm cao, hãy dành khoảng 7 phút cho Part 2: đọc đề, lên ý ngắn, viết 2 '
              + 'câu chắc tay và chừa vài giây để soát lỗi.',
          },
        ],
      },
    ],
  },
  {
    key: 'part3',
    label: 'Phần 3',
    intro:
      'Ba câu trả lời trong một mạch nội dung. Điểm rơi vào việc trả lời đủ, đúng đề và có '
      + 'liên kết, không phải vào câu dài.',
    cards: [
      {
        kind: 'tips',
        heading: 'Cách lên điểm Part 3',
        items: [
          {
            title: 'Phải trả lời đủ cả 3 câu',
            text:
              'Điểm Part 3 phụ thuộc vào việc cả ba câu trả lời đều đúng đề và cùng nằm trong '
              + 'một mạch nội dung.',
          },
          {
            title: 'Đừng biến bài thành danh sách câu rời',
            text:
              'Hãy để mỗi câu trả lời có mở ý, lý do hoặc ví dụ, rồi chốt lại bằng cảm nhận '
              + 'hoặc nhận xét nhỏ.',
          },
          {
            title: 'Cohesion quan trọng',
            text:
              'Các từ nối như because, for example, however, in my opinion hoặc for that reason '
              + 'giúp bài mạch lạc hơn.',
          },
          {
            title: 'Rõ ý an toàn hơn dài dòng',
            text:
              'Ba câu vừa phải, rõ ý thường hiệu quả hơn ba câu quá dài với nhiều mệnh đề dễ sai.',
          },
        ],
      },
      {
        kind: 'forms',
        heading: 'Khung Answer - Support - Comment',
        cards: [
          {
            head: 'Khung 3 nhịp',
            lines: [
              { label: 'Bước 1', text: 'Answer → trả lời thẳng câu hỏi.' },
              { label: 'Bước 2', text: 'Support → thêm lý do, ví dụ hoặc trải nghiệm.' },
              { label: 'Bước 3', text: 'Comment → chốt cảm xúc, đánh giá hoặc kết quả nhỏ.' },
            ],
          },
        ],
      },
      {
        kind: 'forms',
        heading: 'Biến tấu theo dạng câu hỏi',
        cards: [
          {
            head: 'Trải nghiệm quá khứ',
            lines: [
              { label: 'Câu 1', text: 'The first time I... was...' },
              { label: 'Câu 2', text: 'I went there / did it with...' },
              { label: 'Câu 3', text: 'It was memorable because...' },
            ],
          },
          {
            head: 'Ý kiến / sở thích',
            lines: [
              { label: 'Câu 1', text: 'I think... / In my opinion...' },
              { label: 'Câu 2', text: 'This is because...' },
              { label: 'Câu 3', text: 'For that reason, I...' },
            ],
          },
          {
            head: 'Nơi chốn / hoạt động thú vị',
            lines: [
              { label: 'Câu 1', text: 'One of the most interesting places is...' },
              { label: 'Câu 2', text: 'It is famous for...' },
              { label: 'Câu 3', text: "I'd recommend it because..." },
            ],
          },
          {
            head: 'Kế hoạch / mong muốn tương lai',
            lines: [
              { label: 'Câu 1', text: "I'd like to... in the future." },
              { label: 'Câu 2', text: 'It would help me...' },
              { label: 'Câu 3', text: 'I hope I can... soon.' },
            ],
          },
        ],
      },
      {
        kind: 'tips',
        heading: 'Mẹo ăn điểm Part 3',
        items: [
          {
            title: 'Câu 1 phải trả lời thẳng',
            text:
              'Đừng vòng vo ở câu đầu. Hãy trả lời trực diện để người chấm thấy bạn bám đúng '
              + 'câu hỏi.',
          },
          {
            title: 'Câu 2 kéo điểm triển khai',
            text:
              'Lý do, ví dụ hoặc trải nghiệm ở câu thứ hai thường là phần tăng điểm vocabulary '
              + 'và coherence.',
          },
          {
            title: 'Câu 3 nên có chốt nhẹ',
            text:
              'Một câu kết ngắn về cảm xúc, lời khuyên hoặc kết quả giúp đoạn trả lời trông '
              + 'hoàn chỉnh hơn.',
          },
          {
            title: 'Không cố nâng level bằng câu quá dài',
            text:
              'Điểm tốt đến từ việc trả lời đủ, rõ và ít lỗi hơn là nhồi nhiều mệnh đề khó.',
          },
          {
            title: 'Giữ cả 3 câu cùng on topic',
            text:
              'Dù viết tốt đến đâu, nếu lạc đề ở một câu thì toàn bộ Part 3 sẽ tụt điểm đáng kể.',
          },
        ],
      },
      {
        kind: 'forms',
        heading: 'Mẫu Part 3 dễ học theo',
        cards: [
          {
            head: 'Mẫu 1 - First trip alone',
            lines: [
              { label: 'Sentence 1', text: 'Yes, I can.' },
              {
                label: 'Sentence 2',
                text:
                  'I travelled to Da Nang by myself when I was eighteen, and I felt nervous at first.',
              },
              {
                label: 'Sentence 3',
                text: 'However, the trip made me more confident and independent.',
              },
            ],
          },
          {
            head: 'Mẫu 2 - Interesting places',
            lines: [
              {
                label: 'Sentence 1',
                text:
                  'In my country, Ha Long Bay and Hoi An are among the most interesting places to visit.',
              },
              { label: 'Sentence 2', text: 'They are beautiful, famous, and full of local culture.' },
              { label: 'Sentence 3', text: 'That is why many tourists love them.' },
            ],
          },
          {
            head: 'Mẫu 3 - Exciting journey',
            lines: [
              {
                label: 'Sentence 1',
                text:
                  'The most exciting journey I have been on was a motorbike trip to the mountains with my friends.',
              },
              { label: 'Sentence 2', text: 'The scenery was amazing.' },
              { label: 'Sentence 3', text: 'The experience taught me to enjoy adventure more.' },
            ],
          },
        ],
      },
      {
        kind: 'tips',
        heading: 'Quản lý thời gian Part 3',
        items: [
          {
            title: 'Mốc thời gian an toàn',
            text:
              'Nếu nhắm điểm cao, hãy dành khoảng 10 phút cho Part 3 để mỗi câu trả lời có ý '
              + 'chính, lý do hoặc ví dụ và một câu chốt ngắn.',
          },
        ],
      },
      {
        kind: 'tips',
        heading: 'Checklist 20 giây cuối',
        items: [
          {
            title: 'Kiểm tra trọng tâm',
            text: 'Hỏi lại mình đã trả lời đúng từng câu hỏi chưa và có câu nào bị lạc đề không.',
          },
          {
            title: 'Kiểm tra số từ',
            text: 'Đảm bảo bài không quá dài so với giới hạn gợi ý của từng phần.',
          },
          {
            title: 'Kiểm tra từ nối',
            text:
              'Mỗi đoạn nên có ít nhất một từ nối hoặc cụm nối đơn giản để câu không rời rạc.',
          },
          {
            title: 'Kiểm tra lỗi ngớ ngẩn',
            text: 'Soát nhanh các lỗi hay gặp như he go, I am agree, writting hoặc alot.',
          },
          {
            title: 'Kiểm tra viết hoa và dấu câu',
            text: 'Đừng bỏ quên chữ viết hoa đầu câu và dấu chấm cuối câu.',
          },
        ],
      },
    ],
  },
  {
    key: 'part4',
    label: 'Phần 4',
    intro:
      'Hai email: một casual ~50 từ gửi bạn, một formal ~150 từ gửi quản lý. Đổi giọng văn đúng '
      + 'người nhận và bắt buộc đưa giải pháp.',
    cards: [
      {
        kind: 'articles',
        heading: 'Tips Part 4',
        articles: [
          {
            head: 'Chỉ cho các bạn muốn học gấp',
            text:
              'Dùng các form dưới đây khi bạn bí ý hoặc chưa phát triển ý kịp.\n'
              + 'Không chép y nguyên toàn bộ cho mọi đề.\n'
              + 'Hãy thay nội dung trong dấu [ ] theo đúng yêu cầu đề bài.',
          },
        ],
      },
      {
        kind: 'articles',
        heading: 'Part 4 - Question 1',
        articles: [
          {
            head: 'Mẫu 1',
            text:
              'Dear [Name],\n\n'
              + 'It has been quite a long time since we last talked, so I hope you are doing well. '
              + 'I have just read the latest notice from the club, and it really caught my attention. '
              + 'It seems to be an interesting issue, and I have been thinking about it a lot. '
              + 'I am planning to write to the manager to share some of my ideas and opinions. '
              + 'I would be happy to hear what you think about it as well.\n\n'
              + 'Take care,\n[Your Name]',
          },
          {
            head: 'Mẫu 2',
            text:
              'Dear [Name],\n\n'
              + 'I hope you are well and everything is going smoothly for you. I recently saw the '
              + 'club’s notice, and I found it quite interesting. It made me think about a few ideas '
              + 'that might be useful. I am considering sending an email to the manager to express '
              + 'my thoughts and suggestions. Please tell me what you think when you have time.\n\n'
              + 'Best wishes,\n[Your Name]',
          },
        ],
      },
      {
        kind: 'articles',
        heading: 'Part 4 - Question 2',
        articles: [
          {
            head: 'Mẫu 1',
            text:
              'Dear Manager,\n\n'
              + 'I am writing to share my thoughts about the recent information from the club. '
              + 'After reading the announcement, I felt very interested because I think it is an '
              + 'important issue for all members. I would like to express my opinion and give some '
              + 'suggestions.\n\n'
              + 'As mentioned in the announcement, [tóm tắt nội dung đề bài bằng 1-2 câu].\n\n'
              + 'Personally, I think this matter should be considered carefully so that the club '
              + 'can choose the most suitable solution. In my view, there are several points that '
              + 'deserve attention.\n\n'
              + 'To begin with, [ý chính 1 của đề].\n'
              + 'Moreover, [ý chính 2 của đề].\n'
              + 'Finally, [ý chính 3 / giải pháp / đề xuất thêm nếu cần].\n\n'
              + 'I believe that with careful planning, the club can achieve a better result and keep '
              + 'members satisfied. I hope my suggestions will be taken into consideration. Thank you '
              + 'for your time.\n\n'
              + 'Yours faithfully,\n[Your Name]',
          },
          {
            head: 'Mẫu 2 (dễ dùng)',
            text:
              'Dear Sir/Madam,\n\n'
              + 'I am writing to express my opinion about the recent announcement from the club. '
              + 'I think this is an important matter, and I would like to share some ideas that may '
              + 'be helpful.\n\n'
              + 'According to the announcement, [tóm tắt đề bài].\n\n'
              + 'Personally, I believe that this issue should be handled carefully. On the one hand, '
              + '[ý / mặt tích cực / cảm xúc / quan điểm]. On the other hand, [ý / vấn đề / hạn chế / '
              + 'điều cần chú ý].\n\n'
              + 'To improve the situation, I would like to suggest the following ideas. First, [ý 1]. '
              + 'Second, [ý 2]. If possible, [ý 3].\n\n'
              + 'I hope my suggestions will be useful for the club. Thank you for considering my '
              + 'ideas, and I look forward to hearing from you.\n\n'
              + 'Yours sincerely,\n[Your Name]',
          },
          {
            head: 'Mẫu 3 (khuyên dùng)',
            text:
              'Dear Sir/Madam,\n\n'
              + 'My name is [Your Name], and I am a member of the club. I am writing this email to '
              + 'express my opinion about the recent announcement from the club and to share some '
              + 'suggestions.\n\n'
              + 'According to the announcement, [tóm tắt yêu cầu của đề bài].\n\n'
              + 'Personally, I think this is an important matter, and I believe it should be '
              + 'considered carefully. In order to make it more effective and beneficial for '
              + 'everyone, I would like to suggest a few ideas.\n\n'
              + 'First, [ý 1 theo đề bài].\n'
              + 'Second, [ý 2 theo đề bài].\n'
              + 'Furthermore, [ý 3 theo đề bài nếu cần].\n\n'
              + 'I hope that my suggestions will be useful for the club. Thank you for considering '
              + 'my ideas. I look forward to hearing from you.\n\n'
              + 'Yours sincerely,\n[Your Name]',
          },
        ],
      },
    ],
  },
];
