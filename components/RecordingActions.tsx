// components/RecordingActions.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { Play, Pause, Download, Trash2 } from 'lucide-react';
import { useUiSettings } from '@/context/UiSettingsContext';

type RecordingActionsProps = {
  recordingUrl: string;
  fileName?: string;
  onDelete: () => void;
};

export default function RecordingActions({
  recordingUrl,
  fileName,
  onDelete,
}: RecordingActionsProps) {
  const { uiLang } = useUiSettings();
  const isAr = uiLang === 'ar';

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasShownPlayInfo, setHasShownPlayInfo] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const baseName =
    fileName && fileName.trim().length > 0 ? fileName.trim() : 'recording';
  const safeFileName = baseName.replace(/\s+/g, '_');
  const downloadFileName = `${safeFileName}.webm`;

  function ensureAudio() {
    if (!audioRef.current) {
      const audio = new Audio(recordingUrl);
      audio.onended = () => setIsPlaying(false);
      audioRef.current = audio;
    }
    return audioRef.current;
  }

  async function handleTogglePlay() {
    try {
      const audio = ensureAudio();
      if (!audio) return;

      // أول مرة تشغيل → نعرض تنبيه بسيط
      if (!isPlaying && !hasShownPlayInfo) {
        await Swal.fire({
          background: '#020617',
          color: '#e2e8f0',
          icon: 'info',
          title: isAr
            ? 'تشغيل تسجيلك لهذه الكلمة'
            : 'Playing your recording',
          text: isAr
            ? 'أنت الآن تسمع تسجيلك الصوتي لهذه الكلمة. يمكنك إعادة التسجيل من شاشة التدريب إذا أردت تغييره.'
            : 'You are now listening to your own recording for this word. You can re-record it from the training screen if you want to change it.',
          confirmButtonText: isAr ? 'متابعة' : 'Continue',
          confirmButtonColor: '#0ea5e9',
        });
        setHasShownPlayInfo(true);
      }

      if (!isPlaying) {
        await audio.play();
        setIsPlaying(true);
      } else {
        audio.pause();
        audio.currentTime = 0;
        setIsPlaying(false);
      }
    } catch {
      // ممكن تضيف SweetAlert للخطأ لو حبيت
    }
  }

  function handleDownload() {
    try {
      const link = document.createElement('a');
      link.href = recordingUrl;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // تجاهُل بسيط
    }
  }

  async function handleDelete() {
    const res = await Swal.fire({
      background: '#020617',
      color: '#e2e8f0',
      icon: 'warning',
      title: isAr ? 'مسح التسجيل؟' : 'Delete recording?',
      text: isAr
        ? 'هل أنت متأكد أنك تريد مسح هذا التسجيل الصوتي فقط (بدون مسح الكلمة)؟'
        : 'Are you sure you want to delete this recording only (word will stay)?',
      showCancelButton: true,
      confirmButtonText: isAr ? 'نعم، مسح' : 'Yes, delete',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
    });

    if (!res.isConfirmed) return;

    // إيقاف الصوت لو شغال
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    onDelete();
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div className="inline-flex flex-wrap items-center gap-1">
      {/* زر تشغيل/إيقاف التسجيل */}
      <button
        type="button"
        onClick={handleTogglePlay}
        className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
      >
        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
        <span>{isAr ? 'تسجيلك' : 'My recording'}</span>
      </button>

      {/* تحميل (أيقونة صغيرة) */}
      <button
        type="button"
        onClick={handleDownload}
        title={isAr ? 'تحميل التسجيل' : 'Download recording'}
        className="inline-flex items-center justify-center rounded-full border border-sky-500/60 bg-sky-500/10 p-1.5 text-[10px] text-sky-100 hover:bg-sky-500/20 transition"
      >
        <Download size={11} />
      </button>

      {/* مسح التسجيل (أيقونة صغيرة) */}
      <button
        type="button"
        onClick={handleDelete}
        title={isAr ? 'مسح التسجيل' : 'Delete recording'}
        className="inline-flex items-center justify-center rounded-full border border-rose-500/60 bg-rose-500/10 p-1.5 text-[10px] text-rose-100 hover:bg-rose-500/20 transition"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}
