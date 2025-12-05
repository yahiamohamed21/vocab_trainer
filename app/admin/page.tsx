// app/admin/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  Plus,
  Mail,
  Globe2,
  LockKeyhole,
  Shield,
  UserCircle2,
  Trash2,
  Pencil,
  X,
} from 'lucide-react';
import { LANGUAGES } from '@/lib/constants';
import { AdminUser, LanguageId } from '@/lib/types';
import { loadUsers, saveUsers } from '@/lib/storage';
import { useUiSettings } from '@/context/UiSettingsContext';

const swalDarkBase = {
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
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedLangs, setSelectedLangs] = useState<LanguageId[]>([]);
  const [role, setRole] = useState<'admin' | 'user'>('user');

  const [editUser, setEditUser] = useState<EditUserState>(null);

  const { uiLang, theme } = useUiSettings();
  const isAr = uiLang === 'ar';
  const isDark = theme === 'dark';

  useEffect(() => {
    const u = loadUsers();
    setUsers(u);
    setLoading(false);
  }, []);

  const totalUsers = users.length;
  const totalAdmins = users.filter(u => u.role === 'admin').length;
  const totalNormalUsers = totalUsers - totalAdmins;

  function toggleLang(langId: LanguageId) {
    setSelectedLangs(prev =>
      prev.includes(langId)
        ? prev.filter(l => l !== langId)
        : [...prev, langId]
    );
  }

  async function addUser() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedName) {
      await Swal.fire({
        ...swalDarkBase,
        icon: 'warning',
        title: isAr ? 'الاسم مطلوب' : 'Name is required',
        text: isAr
          ? 'من فضلك أدخل اسم المستخدم.'
          : 'Please enter the user name.',
      });
      return;
    }

    if (!trimmedEmail) {
      await Swal.fire({
        ...swalDarkBase,
        icon: 'warning',
        title: isAr ? 'البريد الإلكتروني مطلوب' : 'Email is required',
        text: isAr
          ? 'من فضلك أدخل البريد الإلكتروني. سيتم استخدامه لتسجيل الدخول.'
          : 'Please enter the email. It will be used for login.',
      });
      return;
    }

    if (!trimmedPassword) {
      await Swal.fire({
        ...swalDarkBase,
        icon: 'warning',
        title: isAr ? 'كلمة المرور مطلوبة' : 'Password is required',
        text: isAr
          ? 'من فضلك أدخل كلمة مرور لهذا الحساب.'
          : 'Please set a password for this account.',
      });
      return;
    }

    if (selectedLangs.length === 0) {
      await Swal.fire({
        ...swalDarkBase,
        icon: 'warning',
        title: isAr ? 'اختر اللغات' : 'Select languages',
        text: isAr
          ? 'يجب اختيار لغة واحدة على الأقل لهذا المستخدم.'
          : 'You must select at least one language for this user.',
      });
      return;
    }

    const exists = users.some(u => u.email.toLowerCase() === trimmedEmail);
    if (exists) {
      await Swal.fire({
        ...swalDarkBase,
        icon: 'error',
        title: isAr ? 'البريد مستخدم بالفعل' : 'Email already exists',
        text: isAr
          ? 'يوجد حساب مسجل بهذا البريد الإلكتروني.'
          : 'There is already an account with this email.',
      });
      return;
    }

    const langsLabels = LANGUAGES.filter(l =>
      selectedLangs.includes(l.id)
    )
      .map(l => l.nativeLabel)
      .join(isAr ? ' ، ' : ', ');

    const confirmResult = await Swal.fire({
      ...swalDarkBase,
      icon: 'question',
      title: isAr ? 'تأكيد إنشاء المستخدم' : 'Confirm user creation',
      html: `
        <div style="text-align:${
          isAr ? 'right' : 'left'
        };font-size:13px;line-height:1.6;">
          <div><strong>${isAr ? 'الاسم:' : 'Name:'}</strong> ${trimmedName}</div>
          <div><strong>${isAr ? 'البريد:' : 'Email:'}</strong> ${trimmedEmail}</div>
          <div><strong>${
            isAr ? 'نوع الحساب:' : 'Role:'
          }</strong> ${role === 'admin' ? (isAr ? 'أدمن' : 'Admin') : isAr ? 'مستخدم عادي' : 'User'}</div>
          <div><strong>${isAr ? 'اللغات المسموح بها:' : 'Allowed languages:'}</strong> ${langsLabels}</div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: isAr ? 'تأكيد الإنشاء' : 'Create user',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
    });

    if (!confirmResult.isConfirmed) return;

    const now = new Date().toISOString();
    const newUser: AdminUser = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: trimmedName,
      email: trimmedEmail,
      password: trimmedPassword,
      createdAt: now,
      languages: selectedLangs,
      role,
    };

    const next = [newUser, ...users];
    setUsers(next);
    saveUsers(next);

    await Swal.fire({
      ...swalDarkBase,
      icon: 'success',
      title: isAr ? 'تم إنشاء المستخدم' : 'User created',
      html: `
        <div style="text-align:${
          isAr ? 'right' : 'left'
        };font-size:13px;line-height:1.6;">
          <div><strong>${isAr ? 'البريد:' : 'Email:'}</strong> ${
        newUser.email
      }</div>
          <div><strong>${isAr ? 'كلمة المرور:' : 'Password:'}</strong> ${
        newUser.password
      }</div>
        </div>
      `,
      confirmButtonText: isAr ? 'حسناً' : 'OK',
    });

    setName('');
    setEmail('');
    setPassword('');
    setSelectedLangs([]);
    setRole('user');
  }

  async function confirmToggleUserLang(user: AdminUser, langId: LanguageId) {
    const lang = LANGUAGES.find(l => l.id === langId);
    if (!lang) return;

    const has = user.languages.includes(langId);
    const title = has
      ? isAr
        ? 'إزالة لغة من هذا المستخدم؟'
        : 'Remove language from user?'
      : isAr
      ? 'إضافة لغة لهذا المستخدم؟'
      : 'Add language to user?';

    const text = has
      ? isAr
        ? `سيتم منع المستخدم من استخدام لغة ${lang.nativeLabel}.`
        : `The user will no longer have access to ${lang.nativeLabel}.`
      : isAr
      ? `سيتم السماح للمستخدم باستخدام لغة ${lang.nativeLabel}.`
      : `The user will be allowed to use ${lang.nativeLabel}.`;

    const result = await Swal.fire({
      ...swalDarkBase,
      icon: 'question',
      title,
      text,
      showCancelButton: true,
      confirmButtonText: isAr ? 'تأكيد' : 'Confirm',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
    });

    if (!result.isConfirmed) return;

    const next = users.map(u => {
      if (u.id !== user.id) return u;
      return {
        ...u,
        languages: has
          ? u.languages.filter(l => l !== langId)
          : [...u.languages, langId],
      };
    });
    setUsers(next);
    saveUsers(next);
  }

  async function deleteUser(userId: string) {
    const user = users.find(u => u.id === userId);
    const result = await Swal.fire({
      ...swalDarkBase,
      icon: 'warning',
      title: isAr ? 'حذف المستخدم؟' : 'Delete user?',
      html: user
        ? `<div style="font-size:13px;line-height:1.6;text-align:${
            isAr ? 'right' : 'left'
          }">
            <div><strong>${isAr ? 'الاسم:' : 'Name:'}</strong> ${
            user.name
          }</div>
            <div><strong>${isAr ? 'البريد:' : 'Email:'}</strong> ${
            user.email
          }</div>
          </div>`
        : '',
      showCancelButton: true,
      confirmButtonText: isAr ? 'حذف' : 'Delete',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
    });

    if (!result.isConfirmed) return;

    const next = users.filter(u => u.id !== userId);
    setUsers(next);
    saveUsers(next);
  }

  function updateUserRole(userId: string, newRole: 'admin' | 'user') {
    const next = users.map(u =>
      u.id === userId ? { ...u, role: newRole } : u
    );
    setUsers(next);
    saveUsers(next);
  }

  const languagesById = useMemo(
    () => Object.fromEntries(LANGUAGES.map(l => [l.id, l] as const)),
    []
  );

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
    const role = editUser.role;

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      await Swal.fire({
        ...swalDarkBase,
        icon: 'warning',
        title: isAr ? 'حقول مطلوبة' : 'Missing fields',
        text: isAr
          ? 'الاسم، البريد الإلكتروني، وكلمة المرور مطلوبة.'
          : 'Name, email and password are required.',
      });
      return;
    }

    const duplicate = users.some(
      u =>
        u.id !== editUser.id &&
        u.email.toLowerCase() === trimmedEmail
    );
    if (duplicate) {
      await Swal.fire({
        ...swalDarkBase,
        icon: 'error',
        title: isAr ? 'البريد مستخدم بالفعل' : 'Email already exists',
        text: isAr
          ? 'يوجد مستخدم آخر بهذا البريد الإلكتروني.'
          : 'Another user already uses this email.',
      });
      return;
    }

    const confirm = await Swal.fire({
      ...swalDarkBase,
      icon: 'question',
      title: isAr ? 'تأكيد تعديل المستخدم' : 'Confirm user update',
      text: isAr
        ? 'هل أنت متأكد من حفظ التغييرات على هذا المستخدم؟'
        : 'Are you sure you want to save changes for this user?',
      showCancelButton: true,
      confirmButtonText: isAr ? 'حفظ التعديلات' : 'Save changes',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
    });

    if (!confirm.isConfirmed) return;

    const next = users.map(u =>
      u.id === editUser.id
        ? {
            ...u,
            name: trimmedName,
            email: trimmedEmail,
            password: trimmedPassword,
            role,
          }
        : u
    );

    setUsers(next);
    saveUsers(next);
    setEditUser(null);

    await Swal.fire({
      ...swalDarkBase,
      icon: 'success',
      title: isAr ? 'تم حفظ التعديلات' : 'User updated',
      timer: 1200,
      showConfirmButton: false,
    });
  }

  return (
    <>
      <div className="min-h-screen w-full bg-slate-950 text-slate-50 flex justify-center px-4 py-6">
        <div className="w-full max-w-6xl space-y-6">
          {/* هيدر */}
          <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-50 flex items-center gap-2">
                <UserCircle2 className="text-sky-400" />
                {isAr ? 'لوحة تحكم الحسابات' : 'Accounts Dashboard'}
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                {isAr
                  ? 'إدارة المستخدمين، الأدوار، واللغات المسموح بها لكل حساب.'
                  : 'Manage users, roles and allowed languages for each account.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 border border-slate-700 px-3 py-1">
                <Globe2 size={14} />
                <span>{isAr ? 'إجمالي المستخدمين:' : 'Total users:'}</span>
                <span className="font-semibold text-sky-400">
                  {totalUsers}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 border border-emerald-700 px-3 py-1">
                <Shield size={14} className="text-emerald-400" />
                <span>{isAr ? 'أدمن:' : 'Admins:'}</span>
                <span className="font-semibold text-emerald-300">
                  {totalAdmins}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 border border-slate-700 px-3 py-1">
                <UserCircle2 size={14} className="text-slate-300" />
                <span>{isAr ? 'مستخدمون:' : 'Users:'}</span>
                <span className="font-semibold text-slate-100">
                  {totalNormalUsers}
                </span>
              </span>
            </div>
          </header>

          {/* إضافة مستخدم جديد */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4 md:px-5 md:py-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <Plus size={16} className="text-sky-400" />
              {isAr ? 'إضافة مستخدم جديد' : 'Add new user'}
            </h2>
            <div className="grid gap-3 md:grid-cols-[2fr_2fr_2fr_2fr] md:items-end">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">
                  {isAr ? 'اسم المستخدم' : 'User name'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={
                    isAr ? 'مثال: أحمد محمد' : 'e.g. Ahmed Mohamed'
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-400/80"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 flex items-center gap-1">
                  <Mail size={12} />
                  {isAr ? 'البريد الإلكتروني' : 'Email'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-400/80"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 flex items-center gap-1">
                  <LockKeyhole size={12} />
                  {isAr ? 'كلمة المرور' : 'Password'}
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isAr ? 'ضع كلمة مرور قوية' : 'Set a strong password'}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/70 focus:border-sky-400/80"
                />
                <p className="text-[10px] text-slate-500">
                  {isAr
                    ? 'ستحتاج هذه الكلمة لتسجيل دخول المستخدم من صفحة اللوجين.'
                    : 'You will use this password to sign in from the login page.'}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">
                  {isAr ? 'نوع الحساب' : 'Account role'}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('user')}
                    className={`flex-1 px-2.5 py-1.5 rounded-full border text-[11px] transition-colors ${
                      role === 'user'
                        ? 'border-sky-500 bg-sky-500/20 text-sky-100'
                        : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-sky-500/60 hover:text-sky-100'
                    }`}
                  >
                    {isAr ? 'مستخدم عادي' : 'User'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`flex-1 px-2.5 py-1.5 rounded-full border text-[11px] transition-colors ${
                      role === 'admin'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-100'
                        : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-amber-500/60 hover:text-amber-100'
                    }`}
                  >
                    {isAr ? 'أدمن' : 'Admin'}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <label className="text-[11px] text-slate-300">
                {isAr
                  ? 'اللغات المسموح بها (يجب اختيار لغة واحدة على الأقل)'
                  : 'Allowed languages (at least one required)'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGES.map(lang => {
                  const active = selectedLangs.includes(lang.id);
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => toggleLang(lang.id)}
                      className={`px-2.5 py-1 rounded-full border text-[11px] transition-colors ${
                        active
                          ? 'border-sky-500 bg-sky-600/20 text-sky-200'
                          : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-sky-500/70 hover:text-sky-200'
                      }`}
                    >
                      {lang.nativeLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={addUser}
                className="inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 transition-colors"
              >
                {isAr ? 'إنشاء مستخدم' : 'Create user'}
              </button>
            </div>

            <p className="mt-2 text-[10px] text-slate-500">
              {isAr
                ? 'هذه البيانات محفوظة محليًا في المتصفح (localStorage) لأغراض التجربة. عند الانتقال لنظام حقيقي ستحتاج لقاعدة بيانات وباك إند.'
                : 'Data is stored locally in the browser (localStorage) for demo purposes. In production you will use a real backend and database.'}
            </p>
          </section>

          {/* قائمة المستخدمين */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4 md:px-5 md:py-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-100 mb-3">
              {isAr ? 'المستخدمون الحاليون' : 'Current users'}
            </h2>

            {loading ? (
              <p className="text-xs text-slate-400">
                {isAr ? 'جاري التحميل...' : 'Loading...'}
              </p>
            ) : users.length === 0 ? (
              <p className="text-xs text-slate-400">
                {isAr
                  ? 'لا يوجد مستخدمون بعد. أضف أول مستخدم من النموذج بالأعلى.'
                  : 'No users yet. Add the first user from the form above.'}
              </p>
            ) : (
              <div className="space-y-3">
                {users.map(user => (
                  <div
                    key={user.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-3"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-slate-50 flex items-center gap-2">
                          {user.name}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] border ${
                              user.role === 'admin'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-slate-700/40 text-slate-100 border-slate-500/60'
                            }`}
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
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Mail size={11} />
                          <span>{user.email}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <LockKeyhole size={11} />
                          <span>
                            {isAr ? 'كلمة المرور:' : 'Password:'}{' '}
                            <span className="font-mono text-[10px] text-sky-300">
                              {user.password}
                            </span>
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {isAr ? 'تم الإنشاء في: ' : 'Created at: '}
                          {new Date(user.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 md:mt-0">
                        <select
                          value={user.role}
                          onChange={e =>
                            updateUserRole(
                              user.id,
                              e.target.value as 'admin' | 'user'
                            )
                          }
                          className="rounded-full border border-slate-700 bg-slate-900/80 text-[11px] px-2 py-1 text-slate-100"
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
                          className="inline-flex items-center gap-1 rounded-full border border-sky-500/60 bg-sky-500/10 px-3 py-1 text-[11px] text-sky-200 hover:bg-sky-500/20 transition-colors"
                        >
                          <Pencil size={12} />
                          {isAr ? 'تعديل' : 'Edit'}
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteUser(user.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-rose-500/60 bg-rose-500/10 px-3 py-1 text-[11px] text-rose-200 hover:bg-rose-500/20 transition-colors"
                        >
                          <Trash2 size={12} />
                          {isAr ? 'حذف' : 'Delete'}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1">
                      <p className="text-[11px] text-slate-300 mb-1">
                        {isAr
                          ? 'اللغات المسموح بها لهذا المستخدم:'
                          : 'Allowed languages for this user:'}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {LANGUAGES.map(lang => {
                          const active = user.languages.includes(lang.id);
                          return (
                            <button
                              key={lang.id}
                              type="button"
                              onClick={() =>
                                confirmToggleUserLang(user, lang.id)
                              }
                              className={`px-2.5 py-1 rounded-full border text-[11px] transition-colors ${
                                active
                                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200'
                                  : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-emerald-500/60 hover:text-emerald-200'
                              }`}
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
        </div>
      </div>

      {/* Modal تعديل المستخدم */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-100">
                {isAr ? 'تعديل بيانات المستخدم' : 'Edit user'}
              </h3>
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-400"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">
                  {isAr ? 'الاسم' : 'Name'}
                </label>
                <input
                  type="text"
                  value={editUser.name}
                  onChange={e =>
                    setEditUser(prev =>
                      prev ? { ...prev, name: e.target.value } : prev
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/70"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 flex items-center gap-1">
                  <Mail size={11} />
                  {isAr ? 'البريد الإلكتروني' : 'Email'}
                </label>
                <input
                  type="email"
                  value={editUser.email}
                  onChange={e =>
                    setEditUser(prev =>
                      prev ? { ...prev, email: e.target.value } : prev
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/70"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 flex items-center gap-1">
                  <LockKeyhole size={11} />
                  {isAr ? 'كلمة المرور' : 'Password'}
                </label>
                <input
                  type="text"
                  value={editUser.password}
                  onChange={e =>
                    setEditUser(prev =>
                      prev ? { ...prev, password: e.target.value } : prev
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/70"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">
                  {isAr ? 'نوع الحساب' : 'Role'}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditUser(prev =>
                        prev ? { ...prev, role: 'user' } : prev
                      )
                    }
                    className={`flex-1 px-2.5 py-1.5 rounded-full border text-[11px] transition-colors ${
                      editUser.role === 'user'
                        ? 'border-sky-500 bg-sky-500/20 text-sky-100'
                        : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-sky-500/60 hover:text-sky-100'
                    }`}
                  >
                    {isAr ? 'مستخدم عادي' : 'User'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditUser(prev =>
                        prev ? { ...prev, role: 'admin' } : prev
                      )
                    }
                    className={`flex-1 px-2.5 py-1.5 rounded-full border text-[11px] transition-colors ${
                      editUser.role === 'admin'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-100'
                        : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-amber-500/60 hover:text-amber-100'
                    }`}
                  >
                    {isAr ? 'أدمن' : 'Admin'}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900 text-[11px] text-slate-200 hover:bg-slate-800"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveEditUser}
                className="px-3 py-1.5 rounded-full bg-sky-500 text-[11px] font-semibold text-slate-950 hover:bg-sky-400"
              >
                {isAr ? 'حفظ التعديلات' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
