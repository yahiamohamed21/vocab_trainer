🇬🇧🇦🇪 Vocab Trainer – Multi-Language Pronunciation & Vocabulary App
تطبيق تدريب المفردات والنطق – متعدد اللغات

A full-featured vocabulary & pronunciation trainer built with Next.js, React, and TypeScript, supporting TTS, user roles, admin dashboard, quizzes, stats, and voice recording.

تطبيق متكامل لتدريب المفردات والنطق باستخدام Next.js و React و TypeScript، ويدعم النطق (TTS)، صلاحيات المستخدمين، لوحة تحكم للأدمن، اختبارات، إحصائيات، وتسجيل صوت المستخدم.

⚙️ Tech Stack
⚙️ التقنيات المستخدمة

Next.js 13+ (App Router)

React (Client Components)

TypeScript

Tailwind CSS

SweetAlert2

lucide-react

Web APIs (speechSynthesis, MediaRecorder, localStorage)

Next.js 13+

React (مكوّنات Client)

TypeScript

Tailwind CSS

SweetAlert2

lucide-react

واجهات الويب (النطق، التسجيل، التخزين)

🚀 Features
🚀 المميزات
1. Training View – Pronunciation Practice
١. شاشة التدريب – ممارسة النطق

Choose a language

Type a word

Control TTS:

Speed

Repetition count

اختر لغة

اكتب كلمة

تحكّم في النطق:

سرعة الصوت

عدد مرات التكرار

Uses ElevenLabs TTS if configured, otherwise falls back to browser TTS.

يستخدم ElevenLabs TTS عند توفره، وإلا يستخدم نطق المتصفح.

2. User Voice Recording
٢. تسجيل صوت المستخدم

Record your own pronunciation

Saved as audio Data URL

Stored per-word

Can be played back anytime

يمكنك تسجيل نطقك الشخصي

يُحفظ كبيانات صوت

مرتبط بكل كلمة

يمكن تشغيله لاحقًا بسهولة

3. Words Management
٣. إدارة الكلمات

Every word includes:

Text

Translation

Example

Topic

Review stats

Optional recording

Optional spaced-repetition metadata

كل كلمة تحتوي على:

نص الكلمة

ترجمتها

مثال

الموضوع

إحصائيات المراجعة

تسجيل صوتي (اختياري)

بيانات التكرار المتباعد (اختياري)

4. Quiz System
٤. نظام الاختبارات

Generates quiz questions based on current language

Tracks:

Correct answers

Total attempts

Accuracy %

Last quiz date

يولّد أسئلة حسب اللغة الحالية

يتابع:

الإجابات الصحيحة

عدد الأسئلة

نسبة الدقة

تاريخ آخر اختبار

Supports spaced-repetition scheduling.

يدعم نظام التكرار المتباعد للمراجعة الذكية.

5. Stats Dashboard
٥. لوحة الإحصائيات

Word count

Quiz performance

Accuracy charts

Per-language statistics

عدد الكلمات

أداء الاختبارات

نسب النجاح

إحصائيات متنوعة حسب اللغة

6. UI Settings
٦. إعدادات الواجهة

Light / Dark theme

UI language: Arabic / English

وضع الإضاءة: فاتح / داكن

لغة الواجهة: العربية / الإنجليزية

👑 7. Admin System (Login + Roles + Permissions)
👑 ٧. نظام الأدمن (تسجيل الدخول + الصلاحيات + التحكم باللغات)

The application includes a complete local user system:

يحتوي النظام على نظام مستخدمين كامل محليًا:

User roles
أنواع المستخدمين
Role	Access	Notes
Admin	Can access /admin	Can create/manage users
User	App only (/)	Only sees allowed languages
الدور	الوصول	الملاحظات
أدمن	يمكنه دخول /admin	إنشاء وإدارة المستخدمين
مستخدم	التطبيق فقط /	يرى فقط اللغات المسموح له بها
🔐 Login System
🔐 نظام تسجيل الدخول

Route: /login

Email + Password authentication

Redirect:

Admin → /admin

User → /

المسار: /login

تسجيل الدخول بالبريد وكلمة المرور

التوجيه:

الأدمن → /admin

المستخدم → /

Includes dark-themed SweetAlert messages.

يستخدم رسائل SweetAlert بتصميم داكن واحترافي.

🛠 Admin Dashboard
🛠 لوحة تحكم الأدمن

Route: /admin

Allows:

Add new users

Edit/remove allowed languages

Assign roles

Delete users

See passwords (for local testing)

المسار: /admin

يمكنك من خلاله:

إنشاء مستخدمين

تعديل اللغات المسموح بها

تغيير الدور (أدمن / مستخدم)

حذف المستخدمين

عرض كلمات المرور (للاختبار المحلي)

✔ Enforced Language Permissions
✔ تطبيق صلاحيات اللغات

Users only see their allowed languages

If their current language becomes disabled → switches automatically

Guests see all languages

المستخدم يرى فقط اللغات المسموح بها

إذا أزال الأدمن لغة كان المستخدم يستخدمها → يتم التحويل تلقائيًا

الضيوف يرون كل اللغات

📁 Project Structure
📁 هيكل المشروع
vocab-trainer/
  app/
    layout.tsx
    page.tsx
    login/page.tsx
    admin/page.tsx
    api/tts/route.ts
  components/
    LanguageSelector.tsx
    Tabs.tsx
    views/
      TrainingView.tsx
      WordsView.tsx
      QuizView.tsx
      StatsView.tsx
    WordEditModal.tsx
  context/
    AppStateContext.tsx
    UiSettingsContext.tsx
    AuthContext.tsx
  lib/
    constants.ts
    types.ts
    storage.ts
  styles/
    globals.css


نسخة عربية للهيكل أعلاه:

vocab-trainer/
  app/               ← صفحات التطبيق
  components/        ← مكونات الواجهة
  context/           ← السياق (الستيت الشامل)
  lib/               ← الأنواع والثوابت
  styles/            ← أنماط Tailwind

🎤 External TTS (ElevenLabs)
🎤 النطق الخارجي (ElevenLabs)

TrainingView sends text → /api/tts

API route calls ElevenLabs multilingual model

Returns audio/mpeg stream

Client plays repeated audio

If fails → browser TTS fallback

شاشة التدريب ترسل النص لـ /api/tts

المسار يتصل بـ ElevenLabs

يرجع صوت audio/mpeg

يتم تشغيل الصوت حسب عدد التكرار

في حال الفشل → استخدام نطق المتصفح

💾 Data Persistence
💾 تخزين البيانات

Stored in localStorage:

Key	Purpose
VT_WORDS	saved words
VT_STATS	quiz stats
VT_CURRENT_LANGUAGE	selected language
VT_USERS	admin/users list
VT_CURRENT_USER_ID	current session

يتم التخزين داخل localStorage:

الكلمات

الإحصائيات

اللغة المختارة

بيانات المستخدمين

هوية المستخدم الحالي

Note: Clearing browser data removes everything.
ملاحظة: حذف بيانات المتصفح سيحذف كل شيء.

🔮 Future Improvements
🔮 تحسينات مستقبلية

Real backend & database

Secure authentication

Sync across devices

More quiz types

Import/export CSV

Advanced analytics & streak tracking

ربط بقاعدة بيانات حقيقية

تسجيل دخول مؤمّن

مزامنة بين الأجهزة

أنواع اختبارات إضافية

استيراد/تصدير كلمات

تحليلات متقدمة وتتبع الأيام

🧪 Commands
🧪 الأوامر
npm run dev
npm run build
npm run start
npm run lint

🎉 Enjoy building & improving your multilingual skills!
🎉 استمتع بتطوير مهاراتك في اللغات والنطق!


GITHUB 
 أول مرة:
git init
git remote add origin https://github.com/yahiamohamed21/vocab_trainer
git add .
git commit -m "Initial commit"
git branch -M main   (او تجاهلها لو master)
git push -u origin main (او master)

كل مرة بعد كده:
git add .
git commit -m "update"
git push

