export type Track = "ACADEMIC" | "GENERAL_TRAINING";
export type Skill = "LISTENING" | "READING" | "WRITING" | "SPEAKING";
export type QuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE_NOT_GIVEN"
  | "YES_NO_NOT_GIVEN"
  | "MATCHING"
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "AUDIO_RECORDING";
export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options: { id: string; text: string }[];
  answers?: string[];
  explanation?: string;
  maxWords?: number;
  minWords?: number;
  responseSeconds?: number;
}
export interface Group {
  id: string;
  skill: Skill;
  part: number;
  title: string;
  instructions: string;
  passage: string;
  assetId?: string;
  questions: Question[];
}
export interface Exam {
  id?: string;
  version?: number;
  title: string;
  track: Track;
  fullLength: boolean;
  premium: boolean;
  published: boolean;
  groups: Group[];
}
export interface Summary {
  id: string;
  title: string;
  track: Track;
  fullLength: boolean;
  premium: boolean;
  skills: Skill[];
  questionCount: number;
}
export interface Answer {
  text?: string;
  selected?: string[];
  recordingAssetId?: string;
}
export interface Review {
  criteria: Record<string, number>;
  feedback: string;
  reviewedAt: string;
}
export interface Attempt {
  id: string;
  title: string;
  track: Track;
  status: "IN_PROGRESS" | "PENDING_REVIEW" | "COMPLETED";
  fullLength: boolean;
  groups: Group[];
  responses: Record<string, Answer>;
  version: number;
  activeSkill?: Skill;
  deadline?: string;
  scores: Partial<
    Record<
      Skill,
      { correct?: number; total: number; band?: number; state: string }
    >
  >;
  overallBand?: number;
  answers: Record<
    string,
    { acceptedAnswers: string[]; explanation: string; correct: boolean }
  >;
  reviews: Record<string, Review>;
}
export type AttemptSummary = Pick<
  Attempt,
  "id" | "title" | "track" | "status" | "scores" | "overallBand"
>;
export interface User {
  id: string;
  email: string;
  roles: string[];
  profile?: { fullName?: string };
  premiumActive: boolean;
}
export interface Page<T> {
  content: T[];
  totalPages: number;
  number: number;
}
export const skills: Skill[] = ["LISTENING", "READING", "WRITING", "SPEAKING"];
export const labels: Record<Skill, string> = {
  LISTENING: "Nghe",
  READING: "Đọc",
  WRITING: "Viết",
  SPEAKING: "Nói",
};
export const skillInfo: Record<Skill, string> = {
  LISTENING: "4 part · 40 câu hỏi",
  READING: "3 section · 40 câu hỏi",
  WRITING: "2 task · 60 phút",
  SPEAKING: "3 part · 11–14 phút",
};
export const wordCount = (text = "") =>
  text.trim() ? text.trim().split(/\s+/u).length : 0;
export function rubric(q: Question, part: number): string[] {
  return q.type === "AUDIO_RECORDING"
    ? [
        "fluencyCoherence",
        "lexicalResource",
        "grammarAccuracy",
        "pronunciation",
      ]
    : [
        part === 1 ? "taskAchievement" : "taskResponse",
        "coherenceCohesion",
        "lexicalResource",
        "grammarAccuracy",
      ];
}
