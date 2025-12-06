// context/AppStateContext.tsx
'use client';


import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, Word } from '@/lib/types';
import { LANGUAGES } from '@/lib/constants';
import {
  loadCurrentLanguage,
  loadStats,
  loadWords,
  persistState,
} from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';

interface AppStateContextValue extends AppState {
  initialized: boolean;
  addOrUpdateWord: (word: Partial<Word> & { text: string }) => void;
  deleteWord: (id: string) => void;
  deleteWordsForCurrentLanguage: () => void;
  setCurrentLanguageId: (langId: AppState['currentLanguageId']) => void;
  touchReview: (id: string) => void;
  recordQuizResult: (wordId: string, correct: boolean) => void;
  saveRecordingForWord: (text: string, recordingUrl: string) => void;
  updateWordRecording: (wordId: string, recordingUrl: string | null) => void;
}

const AppStateContext = createContext<AppStateContextValue | undefined>(
  undefined
);

// قيم افتراضية ثابتة للإحصائيات — نفس القيم على السيرفر والكلّاينت
const defaultStats: AppState['stats'] = {
  totalQuestions: 0,
  correctAnswers: 0,
  lastQuizDate: null,
};

// دالة لحساب الـ interval الجديد و nextReviewAt (Spaced Repetition)
function computeSpacedRepetition(word: Word, correct: boolean) {
  const now = new Date();

  let interval = word.intervalDays ?? 0;

  if (correct) {
    if (interval <= 0) {
      interval = 1; // يوم واحد
    } else if (interval === 1) {
      interval = 3;
    } else if (interval === 3) {
      interval = 7;
    } else {
      interval = Math.min(60, Math.round(interval * 2)); // سقف 60 يوم
    }
  } else {
    // إجابة غلط → مراجعة قريبة
    interval = 1;
  }

  const next = new Date(now);
  next.setDate(next.getDate() + interval);

  return {
    intervalDays: interval,
    nextReviewAt: next.toISOString(),
    lastReviewed: now.toISOString(),
  };
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [initialized, setInitialized] = useState(false);
  const [words, setWords] = useState<Word[]>([]);
  const [stats, setStats] = useState(defaultStats);
  const [currentLanguageId, setCurrentLanguageIdState] =
    useState<AppState['currentLanguageId']>('en');

  // تحميل الكلمات + اللغة الحالية + الإحصائيات من localStorage على الكلاينت فقط
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadedWords = loadWords();
    const lang = loadCurrentLanguage('en');
    const loadedStats = loadStats();

    setWords(loadedWords);
    setCurrentLanguageIdState(lang);
    setStats(loadedStats);
    setInitialized(true);
  }, []);

  // التأكد من أن currentLanguageId ضمن اللغات المسموح بها لليوزر (غير الأدمن)
  useEffect(() => {
    if (!initialized) return;
    if (!user || user.role === 'admin') return;

    const allowedLangs = user.languages ?? [];
    if (!allowedLangs.length) return;

    if (!allowedLangs.includes(currentLanguageId)) {
      setCurrentLanguageIdState(allowedLangs[0]);
    }
  }, [initialized, user, currentLanguageId]);

  // حفظ الحالة في localStorage عند أي تغيير بعد التهيئة
  useEffect(() => {
    if (!initialized) return;
    const updatedStats = persistState(words, stats, currentLanguageId);
    setStats(updatedStats);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, currentLanguageId, initialized]);

  const addOrUpdateWord = (data: Partial<Word> & { text: string }) => {
    setWords(prev => {
      const trimmedText = data.text.trim();
      if (!trimmedText) return prev;

      const existingIndex = prev.findIndex(
        w => w.text === trimmedText && w.languageId === currentLanguageId
      );

      // تحديث كلمة موجودة
      if (existingIndex !== -1) {
        const updated = [...prev];
        const word = updated[existingIndex];
        updated[existingIndex] = {
          ...word,
          translation: data.translation ?? word.translation,
          example: data.example ?? word.example,
          topic: data.topic ?? word.topic,
          // recordingUrl وغيره يفضلوا كما هم
        };
        return updated;
      }

      // إضافة كلمة جديدة
      const now = new Date().toISOString();
      const newWord: Word = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        text: trimmedText,
        translation: data.translation ?? '',
        example: data.example ?? '',
        languageId: currentLanguageId,
        createdAt: now,
        lastReviewed: null,
        reviewCount: 0,
        correctCount: 0,
        wrongCount: 0,
        topic: data.topic ?? '',
        intervalDays: null,
        nextReviewAt: null,
        recordingUrl: null,
      };
      return [newWord, ...prev];
    });
  };

  const deleteWord = (id: string) => {
    setWords(prev => prev.filter(w => w.id !== id));
  };

  const deleteWordsForCurrentLanguage = () => {
    setWords(prev => prev.filter(w => w.languageId !== currentLanguageId));
  };

  const setCurrentLanguageId = (langId: AppState['currentLanguageId']) => {
    const exists = LANGUAGES.some(l => l.id === langId);
    if (!exists) return;

    // لو المستخدم ليس أدمن → يقتصر على اللغات المسموح بها
    if (user && user.role !== 'admin') {
      const allowedLangs = user.languages ?? [];
      if (!allowedLangs.includes(langId)) return;
    }

    setCurrentLanguageIdState(langId);
  };

  const touchReview = (id: string) => {
    setWords(prev =>
      prev.map(w =>
        w.id === id
          ? {
              ...w,
              reviewCount: (w.reviewCount ?? 0) + 1,
              lastReviewed: new Date().toISOString(),
            }
          : w
      )
    );
  };

  const recordQuizResult = (wordId: string, correct: boolean) => {
    setWords(prev =>
      prev.map(w => {
        if (w.id !== wordId) return w;

        const schedule = computeSpacedRepetition(w, correct);

        return {
          ...w,
          reviewCount: (w.reviewCount ?? 0) + 1,
          correctCount: (w.correctCount ?? 0) + (correct ? 1 : 0),
          wrongCount: (w.wrongCount ?? 0) + (correct ? 0 : 1),
          ...schedule,
        };
      })
    );

    setStats(prev => ({
      ...prev,
      totalQuestions: (prev.totalQuestions ?? 0) + 1,
      correctAnswers: (prev.correctAnswers ?? 0) + (correct ? 1 : 0),
      lastQuizDate: new Date().toISOString(),
    }));
  };

  // حفظ تسجيل صوتي لكلمة معينة (بالنص + اللغة الحالية)
  const saveRecordingForWord = (rawText: string, recordingUrl: string) => {
    const trimmedText = rawText.trim();
    if (!trimmedText) return;

    setWords(prev => {
      const now = new Date().toISOString();

      const existingIndex = prev.findIndex(
        w =>
          w.languageId === currentLanguageId &&
          w.text.trim().toLowerCase() === trimmedText.toLowerCase()
      );

      // لو الكلمة موجودة في هذه اللغة → حدّث التسجيل
      if (existingIndex !== -1) {
        const updated = [...prev];
        const word = updated[existingIndex];
        updated[existingIndex] = {
          ...word,
          recordingUrl,
        };
        return updated;
      }

      // لو مش موجودة → كلمة جديدة بالتسجيل
      const newWord: Word = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        text: trimmedText,
        translation: '',
        example: '',
        languageId: currentLanguageId,
        createdAt: now,
        lastReviewed: null,
        reviewCount: 0,
        correctCount: 0,
        wrongCount: 0,
        topic: '',
        intervalDays: null,
        nextReviewAt: null,
        recordingUrl,
      };

      return [newWord, ...prev];
    });
  };

  // تحديث تسجيل كلمة موجودة عن طريق id (مسح أو تعديل)
  const updateWordRecording = (wordId: string, recordingUrl: string | null) => {
    setWords(prev =>
      prev.map(w =>
        w.id === wordId
          ? {
              ...w,
              recordingUrl,
            }
          : w
      )
    );
  };

  const value: AppStateContextValue = useMemo(
    () => ({
      words,
      stats,
      currentLanguageId,
      initialized,
      addOrUpdateWord,
      deleteWord,
      deleteWordsForCurrentLanguage,
      setCurrentLanguageId,
      touchReview,
      recordQuizResult,
      saveRecordingForWord,
      updateWordRecording,
    }),
    [words, stats, currentLanguageId, initialized]
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
