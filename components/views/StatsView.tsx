// components/views/StatsView.tsx
'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, BarChart3, CheckCircle2, Clock, ListChecks } from 'lucide-react';
import { useAppState } from '@/context/AppStateContext';
import { useUiSettings } from '@/context/UiSettingsContext';
import type { Word } from '@/lib/types';

const cardVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

function isDueToday(w: Word) {
  if (!w.nextReviewAt) return true;
  const now = new Date();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const dt = new Date(w.nextReviewAt);
  return dt <= endOfToday;
}

export default function StatsView() {
  const { words, currentLanguageId } = useAppState();
  const { uiLang } = useUiSettings();
  const isAr = uiLang === 'ar';

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
  } = useMemo(() => {
    const wordsForLang = words.filter(w => w.languageId === currentLanguageId);

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
      w => w.translation && w.translation.trim()
    ).length;
    const noTranslation = wordsForLang.length - withTranslation;
    const total = totalCorrect + totalWrong;
    const accuracy = total > 0 ? Math.round((totalCorrect / total) * 100) : null;
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

  function formatDate(d: Date | null) {
    if (!d) return isAr ? 'لا يوجد نشاط بعد' : 'No activity yet';
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
              ? 'الأرقام خاصة بالتدريب والإجابات لكل لغة، لكن عدد الكلمات والمراجعات لهذه اللغة فقط.'
              : 'Numbers reflect training and answers per language. Counts here are for the current language only.'}
          </p>
        </div>
      </div>

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
            {isAr ? 'كل الكلمات المحفوظة لهذه اللغة.' : 'All saved words for this language.'}
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
                لديك <span className="font-semibold">{totalWords}</span> كلمة،
                منها{' '}
                <span className="font-semibold">
                  {withTranslation}
                </span>{' '}
                مترجمة. لقد أجبت على{' '}
                <span className="font-semibold">{totalReviews}</span> سؤال
                تدريب، بدقة تقريبية{' '}
                <span className="font-semibold">
                  {accuracy !== null ? `${accuracy}%` : '—'}
                </span>
                . وعدد الكلمات المستحقة اليوم:{' '}
                <span className="font-semibold">{dueToday}</span>.
              </>
            ) : (
              <>
                You have <span className="font-semibold">{totalWords}</span>{' '}
                words, with{' '}
                <span className="font-semibold">
                  {withTranslation}
                </span>{' '}
                translated. You answered{' '}
                <span className="font-semibold">{totalReviews}</span> quiz
                reviews with an approximate accuracy of{' '}
                <span className="font-semibold">
                  {accuracy !== null ? `${accuracy}%` : '—'}
                </span>
                , and{' '}
                <span className="font-semibold">{dueToday}</span> word(s) are
                due for review today.
              </>
            )}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
