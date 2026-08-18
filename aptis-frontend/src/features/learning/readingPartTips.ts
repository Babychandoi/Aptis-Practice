/**
 * Mẹo chung cho từng Part của Reading — phần không phụ thuộc đề cụ thể.
 *
 * Reading Part 2 (sắp xếp câu) và Part 3 (ghép nhận định với người nói) dùng
 * cùng một bộ quy tắc cho mọi đề: nhận diện vai trò câu, cực nghĩa, đối tượng và
 * quan hệ logic. Khác Part 4, ở đây không cần bảng riêng từng đề.
 *
 * Nội dung lấy nguyên theo tài liệu chiến thuật biên tập cung cấp.
 */

export interface ParaphraseRow {
  /** Vai trò của câu trong đoạn, ví dụ "Câu mở / thông tin mới". */
  role: string;
  /** Từ khoá thường thấy ở đề, hiện dạng code cho dễ quét mắt. */
  cues: string[];
  /** Dấu hiệu nhận ra vai trò đó trong bài. */
  signals: string;
  /** Lỗi hay mắc khi dựa vào dấu hiệu này. */
  trap: string;
}

export interface PartTip {
  /** Số Part trong hệ thống (1..4). */
  part: number;
  eyebrow: string;
  title: string;
  intro: string;
  /** Câu nhắc chung, hiện ở khối vàng trên cùng. */
  goldenRule: string;
  rows: ParaphraseRow[];
  steps: string[];
  confusions: string[];
}

export const READING_PART_TIPS: PartTip[] = [
  {
    part: 1,
    eyebrow: 'Reading · Part 1',
    title: 'Điền từ bằng dấu vết ngữ pháp và cụm cố định',
    intro:
      'Mỗi câu chỉ có một chỗ trống và ba lựa chọn. Không cần hiểu cả câu — chỉ cần biết '
      + 'chỗ trống đòi loại từ nào và cụm nào đi cùng từ đứng cạnh.',
    goldenRule:
      'Đọc hết câu trước khi chọn. Xác định LOẠI TỪ cần điền, rồi thử từng lựa chọn vào '
      + 'chỗ trống và đọc thành tiếng trong đầu — cụm sai sẽ nghe gượng ngay.',
    rows: [
      {
        role: 'Danh từ sau mạo từ / giới từ',
        cues: ['the ___', 'a ___', 'in the ___', 'to the ___'],
        signals: 'Chỗ trống đứng sau a/an/the hoặc sau giới từ thì gần như chắc chắn là danh từ.',
        trap: 'Loại ngay động từ nguyên thể và tính từ; “to the walk” sai dù walk là từ quen.',
      },
      {
        role: 'Động từ theo chủ ngữ',
        cues: ['I ___', 'she ___', 'they ___'],
        signals: 'Sau chủ ngữ cần động từ; để ý chia số ít/số nhiều và thì của câu.',
        trap: 'Danh từ và động từ hay trùng dạng (run, walk, study) — quyết định bằng vị trí, không bằng nghĩa.',
      },
      {
        role: 'Tính từ sau be / trước danh từ',
        cues: ['is ___', 'are ___', '___ + danh từ'],
        signals: 'Sau to be hoặc trước một danh từ thì cần tính từ mô tả.',
        trap: 'Everyone is ___ cần tính từ (friendly), không nhận danh từ hay trạng từ.',
      },
      {
        role: 'Giới từ cố định',
        cues: ['good at', 'interested in', 'depend on', 'arrive at'],
        signals: 'Nhiều câu chỉ kiểm tra một cụm cố định; nhớ theo cụm chứ đừng dịch từng từ.',
        trap: 'Dịch nghĩa dễ chọn sai: “good in maths” nghe hợp lý tiếng Việt nhưng sai tiếng Anh.',
      },
      {
        role: 'Từ chỉ thời gian trong ngày',
        cues: ['in the morning', 'at night', 'on Monday'],
        signals: 'Chỗ trống nằm trong cụm thời gian; giới từ đi trước đã gợi ý loại từ cần điền.',
        trap: 'in the ___ + go running chỉ nhận từ chỉ thời điểm, không nhận friends hay leave.',
      },
      {
        role: 'Từ vựng theo ngữ cảnh',
        cues: ['shop, store, station, market'],
        signals: 'Ba lựa chọn cùng loại từ; phải chọn theo nghĩa hợp với phần còn lại của câu.',
        trap: 'Đọc trọn câu: “shoes in the ___ of one store” là window (tủ kính), không phải market.',
      },
      {
        role: 'Từ dễ nhìn nhầm',
        cues: ['melty vs noisy', 'quite vs quiet'],
        signals: 'Đề hay đặt một từ gần giống nhưng không tồn tại hoặc sai nghĩa hoàn toàn.',
        trap: 'Nếu một lựa chọn trông lạ và bạn chưa gặp bao giờ, khả năng cao đó là mồi nhử.',
      },
    ],
    steps: [
      'Đọc trọn câu một lượt, đừng dừng ở chỗ trống.',
      'Hỏi: chỗ này cần danh từ, động từ hay tính từ? Loại ngay các lựa chọn sai loại từ.',
      'Với các lựa chọn còn lại, thay vào và đọc lại cả câu — chọn phương án nghe tự nhiên nhất.',
    ],
    confusions: [
      'Danh từ vs động từ cùng dạng: run/walk/study — quyết định bằng vị trí trong câu.',
      'Tính từ vs trạng từ: sau be dùng tính từ (is friendly), sau động từ thường dùng trạng từ.',
      'Giới từ cố định: good AT, interested IN, arrive AT — học theo cụm, đừng suy từ tiếng Việt.',
      'Từ mồi nhử: lựa chọn nghe lạ tai thường là từ không tồn tại hoặc sai hoàn toàn ngữ cảnh.',
    ],
  },

  {
    part: 2,
    eyebrow: 'Reading · Part 2',
    title: 'Nối câu bằng dấu vết ngữ pháp',
    intro:
      'Đừng xếp theo cảm giác dịch. Hãy tìm câu mở, sau đó khóa từng cặp bằng đại từ, '
      + 'từ nối, thời gian và quan hệ nguyên nhân–kết quả.',
    goldenRule:
      'Đừng dò từ giống hệt. Hãy nhận diện vai trò, cực nghĩa, đối tượng và quan hệ '
      + 'logic rồi mới ghép cụm đồng nghĩa.',
    rows: [
      {
        role: 'Câu mở / thông tin mới',
        cues: ['a/an', 'tên riêng', 'chủ đề đầy đủ'],
        signals: 'Giới thiệu người/vật lần đầu; câu khái quát chưa cần ngữ cảnh trước.',
        trap: 'Câu mở thường không bắt đầu bằng it/this/they/these hoặc however.',
      },
      {
        role: 'Nhắc lại đối tượng',
        cues: ['the', 'this', 'that', 'these', 'they', 'he/she/it'],
        signals: 'Danh từ đầy đủ ở câu trước được rút thành mạo từ xác định hoặc đại từ.',
        trap: 'Không nối chỉ vì cùng một danh từ; đại từ phải đúng số ít/số nhiều và đúng đối tượng.',
      },
      {
        role: 'Trình tự thời gian',
        cues: ['first', 'before', 'after', 'then', 'later', 'finally'],
        signals: 'Mốc giờ/ngày/giai đoạn hoặc thì động từ tạo thành một mạch đường thời gian.',
        trap: 'Finally gần như không thể đứng trước; after cần một mốc đã nêu trước.',
      },
      {
        role: 'Nguyên nhân → kết quả',
        cues: ['because', 'since', 'lead to', 'so', 'therefore', 'as a result'],
        signals: 'Câu sau mô tả hệ quả, thay đổi hay phản ứng do câu trước gây ra.',
        trap: 'So và therefore không giới thiệu nguyên nhân; because thường mở phần lý do.',
      },
      {
        role: 'Tương phản / sửa ý',
        cues: ['but', 'however', 'although', 'instead', 'unlike'],
        signals: 'Cực nghĩa đổi hướng: tốt → xấu, phủ định → thực tế, trước đây → hiện nay.',
        trap: 'Hai câu cùng tiêu cực chưa chắc là cặp; phải có điểm đối lập cụ thể.',
      },
      {
        role: 'Bổ sung / ví dụ',
        cues: ['also', 'moreover', 'for example', 'another', 'in addition'],
        signals: 'Câu sau mở rộng đúng cùng một nhánh ý hoặc đưa ví dụ cho ý khái quát.',
        trap: 'For example phải có ý chung đứng trước; another cần một mục cùng loại đã nêu.',
      },
      {
        role: 'Kết luận / trạng thái cuối',
        cues: ['eventually', 'overall', 'this meant', 'in the end'],
        signals: 'Tóm kết kết quả, bài học hoặc trạng thái sau cả chuỗi sự kiện.',
        trap: 'Đừng đặt câu kết chỉ vì có từ tích cực; nó phải gom được mạch của các câu trước.',
      },
    ],
    steps: [
      'Gạch chân mọi từ chỉ ngược về trước: đại từ, the/this/another và từ nối.',
      'Ghép cặp chắc chắn trước (A→B), rồi ghép các thành chuỗi; không có đoán cả 5 câu một lần.',
      'Đọc lại toàn chuỗi và kiểm tra 4 lớp: chủ thể, thời gian, logic, số ít/số nhiều.',
    ],
    confusions: [
      'However vs therefore: however đổi cực; therefore đưa ra kết quả.',
      'A/an vs the: a/an giới thiệu mới; the nhắc lại điều người đọc đã biết.',
      'This/these: phải kể được chính xác một ý/danh từ ở câu ngay trước hoặc rất gần.',
      'Then/later: chỉ hợp lệ khi đã có mốc hoặc hành động trước đó.',
    ],
  },

  {
    part: 3,
    eyebrow: 'Reading · Part 3',
    title: 'Chống paraphrase bằng mạch toàn đoạn',
    intro:
      'Part 3 dùng cùng bank nối câu với Part 2 nhưng dễ bẫy hơn ở đồng nghĩa và mạch ý. '
      + 'Khóa cặp bằng nghĩa, rồi kiểm tra vai trò của câu trong toàn đoạn.',
    goldenRule:
      'Đừng dò từ giống hệt. Hãy nhận diện vai trò, cực nghĩa, đối tượng và quan hệ '
      + 'logic rồi mới ghép cụm đồng nghĩa.',
    rows: [
      {
        role: 'Chủ đề trung tâm',
        cues: ['topic noun / tên người', 'nơi chốn', 'sự kiện'],
        signals: 'Cụm ở câu sau có thể đổi sang từ bao quát, nghề nghiệp, đại từ hoặc cách gọi khác.',
        trap: 'Trùng một từ nhỏ không đủ chứng minh hai câu đi liền nhau.',
      },
      {
        role: 'Chuỗi đồng nghĩa',
        cues: ['improve/help', 'problem/issue', 'buy/purchase'],
        signals: 'Ý được lặp bằng đồng nghĩa, trái nghĩa phủ định hoặc danh từ hóa.',
        trap: 'Đừng chờ từ khóa xuất hiện nguyên văn; ưu tiên cùng ý và cùng cực nghĩa.',
      },
      {
        role: 'Chủ thể liên tục',
        cues: ['the singer→she', 'the project→it', 'staff→they'],
        signals: 'Tên đầy đủ chuyển thành vai trò, nhóm người, đại từ hoặc sở hữu từ.',
        trap: 'He/she có thể có nhiều ứng viên; chọn danh từ gần nhất hợp logic và giới tính.',
      },
      {
        role: 'Khái quát → chi tiết',
        cues: ['idea, plan, problem', '+ example/detail'],
        signals: 'Câu sau nêu ý lớn; câu kế giải thích cách làm, số liệu, ví dụ hoặc lý do.',
        trap: 'Ví dụ không thể đứng trước khi đối tượng chung chưa được giới thiệu.',
      },
      {
        role: 'Cũ → mới / thay đổi',
        cues: ['used to', 'no longer', 'now', 'become', 'change'],
        signals: 'Hai câu đối chiếu trạng thái trước và sau dù dùng từ vựng khác nhau.',
        trap: 'Now không tự động là câu cuối; nó thường đi ngay sau mô tả quá khứ.',
      },
      {
        role: 'Kỳ vọng → thực tế',
        cues: ['wanted/planned/expected', '+ but/actually'],
        signals: 'Dự định bị sửa, thất bại hoặc kết quả bất ngờ ở câu kế.',
        trap: 'Phân biệt kết quả bất ngờ với kết quả trực tiếp dùng so/therefore.',
      },
      {
        role: 'Đóng đoạn',
        cues: ['result', 'lesson', 'benefit', 'future plan'],
        signals: 'Câu cuối thường paraphrase lại mục tiêu mở đầu ở mức khái quát hơn.',
        trap: 'Một câu có finally vẫn sai nếu chủ thể hoặc thời gian không nối được.',
      },
    ],
    steps: [
      'Viết cạnh mỗi câu một nhãn ngắn: MỞ, GIẢI THÍCH, VÍ DỤ, ĐỔI HƯỚNG hay KẾT.',
      'Đánh dấu cực nghĩa (+/−/trung tính) và đường thời gian trước khi ghép các cặp đồng nghĩa.',
      'Sau khi xếp, che số thứ tự và đọc như một đoạn thật: mỗi đại từ/từ nối phải có điểm tựa rõ ràng.',
    ],
    confusions: [
      'Cùng chủ đề vs cùng mạch: hai câu nói về AI chưa chắc đứng cạnh nếu một câu là lịch sử, một câu là kết luận.',
      'Đồng nghĩa vs lặp từ: repeated word là tín hiệu yếu; quan hệ logic mới là tín hiệu mạnh.',
      'But vs although: but thường nối hai mệnh đề/câu; although báo trước một nhượng bộ cần ý chính.',
      'Result vs example: result trả lời “điều gì xảy ra sau đó”; example trả lời “cụ thể là gì”.',
    ],
  },
];
