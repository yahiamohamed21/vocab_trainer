'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useUiSettings } from '../context/UiSettingsContext';
import Swal from 'sweetalert2';

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();

  // استخدام user من AuthContext
  const { user, loading, logout } = useAuth();
  const { uiLang, theme } = useUiSettings();

  const isLogin = pathname === '/login';
  const isAdmin = pathname.startsWith('/admin');
  const isDark = theme === 'dark';
  const isRtl = uiLang === 'ar';

  const appName = uiLang === 'ar' ? 'مدرّب المفردات' : 'Vocab Trainer';
  const badge = isAdmin ? 'Dashboard' : 'Beta';
  const dir = isRtl ? 'rtl' : 'ltr';

  const baseBg = isDark
    ? 'bg-gradient-to-b from-slate-900/90 to-slate-900/60 border-slate-800'
    : 'bg-gradient-to-b from-white/90 to-slate-50/90 border-slate-200 shadow-[0_8px_24px_rgba(15,23,42,0.06)]';

  // ==============================
  //   صفحة تسجيل الدخول (لوجين)
  // ==============================
  if (isLogin) {
    return (
      <header
        dir={dir}
        className={`sticky top-0 z-40 backdrop-blur-md border-b ${baseBg}`}
      >
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-2">
          <span
            className={`
              text-[15px] font-semibold tracking-tight
              ${isDark ? 'text-slate-50' : 'text-slate-900'}
            `}
          >
            {appName}
          </span>

          <span
            className={`
              px-2 py-0.5 rounded-full text-[10px] font-medium
              flex items-center gap-1
              ${
                isDark
                  ? 'bg-sky-500/10 text-sky-300 border border-sky-500/40'
                  : 'bg-sky-50 text-sky-700 border border-sky-300'
              }
            `}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
            {badge}
          </span>
        </div>
      </header>
    );
  }

  // ==============================
  //   التوب بار الأساسي
  // ==============================
  return (
    <header
      dir={dir}
      className={`
        sticky top-0 z-50 backdrop-blur-xl border-b
        ${baseBg}
      `}
    >
      <div className="mx-auto max-w-5xl px-4 py-2.5 flex items-center justify-between">
        {/* ----------------------------------
            يسار: اسم التطبيق
        ----------------------------------- */}
        <div className="flex items-center gap-3">
          <span
            className={`
              text-[16px] font-semibold tracking-tight
              ${isDark ? 'text-slate-50' : 'text-slate-900'}
            `}
          >
            {appName}
          </span>

          <span
            className={`
              text-[10px] px-2 py-[3px] rounded-full font-medium uppercase tracking-wide
              flex items-center gap-1
              ${
                isDark
                  ? 'bg-sky-500/10 text-sky-300 border border-sky-500/40'
                  : 'bg-sky-50 text-sky-700 border border-sky-300'
              }
            `}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
            {badge}
          </span>
        </div>

        {/* ----------------------------------
            يمين: المستخدم وأزرار التحكم
        ----------------------------------- */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div
              className={`
                h-6 w-28 rounded-full animate-pulse
                ${isDark ? 'bg-slate-400/20' : 'bg-slate-200/80'}
              `}
            />
          ) : user ? (
            <>
              {/* بطاقة المستخدم */}
              <div
                className={`
                  flex items-center gap-3 px-3 py-1.5 rounded-full
                  border
                  ${
                    isDark
                      ? 'bg-slate-800/60 border-slate-700/60 text-slate-100'
                      : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                  }
                `}
              >
                <span className="text-[12px] font-medium truncate max-w-[120px]">
                  {user.name}
                </span>

                <span
                  className={`
                    text-[10px] px-2 py-[2px] rounded-full uppercase tracking-wide
                    ${
                      isDark
                        ? 'bg-slate-700/60 text-slate-100'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }
                  `}
                >
                  {user.role}
                </span>
              </div>

              {/* زر لوحة التحكم */}
              {user.role === 'admin' && !isAdmin && (
                <button
                  onClick={() => router.push('/admin')}
                  className={`
                    px-3 py-1.5 rounded-full text-[11px] font-medium
                    border
                    ${
                      isDark
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 hover:bg-amber-500/20'
                        : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                    }
                    transition
                  `}
                >
                  {uiLang === 'ar' ? 'لوحة التحكم' : 'Admin'}
                </button>
              )}

              {/* ----------------------------------
                  زر الخروج + SweetAlert2
              ----------------------------------- */}
              <button
                onClick={async () => {
                  const res = await Swal.fire({
                    title: uiLang === 'ar' ? 'تأكيد الخروج' : 'Confirm Logout',
                    text:
                      uiLang === 'ar'
                        ? 'هل أنت متأكد أنك تريد تسجيل الخروج؟'
                        : 'Are you sure you want to logout?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: uiLang === 'ar' ? 'تسجيل خروج' : 'Logout',
                    cancelButtonText: uiLang === 'ar' ? 'إلغاء' : 'Cancel',
                    confirmButtonColor: '#d33',
                  });

                  if (res.isConfirmed) {
                    logout();
                    router.push('/login');
                  }
                }}
                className={`
                  px-3 py-1.5 rounded-full text-[11px] font-medium
                  border
                  ${
                    isDark
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/40 hover:bg-rose-500/20'
                      : 'bg-rose-50 text-rose-600 border-rose-300 hover:bg-rose-100'
                  }
                  transition
                `}
              >
                {uiLang === 'ar' ? 'خروج' : 'Logout'}
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className={`
                px-4 py-1.5 rounded-full text-[12px] font-medium
                border
                ${
                  isDark
                    ? 'bg-sky-500/10 text-sky-300 border-sky-500/40 hover:bg-sky-500/20'
                    : 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100'
                }
                transition
              `}
            >
              {uiLang === 'ar' ? 'دخول' : 'Login'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
