// hooks/useGuestTrial.ts
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

import { useUiSettings } from '@/context/UiSettingsContext';
import {
  GUEST_TRIAL_MINUTES,
  STORAGE_KEY_GUEST_SESSION,
  STORAGE_KEY_GUEST_TRIAL_USED,
} from '@/lib/constants';

const swalDark = {
  background: '#020617',
  color: '#e2e8f0',
  confirmButtonColor: '#0ea5e9',
  cancelButtonColor: '#64748b',
};

export function useGuestTrial(isGuest: boolean) {
  const router = useRouter();
  const { uiLang, theme } = useUiSettings();
  const isAr = uiLang === 'ar';
  const isDark = theme === 'dark';

  const swalBase = isDark ? swalDark : {};

  useEffect(() => {
    if (!isGuest) return;
    if (typeof window === 'undefined') return;

    const sessionKey = STORAGE_KEY_GUEST_SESSION;
    const usedKey = STORAGE_KEY_GUEST_TRIAL_USED;
    const now = Date.now();
    const durationMs = GUEST_TRIAL_MINUTES * 60 * 10;

    // لو الضيف استخدم التجربة قبل كده → ممنوع تاني
    try {
      const usedFlag = window.localStorage.getItem(usedKey);
      if (usedFlag === 'true') {
        (async () => {
          await Swal.fire({
            ...swalBase,
            icon: 'info',
            title: isAr ? 'انتهت التجربة المجانية' : 'Free trial finished',
            text: isAr
              ? 'لقد استخدمت التجربة المجانية من قبل. اطلب من الأدمن كود دعوة لإنشاء حساب دائم.'
              : 'You have already used the free trial. Ask your admin for an invite code to create a permanent account.',
            confirmButtonText: isAr ? 'الرجوع للصفحة الرئيسية' : 'Back to home',
          });
          router.replace('/');
        })();
        return;
      }
    } catch {
      // ignore
    }

    let startedAt = now;

    // قراءة بداية الجلسة من localStorage أو إنشاؤها لأول مرة
    try {
      const raw = window.localStorage.getItem(sessionKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.startedAt === 'number') {
          startedAt = parsed.startedAt;
        }
      } else {
        window.localStorage.setItem(
          sessionKey,
          JSON.stringify({ startedAt: now })
        );
      }
    } catch {
      // تجاهل أخطاء الـ localStorage
    }

    const elapsed = now - startedAt;

    const markTrialUsedAndExit = async () => {
      try {
        // علّم إن التجربة استُخدمت مرة واحدة
        window.localStorage.setItem(usedKey, 'true');
        // نظف session
        window.localStorage.removeItem(sessionKey);
      } catch {
        // ignore
      }

      try {
        await Swal.fire({
          ...swalBase,
          icon: 'info',
          title: isAr ? 'انتهت فترة التجربة' : 'Trial finished',
          text: isAr
            ? 'انتهت فترة تجربة التطبيق كزائر. اطلب من الأدمن كود دعوة لإنشاء حساب دائم.'
            : 'Your guest trial has finished. Ask your admin for an invite code to create a permanent account.',
          confirmButtonText: isAr ? 'الرجوع للصفحة الرئيسية' : 'Back to home',
        });
      } finally {
        router.replace('/');
      }
    };

    // لو الفترة انتهت بالفعل
    if (elapsed >= durationMs) {
      markTrialUsedAndExit();
      return;
    }

    // المدة المتبقية
    const remaining = durationMs - elapsed;

    const timeoutId = window.setTimeout(() => {
      markTrialUsedAndExit();
    }, remaining);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isGuest, uiLang, theme, router]);
}
