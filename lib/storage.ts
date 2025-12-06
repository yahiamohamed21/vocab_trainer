// lib/storage.ts
import { AppState, Stats, Word, AdminUser, InviteCode, LanguageId } from './types';
import {
  STORAGE_KEY_LANG,
  STORAGE_KEY_STATS,
  STORAGE_KEY_WORDS,
  STORAGE_KEY_USERS,
  STORAGE_KEY_INVITES,
  STORAGE_KEY_ENABLED_LANGS,
  STORAGE_KEY_APP_LANGUAGES,
  DEFAULT_LANGUAGES,
} from './constants';
import type { LanguageConfig } from './constants';

/* =============================
      SAFE LOCAL STORAGE
============================= */
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
    // ignore quota errors
  }
}

/* =============================
      WORDS
============================= */
export function loadWords(): Word[] {
  const raw = safeGetItem(STORAGE_KEY_WORDS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* =============================
      STATS
============================= */
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
    const parsed = JSON.parse(raw);
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

/* =============================
      SAVE GLOBAL APP STATE
============================= */
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

/* =============================
      CURRENT LANGUAGE
============================= */
export function loadCurrentLanguage(
  defaultId: AppState['currentLanguageId']
): AppState['currentLanguageId'] {
  const raw = safeGetItem(STORAGE_KEY_LANG);
  return raw || defaultId;
}

/* =============================
      USERS (ADMIN SYSTEM)
============================= */
export function loadUsers(): AdminUser[] {
  const raw = safeGetItem(STORAGE_KEY_USERS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveUsers(users: AdminUser[]) {
  safeSetItem(STORAGE_KEY_USERS, JSON.stringify(users));
}

/* =============================
      INVITE CODES
============================= */
export function loadInviteCodes(): InviteCode[] {
  const raw = safeGetItem(STORAGE_KEY_INVITES);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveInviteCodes(codes: InviteCode[]) {
  safeSetItem(STORAGE_KEY_INVITES, JSON.stringify(codes));
}

/* =============================
      ENABLED LANGUAGES
   (لو حابب تستخدمها لاحقاً
    لتفعيل/تعطيل لغات معيّنة)
============================= */

export function loadEnabledLanguages(): LanguageId[] {
  const raw = safeGetItem(STORAGE_KEY_ENABLED_LANGS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id: unknown): id is LanguageId => typeof id === 'string');
  } catch {
    return [];
  }
}

export function saveEnabledLanguages(ids: LanguageId[]) {
  safeSetItem(STORAGE_KEY_ENABLED_LANGS, JSON.stringify(ids));
}

/* =============================
      APP LANGUAGES (ADMIN)
   قائمة اللغات اللي الأدمن
   يقدر يعدّلها (إضافة/حذف)
============================= */

export function loadAppLanguages(): LanguageConfig[] {
  const raw = safeGetItem(STORAGE_KEY_APP_LANGUAGES);
  if (!raw) return DEFAULT_LANGUAGES;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_LANGUAGES;

    const cleaned: LanguageConfig[] = parsed
      .filter(
        (item: any) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.label === 'string' &&
          typeof item.nativeLabel === 'string' &&
          typeof item.ttsCode === 'string'
      )
      .map((item: any) => ({
        id: item.id,
        label: item.label,
        nativeLabel: item.nativeLabel,
        ttsCode: item.ttsCode,
      }));

    return cleaned.length ? cleaned : DEFAULT_LANGUAGES;
  } catch {
    return DEFAULT_LANGUAGES;
  }
}

export function saveAppLanguages(langs: LanguageConfig[]) {
  safeSetItem(STORAGE_KEY_APP_LANGUAGES, JSON.stringify(langs));
}
