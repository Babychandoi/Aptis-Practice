import type { QuestionSetContent } from '@/types/api';

/**
 * Trang luyện trọng điểm, chia theo đúng website gốc (không phải Part của kho):
 * reading-2-3 gộp hai Part web vào Part 2 kho, reading-4 là ghép ý kiến, reading-5
 * là ghép tiêu đề.
 */
export type MonthlyFocusPageKey =
  | 'listening-1' | 'listening-2' | 'listening-3' | 'listening-4'
  | 'reading-1' | 'reading-2-3' | 'reading-4' | 'reading-5'
  | 'speaking-1' | 'speaking-2' | 'speaking-3' | 'speaking-4'
  | 'writing';

export type MonthlyFocusResult = 'CORRECT' | 'WRONG' | 'DONE';

export interface MonthlyFocusTopic {
  topicKey: string;
  title: string;
  stars?: number | null;
  rank?: number | null;
  iconName?: string | null;
  color?: string | null;
  description?: string | null;
}

export interface MonthlyFocusItem {
  questionSetId: string;
  topicKey: string;
  clubPart?: number | null;
  version?: number | null;
  title: string | null;
  locked: boolean;
  /** Đã có đáp án và giải thích; vắng khi locked. */
  content?: QuestionSetContent | null;
}

export interface MonthlyFocusTip {
  title: string;
  description?: string | null;
  content: string[];
}

export interface MonthlyFocusPage {
  pageKey: MonthlyFocusPageKey;
  premium: boolean;
  freeLimit: number;
  topics: MonthlyFocusTopic[];
  items: MonthlyFocusItem[];
  tips: MonthlyFocusTip[];
}

export interface MonthlyFocusProgress {
  questionSetId: string;
  attempts: number;
  correctAttempts: number;
  lastResult?: MonthlyFocusResult | null;
}

export interface MonthlyFocusWritingOverview {
  predictDate?: string | null;
  hotTopics: string[];
  clubs: MonthlyFocusTopic[];
}
