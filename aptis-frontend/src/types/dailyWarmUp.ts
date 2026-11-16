/** Bài khởi động hằng ngày ở trang chủ (GET /daily-warm-up). */
export interface DailyWarmUp {
  dayKey: string;
  /** TYPING: gõ câu Writing; SPEAKING: Speaking Marathon; NONE: chưa có dữ liệu. */
  mode: 'TYPING' | 'SPEAKING' | 'NONE';
  part?: number;
  items: WarmUpTypingItem[];
  questions: MarathonQuestion[];
}

export interface WarmUpTypingItem {
  id: string;
  prompt: string;
  text: string;
}

export interface MarathonQuestion {
  id: string;
  groupId?: string;
  question: string;
  questionVi?: string;
  ideas: string[];
  ideasVi: string[];
  sentences: string[];
  sentencesVi: string[];
  images: string[];
}
