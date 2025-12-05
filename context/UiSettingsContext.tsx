// context/UiSettingsContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

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
  undefined
);

const STORAGE_KEY = 'vocab-trainer-ui-settings';

export function UiSettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [uiLang, setUiLang] = useState<UiLanguage>('ar');

  // تحميل من localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
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
    } catch {
      // تجاهل
    }
  }, []);

  // حفظ في localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = { theme, uiLang };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // تجاهل
    }
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
