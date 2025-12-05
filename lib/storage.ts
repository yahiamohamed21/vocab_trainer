// lib/storage.ts
import { AppState, Stats, Word, AdminUser } from './types';
import {
  STORAGE_KEY_LANG,
  STORAGE_KEY_STATS,
  STORAGE_KEY_WORDS,
  STORAGE_KEY_USERS,
} from './constants';

// wrapper آمن على localStorage
export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // تجاهل أي خطأ في الكوته
  }
}

// ===== الكلمات / الإحصائيات =====

export function loadWords(): Word[] {
  const raw = safeGetItem(STORAGE_KEY_WORDS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Word[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadStats(): Stats {
  const raw = safeGetItem(STORAGE_KEY_STATS);
  if (!raw) {
    return {
      totalQuestions: 0,
      correctAnswers: 0,
      lastQuizDate: null,
    };
  }
  try {
    const parsed = JSON.parse(raw) as Stats;
    return {
      totalQuestions: parsed.totalQuestions ?? 0,
      correctAnswers: parsed.correctAnswers ?? 0,
      lastQuizDate: parsed.lastQuizDate ?? null,
    };
  } catch {
    return {
      totalQuestions: 0,
      correctAnswers: 0,
      lastQuizDate: null,
    };
  }
}

// حفظ الكلمات + الإحصائيات + اللغة الحالية
export function persistState(
  words: Word[],
  stats: Stats,
  currentLanguageId: AppState['currentLanguageId']
): Stats {
  safeSetItem(STORAGE_KEY_WORDS, JSON.stringify(words));
  safeSetItem(STORAGE_KEY_STATS, JSON.stringify(stats));
  safeSetItem(STORAGE_KEY_LANG, currentLanguageId);
  return stats;
}

export function loadCurrentLanguage(
  defaultId: AppState['currentLanguageId']
): AppState['currentLanguageId'] {
  const raw = safeGetItem(STORAGE_KEY_LANG);
  if (!raw) return defaultId;
  return raw;
}

// ===== المستخدمون (للـ Admin Dashboard) =====

// تحميل كل المستخدمين
export function loadUsers(): AdminUser[] {
  const raw = safeGetItem(STORAGE_KEY_USERS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AdminUser[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

// حفظ كل المستخدمين
export function saveUsers(users: AdminUser[]) {
  safeSetItem(STORAGE_KEY_USERS, JSON.stringify(users));
}
