'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Play,
  ArrowRight,
  RotateCcw,
  ListChecks,
} from 'lucide-react';

import { useAppState } from '@/context/AppStateContext';
import { useUiSettings } from '@/context/UiSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { post, ApiError } from '@/lib/api/httpClient';
import type { Word } from '@/lib/types';

type QuizMode = 'All' | 'Due' | 'New';

type NextItemResponse = {
  item: Word | null;
  choices: string[];
  // backend بيرجع correctAnswer في Next بس المفروض null/hidden
  correctAnswer: string | null;
  attempt: number;
  totalItems: number;
  answeredFirstRound: number;
  correctCount: number;
  wrongCount: number;
  score: number;
  finished: boolean;
};

type AnswerResponse = {
  isCorrect: boolean;
  correctAnswer: string;
  correctCount: number;
  wrongCount: number;
  score: number;
  finished: boolean;
  summary: QuizSummary | null;
};

type QuizSummary = {
  total: number;
  correctCount: number;
  wrongCount: number;
  score: number;
  wrongItems: Word[];
};

const cardVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

function unwrap<T>(data: any): T {
  // يدعم Result<T> أو raw
  if (data?.data !== undefined) return data.data as T;
  if (data?.value !== undefined) return data.value as T;
  return data as T;
}

export default function QuizView() {
  const { currentLanguageId } = useAppState();
  const { uiLang } = useUiSettings();
  const { user } = useAuth();
  const isAr = uiLang === 'ar';

  // --------- UI state ---------
  const [mode, setMode] = useState<QuizMode>('Due');
  const [topicFilter, setTopicFilter] = useState<string>('');

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [current, setCurrent] = useState<NextItemResponse | null>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<AnswerResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [summary, setSummary] = useState<QuizSummary | null>(null);

  const started = !!sessionId;

  // لتسجيل وقت الإجابة
  const questionStartRef = useRef<number>(0);

  const progressText = useMemo(() => {
    if (!current) return '';
    const done = current.answeredFirstRound ?? 0;
    const total = current.totalItems ?? 0;
    return isAr
      ? `تقدّم الجولة الأولى: ${done} / ${total}`
      : `First round progress: ${done} / ${total}`;
  }, [current, isAr]);

  // --------- API calls ---------
  const createSession = async () => {
    setStarting(true);
    setErrorMsg(null);
    setSummary(null);
    setCurrent(null);
    setLastAnswer(null);
    setSelected(null);
    setLocked(false);

    try {
      const res = await post<any>('/api/quiz/sessions', {
        languageId: currentLanguageId,
        mode,
        topicFilter: topicFilter.trim() || null,
      });

      const sid =
        res?.sessionId ??
        res?.data?.sessionId ??
        res?.value ??
        res?.data ??
        res;

      if (!sid) throw new Error('No sessionId returned');

      setSessionId(String(sid));
    } catch (e) {
      console.error('createSession error', e);
      setErrorMsg(
        isAr ? 'تعذّر بدء الكويز. جرّب تاني.' : 'Could not start quiz.',
      );
      setSessionId(null);
    } finally {
      setStarting(false);
    }
  };

  const fetchNext = async (sid: string) => {
    setLoading(true);
    setErrorMsg(null);
    setSelected(null);
    setLocked(false);
    setLastAnswer(null);

    try {
      const data = await post<any>('/api/quiz/sessions/next', {
        sessionId: sid,
      });

      const nxt = unwrap<NextItemResponse>(data);

      setCurrent(nxt);

      // لو finished=true هنا => الكويز خلص
      if (nxt.finished) {
        await fetchSummary(sid);
      } else {
        questionStartRef.current = Date.now();
      }
    } catch (e) {
      console.error('next error', e);
      setErrorMsg(
        isAr
          ? 'تعذّر تحميل السؤال التالي.'
          : 'Could not load next question.',
      );
    } finally {
      setLoading(false);
    }
  };

  const answerCurrent = async (choice: string) => {
    if (!current?.item || !sessionId || locked) return;

    const rt = Math.max(0, Date.now() - questionStartRef.current);

    setSelected(choice);
    setLocked(true);
    setErrorMsg(null);

    try {
      const data = await post<any>('/api/quiz/sessions/answer', {
        sessionId,
        wordId: current.item.id,
        isCorrect: false, // backend بيتجاهلها ويحسب بنفسه
        responseTimeMs: rt,
        selectedAnswer: choice,
      });

      const ans = unwrap<AnswerResponse>(data);
      setLastAnswer(ans);

      if (ans.finished) {
        // لو الباك رجّع summary جاهز
        if (ans.summary) {
          setSummary(ans.summary);
        } else {
          await fetchSummary(sessionId);
        }
      }
    } catch (e) {
      console.error('answer error', e);
      setErrorMsg(
        isAr ? 'تعذّر إرسال الإجابة.' : 'Could not submit answer.',
      );
      // unlock عشان يقدر يعيد المحاولة
      setLocked(false);
      setSelected(null);
    }
  };

  const fetchSummary = async (sid: string) => {
    try {
      const data = await post<any>('/api/quiz/sessions/summary', {
        sessionId: sid,
      });
      const sum = unwrap<QuizSummary>(data);
      setSummary(sum);
    } catch (e) {
      console.error('summary error', e);
      setErrorMsg(
        isAr
          ? 'الكويز خلص، لكن تعذّر جلب الملخص.'
          : 'Quiz finished, but could not fetch summary.',
      );
    }
  };

  const resetQuiz = () => {
    setSessionId(null);
    setCurrent(null);
    setSelected(null);
    setLocked(false);
    setLastAnswer(null);
    setSummary(null);
    setErrorMsg(null);
  };

  // أول ما السيشن تتعمل، هات أول سؤال
  useEffect(() => {
    if (sessionId) {
      fetchNext(sessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // --------- UI ---------
  if (!started) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/15 text-violet-500">
            <HelpCircle size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              {isAr ? 'كويز مراجعة الكلمات' : 'Words Quiz'}
            </h2>
            <p className="text-[11px] text-slate-500">
              {isAr
                ? 'اختار نوع الكويز قبل ما تبدأ.'
                : 'Pick quiz type before starting.'}
            </p>
          </div>
        </div>

        {/* اختيار المود */}
        <div className="panel-muted rounded-2xl border p-4 space-y-3">
          <p className="text-[12px] font-medium text-slate-700">
            {isAr ? 'نوع الكويز' : 'Quiz Type'}
          </p>

          <div className="grid gap-2 md:grid-cols-3">
            {([
              { id: 'Due', ar: 'مستحق اليوم', en: 'Due today' },
              { id: 'New', ar: 'كلمات جديدة', en: 'New words' },
              { id: 'All', ar: 'كل الكلمات', en: 'All words' },
            ] as { id: QuizMode; ar: string; en: string }[]).map(x => (
              <button
                key={x.id}
                onClick={() => setMode(x.id)}
                className={[
                  'rounded-xl border px-3 py-2 text-left text-sm transition',
                  mode === x.id
                    ? 'border-sky-500 bg-sky-500/10 text-slate-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700',
                ].join(' ')}
              >
                <div className="font-semibold">
                  {isAr ? x.ar : x.en}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {x.id === 'Due' &&
                    (isAr
                      ? 'بس الكلمات اللي ميعاد مراجعتها النهارده.'
                      : 'Only words scheduled for review.')}
                  {x.id === 'New' &&
                    (isAr
                      ? 'الكلمات اللي لسه متراجعتش قبل كده.'
                      : 'Words not reviewed yet.')}
                  {x.id === 'All' &&
                    (isAr
                      ? 'كل كلمات اللغة الحالية.'
                      : 'All words in this language.')}
                </div>
              </button>
            ))}
          </div>

          {/* Topic filter optional */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-500">
              {isAr ? 'فلتر التوبيك (اختياري)' : 'Topic filter (optional)'}
            </label>
            <input
              value={topicFilter}
              onChange={e => setTopicFilter(e.target.value)}
              placeholder={isAr ? 'مثال: FOOD' : 'e.g., FOOD'}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
          </div>

          {errorMsg && (
            <p className="text-[11px] text-rose-600">{errorMsg}</p>
          )}

          <button
            onClick={createSession}
            disabled={starting}
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-60"
          >
            <Play size={16} />
            {starting
              ? isAr
                ? 'جاري البدء...'
                : 'Starting...'
              : isAr
              ? 'ابدأ الكويز'
              : 'Start Quiz'}
          </button>
        </div>
      </section>
    );
  }

  // ----------- Summary screen -----------
  if (summary) {
    const total = summary.total ?? 0;
    const correct = summary.correctCount ?? 0;
    const wrong = summary.wrongCount ?? 0;
    const acc = total > 0 ? Math.round((correct / total) * 100) : 0;

    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
            <ListChecks size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              {isAr ? 'ملخص الكويز' : 'Quiz Summary'}
            </h2>
            <p className="text-[11px] text-slate-500">
              {isAr
                ? 'ده ملخص أدائك بعد انتهاء السيشن.'
                : 'Here is your performance after finishing the session.'}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <motion.div
            variants={cardVariants}
            initial="initial"
            animate="animate"
            className="panel-muted rounded-2xl border px-3 py-3 flex flex-col gap-1"
          >
            <p className="text-[11px] text-slate-500">
              {isAr ? 'إجمالي الأسئلة' : 'Total questions'}
            </p>
            <p className="text-xl font-semibold text-slate-900">
              {total}
            </p>
          </motion.div>

          <motion.div
            variants={cardVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.03 }}
            className="panel-muted rounded-2xl border px-3 py-3 flex flex-col gap-1"
          >
            <p className="text-[11px] text-slate-500">
              {isAr ? 'إجابات صحيحة' : 'Correct'}
            </p>
            <p className="text-xl font-semibold text-emerald-600">
              {correct}
            </p>
          </motion.div>

          <motion.div
            variants={cardVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.06 }}
            className="panel-muted rounded-2xl border px-3 py-3 flex flex-col gap-1"
          >
            <p className="text-[11px] text-slate-500">
              {isAr ? 'إجابات خاطئة' : 'Wrong'}
            </p>
            <p className="text-xl font-semibold text-rose-600">
              {wrong}
            </p>
          </motion.div>

          <motion.div
            variants={cardVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.09 }}
            className="panel-muted rounded-2xl border px-3 py-3 flex flex-col gap-1"
          >
            <p className="text-[11px] text-slate-500">
              {isAr ? 'الدقّة' : 'Accuracy'}
            </p>
            <p className="text-xl font-semibold text-slate-900">
              {acc}%
            </p>
          </motion.div>
        </div>

        {summary.wrongItems?.length > 0 && (
          <div className="panel-muted rounded-2xl border p-4 space-y-2">
            <p className="text-sm font-semibold text-slate-900">
              {isAr ? 'كلمات أخطأت فيها' : 'Words you missed'}
            </p>

            <div className="grid gap-2 md:grid-cols-2">
              {summary.wrongItems.map(w => (
                <div
                  key={w.id}
                  className="rounded-xl border bg-white px-3 py-2"
                >
                  <div className="font-semibold text-slate-900">
                    {w.text}
                  </div>
                  {w.translation && (
                    <div className="text-[12px] text-slate-600">
                      {w.translation}
                    </div>
                  )}
                  {w.example && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      {w.example}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => resetQuiz()}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-white text-sm font-semibold hover:bg-slate-800"
          >
            <RotateCcw size={16} />
            {isAr ? 'ابدأ كويز جديد' : 'Start new quiz'}
          </button>
        </div>
      </section>
    );
  }

  // ----------- Quiz in progress -----------
  const item = current?.item;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/15 text-violet-500">
          <HelpCircle size={18} />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold">
            {isAr ? 'الكويز شغّال' : 'Quiz running'}
          </h2>
          <p className="text-[11px] text-slate-500">
            {progressText}
          </p>
        </div>

        <button
          onClick={resetQuiz}
          className="text-[11px] text-slate-500 hover:text-slate-800"
          title={isAr ? 'انهاء السيشن' : 'End session'}
        >
          {isAr ? 'انهاء' : 'End'}
        </button>
      </div>

      {errorMsg && (
        <p className="text-[11px] text-rose-600">{errorMsg}</p>
      )}

      {loading && (
        <div className="panel-muted rounded-2xl border px-4 py-5 text-center text-sm text-slate-600">
          {isAr ? 'جاري تحميل السؤال...' : 'Loading question...'}
        </div>
      )}

      {!loading && !item && (
        <div className="panel-muted rounded-2xl border px-4 py-5 text-center text-sm text-slate-600">
          {isAr ? 'لا يوجد أسئلة متاحة.' : 'No questions available.'}
        </div>
      )}

      {!loading && item && current && (
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          className="panel-muted rounded-2xl border p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] text-slate-500">
                {isAr ? 'السؤال' : 'Question'}
              </p>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                {item.text}
              </h3>
              {item.example && (
                <p className="text-[12px] text-slate-500 mt-1">
                  {item.example}
                </p>
              )}
            </div>

            <div className="text-right">
              <p className="text-[11px] text-slate-500">
                {isAr ? 'الدرجة' : 'Score'}
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {current.score}
              </p>
            </div>
          </div>

          {/* choices */}
          <div className="grid gap-2 md:grid-cols-2">
            {current.choices.map(ch => {
              const isPicked = selected === ch;
              const showCorrect =
                locked && lastAnswer && ch === lastAnswer.correctAnswer;
              const showWrong =
                locked && lastAnswer && isPicked && !lastAnswer.isCorrect;

              return (
                <button
                  key={ch}
                  onClick={() => answerCurrent(ch)}
                  disabled={locked}
                  className={[
                    'rounded-xl border px-3 py-2 text-left text-sm transition flex items-center justify-between gap-2',
                    !locked && 'hover:bg-slate-50',
                    isPicked && !locked && 'border-sky-500 bg-sky-50',
                    showCorrect && 'border-emerald-500 bg-emerald-50',
                    showWrong && 'border-rose-500 bg-rose-50',
                    locked && !isPicked && !showCorrect && 'opacity-75',
                  ].join(' ')}
                >
                  <span>{ch}</span>

                  {showCorrect && (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  )}
                  {showWrong && (
                    <XCircle size={16} className="text-rose-600" />
                  )}
                </button>
              );
            })}
          </div>

          {/* feedback */}
          {locked && lastAnswer && (
            <div
              className={[
                'rounded-xl px-3 py-2 text-sm flex items-center gap-2',
                lastAnswer.isCorrect
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700',
              ].join(' ')}
            >
              {lastAnswer.isCorrect ? (
                <>
                  <CheckCircle2 size={16} />
                  {isAr ? 'إجابة صحيحة!' : 'Correct!'}
                </>
              ) : (
                <>
                  <XCircle size={16} />
                  {isAr
                    ? `إجابة خاطئة. الصح: ${lastAnswer.correctAnswer}`
                    : `Wrong. Correct: ${lastAnswer.correctAnswer}`}
                </>
              )}
            </div>
          )}

          {/* next button */}
          <div className="flex items-center justify-end">
            <button
              onClick={() => sessionId && fetchNext(sessionId)}
              disabled={!locked || loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              {isAr ? 'التالي' : 'Next'}
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </section>
  );
}
