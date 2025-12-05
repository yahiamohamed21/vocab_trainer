// lib/constants.ts
import type { LanguageId } from './types';

export interface LanguageConfig {
  id: LanguageId;
  label: string;        // اسم اللغة بالإنجليزي
  nativeLabel: string;  // اسم اللغة بلغتها
  ttsCode: string;      // كود اللغة لنطق TTS
}

// اللغات المتاحة في التطبيق
export const LANGUAGES: LanguageConfig[] = [
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

// مفاتيح التخزين في localStorage
export const STORAGE_KEY_WORDS = 'vocab_trainer_words_v1';
export const STORAGE_KEY_STATS = 'vocab_trainer_stats_v1';
export const STORAGE_KEY_LANG  = 'vocab_trainer_current_lang_v1';
export const STORAGE_KEY_USERS = 'vocab_trainer_admin_users_v1'; // المستخدمين (للأدمن)
