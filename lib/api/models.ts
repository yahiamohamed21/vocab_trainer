// lib/api/models.ts
// TS models matching backend request schemas + assumed response shapes.

export interface Result {
  succeeded: boolean;
  errorCode?: string | null;
  message?: string | null;
}

/* ===================== Auth & Account ===================== */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterWithCodeRequest {
  name: string;
  email: string;
  password: string;
  code: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface UpdateSettingsRequest {
  uiLanguage?: string | null;
  currentLanguageId?: string | null;
  theme?: string | null;
  ttsSpeed?: number | null;
  ttsRepeatCount?: number | null;
  ttsVoiceId?: string | null;
}

// Assumed backend user shape (based on AdminUpdateUserRequest + account settings)
export interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: string; // e.g. "User" | "Admin"
  isGuest?: boolean;
  emailConfirmed?: boolean;

  allowedLanguages?: string[] | null;
  currentLanguageId?: string | null;

  uiLanguage?: string | null;
  theme?: string | null;

  ttsSpeed?: number | null;
  ttsRepeatCount?: number | null;
  ttsVoiceId?: string | null;
}

// Assumed auth response shape.
// Adjust property names if your backend returns different ones (e.g. "token", "refreshToken").
export interface AuthResponse {
  user: BackendUser;
  accessToken: string;
  refreshToken: string;
}

/* ===================== Languages & Bootstrap ===================== */

export interface AllowedLanguagesRequest {
  // empty body
}

export interface LanguageDto {
  id: string;
  nameEn: string;
  isActive: boolean;
}

/* ===================== Words ===================== */

export interface WordsQuery {
  languageId: string;
  search?: string | null;
  topic?: string | null;
}

export interface CreateWordRequest {
  languageId: string;
  text: string;
  translation?: string | null;
  example?: string | null;
  topic?: string | null;
}

export interface UpdateWordBodyRequest {
  id: string; // uuid
  data: {
    text?: string | null;
    translation?: string | null;
    example?: string | null;
    topic?: string | null;
  };
}

export interface DeleteWordRequest {
  wordId: string; // uuid
}

export interface SaveRecordingRequest {
  wordId: string; // uuid
  base64Audio: string;
  fileExt?: string | null;
}

export interface GetRecordingRequest {
  wordId: string; // uuid
}

// Assumed word DTO shape (align to your existing Word type later)
export interface WordDto {
  id: string;
  languageId: string;
  text: string;
  translation?: string | null;
  example?: string | null;
  topic?: string | null;
  // Additional spaced-repetition fields might exist; add as needed.
}

/* ===================== Quiz ===================== */

export interface CreateQuizSessionRequest {
  languageId: string;
  mode: number; // 0=All, 1=Due, 2=New etc.
  topicFilter?: string | null;
}

export interface NextQuizRequest {
  sessionId: string; // uuid
}

export interface AnswerQuizBodyRequest {
  sessionId: string; // uuid
  wordId: string; // uuid
  selectedAnswer: string;
  responseTimeMs: number;
}

export interface SessionBodyRequest {
  sessionId: string; // uuid
}

// Assumed quiz models – adjust to match backend
export interface QuizSessionSummary {
  sessionId: string;
  totalQuestions: number;
  answered: number;
  correct: number;
  incorrect: number;
  // add fields as your Stats/QuizView require
}

export interface QuizOption {
  value: string;
  isCorrect?: boolean;
}

export interface QuizQuestion {
  sessionId: string;
  wordId: string;
  prompt: string; // e.g. the word or translation
  options: QuizOption[];
}

/* ===================== Translate / TTS ===================== */

export interface TranslateRequest {
  text: string;
  from: string;
  to: string;
}

export interface TranslateResponse {
  translatedText: string;
}

export interface TtsRequest {
  text: string;
  languageCode?: string | null;
  repeat?: number | null;
  rate?: number | null;
  voiceName?: string | null;
}

/* ===================== Stats ===================== */

export interface StatsSummaryRequest {
  languageId: string;
}

// Assumed stats summary; align with your StatsView expectations
export interface StatsSummary {
  totalWords: number;
  learnedWords: number;
  dueToday: number;
  sessionsCompleted: number;
  // add more as needed
}

/* ===================== Admin: Languages ===================== */

export interface AdminListRequest {
  // empty body
}

export interface ToggleLanguageRequest {
  id: string;
  active: boolean;
}

export interface AddLanguageByNameRequest {
  nameEn: string;
  isActive?: boolean | null;
}

/* ===================== Admin: Users ===================== */

export interface AdminUpdateUserRequest {
  name?: string | null;
  email?: string | null;
  role?: string | null;

  isGuest?: boolean | null;
  emailConfirmed?: boolean | null;

  allowedLanguages?: string[] | null;
  currentLanguageId?: string | null;

  uiLanguage?: string | null;
  theme?: string | null;

  ttsSpeed?: number | null;
  ttsRepeatCount?: number | null;
  ttsVoiceId?: string | null;

  newPassword?: string | null;
}

export interface UpdateUserBodyRequest {
  id: string; // uuid
  data: AdminUpdateUserRequest;
}

export interface ResetPasswordRequest {
  id: string; // uuid
  newPassword: string;
}

export interface DeleteUserRequest {
  id: string; // uuid
}

// Assumed admin user list item; map to your existing AdminUser type
export interface AdminUserDto extends BackendUser {
  createdAt?: string;
  lastLoginAt?: string;
}

/* ===================== Admin: Codes ===================== */

export interface GenerateInviteCodesRequest {
  count: number;
}

export interface GenerateLanguageCodesRequest {
  languageId: string;
  count: number;
}

export interface ListCodesRequest {
  type: number; // CodesType enum
}

export interface DisableCodeRequest {
  id: string; // uuid
}

export interface CodeDto {
  id: string;
  code: string;
  type: number;
  languageId?: string | null;
  isActive: boolean;
  usedByUserId?: string | null;
  createdAt: string;
  usedAt?: string | null;
}
