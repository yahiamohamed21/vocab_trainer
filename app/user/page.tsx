// app/user/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe2, SunMedium, MoonStar } from 'lucide-react';
import LanguageSelector from '@/components/LanguageSelector';
import Tabs, { TabId } from '@/components/Tabs';
import TrainingView from '@/components/views/TrainingView';
import WordsView from '@/components/views/WordsView';
import QuizView from '@/components/views/QuizView';
import StatsView from '@/components/views/StatsView';
import { useUiSettings } from '@/context/UiSettingsContext';
import { useAuth } from '@/context/AuthContext';

export default function UserHomePage() {
  const [tab, setTab] = useState<TabId>('training');
  const { uiLang, setUiLang, theme, setTheme } = useUiSettings();
  const { user, loading } = useAuth();
  const router = useRouter();

  const isAr = uiLang === 'ar';
  const isDark = theme === 'dark';

  // توجيه المستخدم غير المسجل إلى صفحة تسجيل الدخول
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  // أثناء التحميل أو في لحظة التوجيه لا نعرض محتوى الصفحة
  if (loading || (!user && typeof window !== 'undefined')) {
    return null;
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
                  onClick={() => setUiLang('ar')}
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
                  onClick={() => setUiLang('en')}
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
                  onClick={() => setTheme('light')}
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
                  onClick={() => setTheme('dark')}
                  className={[
                    'px-2.5 py-0.5 text-[10px] font-medium flex items-center gap-1 transition-colors',
                    isDark
                      ? 'bg-slate-200 text-slate-900 shadow'
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

        <LanguageSelector />
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
