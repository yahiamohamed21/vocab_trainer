// app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import {
  Mail,
  Globe2,
  Shield,
  UserCircle2,
  Trash2,
  Pencil,
  X,
  Plus,
} from 'lucide-react';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

import type { LanguageConfig } from '@/lib/constants';
import { AdminUser, LanguageId, InviteCode } from '@/lib/types';
import {
  loadUsers,
  saveUsers,
  loadInviteCodes,
  saveInviteCodes,
  loadAppLanguages,
  saveAppLanguages,
} from '@/lib/storage';
import { useUiSettings } from '@/context/UiSettingsContext';

const swalDark = {
  background: '#020617',
  color: '#e2e8f0',
  confirmButtonColor: '#0ea5e9',
  cancelButtonColor: '#64748b',
};

type EditUserState = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
} | null;

export default function AdminPage() {
  // tabs: users list / invite codes / languages
  const [activeTab, setActiveTab] =
    useState<'users' | 'invites' | 'languages'>('users');

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // invite codes (state بدلاً من النداء المباشر كل مرة)
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);

  // invite code languages (اختيار لغات الكود الجديد)
  const [inviteLangs, setInviteLangs] = useState<LanguageId[]>([]);

  // edit user modal
  const [editUser, setEditUser] = useState<EditUserState>(null);

  // قائمة لغات التطبيق التي يمكن للأدمن تعديلها
  const [appLanguages, setAppLanguages] = useState<LanguageConfig[]>([]);

  // إدخال لغة جديدة
  const [newLang, setNewLang] = useState<{
    id: string;
    label: string;
    nativeLabel: string;
    ttsCode: string;
  }>({
    id: '',
    label: '',
    nativeLabel: '',
    ttsCode: '',
  });

  const { uiLang, theme } = useUiSettings();
  const isAr = uiLang === 'ar';
  const isDark = theme === 'dark';
  const isRtl = isAr;

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // تحميل المستخدمين + اللغات + الأكواد
  useEffect(() => {
    setUsers(loadUsers());
    setUsersLoading(false);

    const langs = loadAppLanguages();
    setAppLanguages(langs);

    const codes = loadInviteCodes();
    setInviteCodes(codes);
  }, []);

  const totalUsers = users.length;
  const totalAdmins = users.filter(u => u.role === 'admin').length;
  const totalNormalUsers = totalUsers - totalAdmins;

  /* ========= ROUTE GUARD: only admin ========= */

  useEffect(() => {
    if (authLoading) return;

    if (!user || user.role !== 'admin') {
      Swal.fire({
        icon: 'warning',
        title: isAr ? 'غير مسموح' : 'Unauthorized',
        text: isAr
          ? 'يجب أن تكون أدمن للوصول إلى لوحة التحكم.'
          : 'You must be an admin to access the dashboard.',
        confirmButtonText: 'OK',
      }).then(() => {
        router.replace('/login');
      });
    }
  }, [authLoading, user, router, isAr]);

  if (authLoading || !user || user.role !== 'admin') {
    return null;
  }

  /* ========= USERS: edit / delete / toggle langs ========= */

  function openEditUser(user: AdminUser) {
    setEditUser({
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
    });
  }

  async function handleSaveEditUser() {
    if (!editUser) return;

    const trimmedName = editUser.name.trim();
    const trimmedEmail = editUser.email.trim().toLowerCase();
    const trimmedPassword = editUser.password.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      await Swal.fire({
        ...swalDark,
        icon: 'warning',
        title: isAr ? 'حقول مطلوبة' : 'Missing fields',
      });
      return;
    }

    const duplicate = users.some(
      u => u.id !== editUser.id && u.email.toLowerCase() === trimmedEmail
    );
    if (duplicate) {
      await Swal.fire({
        ...swalDark,
        icon: 'error',
        title: isAr ? 'البريد مستخدم بالفعل' : 'Email already exists',
      });
      return;
    }

    const next = users.map(u =>
      u.id === editUser.id
        ? {
            ...u,
            name: trimmedName,
            email: trimmedEmail,
            password: trimmedPassword,
            role: editUser.role,
          }
        : u
    );

    setUsers(next);
    saveUsers(next);
    setEditUser(null);

    await Swal.fire({
      ...swalDark,
      icon: 'success',
      title: isAr ? 'تم الحفظ' : 'Saved',
      timer: 1000,
      showConfirmButton: false,
    });
  }

  async function deleteUser(id: string) {
    const result = await Swal.fire({
      ...swalDark,
      icon: 'warning',
      title: isAr ? 'حذف المستخدم؟' : 'Delete user?',
      showCancelButton: true,
      confirmButtonText: isAr ? 'نعم، حذف' : 'Yes, delete',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
    });

    if (!result.isConfirmed) return;

    const next = users.filter(u => u.id !== id);
    setUsers(next);
    saveUsers(next);
  }

  async function toggleUserLang(user: AdminUser, langId: LanguageId) {
    const updated = users.map(u =>
      u.id === user.id
        ? {
            ...u,
            languages: u.languages.includes(langId)
              ? u.languages.filter(l => l !== langId)
              : [...u.languages, langId],
          }
        : u
    );

    setUsers(updated);
    saveUsers(updated);
  }

  /* ========= INVITE CODES ========= */

  async function createInviteCodeHandler() {
    if (inviteLangs.length === 0) {
      await Swal.fire({
        ...swalDark,
        icon: 'warning',
        title: isAr ? 'اختر اللغات أولاً' : 'Select languages first',
        text: isAr
          ? 'يجب اختيار لغة واحدة على الأقل في الكود.'
          : 'You must select at least one language in the code.',
      });
      return;
    }

    const code = Math.random().toString(36).substring(2, 10).toUpperCase();

    const newCode: InviteCode = {
      code,
      languages: inviteLangs,
      createdAt: new Date().toISOString(),
      used: false,
      usedBy: null,
    };

    const existing = loadInviteCodes();
    const next = [newCode, ...existing];

    saveInviteCodes(next);
    setInviteLangs([]);
    setInviteCodes(next);

    await Swal.fire({
      ...swalDark,
      icon: 'success',
      title: isAr ? 'تم إنشاء كود الدعوة' : 'Invite code created',
      html: `
        <div style="font-size:14px;margin-top:6px;">
          <strong style="font-family:monospace;font-size:18px;color:#38bdf8;">
            ${code}
          </strong>
        </div>
      `!,
      confirmButtonText: isAr ? 'نسخ' : 'Copy',
    });

    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // ignore
    }
  }

  async function deleteInviteCodeHandler(code: InviteCode) {
    // لو الكود مستخدم → تأكيد خاص
    if (code.used) {
      const res = await Swal.fire({
        ...swalDark,
        icon: 'warning',
        title: isAr ? 'حذف كود مستخدم؟' : 'Delete used code?',
        text: isAr
          ? `هذا الكود تم استخدامه بواسطة: ${code.usedBy}. هل تريد حذفه نهائياً؟`
          : `This invite code was used by: ${code.usedBy}. Do you really want to delete it?`,
        showCancelButton: true,
        confirmButtonText: isAr ? 'حذف' : 'Delete',
        cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
      });

      if (!res.isConfirmed) return;
    } else {
      // لو الكود غير مستخدم → رسالة تأكيد عادية
      const res = await Swal.fire({
        ...swalDark,
        icon: 'warning',
        title: isAr ? 'حذف الكود؟' : 'Delete code?',
        text: isAr
          ? 'هل تريد حذف هذا الكود؟'
          : 'Do you want to delete this invite code?',
        showCancelButton: true,
        confirmButtonText: isAr ? 'حذف' : 'Delete',
        cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
      });

      if (!res.isConfirmed) return;
    }

    const allCodes = loadInviteCodes();
    const next = allCodes.filter(c => c.code !== code.code);
    saveInviteCodes(next);
    setInviteCodes(next);

    await Swal.fire({
      ...swalDark,
      icon: 'success',
      title: isAr ? 'تم حذف الكود' : 'Invite code deleted',
      timer: 1000,
      showConfirmButton: false,
    });
  }

  /* ========= APP LANGUAGES (ADD / DELETE) ========= */

  async function handleAddLanguage() {
    const id = newLang.id.trim();
    const label = newLang.label.trim();
    const nativeLabel = newLang.nativeLabel.trim();
    const ttsCode = newLang.ttsCode.trim();

    if (!id || !label || !nativeLabel || !ttsCode) {
      await Swal.fire({
        ...swalDark,
        icon: 'warning',
        title: isAr ? 'اكمل كل الحقول' : 'Fill all fields',
        text: isAr
          ? 'معرّف اللغة، الاسم، الاسم المحلي، وكود TTS مطلوبة.'
          : 'Language id, label, native label, and TTS code are required.',
      });
      return;
    }

    const exists = appLanguages.some(
      l => l.id.toLowerCase() === id.toLowerCase()
    );

    if (exists) {
      await Swal.fire({
        ...swalDark,
        icon: 'error',
        title: isAr ? 'المعرّف موجود بالفعل' : 'ID already exists',
        text: isAr
          ? 'اختر معرّف لغة مختلف (id يجب أن يكون فريداً).'
          : 'Choose a different language id (must be unique).',
      });
      return;
    }

    const next: LanguageConfig[] = [
      {
        id,
        label,
        nativeLabel,
        ttsCode,
      },
      ...appLanguages,
    ];

    setAppLanguages(next);
    saveAppLanguages(next);

    setNewLang({
      id: '',
      label: '',
      nativeLabel: '',
      ttsCode: '',
    });

    await Swal.fire({
      ...swalDark,
      icon: 'success',
      title: isAr ? 'تمت إضافة اللغة' : 'Language added',
      timer: 1000,
      showConfirmButton: false,
    });
  }

  async function handleDeleteLanguage(langId: LanguageId) {
    const lang = appLanguages.find(l => l.id === langId);
    const label = lang?.nativeLabel || lang?.label || langId;

    const result = await Swal.fire({
      ...swalDark,
      icon: 'warning',
      title: isAr ? 'حذف اللغة؟' : 'Delete language?',
      text: isAr
        ? `سيتم حذف اللغة "${label}" من قائمة لغات التطبيق.`
        : `This will remove "${label}" from the app languages list.`,
      showCancelButton: true,
      confirmButtonText: isAr ? 'نعم، حذف' : 'Yes, delete',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
    });

    if (!result.isConfirmed) return;

    const nextLangs = appLanguages.filter(l => l.id !== langId);
    setAppLanguages(nextLangs);
    saveAppLanguages(nextLangs);

    // تنظيف اللغات من المستخدمين
    const cleanedUsers = users.map(u => ({
      ...u,
      languages: u.languages.filter(id => id !== langId),
    }));
    setUsers(cleanedUsers);
    saveUsers(cleanedUsers);

    await Swal.fire({
      ...swalDark,
      icon: 'success',
      title: isAr ? 'تم حذف اللغة' : 'Language deleted',
      timer: 900,
      showConfirmButton: false,
    });
  }

  /* ========= UI ========= */

  return (
    <>
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className={`
          min-h-screen w-full flex justify-center px-4 py-6 relative
          ${isDark ? 'bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-900'}
        `}
      >
        {/* خلفيات خفيفة */}
        <div
          className={`
            pointer-events-none absolute inset-0 -z-10 opacity-80
            ${
              isDark
                ? 'bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(129,140,248,0.22),transparent_55%)]'
                : 'bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.12),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(129,140,248,0.14),transparent_55%)]'
            }
          `}
        />
        <div
          className={`
            pointer-events-none absolute inset-x-10 top-10 -z-10 h-40 rounded-full blur-3xl
            ${isDark ? 'bg-sky-500/15' : 'bg-sky-300/25'}
          `}
        />

        <div className="w-full max-w-6xl space-y-6 relative">
          {/* Header */}
          <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <UserCircle2
                  className={isDark ? 'text-sky-400' : 'text-sky-500'}
                />
                <span>{isAr ? 'لوحة تحكم الحسابات' : 'Accounts Dashboard'}</span>
              </h1>
              <p
                className={`
                  text-xs md:text-sm mt-1
                  ${isDark ? 'text-slate-400' : 'text-slate-600'}
                `}
              >
                {isAr
                  ? 'إدارة المستخدمين، أكواد الدعوة، واللغات المتاحة في التطبيق.'
                  : 'Manage users, invite codes, and available languages.'}
              </p>
            </div>
            <div
              className={`
                flex flex-wrap items-center gap-2 text-xs
                ${isDark ? 'text-slate-400' : 'text-slate-600'}
              `}
            >
              <span
                className={`
                  inline-flex items-center gap-1 rounded-full px-3 py-1
                  border
                  ${
                    isDark
                      ? 'bg-slate-900/80 border-slate-700'
                      : 'bg-white border-slate-200 shadow-sm'
                  }
                `}
              >
                <Globe2 size={14} />
                <span>{isAr ? 'إجمالي المستخدمين:' : 'Total users:'}</span>
                <span
                  className={
                    isDark ? 'font-semibold text-sky-400' : 'font-semibold text-sky-600'
                  }
                >
                  {totalUsers}
                </span>
              </span>
              <span
                className={`
                  inline-flex items-center gap-1 rounded-full px-3 py-1
                  border
                  ${
                    isDark
                      ? 'bg-slate-900/80 border-emerald-700'
                      : 'bg-emerald-50 border-emerald-300 shadow-sm'
                  }
                `}
              >
                <Shield
                  size={14}
                  className={isDark ? 'text-emerald-400' : 'text-emerald-600'}
                />
                <span>{isAr ? 'أدمن:' : 'Admins:'}</span>
                <span
                  className={
                    isDark
                      ? 'font-semibold text-emerald-300'
                      : 'font-semibold text-emerald-700'
                  }
                >
                  {totalAdmins}
                </span>
              </span>
              <span
                className={`
                  inline-flex items-center gap-1 rounded-full px-3 py-1
                  border
                  ${
                    isDark
                      ? 'bg-slate-900/80 border-slate-700'
                      : 'bg-white border-slate-200 shadow-sm'
                  }
                `}
              >
                <UserCircle2
                  size={14}
                  className={isDark ? 'text-slate-300' : 'text-slate-500'}
                />
                <span>{isAr ? 'مستخدمون:' : 'Users:'}</span>
                <span
                  className={
                    isDark ? 'font-semibold text-slate-100' : 'font-semibold text-slate-800'
                  }
                >
                  {totalNormalUsers}
                </span>
              </span>
            </div>
          </header>

          {/* Tabs */}
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('users')}
              className={`
                px-4 py-1.5 rounded-full text-sm border transition-colors
                ${
                  activeTab === 'users'
                    ? isDark
                      ? 'bg-sky-600 text-white border-sky-400'
                      : 'bg-sky-600 text-white border-sky-500'
                    : isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                }
              `}
            >
              {isAr ? 'المستخدمون' : 'Users'}
            </button>

            <button
              onClick={() => setActiveTab('invites')}
              className={`
                px-4 py-1.5 rounded-full text-sm border transition-colors
                ${
                  activeTab === 'invites'
                    ? isDark
                      ? 'bg-emerald-600 text-white border-emerald-400'
                      : 'bg-emerald-600 text-white border-emerald-500'
                    : isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                }
              `}
            >
              {isAr ? 'أكواد الدعوة' : 'Invite Codes'}
            </button>

            <button
              onClick={() => setActiveTab('languages')}
              className={`
                px-4 py-1.5 rounded-full text-sm border transition-colors
                ${
                  activeTab === 'languages'
                    ? isDark
                      ? 'bg-indigo-600 text-white border-indigo-400'
                      : 'bg-indigo-600 text-white border-indigo-500'
                    : isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                }
              `}
            >
              {isAr ? 'اللغات في التطبيق' : 'App Languages'}
            </button>
          </div>

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <section
              className={`
                rounded-2xl border p-4 md:p-5 shadow-sm
                ${
                  isDark
                    ? 'border-slate-800 bg-slate-900/70'
                    : 'border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]'
                }
              `}
            >
              <h2
                className={`
                  text-sm font-semibold mb-3
                  ${isDark ? 'text-slate-100' : 'text-slate-900'}
                `}
              >
                {isAr ? 'قائمة المستخدمين' : 'Users list'}
              </h2>

              {usersLoading ? (
                <p
                  className={`text-xs ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {isAr ? 'جاري التحميل...' : 'Loading...'}
                </p>
              ) : users.length === 0 ? (
                <p
                  className={`text-xs ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {isAr
                    ? 'لا يوجد مستخدمون بعد. يتم إنشاء المستخدمين من صفحة التسجيل (Sign up).'
                    : 'No users yet. Users are created from the Sign up page.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {users.map(user => (
                    <div
                      key={user.id}
                      className={`
                        rounded-xl border px-3 py-3
                        ${
                          isDark
                            ? 'border-slate-800 bg-slate-950/80'
                            : 'border-slate-200 bg-slate-50'
                        }
                      `}
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-0.5">
                          <p
                            className={`
                              text-sm font-semibold flex items-center gap-2
                              ${isDark ? 'text-slate-50' : 'text-slate-900'}
                            `}
                          >
                            {user.name}
                            <span
                              className={`
                                rounded-full px-2 py-0.5 text-[10px] border
                                ${
                                  user.role === 'admin'
                                    ? isDark
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      : 'bg-amber-50 text-amber-700 border-amber-300'
                                    : isDark
                                    ? 'bg-slate-700/40 text-slate-100 border-slate-500/60'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                }
                              `}
                            >
                              {user.role === 'admin'
                                ? isAr
                                  ? 'أدمن'
                                  : 'Admin'
                                : isAr
                                ? 'مستخدم'
                                : 'User'}
                            </span>
                          </p>
                          <p
                            className={`
                              text-[11px] flex items-center gap-1
                              ${isDark ? 'text-slate-400' : 'text-slate-600'}
                            `}
                          >
                            <Mail size={11} />
                            <span>{user.email}</span>
                          </p>
                          <p
                            className={`
                              text-[10px]
                              ${isDark ? 'text-slate-500' : 'text-slate-500'}
                            `}
                          >
                            {isAr ? 'تم الإنشاء في: ' : 'Created at: '}
                            {new Date(user.createdAt).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 mt-1 md:mt-0">
                          <select
                            value={user.role}
                            onChange={e =>
                              setUsers(prev => {
                                const next = prev.map(u =>
                                  u.id === user.id
                                    ? {
                                        ...u,
                                        role: e.target
                                          .value as AdminUser['role'],
                                      }
                                    : u
                                );
                                saveUsers(next);
                                return next;
                              })
                            }
                            className={`
                              rounded-full border text-[11px] px-2 py-1
                              ${
                                isDark
                                  ? 'border-slate-700 bg-slate-900/80 text-slate-100'
                                  : 'border-slate-200 bg-white text-slate-800'
                              }
                            `}
                          >
                            <option value="user">
                              {isAr ? 'مستخدم' : 'User'}
                            </option>
                            <option value="admin">
                              {isAr ? 'أدمن' : 'Admin'}
                            </option>
                          </select>

                          <button
                            type="button"
                            onClick={() => openEditUser(user)}
                            className={`
                              inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] transition-colors
                              ${
                                isDark
                                  ? 'border-sky-500/60 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20'
                                  : 'border-sky-400 bg-sky-50 text-sky-700 hover:bg-sky-100'
                              }
                            `}
                          >
                            <Pencil size={12} />
                            {isAr ? 'تعديل' : 'Edit'}
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteUser(user.id)}
                            className={`
                              inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] transition-colors
                              ${
                                isDark
                                  ? 'border-rose-500/60 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
                                  : 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100'
                              }
                            `}
                          >
                            <Trash2 size={12} />
                            {isAr ? 'حذف' : 'Delete'}
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1">
                        <p
                          className={`
                            text-[11px] mb-1
                            ${isDark ? 'text-slate-300' : 'text-slate-700'}
                          `}
                        >
                          {isAr
                            ? 'اللغات المسموح بها لهذا المستخدم:'
                            : 'Allowed languages for this user:'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {appLanguages.map(lang => {
                            const active = user.languages.includes(lang.id);
                            return (
                              <button
                                key={lang.id}
                                type="button"
                                onClick={() => toggleUserLang(user, lang.id)}
                                className={`
                                  px-2.5 py-1 rounded-full border text-[11px] transition-colors
                                  ${
                                    active
                                      ? isDark
                                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
                                        : 'border-emerald-400 bg-emerald-50 text-emerald-700'
                                      : isDark
                                      ? 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-emerald-500/60 hover:text-emerald-200'
                                      : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400'
                                  }
                                `}
                              >
                                {lang.nativeLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* INVITE CODES TAB */}
          {activeTab === 'invites' && (
            <>
              {/* Create invite code */}
              <section
                className={`
                  rounded-2xl border p-4 md:p-5 shadow-sm
                  ${
                    isDark
                      ? 'border-slate-800 bg-slate-900/70'
                      : 'border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]'
                  }
                `}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h2
                    className={`
                      text-sm font-semibold flex items-center gap-2
                      ${isDark ? 'text-slate-100' : 'text-slate-900'}
                    `}
                  >
                    <Plus
                      size={16}
                      className={isDark ? 'text-emerald-400' : 'text-emerald-600'}
                    />
                    {isAr ? 'إنشاء كود دعوة جديد' : 'Create new invite code'}
                  </h2>
                  <p
                    className={`
                      text-[11px]
                      ${isDark ? 'text-slate-400' : 'text-slate-600'}
                    `}
                  >
                    {isAr
                      ? 'اختَر اللغات التي ستظهر لليوزر عندما يستخدم هذا الكود.'
                      : 'Select languages the user will get when using this code.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {appLanguages.map(lang => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() =>
                        setInviteLangs(prev =>
                          prev.includes(lang.id)
                            ? prev.filter(l => l !== lang.id)
                            : [...prev, lang.id]
                        )
                      }
                      className={`
                        px-3 py-1 rounded-full text-[11px] border transition-colors
                        ${
                          inviteLangs.includes(lang.id)
                            ? isDark
                              ? 'bg-emerald-600/30 border-emerald-400 text-emerald-100'
                              : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : isDark
                            ? 'bg-slate-950/70 border-slate-700 text-slate-300 hover:border-emerald-400'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-400'
                        }
                      `}
                    >
                      {lang.nativeLabel}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={createInviteCodeHandler}
                  className={`
                    inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold transition-colors
                    ${
                      isDark
                        ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500'
                    }
                  `}
                >
                  {isAr ? 'إنشاء الكود' : 'Generate code'}
                </button>

                <p
                  className={`
                    mt-2 text-[10px]
                    ${isDark ? 'text-slate-500' : 'text-slate-500'}
                  `}
                >
                  {isAr
                    ? 'هذا نظام تجريبي يعتمد على localStorage. في الإنتاج سيتم تخزين الأكواد في قاعدة بيانات.'
                    : 'This is a demo system using localStorage; in production, codes will be stored in a real database.'}
                </p>
              </section>

              {/* List invite codes */}
              <section
                className={`
                  rounded-2xl border p-4 md:p-5 shadow-sm
                  ${
                    isDark
                      ? 'border-slate-800 bg-slate-900/70'
                      : 'border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]'
                  }
                `}
              >
                <h2
                  className={`
                    text-sm font-semibold mb-3
                    ${isDark ? 'text-slate-100' : 'text-slate-900'}
                  `}
                >
                  {isAr ? 'أكواد الدعوة الموجودة' : 'Existing invite codes'}
                </h2>

                {inviteCodes.length === 0 ? (
                  <p
                    className={`text-xs ${
                      isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    {isAr ? 'لا توجد أكواد حتى الآن.' : 'No invite codes yet.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {inviteCodes.map(code => (
                      <div
                        key={code.code}
                        className={`
                          rounded-xl border px-3 py-3
                          ${
                            isDark
                              ? 'border-slate-800 bg-slate-950/80'
                              : 'border-slate-200 bg-slate-50'
                          }
                        `}
                      >
                        <p
                          className={`
                            text-lg font-mono tracking-widest
                            ${isDark ? 'text-sky-300' : 'text-sky-700'}
                          `}
                        >
                          {code.code}
                        </p>
                        <p
                          className={`
                            text-[11px] mt-1
                            ${isDark ? 'text-slate-400' : 'text-slate-600'}
                          `}
                        >
                          {isAr ? 'اللغات:' : 'Languages:'}{' '}
                          {code.languages
                            .map(
                              id =>
                                appLanguages.find(l => l.id === id)
                                  ?.nativeLabel || id
                            )
                            .join(isAr ? ' ، ' : ', ')}
                        </p>
                        <p
                          className={`
                            text-[11px] mt-1
                            ${isDark ? 'text-slate-400' : 'text-slate-600'}
                          `}
                        >
                          {isAr ? 'الحالة: ' : 'Status: '}
                          {code.used
                            ? isAr
                              ? `مستخدم بواسطة: ${code.usedBy}`
                              : `Used by: ${code.usedBy}`
                            : isAr
                            ? 'غير مستخدم'
                            : 'Not used'}
                        </p>
                        <p
                          className={`
                            text-[10px] mt-1
                            ${isDark ? 'text-slate-500' : 'text-slate-500'}
                          `}
                        >
                          {isAr ? 'تاريخ الإنشاء: ' : 'Created at: '}
                          {new Date(code.createdAt).toLocaleString()}
                        </p>

                        <button
                          type="button"
                          onClick={() => deleteInviteCodeHandler(code)}
                          className={`
                            mt-3 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] transition-colors
                            ${
                              isDark
                                ? 'border-rose-500/60 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
                                : 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100'
                            }
                          `}
                        >
                          <Trash2 size={12} />
                          {isAr ? 'حذف الكود' : 'Delete code'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* LANGUAGES TAB */}
          {activeTab === 'languages' && (
            <section
              className={`
                rounded-2xl border p-4 md:p-5 shadow-sm
                ${
                  isDark
                    ? 'border-slate-800 bg-slate-900/70'
                    : 'border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]'
                }
              `}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2
                  className={`
                    text-sm font-semibold flex items-center gap-2
                    ${isDark ? 'text-slate-100' : 'text-slate-900'}
                  `}
                >
                  <Globe2
                    size={16}
                    className={isDark ? 'text-indigo-400' : 'text-indigo-600'}
                  />
                  {isAr ? 'اللغات المتاحة في التطبيق' : 'Available app languages'}
                </h2>
                <span
                  className={`
                    text-[11px]
                    ${isDark ? 'text-slate-400' : 'text-slate-600'}
                  `}
                >
                  {isAr
                    ? 'يمكنك إضافة أو حذف لغات التدريب التي يستخدمها التطبيق بالكامل.'
                    : 'You can add or remove training languages used across the app.'}
                </span>
              </div>

              {/* إضافة لغة جديدة */}
              <div
                className={`
                  mb-4 rounded-xl border p-3 space-y-2 text-[11px]
                  ${
                    isDark
                      ? 'border-slate-800 bg-slate-950/70'
                      : 'border-slate-200 bg-slate-50'
                  }
                `}
              >
                <p
                  className={`
                    font-semibold mb-1
                    ${isDark ? 'text-slate-200' : 'text-slate-900'}
                  `}
                >
                  {isAr ? 'إضافة لغة جديدة' : 'Add new language'}
                </p>
                <div className="grid gap-2 md:grid-cols-4">
                  <input
                    value={newLang.id}
                    onChange={e =>
                      setNewLang(prev => ({ ...prev, id: e.target.value }))
                    }
                    className={`
                      rounded-lg border px-2 py-1 text-[11px]
                      ${
                        isDark
                          ? 'border-slate-700 bg-slate-900 text-slate-50'
                          : 'border-slate-200 bg-white text-slate-900'
                      }
                    `}
                    placeholder={isAr ? 'معرّف (مثلاً: tr)' : 'ID (e.g. tr)'}
                  />
                  <input
                    value={newLang.label}
                    onChange={e =>
                      setNewLang(prev => ({ ...prev, label: e.target.value }))
                    }
                    className={`
                      rounded-lg border px-2 py-1 text-[11px]
                      ${
                        isDark
                          ? 'border-slate-700 bg-slate-900 text-slate-50'
                          : 'border-slate-200 bg-white text-slate-900'
                      }
                    `}
                    placeholder={isAr ? 'الاسم بالإنجليزية' : 'Label (English)'}
                  />
                  <input
                    value={newLang.nativeLabel}
                    onChange={e =>
                      setNewLang(prev => ({
                        ...prev,
                        nativeLabel: e.target.value,
                      }))
                    }
                    className={`
                      rounded-lg border px-2 py-1 text-[11px]
                      ${
                        isDark
                          ? 'border-slate-700 bg-slate-900 text-slate-50'
                          : 'border-slate-200 bg-white text-slate-900'
                      }
                    `}
                    placeholder={isAr ? 'الاسم المحلي' : 'Native label'}
                  />
                  <input
                    value={newLang.ttsCode}
                    onChange={e =>
                      setNewLang(prev => ({ ...prev, ttsCode: e.target.value }))
                    }
                    className={`
                      rounded-lg border px-2 py-1 text-[11px]
                      ${
                        isDark
                          ? 'border-slate-700 bg-slate-900 text-slate-50'
                          : 'border-slate-200 bg-white text-slate-900'
                      }
                    `}
                    placeholder={
                      isAr ? 'كود TTS (مثلاً: tr-TR)' : 'TTS code (e.g. tr-TR)'
                    }
                  />
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddLanguage}
                    className={`
                      inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors
                      ${
                        isDark
                          ? 'bg-indigo-500 text-slate-950 hover:bg-indigo-400'
                          : 'bg-indigo-600 text-white hover:bg-indigo-500'
                      }
                    `}
                  >
                    {isAr ? 'إضافة اللغة' : 'Add language'}
                  </button>
                </div>
              </div>

              {/* قائمة اللغات */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {appLanguages.map(lang => (
                  <div
                    key={lang.id}
                    className={`
                      rounded-xl border px-3 py-3 flex flex-col justify-between
                      ${
                        isDark
                          ? 'border-slate-800 bg-slate-950/80'
                          : 'border-slate-200 bg-slate-50'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p
                          className={`
                            text-sm font-semibold flex items-center gap-2
                            ${isDark ? 'text-slate-50' : 'text-slate-900'}
                          `}
                        >
                          {lang.label}
                          <span
                            className={`
                              rounded-full px-2 py-0.5 text-[10px]
                              ${
                                isDark
                                  ? 'bg-slate-800/80 text-slate-300'
                                  : 'bg-white text-slate-700 border border-slate-200'
                              }
                            `}
                          >
                            {lang.nativeLabel}
                          </span>
                        </p>
                        <p
                          className={`
                            text-[11px] mt-1
                            ${isDark ? 'text-slate-400' : 'text-slate-600'}
                          `}
                        >
                          ID:{' '}
                          <span
                            className={
                              isDark
                                ? 'font-mono text-sky-300'
                                : 'font-mono text-sky-700'
                            }
                          >
                            {lang.id}
                          </span>
                        </p>
                        <p
                          className={`
                            text-[11px]
                            ${isDark ? 'text-slate-400' : 'text-slate-600'}
                          `}
                        >
                          TTS:{' '}
                          <span
                            className={
                              isDark
                                ? 'font-mono text-emerald-300'
                                : 'font-mono text-emerald-700'
                            }
                          >
                            {lang.ttsCode}
                          </span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteLanguage(lang.id)}
                        className={`
                          inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] transition-colors
                          ${
                            isDark
                              ? 'border-rose-500/60 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
                              : 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100'
                          }
                        `}
                      >
                        <Trash2 size={11} />
                        {isAr ? 'حذف' : 'Delete'}
                      </button>
                    </div>

                    <p
                      className={`
                        mt-2 text-[10px]
                        ${isDark ? 'text-slate-500' : 'text-slate-500'}
                      `}
                    >
                      {isAr
                        ? 'حذف هذه اللغة سيمنع استخدامها في أكواد الدعوة الجديدة، وسيتم إزالتها من قائمة اللغات المسموح بها للمستخدمين.'
                        : 'Deleting this language removes it from new invite codes and from users’ allowed language lists.'}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {/* Edit User Modal */}
      {editUser && (
        <div
          className={`
            fixed inset-0 flex justify-center items-center p-4 z-50
            ${isDark ? 'bg-black/60' : 'bg-black/30'}
          `}
        >
          <div
            className={`
              w-full max-w-md border p-4 rounded-2xl shadow-2xl
              ${
                isDark
                  ? 'bg-slate-950 border-slate-800'
                  : 'bg-white border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.18)]'
              }
            `}
          >
            <div className="flex justify-between items-center mb-3">
              <h3
                className={`
                  text-sm font-semibold
                  ${isDark ? 'text-slate-100' : 'text-slate-900'}
                `}
              >
                {isAr ? 'تعديل بيانات المستخدم' : 'Edit user'}
              </h3>
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className={`
                  transition-colors
                  ${isDark ? 'text-slate-400 hover:text-slate-100' : 'text-slate-500 hover:text-slate-900'}
                `}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <input
                value={editUser.name}
                onChange={e =>
                  setEditUser(prev =>
                    prev ? { ...prev, name: e.target.value } : prev
                  )
                }
                className={`
                  w-full rounded-xl border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/70
                  ${
                    isDark
                      ? 'border-slate-700 bg-slate-900 text-slate-50'
                      : 'border-slate-300 bg-white text-slate-900'
                  }
                `}
                placeholder={isAr ? 'اسم المستخدم' : 'Name'}
              />

              <input
                value={editUser.email}
                onChange={e =>
                  setEditUser(prev =>
                    prev ? { ...prev, email: e.target.value } : prev
                  )
                }
                className={`
                  w-full rounded-xl border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/70
                  ${
                    isDark
                      ? 'border-slate-700 bg-slate-900 text-slate-50'
                      : 'border-slate-300 bg-white text-slate-900'
                  }
                `}
                placeholder="user@example.com"
              />

              <input
                value={editUser.password}
                onChange={e =>
                  setEditUser(prev =>
                    prev ? { ...prev, password: e.target.value } : prev
                  )
                }
                className={`
                  w-full rounded-xl border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/70
                  ${
                    isDark
                      ? 'border-slate-700 bg-slate-900 text-slate-50'
                      : 'border-slate-300 bg-white text-slate-900'
                  }
                `}
                placeholder={isAr ? 'كلمة المرور' : 'Password'}
              />

              <select
                value={editUser.role}
                onChange={e =>
                  setEditUser(prev =>
                    prev
                      ? { ...prev, role: e.target.value as AdminUser['role'] }
                      : prev
                  )
                }
                className={`
                  w-full rounded-xl border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/70
                  ${
                    isDark
                      ? 'border-slate-700 bg-slate-900 text-slate-50'
                      : 'border-slate-300 bg-white text-slate-900'
                  }
                `}
              >
                <option value="user">
                  {isAr ? 'مستخدم' : 'User'}
                </option>
                <option value="admin">
                  {isAr ? 'أدمن' : 'Admin'}
                </option>
              </select>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className={`
                  px-3 py-1.5 rounded-full text-[11px] border
                  ${
                    isDark
                      ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }
                `}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveEditUser}
                className={`
                  px-3 py-1.5 rounded-full text-[11px] font-semibold
                  ${
                    isDark
                      ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                      : 'bg-sky-600 text-white hover:bg-sky-500'
                  }
                `}
              >
                {isAr ? 'حفظ' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
