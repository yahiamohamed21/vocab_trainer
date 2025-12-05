'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useUiSettings } from '../context/UiSettingsContext';
import Swal from 'sweetalert2';

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();

  const { currentUser, loading, logout } = useAuth();
  const { uiLang, theme } = useUiSettings();

  const isLogin = pathname === '/login';
  const isAdmin = pathname.startsWith('/admin');
  const isDark = theme === 'dark';
  const isRtl = uiLang === 'ar';

  const appName = uiLang === 'ar' ? 'مدرّب المفردات' : 'Vocab Trainer';
  const badge = isAdmin ? 'Dashboard' : 'Beta';
  const dir = isRtl ? 'rtl' : 'ltr';

  const baseBg = isDark
    ? 'bg-gradient-to-b from-slate-900/80 to-slate-900/40 border-slate-800'
    : 'bg-gradient-to-b from-white/80 to-white/40 border-slate-200';

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
          <span className="text-[15px] font-semibold">{appName}</span>

          <span
            className="
              px-2 py-0.5 rounded-full text-[10px] font-medium
              bg-sky-500/10 text-sky-600 dark:text-sky-300 dark:bg-sky-900/30
            "
          >
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
            className="
              text-[16px] font-semibold tracking-tight
              text-slate-900 dark:text-slate-100
            "
          >
            {appName}
          </span>

          <span
            className="
              text-[10px] px-2 py-[3px] rounded-full font-medium uppercase tracking-wide
              bg-sky-500/10 text-sky-600 dark:text-sky-300 dark:bg-sky-900/30
            "
          >
            {badge}
          </span>
        </div>

        {/* ----------------------------------
            يمين: المستخدم وأزرار التحكم
        ----------------------------------- */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-6 w-28 rounded-full bg-slate-400/20 animate-pulse" />
          ) : currentUser ? (
            <>
              {/* بطاقة المستخدم */}
              <div
                className="
                  flex items-center gap-3 px-3 py-1.5 rounded-full
                  bg-slate-500/10 dark:bg-slate-800/50
                  border border-slate-300/50 dark:border-slate-700/50
                "
              >
                <span className="text-[12px] font-medium truncate max-w-[120px]">
                  {currentUser.name}
                </span>

                <span
                  className="
                    text-[10px] px-2 py-[2px] rounded-full uppercase tracking-wide
                    bg-slate-300/40 dark:bg-slate-700/40
                  "
                >
                  {currentUser.role}
                </span>
              </div>

              {/* زر لوحة التحكم */}
              {currentUser.role === 'admin' && !isAdmin && (
                <button
                  onClick={() => router.push('/admin')}
                  className="
                    px-3 py-1.5 rounded-full text-[11px] font-medium
                    bg-amber-500/10 text-amber-700 dark:text-amber-300
                    border border-amber-500/30
                    hover:bg-amber-500/20 transition
                  "
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
                className="
                  px-3 py-1.5 rounded-full text-[11px] font-medium
                  bg-rose-500/10 text-rose-600 dark:text-rose-300
                  border border-rose-500/30
                  hover:bg-rose-500/20 transition
                "
              >
                {uiLang === 'ar' ? 'خروج' : 'Logout'}
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="
                px-4 py-1.5 rounded-full text-[12px] font-medium
                bg-sky-500/10 text-sky-600 dark:text-sky-300
                border border-sky-500/30
                hover:bg-sky-500/20 transition
              "
            >
              {uiLang === 'ar' ? 'دخول' : 'Login'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
