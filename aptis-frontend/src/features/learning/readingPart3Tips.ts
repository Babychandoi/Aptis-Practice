/**
 * Bảng chống paraphrase riêng cho từng đề Reading Part 3 (ghép nhận định với
 * người nói).
 *
 * Khác Part 2: ở đây bảy nhận định đều hỏi "Who…", nên bẫy nằm ở chỗ hai nhận
 * định nghe rất giống nhau mà thuộc hai người khác nhau. Bảng liệt kê từ khoá
 * cần khoá và cặp dễ nhầm của chính đề đó.
 *
 * Khoá là tiêu đề đề trong ngân hàng. Đề chưa soạn thì trang vẫn hiện chuỗi đáp
 * án tự động, chỉ thiếu bảng.
 */

export interface StatementHint {
  /** Nhận định rút gọn bằng tiếng Việt. */
  role: string;
  /** Từ khoá phải khoá ở đề bài. */
  cues: string;
  /** Dấu hiệu tương ứng trong đoạn của người nói. */
  signals: string;
  /** Vì sao dễ chọn nhầm sang người khác. */
  trap: string;
}

export interface Part3TopicTip {
  summary: string;
  goldenRule: string;
  hints: StatementHint[];
  steps: string[];
  confusions: string[];
}

export const READING_PART3_TIPS: Record<string, Part3TopicTip> = {
  'Games from childhood': {
    summary:
      'Bám đúng 4 đoạn A–D của đề này: khóa thời gian, người chơi cùng, hoạt động và '
      + 'thái độ trước khi tìm cụm paraphrase.',
    goldenRule:
      'Khóa 4 thứ trước khi chọn: Ai? Khi nào? Làm gì? Thái độ thế nào? Sau đó mới tìm '
      + 'paraphrase trong đoạn văn; một từ giống nhau chưa đủ để chọn đáp án.',
    hints: [
      {
        role: 'Chơi cùng con',
        cues: 'hiện tại + chơi + trẻ em',
        signals:
          'I often spend time playing with them · my children and I still like it. '
          + 'Nhận ra: play with children → spend time playing with my children.',
        trap: 'Đừng chỉ thấy children ở đoạn khác rồi chọn; phải có hành động chơi cùng trẻ em.',
      },
      {
        role: 'Game hiện nay khó hơn',
        cues: 'game hiện nay + khó hơn',
        signals:
          'I have struggled with them · more characters and rules · making us think a lot. '
          + 'Nhận ra: more difficult → struggle with + nhiều luật/nhân vật + phải suy nghĩ nhiều.',
        trap: 'Like modern games không đồng nghĩa với thấy game khó.',
      },
      {
        role: 'Bạn cùng tuổi',
        cues: 'hồi nhỏ + bạn cùng tuổi + chơi cùng',
        signals:
          'played soccer with other children of the same age · divided into small teams. '
          + 'Nhận ra: small friends → other children of the same age.',
        trap: 'Small dễ làm bạn nghĩ đến small teams; bằng chứng mạnh là children of the same age.',
      },
      {
        role: 'Đọc sách hồi nhỏ',
        cues: 'hồi nhỏ + đọc sách',
        signals:
          'When I was a child, I chose reading books as a form of entertainment. '
          + 'Nhận ra: liked reading books → chose reading books.',
        trap: 'Đừng nhầm với drawing activity: cùng là hoạt động trong nhà nhưng khác hẳn loại hoạt động.',
      },
      {
        role: 'Game hiện đại khi lớn lên',
        cues: 'hiện tại/khi trưởng thành + game hiện đại',
        signals:
          'Later, when I grow up, I like playing modern games with eye-catching interfaces. '
          + 'Nhận ra: now / when I grow up / like modern games.',
        trap: 'Đoạn A cũng nhắc games nowadays, nhưng nói game nhiều luật và khó hơn, không nói thích khi trưởng thành.',
      },
      {
        role: 'Nghệ thuật hồi nhỏ',
        cues: 'hồi nhỏ + nghệ thuật',
        signals:
          'paper and a box of crayons · I really liked that drawing activity · often drew at home. '
          + 'Nhận ra: arts → drawing / paper / crayons.',
        trap: 'Passage không có từ art; hãy nhận ra trường nghĩa nghệ thuật qua hành động vẽ và dụng cụ vẽ.',
      },
      {
        role: 'Mong được ra ngoài chơi',
        cues: 'rất mong + được ra ngoài chơi',
        signals:
          'liked playing outdoor activities · glued to the window to look outside · praying for the rain to stop. '
          + 'Nhận ra: looked forward to going out → mong mưa tạnh để được ra ngoài.',
        trap: 'Không có cụm look forward to; đây là suy luận từ hành vi và mong muốn.',
      },
    ],
    steps: [
      'Khóa 4 thứ trước khi chọn: Ai? Khi nào? Làm gì? Thái độ thế nào? Sau đó mới tìm '
      + 'paraphrase trong đoạn văn.',
      'Ví dụ câu về game hiện nay: games nowadays mới chỉ là một dấu hiệu. Chỉ chốt khi có thêm '
      + 'khó hơn → struggled with + more characters and rules + think a lot.',
      'Đối chiếu toàn bộ cụm ý với passage, rồi mới loại các đoạn có từ trùng nhưng sai người, '
      + 'sai thời gian hoặc sai thái độ.',
    ],
    confusions: [
      'Câu 1 vs câu 5: đều có like + games/play; câu 1 là chơi với con, câu 5 là thích game hiện đại khi trưởng thành.',
      'Câu 2 vs câu 5: đều nói về games nowadays/modern games; câu 2 hỏi độ khó, câu 5 hỏi sở thích.',
      'Câu 3 vs câu 7: đều liên quan trẻ em/chơi ngoài trời; câu 3 khóa người chơi cùng, câu 7 khóa mong muốn được ra ngoài.',
      'Câu 4 vs câu 6: đều là hoạt động hồi nhỏ trong nhà; một bên reading, một bên drawing/art.',
    ],
  },
};
