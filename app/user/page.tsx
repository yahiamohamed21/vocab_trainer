// app/user/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Globe2, SunMedium, MoonStar } from 'lucide-react';

import LanguageSelector from '@/components/LanguageSelector';
import Tabs, { TabId } from '@/components/Tabs';
import TrainingView from '@/components/views/TrainingView';
import WordsView from '@/components/views/WordsView';
import QuizView from '@/components/views/QuizView';
import StatsView from '@/components/views/StatsView';

import { useUiSettings } from '@/context/UiSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { useGuestTrial } from '@/hooks/useGuestTrial';
import { post, ApiError } from '@/lib/api/httpClient';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://vocabtrainerapi.runasp.net';

const SESSION_STORAGE_KEY = 'vocab_trainer_session_user';

// نفس الهيلبر بتاع صفحة الأدمن
function getAccessTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    if (parsed && typeof parsed === 'object') {
      if (parsed.accessToken) return parsed.accessToken as string;
      if (parsed.token) return parsed.token as string;
      if (parsed.jwt) return parsed.jwt as string;
    }
  } catch {
    return null;
  }
  return null;
}

async function patchAccountSettings(body: {
  uiLanguage?: string | null;
  theme?: string | null;
}) {
  const token = getAccessTokenFromStorage();
  if (!token) return;

  try {
    await fetch(`${API_BASE_URL}/api/account/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch (err) {
    console.error('Failed to update account settings', err);
  }
}

export default function UserHomePage() {
  // ✅ كل الهوكس فوق قبل أي return
  const [tab, setTab] = useState<TabId>('training');
  const { uiLang, setUiLang, theme, setTheme } = useUiSettings();
  const { user, loading } = useAuth();

  const isAr = uiLang === 'ar';
  const isDark = theme === 'dark';
  const isGuest = !user;

  // اللغات المسموح بيها لليوزر ده من الـ backend
  const [allowedLangIds, setAllowedLangIds] = useState<string[] | null>(null);
  const [allowedLoading, setAllowedLoading] = useState(false);
  const [allowedError, setAllowedError] = useState<string | null>(null);

  useGuestTrial(isGuest);

  // ✅ تحميل اللغات المسموح بها من الباك (relative endpoint)
  useEffect(() => {
    let cancelled = false;

    const loadAllowed = async () => {
      // ضيف → مفيش allowedLanguages من الباك
      if (!user) {
        if (!cancelled) {
          setAllowedLangIds(null);
          setAllowedError(null);
          setAllowedLoading(false);
        }
        return;
      }

      setAllowedLoading(true);
      setAllowedError(null);

      try {
        // endpoint بتاع الباك: POST /api/languages/allowed body فاضي
        const data = await post<any>('/api/languages/allowed', {});
        if (cancelled) return;

        const payload = data?.data ?? data ?? null;

        let ids: string[] = [];

        if (Array.isArray(payload)) {
          if (payload.length > 0 && typeof payload[0] === 'string') {
            ids = payload as string[];
          } else {
            ids = payload
              .map((x: any) => x?.id || x?.languageId || x?.code || null)
              .filter((x: any) => typeof x === 'string');
          }
        }

        setAllowedLangIds(ids.length ? ids : null);
      } catch (err) {
        console.error('Allowed languages error', err);
        if (cancelled) return;

        let msg =
          isAr
            ? 'تعذر الاتصال بالخادم أثناء تحميل اللغات.'
            : 'Could not contact server to load languages.';

        if (err instanceof ApiError && err.message) {
          msg = err.message;
        }

        setAllowedError(msg);
        setAllowedLangIds(null);
      } finally {
        if (!cancelled) setAllowedLoading(false);
      }
    };

    loadAllowed();

    return () => {
      cancelled = true;
    };
  }, [user, isAr]);

  // تغيير لغة الواجهة + حفظ في الباك لو فيه يوزر حقيقي
  const handleUiLangChange = async (lang: 'ar' | 'en') => {
    setUiLang(lang);
    if (!user) return;
    await patchAccountSettings({ uiLanguage: lang });
  };

  // تغيير الثيم + حفظ في الباك لو فيه يوزر حقيقي
  const handleThemeChange = async (nextTheme: 'light' | 'dark') => {
    setTheme(nextTheme);
    if (!user) return;
    await patchAccountSettings({ theme: nextTheme });
  };

  // ✅ loading UI بعد الهوكس
  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-4 mt-6 mb-10">
        <div
          className={[
            'panel panel-muted rounded-2xl border px-5 py-6 text-center text-sm',
            isDark ? 'text-slate-200' : 'text-slate-700',
          ].join(' ')}
        >
          {isAr ? 'جاري التحميل...' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-4 mt-6 mb-10">
      <header className="mb-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          {/* عنوان الموقع */}
          <div className="flex-1 text-center md:text-right">
            <h1
              className={`text-2xl md:text-3xl font-bold ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              {isAr ? 'تطبيق حفظ ونطق الكلمات' : 'Word Pronunciation Trainer'}
            </h1>

            <p
              className={`text-xs md:text-sm mt-1 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              {isAr
                ? 'تدريب على النطق، إدارة الكلمات، تمارين، وإحصائيات بسيطة – مع دعم عدة لغات.'
                : 'Practice pronunciation, manage words, quizzes, and stats – with multi-language support.'}
            </p>

            {/* حالة تحميل/خطأ اللغات المسموح بها */}
            {allowedLoading && (
              <p className="mt-1 text-[10px] text-slate-500">
                {isAr ? 'جاري تحميل اللغات المسموح بها...' : 'Loading allowed languages...'}
              </p>
            )}
            {allowedError && (
              <p className={`mt-1 text-[10px] ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>
                {allowedError}
              </p>
            )}
          </div>

          {/* سويتش اللغة والثيم */}
          <div className="flex flex-col items-end gap-2">
            {/* سويتش لغة الواجهة */}
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-[10px] md:text-[11px] shadow-sm">
              <span className="inline-flex items-center gap-1 text-slate-400">
                <Globe2 size={14} />
                {isAr ? 'لغة الواجهة' : 'UI language'}
              </span>

              <div className="flex rounded-full bg-slate-950/80 border border-slate-700 overflow-hidden">
                <button
                  onClick={() => handleUiLangChange('ar')}
                  className={[
                    'px-2.5 py-0.5 text-[10px] font-medium transition-colors',
                    isAr
                      ? 'bg-sky-500 text-slate-950 shadow'
                      : 'text-slate-300 hover:bg-slate-800/80',
                  ].join(' ')}
                >
                  عربي
                </button>

                <button
                  onClick={() => handleUiLangChange('en')}
                  className={[
                    'px-2.5 py-0.5 text-[10px] font-medium transition-colors',
                    !isAr
                      ? 'bg-sky-500 text-slate-950 shadow'
                      : 'text-slate-300 hover:bg-slate-800/80',
                  ].join(' ')}
                >
                  English
                </button>
              </div>
            </div>

            {/* سويتش الوضع (لايت/دارك) */}
            <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-[10px] md:text-[11px] shadow-sm">
              <span className="inline-flex items-center gap-1 text-slate-400">
                {isDark ? <MoonStar size={14} /> : <SunMedium size={14} />}
                {isAr ? 'وضع الألوان' : 'Theme'}
              </span>

              <div className="flex rounded-full bg-slate-950/80 border border-slate-700 overflow-hidden">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={[
                    'px-2.5 py-0.5 text-[10px] font-medium flex items-center gap-1 transition-colors',
                    !isDark
                      ? 'bg-amber-400 text-slate-900 shadow'
                      : 'text-slate-300 hover:bg-slate-800/80',
                  ].join(' ')}
                >
                  <SunMedium size={12} />
                  {isAr ? 'فاتح' : 'Light'}
                </button>

                <button
                  onClick={() => handleThemeChange('dark')}
                  className={[
                    'px-2.5 py-0.5 text-[10px] font-medium flex items-center gap-1 transition-colors',
                    isDark
                      ? 'bg-slate-800 text-slate-900 shadow'
                      : 'text-slate-300 hover:bg-slate-800/80',
                  ].join(' ')}
                >
                  <MoonStar size={12} />
                  {isAr ? 'داكن' : 'Dark'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* important: مرّر اللغات المسموح بها للـ LanguageSelector */}
        <LanguageSelector allowedLanguageIds={allowedLangIds ?? undefined} />
        <Tabs currentTab={tab} onChange={setTab} />
      </header>

      <main className="panel panel-muted rounded-2xl border px-5 py-5 md:px-6 md:py-6">
        {tab === 'training' && <TrainingView />}
        {tab === 'words' && <WordsView />}
        {tab === 'quiz' && <QuizView />}
        {tab === 'stats' && <StatsView />}
      </main>
    </div>
  );
}
