// lib/constants.ts
import type { LanguageId } from './types';

export interface LanguageConfig {
  id: LanguageId;
  label: string;        // اسم اللغة بالإنجليزي
  nativeLabel: string;  // اسم اللغة بلغتها
  ttsCode: string;      // كود اللغة لنطق TTS
}

/**
 * اللغات الافتراضية في التطبيق
 * نستخدمها كقائمة أساس (fallback) لو مفيش لغات متخزنة في localStorage
 */
export const DEFAULT_LANGUAGES: LanguageConfig[] = [
  {
    id: 'en',
    label: 'English',
    nativeLabel: 'English',
    ttsCode: 'en-US',
  },
  {
    id: 'de',
    label: 'German',
    nativeLabel: 'Deutsch',
    ttsCode: 'de-DE',
  },
  {
    id: 'fr',
    label: 'French',
    nativeLabel: 'Français',
    ttsCode: 'fr-FR',
  },
  {
    id: 'es',
    label: 'Spanish',
    nativeLabel: 'Español',
    ttsCode: 'es-ES',
  },
  {
    id: 'it',
    label: 'Italian',
    nativeLabel: 'Italiano',
    ttsCode: 'it-IT',
  },
  {
    id: 'ar',
    label: 'Arabic',
    nativeLabel: 'العربية',
    ttsCode: 'ar-SA',
  },
];

/**
 * للحفاظ على التوافق مع الكود القديم:
 * LANGUAGES تبدأ باللغات الافتراضية، وبعد كده
 * تقدر تستخدم loadAppLanguages من storage علشان تجيب النسخة المعدّلة.
 */
export const LANGUAGES: LanguageConfig[] = DEFAULT_LANGUAGES;

// مفاتيح التخزين في localStorage
export const STORAGE_KEY_WORDS = 'vocab_trainer_words_v1';
export const STORAGE_KEY_STATS = 'vocab_trainer_stats_v1';
export const STORAGE_KEY_LANG  = 'vocab_trainer_current_lang_v1';
export const STORAGE_KEY_USERS = 'vocab_trainer_admin_users_v1';
export const STORAGE_KEY_INVITES = 'vocab_trainer_invite_codes_v1';

// لغات مفعّلة/معطّلة (لو حابب تستخدم feature الـ enable/disable)
export const STORAGE_KEY_ENABLED_LANGS = 'vocab_trainer_enabled_langs_v1';

// قائمة لغات التطبيق اللي الأدمن يقدر يعدّلها (إضافة/حذف)
export const STORAGE_KEY_APP_LANGUAGES = 'vocab_trainer_app_languages_v1';

/**
 * إعدادات تجربة الضيف (Guest Trial)
 */

// مدة تجربة الضيف بالدقائق
export const GUEST_TRIAL_MINUTES = 10;

// مفتاح تخزين جلسة الضيف (بداية وقت التجربة)
export const STORAGE_KEY_GUEST_SESSION = 'vocab_trainer_guest_session_v1';

// فلَج بيحدد إن التجربة المجانية استُخدمت قبل كده (مرة واحدة فقط)
export const STORAGE_KEY_GUEST_TRIAL_USED =
  'vocab_trainer_guest_trial_used_v1';
