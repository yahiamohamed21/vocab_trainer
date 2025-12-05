// components/views/TrainingView.tsx
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Mic, StopCircle, Activity, X } from 'lucide-react';
import { LANGUAGES } from '@/lib/constants';
import { useAppState } from '@/context/AppStateContext';
import { useUiSettings } from '@/context/UiSettingsContext';
import { Word } from '@/lib/types';

// تحويل Blob إلى Data URL لتخزينه في localStorage
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function TrainingView() {
  const { words, currentLanguageId, addOrUpdateWord, saveRecordingForWord } =
    useAppState();
  const { uiLang } = useUiSettings();
  const isAr = uiLang === 'ar';

  const [text, setText] = useState('');
  const [repeat, setRepeat] = useState(3);
  const [rate, setRate] = useState(0.7);
  const [status, setStatus] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);

  // أصوات TTS للمتصفح (fallback)
  const [availableVoices, setAvailableVoices] =
    useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<string>('0');
  const [voiceWarning, setVoiceWarning] = useState<string | null>(null);

  // تسجيل صوت المستخدم
  const [recordingSupported, setRecordingSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // صوت خارجي (TTS API)
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentLang = LANGUAGES.find(l => l.id === currentLanguageId)!;
  const ttsSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  // دعم التسجيل
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const supported =
      !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
    setRecordingSupported(supported);
  }, []);

  // تحميل الأصوات (للـ fallback)
  useEffect(() => {
    if (!ttsSupported) return;
    const synth = window.speechSynthesis;

    const handleVoices = () => {
      let all = synth.getVoices();
      if (!all || !all.length) return;

      const seen = new Set<string>();
      const uniq: SpeechSynthesisVoice[] = [];
      for (const v of all) {
        const id = `${v.name}|${v.lang}|${v.voiceURI}`;
        if (seen.has(id)) continue;
        seen.add(id);
        uniq.push(v);
      }

      const mainLangCode = currentLang.ttsCode.split('-')[0].toLowerCase();
      const filtered = uniq.filter(v =>
        v.lang?.toLowerCase().startsWith(mainLangCode)
      );

      const voicesToUse = filtered.length ? filtered : uniq;
      setAvailableVoices(voicesToUse);

      if (filtered.length === 0) {
        setVoiceWarning(
          isAr
            ? 'لا يوجد صوت متاح لهذه اللغة على جهازك، سيتم استخدام صوت افتراضي (غالبًا إنجليزي).'
            : 'No native voice is available for this language on your device; a fallback (probably English) will be used.'
        );
      } else {
        setVoiceWarning(null);
      }

      setSelectedVoiceIndex(prev => {
        const idx = Number(prev);
        if (!Number.isNaN(idx) && voicesToUse[idx]) return prev;
        return voicesToUse.length ? '0' : '';
      });
    };

    handleVoices();
    synth.addEventListener('voiceschanged', handleVoices);
    return () => {
      synth.removeEventListener('voiceschanged', handleVoices);
    };
  }, [currentLanguageId, currentLang.ttsCode, ttsSupported, isAr]);

  // آخر الكلمات
  const recentWords = useMemo(
    () =>
      words
        .filter((w: Word) => w.languageId === currentLanguageId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 12),
    [words, currentLanguageId]
  );

  // "ترجمة" مبدئية للكلمة الحالية (قبل ربط API حقيقي)
  const matchingWord = useMemo(() => {
    const trimmed = text.trim().toLowerCase();
    if (!trimmed) return null;
    return (
      words.find(
        w =>
          w.languageId === currentLanguageId &&
          w.text.trim().toLowerCase() === trimmed
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

  // Fallback: صوت المتصفح
  function speakWithBrowserTts(trimmed: string) {
    if (!ttsSupported || typeof window === 'undefined') {
      setStatus(
        isAr
          ? 'النطق غير مدعوم في هذا المتصفح، ولم ينجح الاتصال بـ TTS الخارجي.'
          : 'Speech synthesis is not supported and external TTS failed.'
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
    if (
      availableVoices.length &&
      !Number.isNaN(idx) &&
      availableVoices[idx]
    ) {
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
            ? `تم تكرار الكلمة ${total} مرة (باستخدام صوت المتصفح).`
            : `Finished repeating the word ${total} times (browser voice).`
        );
        speakingRef.current = false;
        setSpeaking(false);
        return;
      }

      setStatus(
        isAr
          ? `بنكرر الكلمة (صوت المتصفح)... ${count} من ${total}`
          : `Repeating with browser voice... ${count} of ${total}`
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
        if (!speakingRef.current) {
          setStatus(isAr ? 'تم الإيقاف.' : 'Stopped.');
          return;
        }
        count += 1;
        setTimeout(speakOnce, 600);
      };

      synth.speak(utter);
    };

    speakOnce();
  }

  // نطق باستخدام ElevenLabs عبر /api/tts
  async function speakWithExternalTts(trimmed: string): Promise<boolean> {
    try {
      console.log('calling /api/tts with text:', trimmed);
      speakingRef.current = true;
      setSpeaking(true);
      setStatus(
        isAr
          ? 'جاري طلب الصوت من خدمة النطق الخارجية...'
          : 'Requesting audio from external TTS service...'
      );

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmed,
          lang: currentLang.ttsCode,
        }),
      });

      console.log('response /api/tts status:', res.status);

      if (!res.ok) {
        setStatus(
          isAr
            ? 'فشل في الاتصال بخدمة النطق الخارجية، سيتم استخدام صوت المتصفح.'
            : 'External TTS request failed, falling back to browser voice.'
        );
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
          setStatus(isAr ? 'تم الإيقاف.' : 'Stopped.');
          URL.revokeObjectURL(url);
          audioRef.current = null;
          return;
        }

        if (count >= total) {
          setStatus(
            isAr
              ? `تم تكرار الكلمة ${total} مرة (باستخدام TTS الخارجي).`
              : `Finished repeating the word ${total} times (external TTS).`
          );
          speakingRef.current = false;
          setSpeaking(false);
          URL.revokeObjectURL(url);
          audioRef.current = null;
          return;
        }

        setStatus(
          isAr
            ? `بنكرر الكلمة (خدمة خارجية)... ${count} من ${total}`
            : `Repeating with external TTS... ${count} of ${total}`
        );

        audioRef.current!.currentTime = 0;
        audioRef.current!
          .play()
          .catch(err => {
            console.error('audio play error:', err);
            setStatus(
              isAr
                ? 'تعذر تشغيل الصوت من الخدمة الخارجية.'
                : 'Could not play audio from external service.'
            );
            speakingRef.current = false;
            setSpeaking(false);
            URL.revokeObjectURL(url);
            audioRef.current = null;
          });
      };

      audio.onended = () => {
        if (!speakingRef.current) {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          return;
        }
        count += 1;
        setTimeout(playOnce, 400);
      };

      playOnce();

      return true;
    } catch (err) {
      console.error('External TTS error:', err);
      setStatus(
        isAr
          ? 'حدث خطأ أثناء الاتصال بخدمة النطق الخارجية، سيتم استخدام صوت المتصفح.'
          : 'Error while calling external TTS; falling back to browser voice.'
      );
      return false;
    }
  }

  async function speak() {
    const trimmed = text.trim();
    if (!trimmed) {
      setStatus(isAr ? 'اكتب كلمة أولاً.' : 'Type a word first.');
      return;
    }

    const exists = words.some(
      w =>
        w.languageId === currentLanguageId &&
        w.text.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (exists) {
      Swal.fire({
        icon: 'info',
        title: isAr ? 'الكلمة موجودة بالفعل' : 'Word already exists',
        text: isAr
          ? 'هذه الكلمة مكتوبة قبل كده في نفس اللغة. هنستخدمها للتدريب فقط.'
          : 'This word is already saved in this language. It will be used only for training.',
        confirmButtonText: isAr ? 'تمام' : 'OK',
        background: '#020617',
        color: '#e5e7eb',
        confirmButtonColor: '#38bdf8',
      });
    } else {
      addOrUpdateWord({ text: trimmed });
    }

    // نحاول الأول TTS الخارجي
    console.log('speak() clicked, using external TTS');
    const ok = await speakWithExternalTts(trimmed);

    // لو فشل → fallback للمتصفح
    if (!ok) {
      console.log('external TTS failed, fallback to browser TTS');
      speakWithBrowserTts(trimmed);
    }
  }

  // تسجيل صوت المستخدم
  async function startRecording() {
    if (!recordingSupported || isRecording) return;

    const trimmed = text.trim();
    if (!trimmed) {
      setStatus(
        isAr
          ? 'اكتب كلمة أولاً قبل بدء التسجيل.'
          : 'Type a word first before recording.'
      );
      return;
    }

    try {
      // تنبيه عند بداية التسجيل
      await Swal.fire({
        background: '#020617',
        color: '#e2e8f0',
        icon: 'info',
        title: isAr ? 'بدء تسجيل صوتك' : 'Starting recording',
        text: isAr
          ? `أنت الآن ستقوم بتسجيل صوتك لهذه الكلمة: "${trimmed}". تكلم بوضوح بالقرب من الميكروفون، ثم اضغط على "إيقاف التسجيل" عند الانتهاء.`
          : `You are now going to record your voice for this word: "${trimmed}". Speak clearly near the microphone, then press "Stop recording" when you are done.`,
        confirmButtonText: isAr ? 'ابدأ التسجيل' : 'Start recording',
        confirmButtonColor: '#0ea5e9',
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const dataUrl = await blobToDataUrl(blob);

          setRecordedUrl(dataUrl);
          setIsRecording(false);
          stream.getTracks().forEach(t => t.stop());

          const currentText = text.trim();
          if (currentText) {
            saveRecordingForWord(currentText, dataUrl);
            setStatus(
              isAr
                ? 'تم حفظ تسجيلك مع هذه الكلمة.'
                : 'Your recording has been saved with this word.'
            );
          } else {
            setStatus(
              isAr
                ? 'تم حفظ التسجيل فقط بدون ربطه بكلمة.'
                : 'Recording saved only locally without linking to a word.'
            );
          }
        } catch {
          setStatus(
            isAr
              ? 'حدث خطأ أثناء معالجة التسجيل.'
              : 'An error occurred while processing the recording.'
          );
        }
      };

      recorder.start();
      setIsRecording(true);
      setStatus(
        isAr ? 'جاري تسجيل صوتك...' : 'Recording your pronunciation...'
      );
    } catch (err) {
      setStatus(
        isAr
          ? 'تعذر الوصول إلى الميكروفون. تأكد من صلاحيات المتصفح.'
          : 'Could not access microphone. Please check browser permissions.'
      );
    }
  }

  function stopRecordingHandler() {
    if (!isRecording || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  }

  return (
    <section className="space-y-5">
      {/* صف علوي: كلمة + إعدادات */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)]">
        {/* كلمة الإدخال + ترجمة تجريبية */}
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
                ? 'الكلمة هتتحفظ تلقائيًا تحت اللغة الحالية وتظهر في صفحة قائمة الكلمات.'
                : 'The word will be saved under the current language and shown in the words list.'}
            </p>
          </div>

          {/* ترجمة مبدئية للكلمة (قبل API حقيقي) */}
          <div className="space-y-1 mt-2">
            <p className="text-[11px] font-medium text-slate-300">
              {isAr ? 'ترجمة الكلمة (تجريبية):' : 'Word translation (preview):'}
            </p>
            <div className="min-h-[40px] rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-[12px] text-slate-100 flex items-center">
              {!text.trim() ? (
                <span className="text-slate-500 text-[11px]">
                  {isAr
                    ? 'اكتب كلمة، وستظهر ترجمتها هنا لاحقًا عند توصيل خدمة الترجمة.'
                    : 'Type a word and its translation will appear here once the translation service is connected.'}
                </span>
              ) : matchingWord && matchingWord.translation ? (
                <span>
                  {isAr ? 'الترجمة المحفوظة: ' : 'Saved translation: '}
                  <span className="font-semibold text-sky-200">
                    {matchingWord.translation}
                  </span>
                </span>
              ) : (
                <span className="text-slate-500 text-[11px]">
                  {isAr
                    ? 'لا توجد ترجمة محفوظة لهذه الكلمة حتى الآن. سيتم جلب ترجمة تلقائية هنا عند إضافة الـ API.'
                    : 'No saved translation for this word yet. An automatic translation will appear here once the API is integrated.'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* إعدادات النطق + اختيار الصوت + التسجيل */}
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

          {/* اختيار الصوت (fallback) */}
          <div className="space-y-1">
            <label className="text-[11px] text-slate-300">
              {isAr
                ? 'اختر صوت المتصفح (يُستخدم لو فشل TTS الخارجي)'
                : 'Choose browser voice (used if external TTS fails)'}
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
                    ? 'النطق بالمتصفح غير مدعوم.'
                    : 'Browser speech is not supported.'}
                </option>
              ) : availableVoices.length === 0 ? (
                <option value="">
                  {isAr
                    ? 'الأصوات غير متاحة حاليًا. جرّب إعادة تحميل الصفحة.'
                    : 'Voices are not available yet. Try reloading the page.'}
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
              <p className="text-[10px] text-amber-400 mt-1">{voiceWarning}</p>
            )}
            <p className="text-[10px] text-slate-500">
              {isAr
                ? 'يتم استخدام خدمة TTS خارجية أولاً، وهذا الصوت يستخدم فقط عند فشلها.'
                : 'External TTS is used first; this browser voice is used only as a fallback.'}
            </p>
          </div>

          {/* تكرار وسرعة */}
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

          {/* أزرار النطق */}
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

          {/* قسم تسجيل صوت المستخدم */}
          <div className="mt-3 space-y-1 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="text-emerald-400" size={16} />
              <p className="text-[11px] font-medium text-slate-200">
                {isAr
                  ? 'جرّب تنطق الكلمة بنفسك (يتم حفظ التسجيل مع الكلمة)'
                  : 'Try pronouncing the word yourself (recording is saved with the word).'}
              </p>
            </div>
            {!recordingSupported ? (
              <p className="text-[10px] text-slate-500">
                {isAr
                  ? 'المتصفح الحالي لا يدعم تسجيل الصوت أو تم منع الوصول إلى الميكروفون.'
                  : 'Current browser does not support audio recording or microphone access is blocked.'}
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
                <p className="text-[10px] text-slate-500 mt-1">
                  {isAr
                    ? 'سجّل ٣–٥ ثواني لنطقك للكلمة. عند إيقاف التسجيل، يتم حفظه مع الكلمة الحالية في هذه اللغة.'
                    : 'Record 3–5 seconds of your pronunciation. When you stop, it will be saved with the current word in this language.'}
                </p>
                {recordedUrl && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] text-slate-400">
                      {isAr
                        ? 'تسجيلك الأخير لهذه الكلمة:'
                        : 'Your latest recording for this word:'}
                    </p>
                    <audio controls src={recordedUrl} className="w-full" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* حالة النطق / التسجيل */}
      <p className="text-[11px] text-slate-300 min-h-[18px]">{status}</p>

      {/* آخر الكلمات */}
      <div className="panel panel-muted mt-2 rounded-2xl border border-slate-800 px-3.5 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-100">
            {isAr
              ? 'آخر الكلمات المستخدمة في هذه اللغة'
              : 'Recent words in this language'}
          </h2>
          <p className="text-[10px] text-slate-500">
            {isAr
              ? 'اضغط على أي كلمة لإرجاعها في خانة الإدخال، ثم اسمع النطق أو سجّل صوتك من جديد.'
              : 'Click any word to put it back into the input, then listen or record again.'}
          </p>
        </div>

        {recentWords.length === 0 ? (
          <p className="text-[11px] text-slate-500">
            {isAr
              ? 'لم يتم استخدام أي كلمة بعد لهذه اللغة.'
              : 'No words used yet for this language.'}
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
