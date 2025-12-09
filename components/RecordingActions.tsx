// components/RecordingActions.tsx
'use client';

import { useState } from 'react';
import Swal from 'sweetalert2';
import { Volume2, Download, Trash2 } from 'lucide-react';
import { useUiSettings } from '@/context/UiSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { safeGetItem } from '@/lib/storage';
import { apiRequest, ApiError } from '@/lib/api/httpClient';

const STORAGE_KEY_SESSION = 'vocab_trainer_session_user';

type StoredSession = {
  user?: any;
  accessToken?: string | null;
  refreshToken?: string | null;
};

interface RecordingActionsProps {
  recordingUrl?: string | null;     // URL محلي (Data URL أو blob URL)، لو موجود
  fileName: string;                 // اسم الملف عند التحميل
  wordId?: string;                  // مطلوب لمود الـ Backend
  onDeleteLocal?: () => void;       // حذف محلي للضيف
}

function getAccessToken(): string | null {
  const raw = safeGetItem(STORAGE_KEY_SESSION);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSession;
    return (parsed as any).accessToken ?? null;
  } catch {
    return null;
  }
}

export default function RecordingActions({
  recordingUrl,
  fileName,
  wordId,
  onDeleteLocal,
}: RecordingActionsProps) {
  const { uiLang, theme } = useUiSettings();
  const { user } = useAuth();

  const isAr = uiLang === 'ar';
  const isDark = theme === 'dark';
  const isGuest = !user || !wordId;

  const [localUrl, setLocalUrl] = useState<string | null>(
    recordingUrl ?? null
  );
  const [loading, setLoading] = useState(false);

  const swalBase = isDark
    ? {
        background: '#020617',
        color: '#e5e7eb',
        confirmButtonColor: '#38bdf8',
        cancelButtonColor: '#64748b',
      }
    : {
        background: '#ffffff',
        color: '#020617',
        confirmButtonColor: '#0ea5e9',
        cancelButtonColor: '#64748b',
      };

  if (!localUrl && isGuest && !wordId) {
    // لا يوجد تسجيل فعلي لعرضه
    return null;
  }

  async function ensureUrlFromBackend(): Promise<string | null> {
    if (localUrl) return localUrl;
    if (!wordId) return null;

    const token = getAccessToken();
    if (!token) {
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: isAr ? 'خطأ في الجلسة' : 'Session error',
        text: isAr
          ? 'لا يوجد رمز دخول صالح. حاول تسجيل الدخول مرة أخرى.'
          : 'No valid access token. Please sign in again.',
      });
      return null;
    }

    try {
      setLoading(true);

      const blob = await apiRequest<Blob>('/api/words/recording/get', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: { wordId },
        responseType: 'blob',
        auth: false, // لأننا بنبعت التوكن يدوي
      });

      const url = URL.createObjectURL(blob);
      setLocalUrl(url);
      return url;
    } catch (err) {
      console.error(err);

      let msg = isAr
        ? 'تعذر الاتصال بالخادم. تأكد من الاتصال بالإنترنت.'
        : 'Could not reach the server. Please check your connection.';

      if (err instanceof ApiError) {
        msg = err.message || msg;
      }

      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: isAr ? 'تعذر تحميل التسجيل' : 'Could not load recording',
        text: msg,
      });

      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handlePlay() {
    if (isGuest || !wordId) {
      if (!localUrl) return;
      const audio = new Audio(localUrl);
      audio.play().catch(() => {
        Swal.fire({
          ...swalBase,
          icon: 'error',
          title: isAr ? 'تعذر تشغيل التسجيل' : 'Could not play recording',
          text: isAr
            ? 'حدث خطأ أثناء تشغيل التسجيل.'
            : 'An error occurred while playing the recording.',
        });
      });
      return;
    }

    const url = await ensureUrlFromBackend();
    if (!url) return;

    const audio = new Audio(url);
    audio.play().catch(() => {
      Swal.fire({
        ...swalBase,
        icon: 'error',
        title: isAr ? 'تعذر تشغيل التسجيل' : 'Could not play recording',
        text: isAr
          ? 'حدث خطأ أثناء تشغيل التسجيل.'
          : 'An error occurred while playing the recording.',
      });
    });
  }

  async function handleDownload() {
    if (isGuest || !wordId) {
      if (!localUrl) return;
      const a = document.createElement('a');
      a.href = localUrl;
      a.download = `${fileName || 'recording'}.webm`;
      a.click();
      return;
    }

    const url = await ensureUrlFromBackend();
    if (!url) return;

    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName || 'recording'}.webm`;
    a.click();
  }

  async function handleDelete() {
    // ضيف / محلي
    if (isGuest || !wordId) {
      const result = await Swal.fire({
        ...swalBase,
        icon: 'warning',
        title: isAr ? 'حذف التسجيل' : 'Delete recording',
        text: isAr
          ? 'سيتم حذف التسجيل المخزّن محلياً لهذه الكلمة.'
          : 'The locally stored recording for this word will be deleted.',
        showCancelButton: true,
        confirmButtonText: isAr ? 'نعم، احذف' : 'Yes, delete',
        cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
        confirmButtonColor: '#ef4444',
      });

      if (!result.isConfirmed) return;

      if (localUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(localUrl);
      }

      setLocalUrl(null);
      onDeleteLocal?.();

      await Swal.fire({
        ...swalBase,
        icon: 'success',
        title: isAr ? 'تم الحذف' : 'Deleted',
        text: isAr ? 'تم حذف التسجيل المحلي.' : 'Local recording deleted.',
        timer: 1000,
        showConfirmButton: false,
      });
      return;
    }

    // Backend mode
    const confirmRes = await Swal.fire({
      ...swalBase,
      icon: 'warning',
      title: isAr ? 'حذف تسجيل الخادم' : 'Delete server recording',
      text: isAr
        ? 'سيتم حذف التسجيل المرتبط بهذه الكلمة من الخادم.'
        : 'The recording linked to this word will be deleted from the server.',
      showCancelButton: true,
      confirmButtonText: isAr ? 'نعم، احذف' : 'Yes, delete',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
      confirmButtonColor: '#ef4444',
    });

    if (!confirmRes.isConfirmed) return;

    const token = getAccessToken();
    if (!token) {
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: isAr ? 'خطأ في الجلسة' : 'Session error',
        text: isAr
          ? 'لا يوجد رمز دخول صالح. حاول تسجيل الدخول مرة أخرى.'
          : 'No valid access token. Please sign in again.',
      });
      return;
    }

    try {
      setLoading(true);

      const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://vocabtrainerapi.runasp.net';

const res = await fetch(
  `${API_BASE_URL}/api/words/recording/delete/${wordId}`,
  {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);


      if (localUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(localUrl);
      }
      setLocalUrl(null);

      await Swal.fire({
        ...swalBase,
        icon: 'success',
        title: isAr ? 'تم الحذف' : 'Deleted',
        text: isAr
          ? 'تم حذف التسجيل من الخادم.'
          : 'Recording deleted from the server.',
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);

      let msg = isAr
        ? 'حدث خطأ أثناء محاولة حذف التسجيل من الخادم.'
        : 'An error occurred while trying to delete the recording from the server.';

      if (err instanceof ApiError) {
        msg = err.message || msg;
      }

      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: isAr ? 'لم يتم حذف التسجيل' : 'Could not delete recording',
        text: msg,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={handlePlay}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        <Volume2 size={12} />
        {isAr ? 'تشغيل' : 'Play'}
      </button>

      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        <Download size={12} />
        {isAr ? 'تحميل' : 'Download'}
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-full bg-rose-500/90 px-2.5 py-1 text-[10px] font-semibold text-slate-50 hover:bg-rose-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        <Trash2 size={12} />
        {isAr ? 'حذف التسجيل' : 'Delete rec.'}
      </button>
    </div>
  );
}
