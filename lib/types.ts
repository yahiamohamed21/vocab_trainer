// lib/types.ts

export type LanguageId = string;

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

export interface Stats {
  totalQuestions: number;
  correctAnswers: number;
  lastQuizDate: string | null;
}

export interface AppState {
  words: Word[];
  stats: Stats;
  currentLanguageId: LanguageId;
}


export interface AdminUser {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
  languages: LanguageId[];      // اللغات المسموح بها
  role: 'admin' | 'user';       // نوع الحساب
}
