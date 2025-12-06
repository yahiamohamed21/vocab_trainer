'use client';

import { FormEvent, useState } from 'react';
import Swal from 'sweetalert2';
import { useRouter } from 'next/navigation';
import {
  Mail,
  LockKeyhole,
  User,
  ShieldCheck,
  ArrowLeft,
  Globe2,
  SunMedium,
  MoonStar,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useUiSettings } from '@/context/UiSettingsContext';
import { useAuth } from '@/context/AuthContext';

const swalDark = {
  background: '#020617',
  color: '#e2e8f0',
  confirmButtonColor: '#0ea5e9',
};

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { uiLang, theme, setUiLang, setTheme } = useUiSettings();
  const { signup } = useAuth();
  const router = useRouter();
  const isAr = uiLang === 'ar';
  const isDark = theme === 'dark';

  // ========================
  //  SUBMIT HANDLER
  // ========================
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedCode = inviteCode.trim();

    const swalBase = isDark ? swalDark : {};

    // 1) Validate fields
    if (!trimmedName || !trimmedEmail || !trimmedPassword || !trimmedCode) {
      Swal.fire({
        ...swalBase,
        icon: 'warning',
        title: isAr ? 'البيانات غير مكتملة' : 'Missing data',
        text: isAr ? 'من فضلك أكمل جميع الحقول.' : 'Please fill all fields.',
      });
      setSubmitting(false);
      return;
    }

    // 2) Call AuthContext.signup (handles invite code + users + session)
    const result = await signup(trimmedName, trimmedEmail, trimmedPassword, trimmedCode);

    if (!result.ok) {
      Swal.fire({
        ...swalBase,
        icon: 'error',
        title: isAr ? 'خطأ في إنشاء الحساب' : 'Signup error',
        text: result.error || (isAr ? 'حدث خطأ غير متوقع.' : 'An unexpected error occurred.'),
      });
      setSubmitting(false);
      return;
    }

    // 3) Success alert
    await Swal.fire({
      ...swalBase,
      icon: 'success',
      title: isAr ? 'تم إنشاء الحساب' : 'Account created',
      text: isAr
        ? 'تم تفعيل حسابك، يمكنك البدء في استخدام التطبيق الآن.'
        : 'Your account has been activated, you can start using the app now.',
      timer: 1200,
      showConfirmButton: false,
    });

    // 4) Redirect to main app page
    router.replace('/');
    setSubmitting(false);
  }

  // ===========================================================
  // UI DESIGN – dark / light modes
  // ===========================================================

  return (
    <div
      className="relative flex-1 flex items-center justify-center px-4 py-10 overflow-hidden"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Background */}
      <div
        className={`pointer-events-none absolute inset-0 -z-30 ${
          isDark ? 'bg-slate-950' : 'bg-slate-50'
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-0 -z-20 opacity-90 ${
          isDark
            ? 'bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.20),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(129,140,248,0.25),transparent_55%)]'
            : 'bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.18),transparent_50%),radial-gradient(circle_at_100%_100%,rgba(129,140,248,0.18),transparent_50%)]'
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-x-10 top-24 -z-10 h-64 rounded-full blur-3xl ${
          isDark ? 'bg-sky-500/10' : 'bg-sky-300/25'
        }`}
      />

      <div className="w-full max-w-4xl relative">
        <section
          className={`grid gap-0 overflow-hidden rounded-[32px] border backdrop-blur-2xl md:grid-cols-[1.1fr,1fr] ${
            isDark
              ? 'border-slate-800/80 bg-slate-950/95 shadow-[0_30px_90px_rgba(15,23,42,0.9)]'
              : 'border-slate-200 bg-white shadow-[0_26px_70px_rgba(15,23,42,0.16)]'
          }`}
        >
          {/* Left panel – marketing / info */}
          <div
            className={`relative hidden p-7 md:flex md:flex-col ${
              isDark
                ? 'border-slate-800/60 bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900/90'
                : 'border-slate-100 bg-gradient-to-br from-slate-50 via-white to-slate-100/70'
            }`}
          >
            <div className="mb-6 flex items-center justify-between gap-3 text-xs">
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
                  isDark
                    ? 'border-slate-700/70 bg-slate-900/80 text-slate-300'
                    : 'border-slate-200 bg-white text-slate-700 shadow-sm'
                }`}
              >
                <ShieldCheck
                  size={13}
                  className={isDark ? 'text-sky-400' : 'text-sky-500'}
                />
                <span className="font-medium">
                  {isAr ? 'حساب آمن للمتدربين' : 'Secure trainee account'}
                </span>
              </div>

              <div
                className={`flex items-center gap-2 rounded-full border px-3 py-1 ${
                  isDark
                    ? 'border-slate-700/70 bg-slate-900/80 text-slate-300'
                    : 'border-slate-200 bg-white text-slate-700 shadow-sm'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isDark ? 'bg-sky-400' : 'bg-sky-500'
                  }`}
                />
                <span className="text-[11px]">
                  {isAr ? 'مدرب مفردات تفاعلي' : 'Interactive vocab trainer'}
                </span>
              </div>
            </div>

            <div className="mb-6 space-y-3">
              <h1
                className={`text-2xl font-semibold tracking-tight ${
                  isDark ? 'text-slate-50' : 'text-slate-900'
                }`}
              >
                {isAr ? 'طوّر حصيلتك اللغوية خطوة بخطوة' : 'Grow your vocabulary, step by step'}
              </h1>
              <p
                className={`text-xs leading-relaxed ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {isAr
                  ? 'تطبيق تدريب مفردات مع تكرار متباعد، إحصائيات تفصيلية، ودعم لعدة لغات. الحساب الخاص بك يربط كل كلماتك وتقدّمك في مكان واحد.'
                  : 'A spaced-repetition vocab trainer with detailed stats and multi-language support. Your account keeps your words and progress in one place.'}
              </p>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-3 text-center text-[11px]">
              <div
                className={`rounded-2xl border px-3 py-3 ${
                  isDark
                    ? 'border-slate-800/80 bg-slate-900/70'
                    : 'border-slate-200 bg-white shadow-sm'
                }`}
              >
                <div
                  className={`text-sm font-semibold ${
                    isDark ? 'text-sky-400' : 'text-sky-600'
                  }`}
                >
                  6+
                </div>
                <div
                  className={`mt-1 text-[10px] ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {isAr ? 'لغات مدعومة' : 'Supported languages'}
                </div>
              </div>
              <div
                className={`rounded-2xl border px-3 py-3 ${
                  isDark
                    ? 'border-slate-800/80 bg-slate-900/70'
                    : 'border-slate-200 bg-white shadow-sm'
                }`}
              >
                <div
                  className={`text-sm font-semibold ${
                    isDark ? 'text-sky-400' : 'text-sky-600'
                  }`}
                >
                  SRS
                </div>
                <div
                  className={`mt-1 text-[10px] ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {isAr ? 'تكرار متباعد' : 'Spaced repetition'}
                </div>
              </div>
              <div
                className={`rounded-2xl border px-3 py-3 ${
                  isDark
                    ? 'border-slate-800/80 bg-slate-900/70'
                    : 'border-slate-200 bg-white shadow-sm'
                }`}
              >
                <div
                  className={`text-sm font-semibold ${
                    isDark ? 'text-sky-400' : 'text-sky-600'
                  }`}
                >
                  100%
                </div>
                <div
                  className={`mt-1 text-[10px] ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {isAr ? 'محفوظ محليًا' : 'Stored locally'}
                </div>
              </div>
            </div>

            <div className="mt-auto space-y-2 text-[11px]">
              <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                {isAr
                  ? 'تحتاج فقط إلى كود دعوة من الأدمن. بعد إنشاء الحساب، ستتمكن من التدريب على اللغات المسموح بها لك.'
                  : 'You only need an invite code from the admin. Once your account is created, you can train in the languages assigned to you.'}
              </p>
              <p className={isDark ? 'text-slate-500' : 'text-slate-500'}>
                {isAr
                  ? 'يمكنك تغيير اللغة ونسق الواجهة في أي وقت من الإعدادات.'
                  : 'You can switch UI language and theme any time from the settings.'}
              </p>
            </div>
          </div>

          {/* Right panel – form */}
          <div
            className={`flex flex-col px-6 py-6 md:px-7 ${
              isDark
                ? 'border-l border-slate-900/70 bg-slate-950/95'
                : 'border-l border-slate-100 bg-white'
            }`}
          >
            {/* Header row */}
            <div className="mb-5 flex items-center justify-between gap-3">
              {/* Back to login */}
              <button
                type="button"
                onClick={() => router.push('/login')}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                  isDark
                    ? 'border-slate-700/80 bg-slate-900/90 text-slate-300 shadow-sm hover:border-sky-500 hover:text-sky-50 hover:bg-slate-900'
                    : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-sky-400 hover:text-slate-900 hover:bg-sky-50'
                }`}
              >
                <ArrowLeft size={12} className={isAr ? 'rotate-180' : ''} />
                {isAr ? 'تسجيل الدخول' : 'Login'}
              </button>

              {/* UI controls */}
              <div className="flex items-center gap-1.5">
                {/* Language toggle */}
                <button
                  type="button"
                  onClick={() => setUiLang(isAr ? 'en' : 'ar')}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] transition-colors ${
                    isDark
                      ? 'border-slate-700/80 bg-slate-900/90 text-slate-200 hover:border-sky-500 hover:text-sky-50'
                      : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-sky-400 hover:text-slate-900'
                  }`}
                >
                  <Globe2 size={12} />
                  <span className="hidden sm:inline">
                    {isAr ? 'العربية / EN' : 'EN / عربي'}
                  </span>
                </button>

                {/* Theme toggle */}
                <button
                  type="button"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className={`inline-flex items-center justify-center rounded-full border p-1.5 text-slate-200 transition-colors ${
                    isDark
                      ? 'border-slate-700/80 bg-slate-900/90 hover:border-sky-400 hover:text-sky-200'
                      : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-sky-400 hover:text-sky-600'
                  }`}
                >
                  {isDark ? (
                    <SunMedium size={13} />
                  ) : (
                    <MoonStar size={13} className="text-slate-700" />
                  )}
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="mb-6 space-y-1">
              <h2
                className={`text-xl font-semibold tracking-tight ${
                  isDark ? 'text-slate-50' : 'text-slate-900'
                }`}
              >
                {isAr ? 'إنشاء حساب متدرب جديد' : 'Create your trainee account'}
              </h2>
              <p
                className={`text-xs leading-relaxed ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {isAr
                  ? 'املأ البيانات التالية وكود الدعوة الذي حصلت عليه من الأدمن.'
                  : 'Fill in your details and the invite code you received from the admin.'}
              </p>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Name */}
              <div>
                <label
                  className={`mb-1 flex items-center gap-1 text-[11px] ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  <User
                    size={12}
                    className={isDark ? 'text-slate-300' : 'text-slate-500'}
                  />
                  {isAr ? 'الاسم الكامل' : 'Full name'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={isAr ? 'مثال: أحمد علي' : 'e.g. John Doe'}
                  className={`w-full rounded-2xl border px-3 py-2 text-xs placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 focus-visible:border-sky-400/80 transition-colors ${
                    isDark
                      ? 'border-slate-700 bg-slate-950/90 text-slate-100'
                      : 'border-slate-200 bg-slate-50 text-slate-900'
                  }`}
                />
              </div>

              {/* Email */}
              <div>
                <label
                  className={`mb-1 flex items-center gap-1 text-[11px] ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  <Mail
                    size={12}
                    className={isDark ? 'text-slate-300' : 'text-slate-500'}
                  />
                  {isAr ? 'البريد الإلكتروني' : 'Email'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="example@mail.com"
                  className={`w-full rounded-2xl border px-3 py-2 text-xs placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 focus-visible:border-sky-400/80 transition-colors ${
                    isDark
                      ? 'border-slate-700 bg-slate-950/90 text-slate-100'
                      : 'border-slate-200 bg-slate-50 text-slate-900'
                  }`}
                />
              </div>

              {/* Password */}
              <div>
                <label
                  className={`mb-1 flex items-center gap-1 text-[11px] ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  <LockKeyhole
                    size={12}
                    className={isDark ? 'text-slate-300' : 'text-slate-500'}
                  />
                  {isAr ? 'كلمة المرور' : 'Password'}
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={isAr ? 'على الأقل 6 أحرف' : 'At least 6 characters'}
                    className={`w-full rounded-2xl border px-3 py-2 pr-9 text-xs placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 focus-visible:border-sky-400/80 transition-colors ${
                      isDark
                        ? 'border-slate-700 bg-slate-950/90 text-slate-100'
                        : 'border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className={`absolute inset-y-0 right-2 flex items-center text-slate-400 transition-colors ${
                      isDark ? 'hover:text-slate-200' : 'hover:text-slate-700'
                    }`}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Invite Code */}
              <div>
                <label
                  className={`mb-1 flex items-center gap-1 text-[11px] ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  <ShieldCheck
                    size={12}
                    className={isDark ? 'text-slate-300' : 'text-slate-500'}
                  />
                  {isAr ? 'كود الدعوة' : 'Invite code'}
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  placeholder={isAr ? 'مثال: ABCD-1234' : 'e.g. ABCD-1234'}
                  className={`w-full rounded-2xl border px-3 py-2 text-xs uppercase tracking-[0.14em] placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 focus-visible:border-sky-400/80 transition-colors ${
                    isDark
                      ? 'border-slate-700 bg-slate-950/90 text-slate-100'
                      : 'border-slate-200 bg-slate-50 text-slate-900'
                  }`}
                />
                <p
                  className={`mt-1 text-[10px] ${
                    isDark ? 'text-slate-500' : 'text-slate-500'
                  }`}
                >
                  {isAr
                    ? 'لن يمكنك إنشاء الحساب بدون كود دعوة صالح من الأدمن.'
                    : 'You cannot create an account without a valid invite code from the admin.'}
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className={`mt-4 w-full rounded-2xl py-2.5 text-xs font-semibold transition-colors ${
                  isDark
                    ? 'bg-sky-500 text-slate-950 shadow-[0_14px_40px_rgba(56,189,248,0.45)] hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed'
                    : 'bg-sky-600 text-white shadow-[0_14px_40px_rgba(56,189,248,0.40)] hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed'
                }`}
              >
                {isAr ? 'إنشاء الحساب' : 'Create account'}
              </button>
            </form>

            {/* Small footer text */}
            <div
              className={`mt-4 text-[10px] ${
                isDark ? 'text-slate-500' : 'text-slate-500'
              }`}
            >
              {isAr
                ? 'بإنشائك حساباً، فأنت تقر باستخدام هذا الحساب لتتبع تقدّمك في المفردات فقط على هذا الجهاز.'
                : 'By creating an account, you agree that your vocab progress is stored locally on this device only.'}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
