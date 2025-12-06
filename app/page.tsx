// app/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import {
  Globe2,
  ArrowRight,
  BookOpenCheck,
  Sparkles,
  SunMedium,
  MoonStar,
  LayoutDashboard,
  Mic2,
  LineChart,
  ShieldCheck,
} from 'lucide-react';
import { useUiSettings } from '@/context/UiSettingsContext';

export default function LandingPage() {
  const router = useRouter();
  const { uiLang, theme, setUiLang, setTheme } = useUiSettings();

  const isAr = uiLang === 'ar';
  const isDark = theme === 'dark';

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-5xl">
        {/* خلفية متكيّفة مع الثيم */}
        <div
          className={`pointer-events-none absolute inset-0 -z-10 opacity-100 ${
            isDark ? 'bg-slate-950' : 'bg-slate-50'
          }`}
        />
        <div
          className={`pointer-events-none absolute inset-0 -z-10 opacity-80 ${
            isDark
              ? 'bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(129,140,248,0.22),transparent_55%)]'
              : 'bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.14),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(129,140,248,0.16),transparent_55%)]'
          }`}
        />

        <div className="grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center relative">
          {/* النص الرئيسي */}
          <section className="space-y-5">
            {/* شريط أعلى: لغة الواجهة + الثيم */}
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <div
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 ${
                  isDark
                    ? 'border-slate-600 bg-slate-900/80 text-slate-300'
                    : 'border-slate-200 bg-white text-slate-700 shadow-sm'
                }`}
              >
                <Globe2
                  size={13}
                  className={isDark ? 'text-sky-400' : 'text-sky-500'}
                />
                <span className="truncate">
                  {isAr ? 'لغة الواجهة' : 'UI language'}
                </span>
                <div className="ml-2 flex rounded-full overflow-hidden border border-slate-600/60">
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

              <div
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 ${
                  isDark
                    ? 'border-slate-600 bg-slate-900/80 text-slate-300'
                    : 'border-slate-200 bg-white text-slate-700 shadow-sm'
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  {isDark ? (
                    <MoonStar size={13} className="text-slate-200" />
                  ) : (
                    <SunMedium size={13} className="text-amber-500" />
                  )}
                  {isAr ? 'وضع الألوان' : 'Theme'}
                </span>
                <div className="ml-2 flex rounded-full overflow-hidden border border-slate-600/60">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`px-2.5 py-0.5 ${
                      !isDark
                        ? 'bg-amber-400 text-slate-900 font-semibold'
                        : 'text-slate-300'
                    }`}
                  >
                    {isAr ? 'فاتح' : 'Light'}
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
                    {isAr ? 'داكن' : 'Dark'}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] ${
                  isDark
                    ? 'border-sky-500/50 bg-sky-500/10 text-sky-100'
                    : 'border-sky-300 bg-sky-50 text-sky-700'
                }`}
              >
                <Sparkles size={13} />
                {isAr
                  ? 'تطبيق تدريب كلمات ونطق بعدّة لغات بدعم للأدمن والمستخدمين'
                  : 'Multi-language vocab trainer with admin & user flows'}
              </p>

              <h1
                className={`text-3xl md:text-4xl font-bold leading-snug ${
                  isDark ? 'text-slate-50' : 'text-slate-900'
                }`}
              >
                {isAr
                  ? 'ابدأ تدريب الكلمات وانطق بثقة.'
                  : 'Train your vocabulary and speak with confidence.'}
              </h1>

              <p
                className={`text-sm md:text-base max-w-xl ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                {isAr
                  ? 'أنشئ حساباً باستخدام كود دعوة من الأدمن، وابدأ حفظ الكلمات، تسجيل النطق، وحل التمارين مع إحصائيات مبسّطة لكل لغة.'
                  : 'Create an account with an invite code from your admin, then start saving words, recording pronunciation, and practicing with simple stats for each language.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => router.push('/signup')}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs md:text-sm font-semibold shadow-[0_18px_50px_rgba(56,189,248,0.8)] transition-colors ${
                  isDark
                    ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                    : 'bg-sky-600 text-white hover:bg-sky-500'
                }`}
              >
                <BookOpenCheck size={14} />
                {isAr ? 'إنشاء حساب جديد' : 'Create new account'}
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                onClick={() => router.push('/login')}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs md:text-sm font-medium transition-colors ${
                  isDark
                    ? 'border-slate-600 bg-slate-900/70 text-slate-200 hover:border-sky-400 hover:text-sky-100'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-sky-400 hover:text-sky-700 hover:bg-sky-50'
                }`}
              >
                {isAr ? 'لدي حساب مسبقاً' : 'I already have an account'}
              </button>
            </div>

            <p
              className={`text-[11px] mt-2 ${
                isDark ? 'text-slate-500' : 'text-slate-500'
              }`}
            >
              {isAr
                ? 'الأدمن ينشئ أكواد دعوة ويحدّد اللغات المتاحة لكل مستخدم، والمستخدم يختار لغة التدريب من داخل التطبيق.'
                : 'Admins create invite codes and assign languages per user. Each user trains only in the languages assigned to them.'}
            </p>
          </section>

          {/* لوحة جانبية بسيطة (ديكور) */}
          <section className="hidden md:block">
            <div
              className={`relative h-full rounded-3xl border px-5 py-6 shadow-[0_32px_80px_rgba(15,23,42,0.5)] ${
                isDark
                  ? 'border-slate-800 bg-slate-950/80'
                  : 'border-slate-200 bg-white shadow-[0_26px_70px_rgba(15,23,42,0.12)]'
              }`}
            >
              <div
                className={`absolute -top-5 right-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] ${
                  isDark
                    ? 'border-sky-500/60 bg-sky-500/15 text-sky-100'
                    : 'border-sky-400 bg-sky-50 text-sky-700 shadow-sm'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full animate-pulse ${
                    isDark ? 'bg-sky-400' : 'bg-sky-500'
                  }`}
                />
                {isAr ? 'يتطلب كود دعوة' : 'Invite-only access'}
              </div>

              <div
                className={`space-y-4 mt-2 text-[11px] ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                <div
                  className={`rounded-2xl border p-3 space-y-1 ${
                    isDark
                      ? 'border-slate-700 bg-slate-900/70'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <p
                    className={`flex items-center gap-1 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    <BookOpenCheck size={12} />
                    {isAr ? 'تدريب مخصص لكل لغة' : 'Per-language training'}
                  </p>
                  <p>
                    {isAr
                      ? 'اختر اللغة، أضف كلمات جديدة، وسجّل نطقك لكل كلمة مع تتبع بسيط للأداء.'
                      : 'Pick a language, add new words, and record your pronunciation with basic tracking.'}
                  </p>
                </div>

                <div
                  className={`rounded-2xl border p-3 space-y-1 ${
                    isDark
                      ? 'border-slate-700 bg-slate-900/70'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <p
                    className={`flex items-center gap-1 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    <Mic2 size={12} />
                    {isAr ? 'تسجيل ونطق' : 'Recording & TTS'}
                  </p>
                  <p>
                    {isAr
                      ? 'استمع للنطق الآلي (TTS) وسجّل صوتك، ثم راجع التسجيل عند الحاجة.'
                      : 'Listen via TTS, record your own pronunciation, and review it anytime.'}
                  </p>
                </div>

                <div
                  className={`rounded-2xl border p-3 space-y-1 ${
                    isDark
                      ? 'border-slate-700 bg-slate-900/70'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <p
                    className={`flex items-center gap-1 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    <LayoutDashboard size={12} />
                    {isAr ? 'منطقة الأدمن' : 'Admin area'}
                  </p>
                  <p>
                    {isAr
                      ? 'لوحة تحكم لإنشاء أكواد دعوة وتحديد اللغات المتاحة لكل مستخدم.'
                      : 'Dashboard to create invite codes and assign languages to users.'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ====== سيكشن إضافي تحت الهيرو: المزايا والخطوات ====== */}
        <section className="mt-10 space-y-6">
          {/* مميزات سريعة */}
          <div className="grid gap-4 md:grid-cols-3 text-[11px] md:text-[12px]">
            <div
              className={`rounded-2xl border p-4 space-y-2 ${
                isDark
                  ? 'border-slate-800 bg-slate-950/80'
                  : 'border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]'
              }`}
            >
              <div
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] ${
                  isDark
                    ? 'bg-sky-500/10 border-sky-500/40 text-sky-100'
                    : 'bg-sky-50 border-sky-300 text-sky-700'
                }`}
              >
                <Sparkles size={11} />
                {isAr ? 'للمتعلمين' : 'For learners'}
              </div>
              <p
                className={`text-xs font-semibold ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                {isAr ? 'تجربة بسيطة ومباشرة' : 'Simple learning workflow'}
              </p>
              <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                {isAr
                  ? 'نافذة واحدة تجمع الكلمات، التدريب، الكويز والإحصائيات، مع واجهة عربية/إنجليزية.'
                  : 'One screen for words, training, quiz, and stats with Arabic/English UI.'}
              </p>
            </div>

            <div
              className={`rounded-2xl border p-4 space-y-2 ${
                isDark
                  ? 'border-slate-800 bg-slate-950/80'
                  : 'border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]'
              }`}
            >
              <div
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] ${
                  isDark
                    ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-100'
                    : 'bg-indigo-50 border-indigo-300 text-indigo-700'
                }`}
              >
                <LineChart size={11} />
                {isAr ? 'نظام مراجعة' : 'Review system'}
              </div>
              <p
                className={`text-xs font-semibold ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                {isAr ? 'مراجعة متدرجة للكلمات' : 'Spaced repetition for words'}
              </p>
              <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                {isAr
                  ? 'منطق مراجعة يعتمد على الأداء (إجابات صحيحة/خاطئة) لتحديد مواعيد المراجعة القادمة.'
                  : 'Built-in spaced repetition logic schedules the next review based on performance.'}
              </p>
            </div>

            <div
              className={`rounded-2xl border p-4 space-y-2 ${
                isDark
                  ? 'border-slate-800 bg-slate-950/80'
                  : 'border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]'
              }`}
            >
              <div
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] ${
                  isDark
                    ? 'bg-violet-500/10 border-violet-500/40 text-violet-100'
                    : 'bg-violet-50 border-violet-300 text-violet-700'
                }`}
              >
                <ShieldCheck size={11} />
                {isAr ? 'للأدمن' : 'For admins'}
              </div>
              <p
                className={`text-xs font-semibold ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                {isAr ? 'تحكم كامل في الوصول' : 'Full access control'}
              </p>
              <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                {isAr
                  ? 'أنشئ أكواد دعوة، حدّد لكل مستخدم اللغات المتاحة له، وراقب قائمة المستخدمين.'
                  : 'Create invite codes, define languages per user, and manage all accounts.'}
              </p>
            </div>
          </div>

          {/* كيف تعمل؟ */}
          <div
            className={`rounded-2xl border p-4 md:p-5 ${
              isDark
                ? 'border-slate-800 bg-slate-950/90'
                : 'border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)]'
            }`}
          >
            <p
              className={`text-xs font-semibold mb-3 ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              {isAr ? 'كيف تعمل المنظومة؟' : 'How does it work?'}
            </p>
            <div className="grid gap-3 md:grid-cols-3 text-[11px]">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${
                    isDark
                      ? 'bg-sky-500/15 border-sky-500/50 text-sky-200'
                      : 'bg-sky-50 border-sky-300 text-sky-700'
                  }`}
                >
                  1
                </div>
                <div>
                  <p
                    className={`font-medium ${
                      isDark ? 'text-slate-100' : 'text-slate-900'
                    }`}
                  >
                    {isAr ? 'الأدمن ينشئ الكود' : 'Admin creates an invite'}
                  </p>
                  <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                    {isAr
                      ? 'من لوحة التحكم، الأدمن يختار اللغات ويربطها بكود دعوة واحد.'
                      : 'From the dashboard, the admin selects languages and binds them to a single invite code.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${
                    isDark
                      ? 'bg-sky-500/15 border-sky-500/50 text-sky-200'
                      : 'bg-sky-50 border-sky-300 text-sky-700'
                  }`}
                >
                  2
                </div>
                <div>
                  <p
                    className={`font-medium ${
                      isDark ? 'text-slate-100' : 'text-slate-900'
                    }`}
                  >
                    {isAr ? 'المستخدم يسجّل حسابه' : 'User signs up'}
                  </p>
                  <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                    {isAr
                      ? 'المستخدم يدخل الاسم والبريد وكلمة المرور وكود الدعوة لتفعيل الحساب.'
                      : 'The learner enters name, email, password, and the invite code to activate their account.'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${
                    isDark
                      ? 'bg-sky-500/15 border-sky-500/50 text-sky-200'
                      : 'bg-sky-50 border-sky-300 text-sky-700'
                  }`}
                >
                  3
                </div>
                <div>
                  <p
                    className={`font-medium ${
                      isDark ? 'text-slate-100' : 'text-slate-900'
                    }`}
                  >
                    {isAr
                      ? 'بدء التدريب على اللغات المحددة'
                      : 'Start training in assigned languages'}
                  </p>
                  <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                    {isAr
                      ? 'داخل التطبيق، المستخدم يرى فقط اللغات المرتبطة بالكود ويبدأ التدريب فوراً.'
                      : 'Inside the app, the user sees only the languages from their invite and can start training immediately.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ملاحظة صغيرة للأدمن */}
          <p
            className={`text-[10px] text-center ${
              isDark ? 'text-slate-500' : 'text-slate-500'
            }`}
          >
            {isAr
              ? 'تذكير: الدخول كأدمن يتم من خلال حساب مميز بدور "admin"، أما المستخدم العادي فيُحوَّل إلى واجهة التدريب.'
              : 'Reminder: admins access the dashboard with an admin role account, while normal users are redirected to the training interface.'}
          </p>
        </section>
      </div>
    </div>
  );
}
