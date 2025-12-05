// components/views/QuizView.tsx
'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import { Brain, CheckCircle2, XCircle, RefreshCcw, Play } from 'lucide-react';
import { useAppState } from '@/context/AppStateContext';
import { useUiSettings } from '@/context/UiSettingsContext';
import type { Word } from '@/lib/types';

interface QuizQuestion {
  wordId: string;
  correctTranslation: string;
  options: string[];
}

// كلمة مستحقة المراجعة الآن (أو مفيش nextReviewAt أصلاً)
function isWordDueNow(w: Word): boolean {
  if (!w.nextReviewAt) return true;
  const now = new Date();
  const due = new Date(w.nextReviewAt);
  return due <= now;
}

export default function QuizView() {
  const { words, currentLanguageId, recordQuizResult } = useAppState();
  const { uiLang } = useUiSettings();
  const isAr = uiLang === 'ar';

  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [status, setStatus] = useState(
    isAr ? 'اضغط "سؤال جديد" للبدء.' : 'Press "New question" to start.'
  );
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  // وضع الجلسة اليومية
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionQueue, setSessionQueue] = useState<Word[]>([]);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);

  // كل الكلمات اللي لها ترجمة في اللغة الحالية
  const allCandidates = useMemo(
    () =>
      words.filter(
        w =>
          w.languageId === currentLanguageId &&
          w.translation &&
          w.translation.trim()
      ),
    [words, currentLanguageId]
  );

  // الكلمات المستحقة الآن (للكويز ولجلسة اليوم)
  const dueWords = useMemo(
    () => allCandidates.filter(isWordDueNow),
    [allCandidates]
  );

  const dueCount = dueWords.length;

  function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function buildQuestionForWord(word: Word): QuizQuestion {
    const optionsCount = Math.min(4, allCandidates.length);
    const pool = allCandidates.filter(w => w.id !== word.id);
    const optionWords = [word];

    while (optionWords.length < optionsCount && pool.length) {
      const idx = Math.floor(Math.random() * pool.length);
      optionWords.push(pool.splice(idx, 1)[0]);
    }

    // shuffle
    for (let i = optionWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [optionWords[i], optionWords[j]] = [optionWords[j], optionWords[i]];
    }

    return {
      wordId: word.id,
      correctTranslation: word.translation!,
      options: optionWords.map(w => w.translation!),
    };
  }

  // كويز عادي (مش جلسة)
  function generateNormalQuestion() {
    if (allCandidates.length < 2) {
      setStatus(
        isAr
          ? 'أضف كلمتين على الأقل مع ترجمة لهذه اللغة للبدء.'
          : 'Add at least two words with translations for this language to start.'
      );
      setQuestion(null);
      setFeedback(null);
      setAnswered(false);
      setSelected(null);
      return;
    }

    const source =
      dueWords.length > 0
        ? dueWords
        : allCandidates;

    const correctWord = pickRandom(source);
    const q = buildQuestionForWord(correctWord);

    setQuestion(q);
    setAnswered(false);
    setSelected(null);
    setFeedback(null);

    if (dueWords.length > 0) {
      setStatus(
        isAr
          ? `بيتم التركيز على ${dueWords.length} كلمة مستحقة المراجعة الآن.`
          : `Focusing on ${dueWords.length} word(s) currently due for review.`
      );
    } else {
      setStatus(
        isAr
          ? 'لا توجد كلمات مستحقة الآن، يتم الاختيار عشوائيًا من كل الكلمات.'
          : 'No words are currently due, choosing randomly from all words.'
      );
    }
  }

  // بدء جلسة اليوم
  async function startSession() {
    if (dueWords.length === 0) {
      await Swal.fire({
        icon: 'info',
        title: isAr ? 'لا توجد كلمات مستحقة اليوم' : 'No due words today',
        text: isAr
          ? 'كل الكلمات المجدولة لهذه اللغة تمّت مراجعتها. يمكنك استخدام الوضع العادي للتمارين.'
          : 'All scheduled words for this language are already reviewed. You can still use normal quiz mode.',
        confirmButtonText: isAr ? 'حسناً' : 'OK',
        background: '#020617',
        color: '#e5e7eb',
        confirmButtonColor: '#38bdf8',
      });
      return;
    }

    // عمل نسخة shuffled من dueWords
    const queue = [...dueWords];
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }

    setSessionActive(true);
    setSessionQueue(queue);
    setSessionIndex(0);
    setSessionCorrect(0);
    setSessionWrong(0);

    const firstWord = queue[0];
    const q = buildQuestionForWord(firstWord);
    setQuestion(q);
    setAnswered(false);
    setSelected(null);
    setFeedback(null);

    setStatus(
      isAr
        ? `جلسة اليوم: الكلمة 1 من ${queue.length}.`
        : `Today’s session: word 1 of ${queue.length}.`
    );
  }

  // ملخص الجلسة – ناخد الأرقام جاهزة كـ arguments
  async function endSessionSummary(correctCount: number, wrongCount: number) {
    const total = correctCount + wrongCount;
    const accuracy =
      total > 0 ? Math.round((correctCount / total) * 100) : 0;

    await Swal.fire({
      icon: 'info',
      title: isAr ? 'انتهت جلسة اليوم' : 'Session finished',
      html: isAr
        ? `
          <div style="text-align:right;font-size:13px">
            <p>إجمالي الأسئلة: <b>${total}</b></p>
            <p>إجابات صحيحة: <b>${correctCount}</b></p>
            <p>إجابات خاطئة: <b>${wrongCount}</b></p>
            <p>نسبة الدقة التقريبية: <b>${accuracy}%</b></p>
          </div>
        `
        : `
          <div style="text-align:left;font-size:13px">
            <p>Total questions: <b>${total}</b></p>
            <p>Correct answers: <b>${correctCount}</b></p>
            <p>Wrong answers: <b>${wrongCount}</b></p>
            <p>Approximate accuracy: <b>${accuracy}%</b></p>
          </div>
        `,
      confirmButtonText: isAr ? 'إنهاء' : 'Close',
      background: '#020617',
      color: '#e5e7eb',
      confirmButtonColor: '#38bdf8',
    });

    setSessionActive(false);
    setSessionQueue([]);
    setSessionIndex(0);
    setQuestion(null);
    setFeedback(null);
    setSelected(null);
    setAnswered(false);
    setStatus(
      isAr
        ? 'انتهت جلسة اليوم. يمكنك بدء جلسة جديدة لاحقًا أو استخدام الوضع العادي.'
        : 'Today’s session finished. You can start another session later or use normal quiz mode.'
    );
  }

  // الانتقال للسؤال التالي داخل الجلسة
  async function goToNextInSession() {
    if (!sessionActive) {
      // لو مش في جلسة، يبقى زر "سؤال جديد" عادي
      generateNormalQuestion();
      return;
    }

    const nextIndex = sessionIndex + 1;

    if (nextIndex >= sessionQueue.length) {
      // احتياطًا لو اتندِه هنا في آخر سؤال (مع إن المفروض handleAnswer هو اللي يختم)
      await endSessionSummary(sessionCorrect, sessionWrong);
      return;
    }

    const nextWord = sessionQueue[nextIndex];
    const q = buildQuestionForWord(nextWord);

    setSessionIndex(nextIndex);
    setQuestion(q);
    setAnswered(false);
    setSelected(null);
    setFeedback(null);

    setStatus(
      isAr
        ? `جلسة اليوم: الكلمة ${nextIndex + 1} من ${sessionQueue.length}.`
        : `Today’s session: word ${nextIndex + 1} of ${sessionQueue.length}.`
    );
  }

  async function handleAnswer(opt: string) {
    if (!question || answered) return;
    setSelected(opt);

    const correct = opt === question.correctTranslation;
    recordQuizResult(question.wordId, correct);
    setAnswered(true);

    // نحسب القيم الجديدة محليًا عشان نستخدمها في الملخص
    let newCorrect = sessionCorrect;
    let newWrong = sessionWrong;

    if (sessionActive) {
      if (correct) {
        newCorrect = sessionCorrect + 1;
        setSessionCorrect(newCorrect);
      } else {
        newWrong = sessionWrong + 1;
        setSessionWrong(newWrong);
      }
    }

    if (correct) {
      setFeedback(isAr ? 'إجابة صحيحة، ممتاز!' : 'Correct answer, great job!');
      await Swal.fire({
        icon: 'success',
        title: isAr ? 'أحسنت!' : 'Well done!',
        text: isAr ? 'إجابة صحيحة.' : 'Correct answer.',
        timer: 1200,
        showConfirmButton: false,
        background: '#020617',
        color: '#e5e7eb',
      });
    } else {
      setFeedback(
        isAr
          ? `إجابة خاطئة. الترجمة الصحيحة: ${question.correctTranslation}`
          : `Wrong answer. Correct translation: ${question.correctTranslation}`
      );
      await Swal.fire({
        icon: 'error',
        title: isAr ? 'محاولة كويسة' : 'Nice try',
        text: isAr
          ? `الإجابة الصحيحة: ${question.correctTranslation}`
          : `Correct answer: ${question.correctTranslation}`,
        timer: 1500,
        showConfirmButton: false,
        background: '#020617',
        color: '#e5e7eb',
      });
    }

    // لو دي آخر كلمة في الجلسة → اعرض الملخص باستخدام القيم الجديدة
    if (sessionActive) {
      const isLast = sessionIndex >= sessionQueue.length - 1;
      if (isLast) {
        await endSessionSummary(newCorrect, newWrong);
      }
    }
  }

  const hasQuestion = !!question;

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/25 text-violet-300">
            <Brain size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-50">
              {isAr ? 'تمارين الترجمة' : 'Translation exercises'}
            </h2>
            <p className="text-[11px] text-slate-400">
              {isAr
                ? 'الوضع العادي يفضّل الكلمات المستحقة للمراجعة، وجلسة اليوم تمشي على كل الكلمات المستحقة واحدة واحدة.'
                : 'Normal mode prefers words due for review; Today’s session walks through all due words one by one.'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {isAr
                ? `عدد الكلمات المستحقة الآن: ${dueCount}`
                : `Words currently due for review: ${dueCount}`}
            </p>
          </div>
        </div>

        {/* زر جلسة اليوم */}
        <div className="flex flex-col items-end gap-1 text-[11px]">
          <button
            type="button"
            onClick={startSession}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
          >
            <Play size={14} />
            {isAr ? 'بدء جلسة اليوم' : "Start today's session"}
          </button>
          {sessionActive && (
            <span className="text-emerald-300">
              {isAr
                ? `جلسة نشطة: ${sessionIndex + 1} / ${sessionQueue.length}`
                : `Session active: ${sessionIndex + 1} / ${sessionQueue.length}`}
            </span>
          )}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-4 space-y-4"
      >
        <p className="text-[11px] text-slate-400 min-h-[16px]">{status}</p>

        <AnimatePresence mode="wait">
          {hasQuestion && question && (
            <motion.div
              key={question.wordId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <div>
                <p className="text-[11px] text-slate-400 mb-1">
                  {isAr
                    ? 'ما ترجمة الكلمة التالية؟'
                    : 'What is the translation of this word?'}
                </p>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/70 border border-slate-700 px-3 py-1.5">
                  <span className="text-xs font-semibold text-slate-50">
                    {words.find(w => w.id === question.wordId)?.text}
                  </span>
                  {sessionActive && (
                    <span className="text-[10px] text-emerald-300">
                      {isAr ? 'من جلسة اليوم' : "Today's session"}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {question.options.map(opt => {
                  const isSelected = selected === opt;
                  const isCorrect = opt === question.correctTranslation;

                  let classes =
                    'w-full text-right px-3 py-2.5 rounded-xl border text-xs sm:text-sm transition-all';

                  if (!answered) {
                    classes +=
                      ' border-slate-700 bg-slate-950/70 text-slate-100 hover:bg-slate-900 hover:border-sky-500/60';
                  } else if (answered && isCorrect) {
                    classes +=
                      ' border-emerald-400 bg-emerald-500/15 text-emerald-100';
                  } else if (answered && isSelected && !isCorrect) {
                    classes += ' border-rose-400 bg-rose-500/15 text-rose-100';
                  } else {
                    classes += ' border-slate-800 bg-slate-950/80 text-slate-400';
                  }

                  return (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(opt)}
                      disabled={answered}
                      className={classes}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px]">
                  {feedback && answered && (
                    <>
                      {feedback.startsWith('إجابة صحيحة') ||
                      feedback.startsWith('Correct answer') ? (
                        <CheckCircle2 className="text-emerald-300" size={16} />
                      ) : (
                        <XCircle className="text-rose-300" size={16} />
                      )}
                      <span className="text-slate-200">{feedback}</span>
                    </>
                  )}
                </div>

                <button
                  onClick={
                    sessionActive
                      ? goToNextInSession
                      : generateNormalQuestion
                  }
                  disabled={sessionActive && !answered}
                  className="inline-flex items-center gap-1 rounded-full bg-violet-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-violet-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCcw size={14} />
                  {sessionActive
                    ? isAr ? 'الكلمة التالية' : 'Next word'
                    : isAr ? 'سؤال جديد' : 'New question'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!hasQuestion && (
          <div className="flex justify-end">
            <button
              onClick={generateNormalQuestion}
              className="inline-flex items-center gap-1 rounded-full bg-violet-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-violet-400 transition-colors"
            >
              <RefreshCcw size={14} />
              {isAr ? 'سؤال جديد' : 'New question'}
            </button>
          </div>
        )}
      </motion.div>
    </section>
  );
}
