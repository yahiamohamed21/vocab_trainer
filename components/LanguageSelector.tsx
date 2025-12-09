// components/LanguageSelector.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { LANGUAGES, type LanguageConfig } from '@/lib/constants';
import { useAppState } from '@/context/AppStateContext';
import { useUiSettings } from '@/context/UiSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { safeGetItem } from '@/lib/storage';
import type { LanguageId } from '@/lib/types';

const STORAGE_KEY_SESSION = 'vocab_trainer_session_user';
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://vocabtrainerapi.runasp.net';

type StoredSession = {
  user?: any;
  accessToken?: string | null;
  refreshToken?: string | null;
};

function getAccessToken(): string | null {
  const raw = safeGetItem(STORAGE_KEY_SESSION);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    return (parsed as any).accessToken ?? null;
  } catch {
    return null;
  }
}

function normalizeApiLanguage(item: any): LanguageConfig | null {
  if (!item || typeof item !== 'object') return null;

  const id =
    item.id ??
    item.code ??
    item.languageId ??
    item.langId ??
    item.key ??
    null;

  const label =
    item.label ??
    item.nameEn ??
    item.englishName ??
    item.displayName ??
    item.name ??
    null;

  const nativeLabel =
    item.nativeLabel ??
    item.nameNative ??
    item.localName ??
    label ??
    null;

  const ttsCode =
    item.ttsCode ??
    item.languageCode ??
    item.tts ??
    item.voiceCode ??
    id ??
    '';

  if (!id || !label) return null;

  return {
    id,
    label,
    nativeLabel: nativeLabel || label,
    ttsCode: ttsCode || String(id),
  };
}

/** ✅ NEW: props */
type LanguageSelectorProps = {
  allowedLanguageIds?: string[]; // لو جاية من صفحة /user
};

export default function LanguageSelector({
  allowedLanguageIds,
}: LanguageSelectorProps) {
  const { currentLanguageId, setCurrentLanguageId } = useAppState();
  const { uiLang } = useUiSettings();
  const { user } = useAuth();

  const [availableLanguages, setAvailableLanguages] =
    useState<LanguageConfig[]>(LANGUAGES);

  const isAr = uiLang === 'ar';
  const isAdmin = user?.role === 'admin';
  const isGuest = !user;

  // تحميل اللغات من الـ API لو في يوزر (أدمن أو عادي)
  useEffect(() => {
    let cancelled = false;

    async function loadFromApi() {
      // ضيف: نكتفي بالـ LANGUAGES الافتراضية
      if (!user) {
        setAvailableLanguages(LANGUAGES);
        return;
      }

      const token = getAccessToken();
      const isAdminUser = user.role === 'admin';

      const url = isAdminUser
        ? `${API_BASE_URL}/api/admin/languages/list`
        : `${API_BASE_URL}/api/languages/allowed`;

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({}),
        });

        let json: any = null;
        try {
          json = await res.json();
        } catch {
          json = null;
        }

        const payload = json?.data ?? json ?? null;

        let items: any[] = [];
        if (Array.isArray(payload)) {
          items = payload;
        } else if (payload && Array.isArray(payload.languages)) {
          items = payload.languages;
        } else if (payload && Array.isArray(payload.items)) {
          items = payload.items;
        }

        const mapped = (items || [])
          .map(normalizeApiLanguage)
          .filter((l: LanguageConfig | null): l is LanguageConfig => !!l);

        if (cancelled) return;

        setAvailableLanguages(mapped.length > 0 ? mapped : LANGUAGES);
      } catch {
        if (!cancelled) {
          setAvailableLanguages(LANGUAGES);
        }
      }
    }

    loadFromApi();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // ✅ Determine allowed IDs
  const finalAllowedIds: LanguageId[] = useMemo(() => {
    // لو allowedLanguageIds جاية من الصفحة → خديها زي ما هي
    if (allowedLanguageIds && allowedLanguageIds.length > 0) {
      return allowedLanguageIds as LanguageId[];
    }

    // ضيف أو أدمن → كل المتاح
    if (!user || isAdmin) {
      return availableLanguages.map(l => l.id);
    }

    // يوزر عادي → يعتمد على user.languages
    if (!user.languages || user.languages.length === 0) {
      return availableLanguages.map(l => l.id);
    }

    const validIds = new Set(availableLanguages.map(l => l.id));
    const filtered = user.languages.filter(id =>
      validIds.has(id as LanguageId),
    );

    return filtered.length > 0
      ? (filtered as LanguageId[])
      : (availableLanguages.map(l => l.id) as LanguageId[]);
  }, [allowedLanguageIds, user, isAdmin, availableLanguages]);

  // اللغات اللي فعلاً هتظهر
  const visibleLanguages = useMemo(
    () => availableLanguages.filter(l => finalAllowedIds.includes(l.id)),
    [availableLanguages, finalAllowedIds],
  );

  // تأمين: لو اللغة الحالية مش ضمن المسموح → نغيرها
  useEffect(() => {
    if (!visibleLanguages.length) return;
    const exists = visibleLanguages.some(l => l.id === currentLanguageId);
    if (!exists) {
      setCurrentLanguageId(visibleLanguages[0].id);
    }
  }, [currentLanguageId, visibleLanguages, setCurrentLanguageId]);

  const current =
    visibleLanguages.find(l => l.id === currentLanguageId) ||
    visibleLanguages[0] ||
    availableLanguages[0] ||
    LANGUAGES[0];

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

      <p className="text-[10px] text-center text-slate-500">{extraLine}</p>
    </div>
  );
}
