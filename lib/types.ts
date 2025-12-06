// lib/types.ts

export type LanguageId = string;

/* ======================
      WORD
====================== */
export interface Word {
  id: string;
  text: string;
  translation: string;
  example: string;
  languageId: LanguageId;
  createdAt: string;
  lastReviewed: string | null;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  topic: string;
  intervalDays?: number | null;
  nextReviewAt?: string | null;
  recordingUrl?: string | null;
}

/* ======================
      STATS
====================== */
export interface Stats {
  totalQuestions: number;
  correctAnswers: number;
  lastQuizDate: string | null;
}

/* ======================
      APP STATE
====================== */
export interface AppState {
  words: Word[];
  stats: Stats;
  currentLanguageId: LanguageId;
}

/* ======================
      ADMIN USER
====================== */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;

  // في نظام الدعوات الجديد:
  // اليوزر يتسجل بدون لغات، ولما يدخل Invite Code يأخذ لغاته
  languages: LanguageId[];

  role: 'admin' | 'user';

  // لو الحساب غير مفعل → لازم يدخل Invite Code
  activated?: boolean;
}

/* ======================
      INVITE CODE
====================== */
export interface InviteCode {
  code: string;
  languages: LanguageId[];
  createdAt: string;
  used: boolean;
  usedBy: string | null; // userId
}
