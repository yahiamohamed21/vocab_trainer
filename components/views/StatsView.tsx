'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock,
  ListChecks,
} from 'lucide-react';
import { useAppState } from '@/context/AppStateContext';
import { useUiSettings } from '@/context/UiSettingsContext';
import { useAuth } from '@/context/AuthContext';
import type { Word } from '@/lib/types';
import { post, ApiError } from '@/lib/api/httpClient';

const cardVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

function isDueToday(w: Word) {
  if (!w.nextReviewAt) return true;
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const dt = new Date(w.nextReviewAt);
  return dt <= endOfToday;
}

interface LocalStats {
  totalWords: number;
  withTranslation: number;
  noTranslation: number;
  totalReviews: number;
  totalCorrect: number;
  totalWrong: number;
  accuracy: number | null;
  lastActivity: Date | null;
  dueToday: number;
}

export default function StatsView() {
  const { words, currentLanguageId } = useAppState();
  const { uiLang } = useUiSettings();
  const { user } = useAuth();
  const isAr = uiLang === 'ar';

  // حساب محلي من الكلمات (يستخدم للضيف أو كـ fallback)
  const localStats: LocalStats = useMemo(() => {
    const wordsForLang = words.filter(
      w => w.languageId === currentLanguageId,
    );

    let totalReviews = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let lastActivity: Date | null = null;

    for (const w of wordsForLang) {
      const r = w.reviewCount ?? 0;
      const c = w.correctCount ?? 0;
      const wr = w.wrongCount ?? 0;
      totalReviews += r;
      totalCorrect += c;
      totalWrong += wr;

      const dates: (string | undefined | null)[] = [
        (w as any).lastReviewedAt,
        w.lastReviewed,
        w.createdAt,
        (w as any).updatedAt,
      ];
      for (const d of dates) {
        if (!d) continue;
        const dt = new Date(d);
        if (!lastActivity || dt.getTime() > lastActivity.getTime()) {
          lastActivity = dt;
        }
      }
    }

    const withTranslation = wordsForLang.filter(
      w => w.translation && w.translation.trim(),
    ).length;
    const noTranslation = wordsForLang.length - withTranslation;
    const total = totalCorrect + totalWrong;
    const accuracy =
      total > 0 ? Math.round((totalCorrect / total) * 100) : null;
    const dueToday = wordsForLang.filter(isDueToday).length;

    return {
      totalWords: wordsForLang.length,
      withTranslation,
      noTranslation,
      totalReviews,
      totalCorrect,
      totalWrong,
      accuracy,
      lastActivity,
      dueToday,
    };
  }, [words, currentLanguageId]);

  const [serverStats, setServerStats] = useState<LocalStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // جلب ملخص الإحصائيات من الباك للمستخدم المسجّل
  useEffect(() => {
    if (!user) {
      setServerStats(null);
      setErrorMsg(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const data = await post<any>('/api/stats/summary', {
          languageId: currentLanguageId,
        });

        if (cancelled) return;

        // نفترض شكل تقريبًا كالتالي (يمكنك تعديله حسب الاستجابة الحقيقية):
        // {
        //   totalWords,
        //   wordsWithTranslation,
        //   wordsWithoutTranslation,
        //   totalReviews,
        //   totalCorrect,
        //   totalWrong,
        //   accuracyPercent,
        //   lastActivity,
        //   dueToday
        // }
        const d: any = data;

        const mapped: LocalStats = {
          totalWords:
            d.totalWords ?? d.wordsCount ?? localStats.totalWords,
          withTranslation:
            d.wordsWithTranslation ??
            d.withTranslation ??
            localStats.withTranslation,
          noTranslation:
            d.wordsWithoutTranslation ??
            d.noTranslation ??
            localStats.noTranslation,
          totalReviews:
            d.totalReviews ??
            d.reviewsCount ??
            localStats.totalReviews,
          totalCorrect:
            d.totalCorrect ??
            d.correctAnswers ??
            localStats.totalCorrect,
          totalWrong:
            d.totalWrong ?? d.wrongAnswers ?? localStats.totalWrong,
          accuracy:
            typeof d.accuracyPercent === 'number'
              ? Math.round(d.accuracyPercent)
              : typeof d.accuracy === 'number'
              ? Math.round(d.accuracy)
              : localStats.accuracy,
          lastActivity: d.lastActivity
            ? new Date(d.lastActivity)
            : d.lastReviewAt
            ? new Date(d.lastReviewAt)
            : localStats.lastActivity,
          dueToday:
            d.dueToday ??
            d.wordsDueToday ??
            localStats.dueToday,
        };

        setServerStats(mapped);
      } catch (error) {
        console.error('/api/stats/summary error:', error);
        let msg =
          isAr
            ? 'تعذر جلب الإحصائيات من الخادم، سيتم استخدام الحساب المحلي.'
            : 'Could not fetch stats from server, using local calculation.';
        if (error instanceof ApiError) {
          msg = error.message || msg;
        }
        if (!cancelled) {
          setErrorMsg(msg);
          setServerStats(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [user, currentLanguageId, isAr, localStats]);

  const {
    totalWords,
    withTranslation,
    noTranslation,
    totalReviews,
    totalCorrect,
    totalWrong,
    accuracy,
    lastActivity,
    dueToday,
  } = serverStats ?? localStats;

  function formatDate(d: Date | null) {
    if (!d)
      return isAr ? 'لا يوجد نشاط بعد' : 'No activity yet';
    return d.toLocaleString(isAr ? 'ar-EG' : 'en-GB', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-500">
          <BarChart3 size={18} />
        </div>
        <div>
          <h2 className="text-sm font-semibold">
            {isAr ? 'إحصائيات هذه اللغة' : 'Stats for this language'}
          </h2>
          <p className="text-[11px] text-slate-500">
            {isAr
              ? 'الإحصائيات تُحسب من الخادم للمستخدم المسجَّل (إن أمكن)، أو محليًا من الكلمات المحفوظة.'
              : 'Stats are fetched from the backend for signed-in users when possible, or calculated locally from saved words.'}
          </p>
        </div>
      </div>

      {user && loading && (
        <p className="text-[11px] text-slate-400">
          {isAr
            ? 'جاري جلب الإحصائيات من الخادم...'
            : 'Loading stats from server...'}
        </p>
      )}

      {user && errorMsg && (
        <p className="text-[11px] text-amber-400">
          {errorMsg}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        {/* إجمالي الكلمات */}
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          className="panel-muted rounded-2xl border px-3 py-3 flex flex-col gap-1"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500">
              {isAr ? 'إجمالي الكلمات' : 'Total words'}
            </p>
            <Activity size={15} className="text-sky-500" />
          </div>
          <p className="text-xl font-semibold text-slate-900">
            {totalWords}
          </p>
          <p className="text-[11px] text-slate-500">
            {isAr
              ? 'كل الكلمات المحفوظة لهذه اللغة.'
              : 'All saved words for this language.'}
          </p>
        </motion.div>

        {/* كلمات لها ترجمة */}
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.03 }}
          className="panel-muted rounded-2xl border px-3 py-3 flex flex-col gap-1"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500">
              {isAr ? 'كلمات لها ترجمة' : 'With translation'}
            </p>
            <CheckCircle2 size={15} className="text-emerald-500" />
          </div>
          <p className="text-xl font-semibold text-slate-900">
            {withTranslation}
          </p>
          <p className="text-[11px] text-slate-500">
            {isAr
              ? `بدون ترجمة: ${noTranslation}`
              : `Without translation: ${noTranslation}`}
          </p>
        </motion.div>

        {/* مجموع المراجعات */}
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.06 }}
          className="panel-muted rounded-2xl border px-3 py-3 flex flex-col gap-1"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500">
              {isAr ? 'مجموع المراجعات' : 'Total reviews'}
            </p>
            <ListChecks size={15} className="text-violet-500" />
          </div>
          <p className="text-xl font-semibold text-slate-900">
            {totalReviews}
          </p>
          <p className="text-[11px] text-slate-500">
            {isAr
              ? `صحيحة: ${totalCorrect} / خاطئة: ${totalWrong}`
              : `Correct: ${totalCorrect} / Wrong: ${totalWrong}`}
          </p>
        </motion.div>

        {/* نسبة الصح + كلمات اليوم */}
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.09 }}
          className="panel-muted rounded-2xl border px-3 py-3 flex flex-col gap-1"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500">
              {isAr ? 'نسبة الصح' : 'Accuracy'}
            </p>
            <CheckCircle2 size={15} className="text-emerald-500" />
          </div>
          <p className="text-xl font-semibold text-slate-900">
            {accuracy !== null ? `${accuracy}%` : '—'}
          </p>
          <p className="text-[11px] text-slate-500">
            {isAr
              ? `كلمات مستحقة المراجعة اليوم: ${dueToday}`
              : `Words due for review today: ${dueToday}`}
          </p>
        </motion.div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* آخر نشاط */}
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          className="panel-muted rounded-2xl border px-3 py-3 flex flex-col gap-1"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500">
              {isAr ? 'آخر نشاط' : 'Last activity'}
            </p>
            <Clock size={15} className="text-slate-500" />
          </div>
          <p className="text-sm font-medium text-slate-900">
            {formatDate(lastActivity)}
          </p>
          <p className="text-[11px] text-slate-500">
            {isAr
              ? 'أحدث تاريخ إضافة أو مراجعة كلمة لهذه اللغة.'
              : 'Most recent date a word was added or reviewed for this language.'}
          </p>
        </motion.div>

        {/* ملخص سريع */}
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.03 }}
          className="panel-muted rounded-2xl border px-3 py-3 flex flex-col gap-1"
        >
          <p className="text-[11px] text-slate-500 mb-1">
            {isAr ? 'ملخص سريع' : 'Quick summary'}
          </p>
          <p className="text-sm text-slate-900">
            {isAr ? (
              <>
                لديك{' '}
                <span className="font-semibold">{totalWords}</span>{' '}
                كلمة، منها{' '}
                <span className="font-semibold">
                  {withTranslation}
                </span>{' '}
                مترجمة. لقد أجبت على{' '}
                <span className="font-semibold">{totalReviews}</span>{' '}
                سؤال تدريب، بدقة تقريبية{' '}
                <span className="font-semibold">
                  {accuracy !== null ? `${accuracy}%` : '—'}
                </span>
                . وعدد الكلمات المستحقة اليوم:{' '}
                <span className="font-semibold">{dueToday}</span>.
              </>
            ) : (
              <>
                You have{' '}
                <span className="font-semibold">{totalWords}</span>{' '}
                words, with{' '}
                <span className="font-semibold">
                  {withTranslation}
                </span>{' '}
                translated. You answered{' '}
                <span className="font-semibold">{totalReviews}</span>{' '}
                quiz reviews with an approximate accuracy of{' '}
                <span className="font-semibold">
                  {accuracy !== null ? `${accuracy}%` : '—'}
                </span>
                , and{' '}
                <span className="font-semibold">{dueToday}</span>{' '}
                word(s) are due for review today.
              </>
            )}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
