'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Mic, StopCircle, Activity, X } from 'lucide-react';
import { LANGUAGES } from '@/lib/constants';
import { useAppState } from '@/context/AppStateContext';
import { useUiSettings } from '@/context/UiSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { safeGetItem } from '@/lib/storage';
import type { Word } from '@/lib/types';
import { post, ApiError } from '@/lib/api/httpClient';

// ✅ API Base URL
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://vocabtrainerapi.runasp.net';

const SESSION_STORAGE_KEY = 'vocab_trainer_session_user';

type StoredSession = {
  user?: any;
  accessToken?: string | null;
  refreshToken?: string | null;
};

//=============== Helpers ===============//

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function getAccessTokenFromSession(): string | null {
  const raw = safeGetItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    if (parsed && typeof parsed === 'object') {
      return (parsed as any).accessToken ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

async function findWordIdInBackend(
  languageId: string,
  text: string,
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    const payload = await post<any>('/api/words/list', {
      languageId,
      search: trimmed,
    });

    let list: any[] = [];
    if (Array.isArray(payload)) {
      list = payload;
    } else if (Array.isArray(payload.items)) {
      list = payload.items;
    } else if (Array.isArray(payload.words)) {
      list = payload.words;
    }

    const lowered = trimmed.toLowerCase();
    const hit = list.find((w: any) =>
      (w.text ?? w.word ?? '')
        .toString()
        .trim()
        .toLowerCase()
        .includes(lowered),
    );

    if (!hit) return null;
    const id = hit.id ?? hit.wordId ?? hit.guid;
    return id ? String(id) : null;
  } catch (error) {
    console.error('findWordIdInBackend error:', error);
    return null;
  }
}

async function ensureWordIdInBackend(
  languageId: string,
  text: string,
): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  let id = await findWordIdInBackend(languageId, trimmed);
  if (id) return id;

  try {
    await post('/api/words/create', {
      languageId,
      text: trimmed,
      translation: null,
      example: null,
      topic: null,
    });
  } catch (error) {
    console.error('ensureWordIdInBackend create error:', error);
    return null;
  }

  id = await findWordIdInBackend(languageId, trimmed);
  return id;
}

export default function TrainingView() {
  const {
    words,
    currentLanguageId,
    addOrUpdateWord,
    saveRecordingForWord,
  } = useAppState();
  const { uiLang, theme } = useUiSettings();
  const { user } = useAuth();

  const isAr = uiLang === 'ar';
  const isDark = theme === 'dark';
  const isGuest = !user;

  const [text, setText] = useState('');
  const [repeat, setRepeat] = useState(3);
  const [rate, setRate] = useState(0.7);
  const [status, setStatus] = useState(
    isAr ? 'اكتب كلمة ثم ابدأ التكرار.' : 'Type a word then start repeating.',
  );
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);

  // ✅ Auto translation (always to Arabic)
  const [autoTranslation, setAutoTranslation] = useState<string | null>(null);
  const [autoTransLoading, setAutoTransLoading] = useState(false);
  const [autoTransError, setAutoTransError] = useState<string | null>(null);

  // ✅ Browser TTS voices
  const [availableVoices, setAvailableVoices] =
    useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<string>('0');
  const [voiceWarning, setVoiceWarning] = useState<string | null>(null);

  // ✅ Recording
  const [recordingSupported, setRecordingSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // External audio (backend TTS)
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentLang = useMemo(
    () => LANGUAGES.find(l => l.id === currentLanguageId) ?? null,
    [currentLanguageId],
  );

  const ttsSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  // ✅ Mic support
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const supported =
      !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
    setRecordingSupported(supported);
  }, []);

  // ✅ Load + filter voices for current language
  // ✅ load browser voices + pick best matching for current language
useEffect(() => {
  if (typeof window === 'undefined') return;
  if (!ttsSupported) return;

  const synth = window.speechSynthesis;

  const loadVoices = () => {
    const all = synth.getVoices() || [];
    setAvailableVoices(all);

    // ✅ guard: currentLang ممكن تكون null أثناء أول رندر
    if (!currentLang) {
      setSelectedVoiceIndex('0');
      setVoiceWarning(
        isAr
          ? 'اختر لغة أولاً عشان نحدد الصوت المناسب.'
          : 'Select a language first to pick a suitable voice.',
      );
      return;
    }

    // ✅ هنا safe لأن currentLang مش null
    const prefix = (currentLang.ttsCode || '')
      .split('-')[0]
      .toLowerCase();

    const matches = all.filter(v =>
      (v.lang || '').toLowerCase().startsWith(prefix),
    );

    if (matches.length > 0) {
      const best = matches[0];
      const bestIndex = all.indexOf(best);
      setSelectedVoiceIndex(String(bestIndex));
      setVoiceWarning(null);
    } else {
      setSelectedVoiceIndex('0');
      setVoiceWarning(
        isAr
          ? 'لا يوجد صوت مطابق للغة الحالية، سيتم استخدام الصوت الافتراضي.'
          : 'No matching voice for this language; default voice will be used.',
      );
    }
  };

  loadVoices();
  synth.onvoiceschanged = loadVoices;

  return () => {
    synth.onvoiceschanged = null;
  };
}, [ttsSupported, currentLang, isAr]);


  // ✅ Auto translate when text changes (always to Arabic)
  useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      setAutoTranslation(null);
      setAutoTransError(null);
      setAutoTransLoading(false);
      return;
    }

    let cancelled = false;
    const currentText = trimmed;

    const timer = setTimeout(async () => {
      setAutoTransLoading(true);
      setAutoTransError(null);

      try {
        const from = currentLanguageId;
        const to = 'ar'; // ✅ ALWAYS Arabic

        const data = await post<any>('/api/translate', {
          text: currentText,
          from,
          to,
        });

        if (cancelled) return;

        const d: any = data;
        const translated: string | undefined =
          d?.value ??
          d?.data?.value ??
          d?.translatedText ??
          d?.translation ??
          d?.text ??
          d?.result ??
          d?.output;

        setAutoTranslation(translated || null);
        setAutoTransLoading(false);
      } catch (error) {
        if (cancelled) return;

        console.error('auto translate error:', error);

        let msg = isAr
          ? 'تعذر جلب ترجمة تلقائية من الخادم.'
          : 'Could not fetch automatic translation from server.';

        if (error instanceof ApiError) {
          msg = error.message || msg;
        }

        setAutoTranslation(null);
        setAutoTransError(msg);
        setAutoTransLoading(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, currentLanguageId, isAr]);

  const recentWords = useMemo(
    () =>
      words
        .filter((w: Word) => w.languageId === currentLanguageId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        )
        .slice(0, 12),
    [words, currentLanguageId],
  );

  const matchingWord = useMemo(() => {
    const trimmed = text.trim().toLowerCase();
    if (!trimmed) return null;
    return (
      words.find(
        w =>
          w.languageId === currentLanguageId &&
          w.text.trim().toLowerCase() === trimmed,
      ) || null
    );
  }, [text, words, currentLanguageId]);

  function cleanupAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }

  function stopSpeech() {
    speakingRef.current = false;
    setSpeaking(false);
    setStatus(isAr ? 'تم إيقاف النطق.' : 'Speech stopped.');

    cleanupAudio();

    if (ttsSupported && typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    }
  }

  function speakWithBrowserTts(trimmed: string) {
    if (!currentLang) {
      setStatus(
        isAr
          ? 'لا توجد لغة محددة للنطق. اختر لغة من الإعدادات.'
          : 'No language selected for speech. Please choose a language in settings.',
      );
      return;
    }

    if (!ttsSupported || typeof window === 'undefined') {
      setStatus(
        isAr
          ? 'النطق غير مدعوم في هذا المتصفح.'
          : 'Speech synthesis is not supported in this browser.',
      );
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();
    speakingRef.current = true;
    setSpeaking(true);

    let count = 0;
    const total = repeat;

    let voiceToUse: SpeechSynthesisVoice | null = null;
    const idx = Number(selectedVoiceIndex);
    if (availableVoices.length && !Number.isNaN(idx) && availableVoices[idx]) {
      voiceToUse = availableVoices[idx];
    }

    const speakOnce = () => {
      if (!speakingRef.current) {
        setStatus(isAr ? 'تم الإيقاف.' : 'Stopped.');
        return;
      }
      if (count >= total) {
        setStatus(
          isAr
            ? `تم تكرار الكلمة ${total} مرة (صوت المتصفح).`
            : `Finished repeating ${total} times (browser voice).`,
        );
        speakingRef.current = false;
        setSpeaking(false);
        return;
      }

      setStatus(
        isAr
          ? `بنكرر الكلمة (صوت المتصفح)... ${count} من ${total}`
          : `Repeating with browser voice... ${count} of ${total}`,
      );

      const utter = new SpeechSynthesisUtterance(trimmed);
      if (voiceToUse) {
        utter.voice = voiceToUse;
        utter.lang = voiceToUse.lang || currentLang.ttsCode;
      } else {
        utter.lang = currentLang.ttsCode;
      }
      utter.rate = rate;

      utter.onend = () => {
        if (!speakingRef.current) return;
        count += 1;
        setTimeout(speakOnce, 600);
      };

      synth.speak(utter);
    };

    speakOnce();
  }

  // ✅ Backend TTS first
  async function speakWithExternalTts(trimmed: string): Promise<boolean> {
    if (!currentLang) return false;

    try {
      const token = getAccessTokenFromSession();
      if (!token) return false;

      speakingRef.current = true;
      setSpeaking(true);
      setStatus(
        isAr
          ? 'جاري طلب الصوت من الخادم...'
          : 'Requesting audio from backend...',
      );

      const res = await fetch(`${API_BASE_URL}/api/translate/speak`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: trimmed,
          languageCode: currentLang.ttsCode,
          repeat,
          rate,
        }),
        cache: 'no-store',
      });

      if (!res.ok) {
        speakingRef.current = false;
        setSpeaking(false);
        return false;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = rate;
      audioRef.current = audio;

      let count = 0;
      const total = repeat;

      const playOnce = () => {
        if (!speakingRef.current || !audioRef.current) {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          return;
        }

        if (count >= total) {
          setStatus(
            isAr
              ? `تم التكرار ${total} مرة (TTS من الخادم).`
              : `Finished ${total} times (backend TTS).`,
          );
          speakingRef.current = false;
          setSpeaking(false);
          URL.revokeObjectURL(url);
          audioRef.current = null;
          return;
        }

        setStatus(
          isAr
            ? `بنكرر الكلمة (الخادم)... ${count} من ${total}`
            : `Repeating with backend... ${count} of ${total}`,
        );

        audioRef.current!.currentTime = 0;
        audioRef.current!.play().catch(() => {
          speakingRef.current = false;
          setSpeaking(false);
          URL.revokeObjectURL(url);
          audioRef.current = null;
        });
      };

      audio.onended = () => {
        if (!speakingRef.current) return;
        count += 1;
        setTimeout(playOnce, 400);
      };

      playOnce();
      return true;
    } catch {
      speakingRef.current = false;
      setSpeaking(false);
      return false;
    }
  }

  async function speak() {
    const trimmed = text.trim();
    if (!trimmed) {
      setStatus(isAr ? 'اكتب كلمة أولاً.' : 'Type a word first.');
      return;
    }

    if (!currentLang) {
      setStatus(
        isAr
          ? 'اختر لغة من الإعدادات.'
          : 'Please select a language in settings.',
      );
      return;
    }

    const exists = words.some(
      w =>
        w.languageId === currentLanguageId &&
        w.text.trim().toLowerCase() === trimmed.toLowerCase(),
    );

    if (!exists) addOrUpdateWord({ text: trimmed });

    const ok = await speakWithExternalTts(trimmed);
    if (!ok) speakWithBrowserTts(trimmed);
  }

  async function startRecording() {
    if (!recordingSupported || isRecording) return;

    const trimmed = text.trim();
    if (!trimmed) {
      setStatus(isAr ? 'اكتب كلمة أولاً.' : 'Type a word first.');
      return;
    }

    try {
      await Swal.fire({
        background: isDark ? '#020617' : '#ffffff',
        color: isDark ? '#e2e8f0' : '#020617',
        icon: 'info',
        title: isAr ? 'بدء تسجيل صوتك' : 'Starting recording',
        text: isAr
          ? `هتسجلي صوتك لكلمة: "${trimmed}".`
          : `You are recording your pronunciation for: "${trimmed}".`,
        confirmButtonText: isAr ? 'ابدأ التسجيل' : 'Start recording',
        confirmButtonColor: '#0ea5e9',
      });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      chunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const dataUrl = await blobToDataUrl(blob);

          setRecordedUrl(dataUrl);
          setIsRecording(false);
          stream.getTracks().forEach(t => t.stop());

          const currentText = text.trim();
          if (!currentText) return;

          const base64 = dataUrl.split(',')[1] || '';
          if (!base64) return;

          saveRecordingForWord(currentText, dataUrl);

          if (isGuest) {
            setStatus(isAr ? 'تم حفظ التسجيل محلياً.' : 'Saved locally.');
            return;
          }

          const wordId = await ensureWordIdInBackend(
            currentLanguageId,
            currentText,
          );
          if (!wordId) return;

          await post('/api/words/recording/save', {
            wordId,
            base64Audio: base64,
            fileExt: 'webm',
          });

          setStatus(
            isAr ? 'تم حفظ التسجيل محلياً وعلى الخادم.' : 'Saved locally and on server.',
          );
        } catch {
          setStatus(isAr ? 'خطأ في التسجيل.' : 'Recording error.');
        }
      };

      recorder.start();
      setIsRecording(true);
      setStatus(isAr ? 'جاري التسجيل...' : 'Recording...');
    } catch {
      setStatus(
        isAr
          ? 'تعذر الوصول للميكروفون.'
          : 'Could not access microphone.',
      );
    }
  }

  function stopRecordingHandler() {
    if (!isRecording || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  }

  if (!currentLang) {
    return (
      <section className="space-y-3">
        <p className="text-sm text-slate-200">
          {isAr
            ? 'اختر لغة من الإعدادات قبل التدريب.'
            : 'Please select a language in settings before training.'}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)]">
        {/* ===== Left Panel (word + translation) ===== */}
        <div className="panel panel-muted space-y-3 rounded-2xl border border-slate-800 px-3.5 py-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-200">
              {isAr ? 'الكلمة التي تريد حفظها' : 'Word you want to learn'}
            </label>

            <div className="relative">
              <input
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={isAr ? 'مثال: apple' : 'e.g. apple'}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 pr-9 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-sky-400/80 shadow-sm"
              />

              {text && (
                <button
                  type="button"
                  onClick={() => setText('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-50 text-[10px]"
                  aria-label={isAr ? 'مسح الكلمة' : 'Clear word'}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              {isAr
                ? 'الكلمة هتتحفظ تحت اللغة الحالية.'
                : 'The word is saved under the current language.'}
            </p>
          </div>

          <div className="space-y-1 mt-2">
            <p className="text-[11px] font-medium text-slate-300">
              {isAr ? 'ترجمة الكلمة:' : 'Word translation:'}
            </p>

            <div className="min-h-[40px] rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-[12px] text-slate-100 flex items-center">
              {!text.trim() ? (
                <span className="text-slate-500 text-[11px]">
                  {isAr
                    ? 'اكتب كلمة لترى ترجمتها.'
                    : 'Type a word to see its translation.'}
                </span>
              ) : matchingWord && matchingWord.translation ? (
                <span>
                  {isAr ? 'الترجمة المحفوظة: ' : 'Saved translation: '}
                  <span className="font-semibold text-sky-200">
                    {matchingWord.translation}
                  </span>
                </span>
              ) : autoTransLoading ? (
                <span className="text-slate-400 text-[11px]">
                  {isAr
                    ? 'جاري جلب ترجمة...'
                    : 'Fetching translation...'}
                </span>
              ) : autoTranslation ? (
                <span>
                  {isAr ? 'ترجمة مقترحة: ' : 'Suggested translation: '}
                  <span className="font-semibold text-emerald-200">
                    {autoTranslation}
                  </span>
                </span>
              ) : autoTransError ? (
                <span className="text-rose-300 text-[11px]">
                  {autoTransError}
                </span>
              ) : (
                <span className="text-slate-500 text-[11px]">
                  {isAr
                    ? 'لا توجد ترجمة.'
                    : 'No translation.'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ===== Right Panel (voice) ===== */}
        <div className="panel rounded-2xl border border-slate-800 px-3.5 py-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-slate-200">
                {isAr ? 'اللغة الحالية للنطق' : 'Current speaking language'}
              </p>
              <p className="text-[11px] text-slate-400">
                {currentLang.label} ({currentLang.nativeLabel})
              </p>
            </div>
            <span className="rounded-full border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 text-[10px] text-sky-200">
              {currentLang.ttsCode}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-300">
              {isAr
                ? 'اختر صوت المتصفح (Fallback)'
                : 'Choose browser voice (fallback)'}
            </label>

            <select
              value={selectedVoiceIndex}
              onChange={e => setSelectedVoiceIndex(e.target.value)}
              disabled={!ttsSupported || !availableVoices.length}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-2.5 py-2 text-xs text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-400/80 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {!ttsSupported ? (
                <option value="">
                  {isAr
                    ? 'الميزة غير مدعومة.'
                    : 'Speech not supported.'}
                </option>
              ) : availableVoices.length === 0 ? (
                <option value="">
                  {isAr
                    ? 'جاري تحميل الأصوات...'
                    : 'Loading voices...'}
                </option>
              ) : (
                availableVoices.map((v, index) => (
                  <option
                    key={`${v.voiceURI || v.name}-${index}`}
                    value={String(index)}
                  >
                    {v.name} {v.lang ? `(${v.lang})` : ''}
                  </option>
                ))
              )}
            </select>

            {voiceWarning && (
              <p className="text-[10px] text-amber-400 mt-1">
                {voiceWarning}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300">
                {isAr ? 'عدد مرات التكرار' : 'Repetitions'}
              </label>
              <select
                value={repeat}
                onChange={e => setRepeat(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-2.5 py-2 text-xs text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-400/80"
              >
                {[1, 3, 5, 10, 20].map(v => (
                  <option key={v} value={v}>
                    {isAr
                      ? v === 1
                        ? 'مرة واحدة'
                        : `${v} مرات`
                      : v === 1
                      ? 'Once'
                      : `${v} times`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-300">
                {isAr ? 'سرعة النطق' : 'Speech speed'}
              </label>

              <div className="space-y-1">
                <input
                  type="range"
                  min={0.4}
                  max={1.2}
                  step={0.1}
                  value={rate}
                  onChange={e => setRate(Number(e.target.value))}
                  className="w-full accent-sky-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>{isAr ? 'أبطأ' : 'Slower'}</span>
                  <span>{isAr ? 'أسرع' : 'Faster'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={speak}
              disabled={speaking}
              className="rounded-full bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isAr ? 'ابدأ التكرار' : 'Start repeating'}
            </button>

            <button
              type="button"
              onClick={stopSpeech}
              className="rounded-full border border-slate-600 bg-slate-950/90 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-rose-400/80 hover:text-rose-100 hover:bg-slate-900 transition-colors"
            >
              {isAr ? 'إيقاف النطق' : 'Stop speech'}
            </button>
          </div>

          {/* Recording */}
          <div className="mt-3 space-y-1 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="text-emerald-400" size={16} />
              <p className="text-[11px] font-medium text-slate-200">
                {isAr
                  ? 'جرّب تنطق الكلمة بنفسك'
                  : 'Try pronouncing yourself'}
              </p>
            </div>

            {!recordingSupported ? (
              <p className="text-[10px] text-slate-500">
                {isAr
                  ? 'المتصفح لا يدعم التسجيل.'
                  : 'Recording not supported.'}
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={isRecording}
                    className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1.5 text-[11px] font-semibold text-slate-50 hover:bg-rose-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    <Mic size={14} />
                    {isAr ? 'ابدأ التسجيل' : 'Start recording'}
                  </button>

                  <button
                    type="button"
                    onClick={stopRecordingHandler}
                    disabled={!isRecording}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-slate-100 hover:border-emerald-400/80 hover:text-emerald-100 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    <StopCircle size={14} />
                    {isAr ? 'إيقاف التسجيل' : 'Stop recording'}
                  </button>
                </div>

                {recordedUrl && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] text-slate-400">
                      {isAr
                        ? 'تسجيلك الأخير:'
                        : 'Your latest recording:'}
                    </p>
                    <audio controls src={recordedUrl} className="w-full" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-300 min-h-[18px]">{status}</p>

      {/* Recent words */}
      <div className="panel panel-muted mt-2 rounded-2xl border border-slate-800 px-3.5 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-100">
            {isAr ? 'آخر الكلمات' : 'Recent words'}
          </h2>
        </div>

        {recentWords.length === 0 ? (
          <p className="text-[11px] text-slate-500">
            {isAr
              ? 'لا توجد كلمات بعد.'
              : 'No words yet.'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {recentWords.map(w => (
              <button
                key={w.id}
                type="button"
                onClick={() => setText(w.text)}
                className="group inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950/60 px-2.5 py-1 text-[11px] text-slate-200 hover:border-sky-500/70 hover:bg-slate-900/80 transition-colors"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-slate-500 group-hover:bg-sky-400" />
                <span>{w.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
