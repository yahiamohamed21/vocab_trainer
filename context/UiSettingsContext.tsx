// context/UiSettingsContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';

export type ThemeMode = 'dark' | 'light';
export type UiLanguage = 'ar' | 'en';

interface UiSettingsContextValue {
  theme: ThemeMode;
  uiLang: UiLanguage;
  setTheme: (theme: ThemeMode) => void;
  setUiLang: (lang: UiLanguage) => void;
  toggleTheme: () => void;
  toggleUiLang: () => void;
}

const UiSettingsContext = createContext<UiSettingsContextValue | undefined>(
  undefined,
);

// تخزين إعدادات الواجهة (محلي)
const UI_STORAGE_KEY = 'vocab-trainer-ui-settings';

// نفس مفتاح الجلسة المستخدم في AuthContext / باقي الملفات
const SESSION_STORAGE_KEY = 'vocab_trainer_session_user';

// عنوان الـ API الرئيسي
const API_BASE_URL = 'http://vocabtrainerapi.runasp.net';

type StoredSession = {
  user?: any;
  accessToken?: string | null;
  refreshToken?: string | null;
};

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    return (parsed as any).accessToken ?? null;
  } catch {
    return null;
  }
}

async function authPatchSettings(body: {
  uiLanguage?: string | null;
  currentLanguageId?: string | null;
  theme?: string | null;
  ttsSpeed?: number | null;
  ttsRepeatCount?: number | null;
  ttsVoiceId?: string | null;
}) {
  const token = getAccessToken();
  if (!token) return;

  try {
    await fetch(`${API_BASE_URL}/api/account/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    // مش لازم نقرأ الرد هنا، مجرد best-effort تحديث
  } catch {
    // لو فشل الاتصال نكتفي بالـ localStorage
  }
}

async function fetchBackendSettings(): Promise<{
  theme?: ThemeMode;
  uiLang?: UiLanguage;
} | null> {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`/api/bootstrap/get`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return null;

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      return null;
    }

    const data = json?.data ?? json ?? null;
    if (!data || typeof data !== 'object') return null;

    const backendTheme = data.theme ?? data.uiTheme ?? null;
    const backendUiLang = data.uiLanguage ?? data.uiLang ?? null;

    let theme: ThemeMode | undefined;
    if (backendTheme === 'dark' || backendTheme === 'light') {
      theme = backendTheme;
    }

    let uiLang: UiLanguage | undefined;
    if (backendUiLang === 'ar' || backendUiLang === 'en') {
      uiLang = backendUiLang;
    }

    if (!theme && !uiLang) return null;

    return { theme, uiLang };
  } catch {
    return null;
  }
}

export function UiSettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [uiLang, setUiLang] = useState<UiLanguage>('ar');

  // عشان ما نبعتش PATCH أثناء أول sync من الباك
  const initializedFromBackend = useRef(false);

  // تحميل من localStorage + محاولة sync من الباك
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1) إعدادات محلية
    try {
      const raw = window.localStorage.getItem(UI_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<{
          theme: ThemeMode;
          uiLang: UiLanguage;
        }>;
        if (parsed.theme === 'dark' || parsed.theme === 'light') {
          setTheme(parsed.theme);
        }
        if (parsed.uiLang === 'ar' || parsed.uiLang === 'en') {
          setUiLang(parsed.uiLang);
        }
      }
    } catch {
      // تجاهل
    }

    // 2) إعدادات من الباك لو اليوزر مسجّل
    (async () => {
      const backend = await fetchBackendSettings();
      if (backend) {
        if (backend.theme) setTheme(backend.theme);
        if (backend.uiLang) setUiLang(backend.uiLang);
        initializedFromBackend.current = true;
      }
    })();
  }, []);

  // حفظ في localStorage + تحديث الباك (لو فيه توكن)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // تحديث التخزين المحلي
    const payload = { theme, uiLang };
    try {
      window.localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // تجاهل
    }

    // بعد ما نقرأ من الباك لأول مرة، أي تغيير لاحق نبعته للـ backend
    // لو مفيش backend / مفيش token، الـ helper نفسه هيخرج عادي
    authPatchSettings({
      uiLanguage: uiLang,
      theme,
      // القيم الأخرى نخليها زي ما هي (null = بدون تغيير)
      currentLanguageId: null,
      ttsSpeed: null,
      ttsRepeatCount: null,
      ttsVoiceId: null,
    });
  }, [theme, uiLang]);

  const value: UiSettingsContextValue = {
    theme,
    uiLang,
    setTheme,
    setUiLang,
    toggleTheme: () =>
      setTheme(prev => (prev === 'dark' ? 'light' : 'dark')),
    toggleUiLang: () =>
      setUiLang(prev => (prev === 'ar' ? 'en' : 'ar')),
  };

  return (
    <UiSettingsContext.Provider value={value}>
      <div className={theme === 'dark' ? 'app-theme-dark' : 'app-theme-light'}>
        {children}
      </div>
    </UiSettingsContext.Provider>
  );
}

export function useUiSettings() {
  const ctx = useContext(UiSettingsContext);
  if (!ctx) {
    throw new Error('useUiSettings must be used within UiSettingsProvider');
  }
  return ctx;
}
