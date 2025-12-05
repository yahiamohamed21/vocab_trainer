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
      ? 'حساب الأدمن يمكنه إدارة المستخدمين واللغات، بينما الحساب العادي يركّز على التدريب وحفظ الكلمات.'
      : 'Admin accounts can manage users and languages, normal accounts focus on training and vocab practice.',
    heroChip1: isAr ? 'حسابات المستخدمين' : 'User accounts',
    heroChip2: isAr ? 'الأدوار والصلاحيات' : 'Roles & permissions',
    footerText: isAr
      ? 'إذا كان الحساب من نوع أدمن سيتم نقلك للوحة التحكم، وإذا كان مستخدم عادي سيتم نقلك لواجهة التدريب الرئيسية.'
      : 'Admin accounts will be redirected to the dashboard, normal users will be redirected to the main training interface.',
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const result = await login(email, password);

    if (!result.ok) {
      await Swal.fire({
        ...swalDarkBase,
        icon: 'error',
        title: t.wrongCredTitle,
        text: t.wrongCredText,
      });
      setSubmitting(false);
      return;
    }

    const user = result.user;

    await Swal.fire({
      ...swalDarkBase,
      icon: 'success',
      title: t.successTitle,
      timer: 1000,
      showConfirmButton: false,
    });

    // الفرق هنا: نفس login لكل الناس، بس الـ redirect حسب role
    if (user.role === 'admin') {
      router.replace('/admin');
    } else {
      router.replace('/');
    }

    setSubmitting(false);
  }

  return (
    <div className="relative flex-1 flex items-center justify-center px-4 py-10 overflow-hidden">
      {/* خلفية عامة */}
      <div className="pointer-events-none absolute inset-0 -z-30 bg-slate-950" />
      <div className="pointer-events-none absolute inset-0 -z-20 opacity-80 bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.16),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(129,140,248,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute -right-40 -top-32 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 bottom-0 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />

      <div className="w-full max-w-5xl relative">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-stretch">
          {/* PANEL تعريفي على اليسار */}
          <section className="hidden md:flex flex-col justify-between rounded-3xl border border-slate-800/70 bg-slate-950/70 px-6 py-6 shadow-[0_0_55px_rgba(15,23,42,1)] backdrop-blur-2xl">
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 shadow-lg shadow-sky-500/40">
                    <span className="text-[13px] font-bold text-slate-950">
                      VT
                    </span>
                  </div>
                  <div className="leading-tight">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      Vocab Trainer
                    </p>
                    <p className="text-xs text-slate-300">
                      {isAr ? 'لوحة إدارة الحسابات' : 'Accounts Control'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    {isAr ? 'دخول آمن للحسابات' : 'Secure account access'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h1 className="text-2xl font-semibold text-slate-50 leading-snug">
                  {t.heroTitle}
                </h1>
                <p className="text-sm text-slate-400">{t.heroBody}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-300">
                <div className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-3 space-y-1">
                  <p className="text-slate-400">{t.heroChip1}</p>
                  <p>
                    {isAr
                      ? 'يمكن للأدمن إدارة المستخدمين، وإيقاف الحسابات، وتعديل البيانات.'
                      : 'Admins can manage users, disable accounts, and edit details.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-3 space-y-1">
                  <p className="text-slate-400">{t.heroChip2}</p>
                  <p>
                    {isAr
                      ? 'الحساب العادي يركز على التدريب، والحساب الأدمن لديه صلاحيات كاملة.'
                      : 'Normal users focus on training, admins have full control.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 text-[11px] text-slate-500 space-y-1">
              <p>{t.footerText}</p>
            </div>
          </section>

          {/* كارت اللوجين */}
          <section className="relative rounded-[32px] border border-slate-800/80 bg-gradient-to-br from-slate-950/95 via-slate-950/90 to-slate-900/90 px-6 py-6 shadow-[0_32px_80px_rgba(15,23,42,0.95)] backdrop-blur-2xl">
            {/* خط متدرج رفيع في الأعلى + جلو تحت الكارت */}
            <div className="absolute inset-x-10 -top-px h-px bg-gradient-to-r from-sky-500/70 via-cyan-400/70 to-indigo-500/70" />
            <div className="pointer-events-none absolute inset-x-6 bottom-[-28px] h-16 rounded-full bg-sky-500/25 blur-3xl opacity-70" />

            {/* الشريط (UI language + Theme) */}
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="hidden sm:block flex-1">
                <div className="h-9 rounded-full border border-slate-800 bg-slate-950/70 shadow-inner shadow-slate-900/90" />
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                {/* UI language pill */}
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-500/70 bg-slate-900/90 px-2 py-1 shadow-[0_0_18px_rgba(15,23,42,0.9)]">
                  <span className="inline-flex items-center gap-1 text-slate-300">
                    <Globe2 size={12} className="opacity-70" />
                    <span className="opacity-80">{t.uiLangLabel}</span>
                  </span>
                  <div className="ml-2 flex rounded-full bg-slate-950/90 overflow-hidden border border-slate-600/80">
                    <button
                      type="button"
                      onClick={() => setUiLang('ar')}
                      className={`px-2.5 py-0.5 transition-colors ${
                        isAr
                          ? 'bg-sky-500 text-slate-950 font-semibold shadow-[0_0_14px_rgba(56,189,248,0.9)]'
                          : 'text-slate-300 hover:bg-slate-800/80'
                      }`}
                    >
                      عربي
                    </button>
                    <button
                      type="button"
                      onClick={() => setUiLang('en')}
                      className={`px-2.5 py-0.5 transition-colors ${
                        !isAr
                          ? 'bg-sky-500 text-slate-950 font-semibold shadow-[0_0_14px_rgba(56,189,248,0.9)]'
                          : 'text-slate-300 hover:bg-slate-800/80'
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </div>

                {/* Theme pill */}
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-500/70 bg-slate-900/90 px-2 py-1 shadow-[0_0_18px_rgba(15,23,42,0.9)]">
                  <span className="inline-flex items-center gap-1 text-slate-300">
                    {isDark ? (
                      <MoonStar size={12} className="opacity-80" />
                    ) : (
                      <SunMedium size={12} className="text-amber-300" />
                    )}
                    <span className="opacity-80">{t.themeLabel}</span>
                  </span>
                  <div className="ml-2 flex rounded-full bg-slate-950/90 overflow-hidden border border-slate-600/80">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`px-2.5 py-0.5 transition-colors ${
                        !isDark
                          ? 'bg-amber-400 text-slate-900 font-semibold shadow-[0_0_14px_rgba(250,204,21,0.9)]'
                          : 'text-slate-300 hover:bg-slate-800/80'
                      }`}
                    >
                      {t.themeLight}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`px-2.5 py-0.5 transition-colors ${
                        isDark
                          ? 'bg-slate-200 text-slate-900 font-semibold shadow-[0_0_14px_rgba(148,163,184,0.9)]'
                          : 'text-slate-300 hover:bg-slate-800/80'
                      }`}
                    >
                      {t.themeDark}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* زر الرجوع + شارة Account access */}
            <div className="mb-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[11px] text-slate-300 hover:border-sky-500/70 hover:text-sky-100 transition-colors"
              >
                <ArrowLeft size={12} />
                <span>{t.backHome}</span>
              </button>

              <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/50 bg-sky-500/15 px-3 py-1 text-[11px] text-sky-100">
                <ShieldCheck size={13} />
                <span>{isAr ? 'دخول الحساب' : 'Account access'}</span>
              </div>
            </div>

            {/* العنوان والوصف */}
            <div className="mb-4 space-y-1">
              <h2 className="text-xl font-semibold text-slate-50">
                {t.title}
              </h2>
              <p className="text-xs text-slate-400">{t.subtitle}</p>
            </div>

            {/* الفورم */}
            <form onSubmit={handleSubmit} className="space-y-3 mt-1">
              <div className="space-y-1">
                <label className="text-[11px] flex items-center gap-1 text-slate-200">
                  <Mail size={12} />
                  {t.email}
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-[999px] border border-slate-600 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-sky-400/80"
                  placeholder={isAr ? 'example@domain.com' : 'example@domain.com'}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] flex items-center gap-1 text-slate-200">
                  <LockKeyhole size={12} />
                  {t.password}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full rounded-[999px] border border-slate-600 bg-slate-950/80 px-3 py-2 pr-9 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/80 focus:border-sky-400/80"
                    placeholder={isAr ? '••••••••' : '••••••••'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-2 flex items-center justify-center rounded-full p-1 text-slate-400 hover:text-sky-300"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-3 inline-flex w-full items-center justify-center rounded-[999px] bg-sky-500 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-[0_20px_60px_rgba(56,189,248,0.9)] hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {t.submit}
              </button>
            </form>

            <div className="mt-4 text-[11px] text-slate-500 space-y-1">
              <p>{t.footerText}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
