// app/login/page.tsx
'use client';

import { FormEvent, useState } from 'react';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import {
  Mail,
  LockKeyhole,
  ShieldCheck,
  ArrowLeft,
  Globe2,
  SunMedium,
  MoonStar,
  Eye,
  EyeOff,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useUiSettings } from '@/context/UiSettingsContext';

const swalDarkBase = {
  background: '#020617',
  color: '#e2e8f0',
  confirmButtonColor: '#0ea5e9',
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { uiLang, theme, setUiLang, setTheme } = useUiSettings();
  const { login } = useAuth();
  const router = useRouter();

  const isAr = uiLang === 'ar';
  const isDark = theme === 'dark';

  const t = {
    title: isAr ? 'تسجيل الدخول للحساب' : 'Sign in to your account',
    subtitle: isAr
      ? 'اكتب البريد الإلكتروني وكلمة المرور للدخول سواء كنت أدمن أو مستخدم عادي.'
      : 'Enter your email and password to sign in as an admin or a normal user.',
    email: isAr ? 'البريد الإلكتروني' : 'Email',
    password: isAr ? 'كلمة المرور' : 'Password',
    submit: isAr ? 'تسجيل الدخول' : 'Sign in',
    backHome: isAr ? 'الرجوع للتطبيق' : 'Back to app',
    wrongCredTitle: isAr ? 'بيانات غير صحيحة' : 'Invalid credentials',
    wrongCredText: isAr
      ? 'تأكد من البريد الإلكتروني وكلمة المرور.'
      : 'Please check your email and password.',
    successTitle: isAr ? 'تم تسجيل الدخول' : 'Logged in',
    uiLangLabel: isAr ? 'لغة الواجهة' : 'UI language',
    themeLabel: isAr ? 'وضع الألوان' : 'Theme',
    themeLight: isAr ? 'فاتح' : 'Light',
    themeDark: isAr ? 'داكن' : 'Dark',
    heroTitle: isAr
      ? 'سجّل الدخول لإدارة الحساب أو متابعة التدريب.'
      : 'Sign in to manage your account or continue training.',
    heroBody: isAr
      ? 'حساب الأدمن يمكنه إدارة المستخدمين، بينما الحساب العادي يركّز على التدريب.'
      : 'Admin accounts manage the dashboard, normal users train vocabulary.',
    heroChip1: isAr ? 'حسابات المستخدمين' : 'User accounts',
    heroChip2: isAr ? 'الأدوار والصلاحيات' : 'Roles & permissions',
    footerText: isAr
      ? 'الأدمن → لوحة التحكم | المستخدم → صفحة التدريب'
      : 'Admins go to dashboard, users go to training page.',
  };

  // ==========================
  //     تسجيل الدخول
  // ==========================
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const swalBase = isDark ? swalDarkBase : {};

    const result = await login(email, password);

    if (!result.ok || !result.user) {
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: t.wrongCredTitle,
        text: result.error || t.wrongCredText,
      });
      setSubmitting(false);
      return;
    }

    const user = result.user;

    // أدمن → يذهب للوحة التحكم
    if (user.role === 'admin') {
      await Swal.fire({
        ...swalBase,
        icon: 'success',
        title: t.successTitle,
        timer: 1000,
        showConfirmButton: false,
      });

      router.replace('/admin');
      setSubmitting(false);
      return;
    }

    // مستخدم عادي → يذهب مباشرة للتطبيق الرئيسي
    await Swal.fire({
      ...swalBase,
      icon: 'success',
      title: t.successTitle,
      timer: 1000,
      showConfirmButton: false,
    });

    router.replace('/user');
    setSubmitting(false);
  }

  // =====================================================
  //     واجهة تسجيل الدخول (UI)
  // =====================================================
  return (
    <div
      className="relative flex-1 flex items-center justify-center px-4 py-10 overflow-hidden"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* الخلفيات */}
      <div
        className={`pointer-events-none absolute inset-0 -z-30 ${
          isDark ? 'bg-slate-950' : 'bg-slate-50'
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-0 -z-20 opacity-80 ${
          isDark
            ? 'bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.16),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(129,140,248,0.18),transparent_55%)]'
            : 'bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.12),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(129,140,248,0.14),transparent_55%)]'
        }`}
      />
      <div
        className={`pointer-events-none absolute -right-40 -top-32 h-72 w-72 rounded-full blur-3xl ${
          isDark ? 'bg-sky-500/20' : 'bg-sky-300/35'
        }`}
      />
      <div
        className={`pointer-events-none absolute -left-40 bottom-0 h-72 w-72 rounded-full blur-3xl ${
          isDark ? 'bg-indigo-500/25' : 'bg-indigo-300/30'
        }`}
      />

      <div className="w-full max-w-5xl relative">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-stretch">
          {/* ========== البانل اليسار ========== */}
          <section
            className={`hidden md:flex flex-col justify-between rounded-3xl border px-6 py-6 backdrop-blur-2xl ${
              isDark
                ? 'border-slate-800/70 bg-slate-950/70 shadow-[0_0_55px_rgba(15,23,42,1)]'
                : 'border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]'
            }`}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 shadow-lg shadow-sky-500/40">
                    <span className="text-[13px] font-bold text-slate-950">VT</span>
                  </div>

                  <div className="leading-tight">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      Vocab Trainer
                    </p>
                    <p
                      className={`text-xs ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      {isAr ? 'لوحة إدارة الحسابات' : 'Accounts Control'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-emerald-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                    {isAr ? 'دخول آمن للحسابات' : 'Secure account access'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h1
                  className={`text-2xl font-semibold leading-snug ${
                    isDark ? 'text-slate-50' : 'text-slate-900'
                  }`}
                >
                  {t.heroTitle}
                </h1>
                <p
                  className={`text-sm ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {t.heroBody}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div
                  className={`rounded-2xl border p-3 space-y-1 ${
                    isDark
                      ? 'border-slate-700/80 bg-slate-900/70 text-slate-300'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <p
                    className={
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }
                  >
                    {t.heroChip1}
                  </p>
                  <p>
                    {isAr
                      ? 'إدارة المستخدمين والصلاحيات.'
                      : 'Manage users & permissions.'}
                  </p>
                </div>

                <div
                  className={`rounded-2xl border p-3 space-y-1 ${
                    isDark
                      ? 'border-slate-700/80 bg-slate-900/70 text-slate-300'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <p
                    className={
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }
                  >
                    {t.heroChip2}
                  </p>
                  <p>
                    {isAr
                      ? 'صلاحيات كاملة للأدمن.'
                      : 'Full admin capabilities.'}
                  </p>
                </div>
              </div>
            </div>

            <p
              className={`mt-6 text-[11px] ${
                isDark ? 'text-slate-500' : 'text-slate-500'
              }`}
            >
              {t.footerText}
            </p>
          </section>

          {/* ========== كارت تسجيل الدخول ========== */}
          <section
            className={`relative rounded-[32px] border px-6 py-6 backdrop-blur-2xl ${
              isDark
                ? 'border-slate-800/80 bg-gradient-to-br from-slate-950/95 via-slate-950/90 to-slate-900/90 shadow-[0_32px_80px_rgba(15,23,42,0.95)]'
                : 'border-slate-200 bg-white shadow-[0_26px_70px_rgba(15,23,42,0.16)]'
            }`}
          >
            {/* شريط UI + Theme */}
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="hidden sm:block flex-1">
                <div
                  className={`h-9 rounded-full border shadow-inner ${
                    isDark
                      ? 'border-slate-800 bg-slate-950/70 shadow-slate-900/90'
                      : 'border-slate-200 bg-slate-50 shadow-slate-200'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                {/* UI language */}
                <div
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${
                    isDark
                      ? 'border-slate-500/70 bg-slate-900/90 text-slate-300'
                      : 'border-slate-200 bg-white text-slate-700 shadow-sm'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    <Globe2
                      size={12}
                      className={isDark ? 'opacity-70' : 'text-sky-500'}
                    />
                    {t.uiLangLabel}
                  </span>

                  <div className="ml-2 flex rounded-full overflow-hidden border border-slate-600/80">
                    <button
                      type="button"
                      onClick={() => setUiLang('ar')}
                      className={`px-2.5 py-0.5 ${
                        isAr
                          ? isDark
                            ? 'bg-sky-500 text-slate-950 font-semibold'
                            : 'bg-sky-600 text-white font-semibold'
                          : isDark
                          ? 'text-slate-300'
                          : 'text-slate-600'
                      }`}
                    >
                      عربي
                    </button>

                    <button
                      type="button"
                      onClick={() => setUiLang('en')}
                      className={`px-2.5 py-0.5 ${
                        !isAr
                          ? isDark
                            ? 'bg-sky-500 text-slate-950 font-semibold'
                            : 'bg-sky-600 text-white font-semibold'
                          : isDark
                          ? 'text-slate-300'
                          : 'text-slate-600'
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </div>

                {/* Theme */}
                <div
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${
                    isDark
                      ? 'border-slate-500/70 bg-slate-900/90 text-slate-300'
                      : 'border-slate-200 bg-white text-slate-700 shadow-sm'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {isDark ? (
                      <MoonStar size={12} />
                    ) : (
                      <SunMedium size={12} className="text-amber-500" />
                    )}
                    {t.themeLabel}
                  </span>

                  <div className="ml-2 flex rounded-full overflow-hidden border border-slate-600/80">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`px-2.5 py-0.5 ${
                        !isDark
                          ? 'bg-amber-400 text-slate-900 font-semibold'
                          : 'text-slate-300'
                      }`}
                    >
                      {t.themeLight}
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`px-2.5 py-0.5 ${
                        isDark
                          ? 'bg-slate-200 text-slate-900 font-semibold'
                          : 'text-slate-600'
                      }`}
                    >
                      {t.themeDark}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* زر الرجوع */}
            <div className="mb-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => router.push('/')}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                  isDark
                    ? 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-sky-500 hover:text-sky-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-sky-400 hover:text-slate-900 hover:bg-sky-50'
                }`}
              >
                <ArrowLeft size={12} />
                {t.backHome}
              </button>

              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] ${
                  isDark
                    ? 'border-sky-500/50 bg-sky-500/15 text-sky-100'
                    : 'border-sky-300 bg-sky-50 text-sky-700'
                }`}
              >
                <ShieldCheck size={13} />
                {isAr ? 'دخول الحساب' : 'Account access'}
              </div>
            </div>

            {/* العنوان */}
            <div className="mb-4 space-y-1">
              <h2
                className={`text-xl font-semibold ${
                  isDark ? 'text-slate-50' : 'text-slate-900'
                }`}
              >
                {t.title}
              </h2>
              <p
                className={`text-xs ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {t.subtitle}
              </p>
            </div>

            {/* ================================
                الفورم
            ================================= */}
            <form onSubmit={handleSubmit} className="space-y-3 mt-1">
              {/* Email */}
              <div className="space-y-1">
                <label
                  className={`text-[11px] flex items-center gap-1 ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  <Mail
                    size={12}
                    className={isDark ? 'text-slate-300' : 'text-slate-500'}
                  />
                  {t.email}
                </label>

                <input
                  type="email"
                  value={email}
                  autoComplete="email"
                  onChange={e => setEmail(e.target.value)}
                  className={`w-full rounded-[999px] border px-3 py-2 text-xs placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 focus-visible:border-sky-400/80 transition-colors ${
                    isDark
                      ? 'border-slate-600 bg-slate-950/80 text-slate-100'
                      : 'border-slate-200 bg-slate-50 text-slate-900'
                  }`}
                  placeholder="example@domain.com"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label
                  className={`text-[11px] flex items-center gap-1 ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  <LockKeyhole
                    size={12}
                    className={isDark ? 'text-slate-300' : 'text-slate-500'}
                  />
                  {t.password}
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    autoComplete="current-password"
                    onChange={e => setPassword(e.target.value)}
                    className={`w-full rounded-[999px] border px-3 py-2 pr-9 text-xs placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 focus-visible:border-sky-400/80 transition-colors ${
                      isDark
                        ? 'border-slate-600 bg-slate-950/80 text-slate-100'
                        : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                    placeholder="•••••••"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className={`absolute inset-y-0 right-2 flex items-center justify-center p-1 text-slate-400 transition-colors ${
                      isDark ? 'hover:text-slate-200' : 'hover:text-slate-700'
                    }`}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={submitting}
                className={`mt-3 inline-flex w-full items-center justify-center rounded-[999px] px-4 py-2.5 text-xs font-semibold transition-colors ${
                  isDark
                    ? 'bg-sky-500 text-slate-950 shadow-[0_20px_60px_rgba(56,189,248,0.9)] hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed'
                    : 'bg-sky-600 text-white shadow-[0_20px_60px_rgba(56,189,248,0.7)] hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed'
                }`}
              >
                {t.submit}
              </button>
            </form>

            <p
              className={`mt-4 text-[11px] ${
                isDark ? 'text-slate-500' : 'text-slate-500'
              }`}
            >
              {t.footerText}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
