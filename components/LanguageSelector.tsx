// components/LanguageSelector.tsx
'use client';

import { useEffect, useMemo } from 'react';
import { LANGUAGES } from '@/lib/constants';
import { useAppState } from '@/context/AppStateContext';
import { useUiSettings } from '@/context/UiSettingsContext';
import { useAuth } from '@/context/AuthContext';
import type { LanguageId } from '@/lib/types';

export default function LanguageSelector() {
  const { currentLanguageId, setCurrentLanguageId } = useAppState();
  const { uiLang } = useUiSettings();
  const { user } = useAuth();

  const isAr = uiLang === 'ar';
  const isAdmin = user?.role === 'admin';

  // حساب اللغات المسموح بها حسب اليوزر
  const allowedLanguageIds: LanguageId[] = useMemo(() => {
    // لو مفيش يوزر (ضيف) أو يوزر أدمن → كل اللغات متاحة
    if (!user || isAdmin) {
      return LANGUAGES.map(l => l.id);
    }

    // لو يوزر عادي: نستخدم اللغات اللي محددها له الأدمن
    if (!user.languages || user.languages.length === 0) {
      return LANGUAGES.map(l => l.id);
    }

    const validIds = new Set(LANGUAGES.map(l => l.id));
    const filtered = user.languages.filter(id => validIds.has(id));

    // لو الأدمن حاطط IDs مش موجودة في LANGUAGES لأي سبب → fallback لكل اللغات
    return filtered.length > 0 ? filtered : LANGUAGES.map(l => l.id);
  }, [user, isAdmin]);

  // اللغات اللي فعلاً هتظهر في السيلكتور
  const visibleLanguages = useMemo(
    () => LANGUAGES.filter(lang => allowedLanguageIds.includes(lang.id)),
    [allowedLanguageIds]
  );

  // تأمين: لو اللغة الحالية مش ضمن المسموح → نغيرها لأوّل لغة متاحة
  useEffect(() => {
    if (!visibleLanguages.length) return;
    const exists = visibleLanguages.some(l => l.id === currentLanguageId);
    if (!exists) {
      setCurrentLanguageId(visibleLanguages[0].id);
    }
  }, [currentLanguageId, visibleLanguages, setCurrentLanguageId]);

  // اللغة الحالية لعرض النص تحت الزرار
  const current =
    visibleLanguages.find(l => l.id === currentLanguageId) ||
    visibleLanguages[0] ||
    LANGUAGES[0];

  const isGuest = !user;

  const mainLine = isAr
    ? 'لغة التدريب الحالية: '
    : 'Current training language: ';

  const extraLine = isGuest
    ? isAr
      ? 'جميع اللغات متاحة لأنك تستخدم التطبيق كضيف.'
      : 'All languages are available because you are using the app as a guest.'
    : isAdmin
    ? isAr
      ? 'يمكنك الوصول إلى جميع اللغات بصلاحيات الأدمن.'
      : 'You can access all languages as an admin.'
    : isAr
    ? `يمكنك الوصول إلى ${visibleLanguages.length} لغة حددها لك الأدمن.`
    : `You can access ${visibleLanguages.length} languages assigned by the admin.`;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex flex-wrap justify-center gap-2">
        {visibleLanguages.map(lang => {
          const active = lang.id === currentLanguageId;
          return (
            <button
              key={lang.id}
              onClick={() => setCurrentLanguageId(lang.id)}
              className={[
                'group relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] sm:text-xs font-medium transition-all',
                active
                  ? 'border-sky-400 bg-slate-950/80 text-sky-50 shadow-[0_0_18px_rgba(56,189,248,0.6)]'
                  : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500 hover:bg-slate-800/80',
              ].join(' ')}
            >
              <span
                className={[
                  'h-2.5 w-2.5 rounded-full border transition-colors',
                  active
                    ? 'bg-emerald-400 border-emerald-300 shadow-[0_0_0_3px_rgba(16,185,129,0.35)]'
                    : 'bg-slate-600 border-slate-400/70 group-hover:bg-slate-300',
                ].join(' ')}
              />
              <span>{lang.label}</span>
              <span className="text-[10px] text-slate-400/90">
                ({lang.nativeLabel})
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-center text-slate-400">
        {mainLine}
        <span className="font-semibold text-slate-100">
          {current.label} ({current.nativeLabel})
        </span>
      </p>

      <p className="text-[10px] text-center text-slate-500">
        {extraLine}
      </p>
    </div>
  );
}
