/**
 * Cấu trúc chuẩn của một bài thi Aptis.
 *
 * <p>Số đề mỗi part không phải muốn chọn bao nhiêu cũng được — bài thi thật có
 * cấu trúc cố định. Lấy đúng theo đề thi thử của hệ thống: mỗi part một đề, trừ
 * Listening Part 4 và Reading Part 2 là hai đề.
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
    { partCode: 'PART_1', questionSetCount: 1 },
    { partCode: 'PART_2', questionSetCount: 1 },
    { partCode: 'PART_3', questionSetCount: 1 },
    { partCode: 'PART_4', questionSetCount: 1 },
  ],
  LISTENING: [
    { partCode: 'PART_1', questionSetCount: 1 },
    { partCode: 'PART_2', questionSetCount: 1 },
    { partCode: 'PART_3', questionSetCount: 1 },
    // Part 4 gồm hai bài độc thoại riêng.
    { partCode: 'PART_4', questionSetCount: 2 },
  ],
  GRAMMAR_VOCABULARY: [
    { partCode: 'GRAMMAR', questionSetCount: 1 },
    { partCode: 'VOCABULARY', questionSetCount: 1 },
  ],
  READING: [
    { partCode: 'PART_1', questionSetCount: 1 },
    // Part 2 gồm hai đoạn cần sắp xếp.
    { partCode: 'PART_2', questionSetCount: 2 },
    { partCode: 'PART_3', questionSetCount: 1 },
    { partCode: 'PART_4', questionSetCount: 1 },
  ],
  WRITING: [
    { partCode: 'PART_1', questionSetCount: 1 },
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
  SPEAKING: 12,
  LISTENING: 40,
  GRAMMAR_VOCABULARY: 25,
  READING: 35,
  WRITING: 50,
};

/** Tổng thời lượng bài đủ 5 kỹ năng. */
export const FULL_TEST_MINUTES = FULL_TEST_ORDER.reduce(
  (total, code) => total + (SUGGESTED_MINUTES[code] ?? 0),
  0,
);
