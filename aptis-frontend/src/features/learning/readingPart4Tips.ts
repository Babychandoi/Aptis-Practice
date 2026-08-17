/**
 * Nội dung mẹo Reading Part 4 (dạng ghép tiêu đề với 7 đoạn văn).
 *
 * Chỉ chứa phần PHẢI SOẠN TAY: dấu hiệu paraphrase, bẫy dễ nhầm, nghĩa tiếng
 * Việt, câu chuyện liên tưởng. Những thứ suy được từ ngân hàng — chuỗi tiêu đề
 * theo thứ tự đoạn, số lửa, năm — do backend trả về, không lặp ở đây.
 *
 * Khoá là tiêu đề đề trong ngân hàng. Đề chưa soạn thì trang vẫn hiện chuỗi
 * keyword tự động, chỉ thiếu bảng chi tiết.
 *
 * Nội dung viết dựa trên chính đoạn văn trong ngân hàng, không phải mẹo chung
 * chung: mỗi dòng "dấu hiệu" là từ ngữ thật xuất hiện trong đoạn tương ứng.
 */

export interface HeadingHint {
  /** Vai trò/lõi nghĩa của tiêu đề, viết bằng tiếng Việt cho dễ nhớ. */
  role: string;
  /** Nguyên văn tiêu đề trong đề. */
  heading: string;
  /** Họ nghĩa và dấu hiệu mạnh xuất hiện trong đoạn văn tương ứng. */
  signals: string;
  /** Vì sao dễ chọn nhầm tiêu đề này cho đoạn khác. */
  trap: string;
}

export interface TopicTip {
  /** Tóm tắt cách nhận diện cả đề trong một câu. */
  summary: string;
  hints: HeadingHint[];
  /** Ba bước áp dụng trong phòng thi, riêng cho đề này. */
  steps: string[];
  /** Cặp tiêu đề dễ nhầm nhất của đề này. */
  confusions: string[];
  /** Nghĩa tiếng Việt của từng keyword, theo đúng thứ tự đoạn. */
  keywordsVi: string[];
  /** Câu chuyện nối các keyword lại để nhớ nguyên chuỗi. */
  story: string;
}

export const READING_PART4_TIPS: Record<string, TopicTip> = {
  Mountain: {
    summary:
      'Nhận diện theo họ nghĩa: term + evolved, accomplishment, public attention, '
      + 'misplaced priorities, risky links, security và close bonds.',
    hints: [
      {
        role: 'Định nghĩa thay đổi',
        heading: 'Changing the definition of mountain',
        signals:
          'Họ nghĩa: definition, meaning, criteria, interpretation. Dấu hiệu mạnh: '
          + 'main criteria, do not always settle, modern discussions, meaning attached to a place.',
        trap: 'Phải có cả ý khái niệm và sự thay đổi; đừng chọn chỉ vì đoạn có từ mountain.',
      },
      {
        role: 'Cảm giác thành tựu',
        heading: 'Unique sense of achievement',
        signals:
          'Họ nghĩa: achievement, success, personal victory. Dấu hiệu mạnh: reaching a summit, '
          + 'private struggle with fear, exhaustion, self-doubt — thành tựu đo bằng nội tâm chứ không bằng điểm số.',
        trap: 'Thành tựu nói về cảm giác đạt được; publicity nói về việc đem thành tựu ra công chúng.',
      },
      {
        role: 'Công khai thành tựu',
        heading: 'Publicity of achievement',
        signals:
          'Họ nghĩa: publicity, exposure, recognition. Dấu hiệu mạnh: followed in real time, '
          + 'thousands of viewers, promoted by sponsors, likes and comments.',
        trap: 'Cần dấu hiệu công chúng hoặc truyền thông; achievement đứng một mình chưa đủ.',
      },
      {
        role: 'Đặt sai ưu tiên',
        heading: 'Misguided priorities',
        signals:
          'Họ nghĩa: priorities, focus, values. Dấu hiệu mạnh: becomes more important than work, '
          + 'family commitments, financial security — có sự đánh đổi A lấy B.',
        trap: 'Đừng nhầm một mục tiêu bình thường với ưu tiên sai; phải có sự bỏ bê hoặc đặt A lên trên B.',
      },
      {
        role: 'Kết nối đáng lo',
        heading: 'Worrying connections',
        signals:
          'Họ nghĩa: connections, loyalty, group. Dấu hiệu mạnh: loyalty more quickly, '
          + 'nhưng caution appear weak, withdrawal feel like betrayal.',
        trap: 'Câu đầu có thể khen sự gắn kết; phải đọc hết đoạn để thấy hậu quả tiêu cực biến nó thành worrying.',
      },
      {
        role: 'Tập trung vào ổn định',
        heading: 'Focus on stability',
        signals:
          'Họ nghĩa: stability, security, routine. Dấu hiệu mạnh: reliable income, '
          + 'regular time with family, permanent home.',
        trap: 'Balance + security + long-term mới là stability; đừng nhầm với quan hệ ổn định.',
      },
      {
        role: 'Quan hệ thân mật',
        heading: 'Intimate relationships',
        signals:
          'Họ nghĩa: relationships, trust, closeness. Dấu hiệu mạnh: share equipment, '
          + 'slow down for one another, admit fear, accept help.',
        trap: 'Connections có thể là mạng lưới chung; intimate relationships phải có sự gần gũi hoặc hỗ trợ cảm xúc.',
      },
    ],
    steps: [
      'Gạch hai lớp ở mỗi tiêu đề: danh từ lõi và từ đổi cực, ví dụ connections + worrying '
      + 'hoặc priorities + misguided.',
      'Đọc cả đoạn, đặc biệt sau but/yet: Mountain thường đặt tín hiệu tích cực trước rồi mới lộ bẫy tiêu cực.',
      'Chốt bằng chuỗi: definition → achievement → publicity → priorities → connections → stability → relationships.',
    ],
    confusions: [
      'Achievement vs publicity: private struggle/pride = thành tựu; viewers/sponsors/likes = công khai thành tựu.',
      'Priorities vs stability: more important than family = sai ưu tiên; reliable income/permanent home = ổn định.',
      'Connections vs relationships: group built around risk = kết nối đáng lo; admit fear/accept help = quan hệ thân mật.',
      'Definition vs achievement: criteria/meaning = đổi khái niệm; summit/self-doubt = cảm giác đạt được.',
    ],
    keywordsVi: [
      'định nghĩa', 'thành tựu', 'công khai', 'ưu tiên', 'kết nối', 'ổn định', 'quan hệ thân mật',
    ],
    story:
      'Định nghĩa của núi thay đổi, người leo núi đạt được thành tựu rồi đem khoe công khai, '
      + 'nhưng dễ sai ưu tiên, tạo kết nối đáng lo, cuối cùng cần sự ổn định và quan hệ thân mật.',
  },

  'The Arrival of the Four-Day Work Week': {
    summary:
      'Bám trục lợi–hại: lỗi thời, lợi cho nhân viên, hại về tiền, khó khăn bất ngờ, '
      + 'thói quen cũ, bất công theo ngành, và giải pháp thay thế.',
    hints: [
      {
        role: 'Lối làm việc lỗi thời',
        heading: 'A way of life now out of date',
        signals:
          'Dấu hiệu mạnh: Monday-to-Friday timetable, emerged from an industrial world, '
          + 'output connected to time beside a machine — nhắc quá khứ để nói nay đã khác.',
        trap: 'Đoạn này mô tả nguồn gốc lịch làm việc, không phải khó khăn khi đổi lịch.',
      },
      {
        role: 'Lợi ích cho nhân viên',
        heading: 'Benefits for employees',
        signals:
          'Dấu hiệu mạnh: additional non-working day, deal with appointments, without using annual leave, '
          + 'return with greater concentration.',
        trap: 'Lợi ích cho NHÂN VIÊN, không phải cho doanh nghiệp; đừng nhầm với đoạn nói doanh thu.',
      },
      {
        role: 'Hậu quả tài chính',
        heading: 'Undesirable financial consequences',
        signals:
          'Dấu hiệu mạnh: does not reduce number of customers, overlapping teams, '
          + 'additional recruitment — chi phí tăng.',
        trap: 'Nói về tiền và nhân lực của tổ chức; đừng nhầm với áp lực công việc dồn lên nhân viên.',
      },
      {
        role: 'Khó khăn bất ngờ',
        heading: 'Unforeseen challenges for employees',
        signals:
          'Dấu hiệu mạnh: five days compressed into four, more intense rather than more efficient, '
          + 'messages accumulate during the extra day off.',
        trap: 'Cùng nói về nhân viên như đoạn benefits nhưng CỰC NGƯỢC: đây là mặt trái.',
      },
      {
        role: 'Thói quen cũ khó bỏ',
        heading: 'Difficult to change old habits',
        signals:
          'Dấu hiệu mạnh: easier than changing assumptions, trust people they can see at a desk, '
          + 'workers may feel guilty — rào cản tâm lý, không phải rào cản kỹ thuật.',
        trap: 'Đoạn này nói về NIỀM TIN và văn hoá; challenges nói về khối lượng công việc thực tế.',
      },
      {
        role: 'Bất công theo ngành',
        heading: 'Unfair for some people',
        signals:
          'Dấu hiệu mạnh: a software company may close on Friday, but a hospital, hotel, transport '
          + 'cannot stop serving the public — so sánh ngành được hưởng và ngành không.',
        trap: 'Phải có sự SO SÁNH giữa nhóm được và nhóm không; chỉ nói khó khăn chung thì chưa đủ.',
      },
      {
        role: 'Giải pháp thay thế',
        heading: 'Alternative solutions worth considering',
        signals:
          'Dấu hiệu mạnh: do not have to choose between, select different days, shorten each working day, '
          + 'alternate their schedules.',
        trap: 'Đoạn kết đưa lựa chọn khác, không phải kết luận chung chung về lợi hại.',
      },
    ],
    steps: [
      'Chia bảy tiêu đề thành ba nhóm: bối cảnh (out of date), mặt lợi (benefits), '
      + 'mặt hại (financial, challenges, habits, unfair), lối ra (alternatives).',
      'Với bốn tiêu đề mặt hại, hỏi tiếp: hại cho AI — tổ chức (tiền) hay nhân viên (áp lực, tâm lý, ngành nghề).',
      'Đoạn cuối gần như luôn là alternatives; dùng nó làm mốc rồi ghép ngược lên.',
    ],
    confusions: [
      'Benefits vs challenges: cùng nói về nhân viên, khác cực — có thêm thời gian vs bị dồn việc.',
      'Financial vs challenges: financial là chi phí của tổ chức; challenges là khối lượng việc của người làm.',
      'Habits vs unfair: habits là định kiến của quản lý; unfair là khác biệt giữa các ngành.',
      'Out of date vs alternatives: một cái nhìn về quá khứ, một cái đề xuất tương lai.',
    ],
    keywordsVi: [
      'lỗi thời', 'lợi ích nhân viên', 'hậu quả tài chính', 'khó khăn bất ngờ',
      'thói quen cũ', 'bất công', 'giải pháp thay thế',
    ],
    story:
      'Lịch làm việc cũ đã lỗi thời, đổi sang bốn ngày thì lợi ích nhân viên rõ, '
      + 'nhưng kéo theo hậu quả tài chính và khó khăn bất ngờ, lại vướng thói quen cũ, '
      + 'gây bất công cho vài ngành — nên cần giải pháp thay thế linh hoạt.',
  },

  'Women Mathematicians': {
    summary:
      'Trục thời gian và công nhận: bị che khuất, được ghi nhận, bị nam giới nhận công, '
      + 'sự nghiệp dài, nhãn dán, nỗ lực cân bằng, và mặt trái của sự đồng nhất.',
    hints: [
      {
        role: 'Thành tựu bị che khuất',
        heading: 'Gender obscure achievements',
        signals:
          'Dấu hiệu mạnh: omitted from historical records, attributed to male colleagues, '
          + 'Hypatia of Alexandria — nói về việc bị xoá khỏi lịch sử.',
        trap: 'Bị che khuất nói chung; "man unfairly credited" chỉ đích danh một người nam nhận công.',
      },
      {
        role: 'Ghi nhận người tiên phong',
        heading: 'Acknowledging achievement of a pioneer',
        signals:
          'Dấu hiệu mạnh: Emmy Noether, most important woman in the history of mathematics, '
          + 'Einstein referred to her work — có lời khen từ người có uy tín.',
        trap: 'Đây là sự CÔNG NHẬN, ngược cực với đoạn bị che khuất và đoạn bị nhận công.',
      },
      {
        role: 'Nam giới nhận công oan',
        heading: 'Man unfairly credited',
        signals:
          'Dấu hiệu mạnh: overshadowed the collaborative efforts, credits Edward Lorenz yet '
          + '— nêu tên cụ thể người nam được ghi công thay.',
        trap: 'Phải có người nam CỤ THỂ được nêu; nếu chỉ nói chung là bị bỏ quên thì là đoạn obscure.',
      },
      {
        role: 'Sự nghiệp dài',
        heading: 'A long career showing exceptional ability',
        signals:
          'Dấu hiệu mạnh: Mary Cartwright, career spanning over six decades, '
          + 'laid the groundwork for chaos theory — nhấn vào ĐỘ DÀI thời gian.',
        trap: 'Điểm phân biệt là số năm/thập kỷ, không phải mức độ nổi tiếng.',
      },
      {
        role: 'Nhãn dán đổi cách nhìn',
        heading: 'Labels can change perspective on people',
        signals:
          'Dấu hiệu mạnh: described as "women geniuses", the gender label, well-intended, '
          + 'implies that excellence is rare among women.',
        trap: 'Ý tinh tế: lời khen nhưng gây hại. Đừng nhầm với đoạn nói bị phân biệt thẳng thừng.',
      },
      {
        role: 'Nỗ lực cân bằng giới',
        heading: 'Attempting to create a gender balance',
        signals:
          'Dấu hiệu mạnh: outreach programs, scholarships specifically for women, '
          + 'female mentorship — hành động cụ thể để sửa mất cân bằng.',
        trap: 'Đây là GIẢI PHÁP đang làm; đoạn uniformity mới nói mặt trái của giải pháp.',
      },
      {
        role: 'Đồng nhất không phải lúc nào cũng tốt',
        heading: 'Uniformity is not always beneficial',
        signals:
          'Dấu hiệu mạnh: standardized criteria, however such uniform methods can ignore '
          + 'the diverse paths — có chữ however đảo cực.',
        trap: 'Cùng chủ đề cân bằng giới với đoạn trước nhưng ngược cực: một cái ủng hộ, một cái cảnh báo.',
      },
    ],
    steps: [
      'Tách ba đoạn nhắc TÊN RIÊNG (Hypatia, Noether, Lorenz, Cartwright) trước — chúng chiếm '
      + 'bốn trong bảy đoạn và dễ khoá nhất.',
      'Với hai đoạn về cân bằng giới, tìm chữ however/but: có đảo cực là uniformity, không có là balance.',
      'Chốt bằng chuỗi: obscure → acknowledge → unfair credit → long career → labels → balance → uniformity.',
    ],
    confusions: [
      'Obscure vs unfairly credited: bị bỏ quên chung vs bị một người nam cụ thể nhận công.',
      'Acknowledging vs long career: được người khác ca ngợi vs tự mình bền bỉ nhiều thập kỷ.',
      'Balance vs uniformity: chương trình hỗ trợ vs cảnh báo tiêu chuẩn cứng nhắc.',
      'Labels vs obscure: nhãn dán là lời khen gây hại; obscure là bị xoá khỏi ghi chép.',
    ],
    keywordsVi: [
      'bị che khuất', 'ghi nhận tiên phong', 'nhận công oan', 'sự nghiệp dài',
      'nhãn dán', 'cân bằng giới', 'đồng nhất',
    ],
    story:
      'Thành tựu của nữ giới bị che khuất, sau đó có người tiên phong được ghi nhận, '
      + 'nhưng vẫn có nam giới nhận công oan; một số bà có sự nghiệp dài, rồi bị gắn nhãn dán, '
      + 'nên các trường nỗ lực cân bằng giới — song sự đồng nhất lại không hẳn tốt.',
  },
};
