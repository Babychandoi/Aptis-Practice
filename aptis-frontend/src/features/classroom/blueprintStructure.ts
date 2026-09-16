/**
 * Cấu trúc chuẩn của một bài thi Aptis.
 *
 * <p>Số đề mỗi part không phải muốn chọn bao nhiêu cũng được — bài thi thật có
 * cấu trúc cố định. Lấy đúng theo đề thi thử của hệ thống: mỗi part một đề, trừ
 * Speaking Part 1 là ba đề, Listening Part 4 và Reading Part 2 là hai đề.
 *
 * <p>Ép đúng cấu trúc ngay trên giao diện thay vì để giáo viên tự đếm: chọn
 * thừa hay thiếu thì bài thi ra không giống đề thật, mà học viên luyện để thi
 * thật.
 */
export interface PartSlot {
  /** Mã part trong hệ thống, ví dụ PART_1 hoặc GRAMMAR. */
  partCode: string;
  /** Số đề bài thi thật lấy ở part này. */
  questionSetCount: number;
}

/** Cấu trúc từng kỹ năng, khoá theo mã kỹ năng. */
export const SKILL_STRUCTURE: Record<string, PartSlot[]> = {
  SPEAKING: [
    // Part 1 hỏi ba câu cá nhân riêng, mỗi câu 30 giây.
    { partCode: 'PART_1', questionSetCount: 3 },
    { partCode: 'PART_2', questionSetCount: 1 },
    { partCode: 'PART_3', questionSetCount: 1 },
    { partCode: 'PART_4', questionSetCount: 1 },
  ],
  LISTENING: [
    // Part 1 nghe 13 đoạn ngắn, mỗi đoạn một đề riêng trong kho.
    { partCode: 'PART_1', questionSetCount: 13 },
    // Part 2 và 3 mỗi đề đã gồm sẵn 4 câu.
    { partCode: 'PART_2', questionSetCount: 1 },
    { partCode: 'PART_3', questionSetCount: 1 },
    // Part 4 gồm hai bài độc thoại riêng, mỗi bài 2 câu.
    { partCode: 'PART_4', questionSetCount: 2 },
  ],
  GRAMMAR_VOCABULARY: [
    // Mỗi câu là một đề riêng. Đề thật 25 câu ngữ pháp và 25 câu từ vựng, nhưng
    // kho mới có 5 đề từ vựng nên tạm lấy 5 — thêm đề thì sửa số này lên.
    { partCode: 'GRAMMAR', questionSetCount: 25 },
    { partCode: 'VOCABULARY', questionSetCount: 5 },
  ],
  READING: [
    { partCode: 'PART_1', questionSetCount: 1 },
    // Part 2 gồm hai đoạn cần sắp xếp.
    { partCode: 'PART_2', questionSetCount: 2 },
    { partCode: 'PART_3', questionSetCount: 1 },
    { partCode: 'PART_4', questionSetCount: 1 },
  ],
  WRITING: [
    // Part 1 trả lời năm câu ngắn, mỗi câu là một đề riêng trong kho.
    { partCode: 'PART_1', questionSetCount: 5 },
    { partCode: 'PART_2', questionSetCount: 1 },
    { partCode: 'PART_3', questionSetCount: 1 },
    { partCode: 'PART_4', questionSetCount: 1 },
  ],
};

/** Thứ tự kỹ năng trong bài thi đủ 5 kỹ năng, theo đúng thứ tự thi thật. */
export const FULL_TEST_ORDER = [
  'GRAMMAR_VOCABULARY',
  'READING',
  'LISTENING',
  'WRITING',
  'SPEAKING',
] as const;

/**
 * Thời lượng gợi ý, tính bằng phút.
 *
 * <p>Theo đề thi Aptis General thật. Giáo viên sửa được nếu muốn cho lớp nhiều
 * thời gian hơn.
 */
export const SUGGESTED_MINUTES: Record<string, number> = {
  // Bài Speaking của hệ thống để 30 phút, gồm cả thời gian đọc đề và chuẩn bị.
  SPEAKING: 30,
  LISTENING: 40,
  GRAMMAR_VOCABULARY: 25,
  READING: 35,
  WRITING: 50,
};

/**
 * Thời lượng bài đủ 5 kỹ năng.
 *
 * <p>Lấy thẳng con số bài thi thử đầy đủ của hệ thống (162 phút) chứ không cộng
 * dồn từng kỹ năng — cộng dồn ra 180 phút vì mỗi kỹ năng đều cộng thêm phần đọc
 * đề, mà thi liền mạch thì chỉ đọc một lần.
 */
export const FULL_TEST_MINUTES = 162;
