// app/admin/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
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
import type { LanguageId } from '@/lib/types';
import { useUiSettings } from '@/context/UiSettingsContext';

const API_BASE_URL = 'http://vocabtrainerapi.runasp.net';
const SESSION_STORAGE_KEY = 'vocab_trainer_session_user';

const swalDarkBase = {
  background: '#020617',
  color: '#e2e8f0',
  confirmButtonColor: '#0ea5e9',
  cancelButtonColor: '#64748b',
};

const swalLightBase = {
  background: '#ffffff',
  color: '#020617',
  confirmButtonColor: '#0ea5e9',
  cancelButtonColor: '#64748b',
};

const CODE_TYPE_INVITE = 'InviteAccount' as const;
const CODE_TYPE_ADD_LANGUAGE = 'AddLanguage' as const;

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  isGuest: boolean;
  emailConfirmed?: boolean;
  languages: LanguageId[];
  currentLanguageId?: string | null;
  createdAt?: string;
};

type EditUserState = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  newPassword: string;
} | null;

type AdminLanguage = LanguageConfig & {
  isActive?: boolean;
  nameEn?: string;
};

type AdminCode = {
  id: string;
  code: string;
  type?: string;                 // "InviteAccount" | "AddLanguage"
  targetRole?: string;           // "Admin" | "User"
  languageId?: string | null;
  languages?: string[];
  used?: boolean;
  disabled?: boolean;
  isActive?: boolean;
  remainingUses?: number;
  expiresAt?: string | null;
  usedBy?: string | null;        // UI-only
  createdAt?: string;
};

// =============== Auth helpers ===============

function getAccessTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    if (parsed && typeof parsed === 'object') {
      if (parsed.accessToken) return parsed.accessToken as string;
      if (parsed.token) return parsed.token as string;
      if (parsed.jwt) return parsed.jwt as string;
    }
  } catch {
    return null;
  }
  return null;
}

interface FetchResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  errorMessage?: string;
}

async function authFetchJson<T = any>(
  path: string,
  body: unknown,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'POST',
): Promise<FetchResult<T>> {
  const token = getAccessTokenFromStorage();

  if (!token) {
    return {
      ok: false,
      status: 401,
      errorMessage: 'لا يوجد رمز دخول',
    };
  }

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };

    if (method !== 'GET') {
      (options as any).body = JSON.stringify(body ?? {});
    }

    const res = await fetch(`${API_BASE_URL}${path}`, options);

    const status = res.status;
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    const payload = json?.data ?? json ?? null;

    if (!res.ok) {
      return {
        ok: false,
        status,
        errorMessage:
          json?.message ||
          json?.error ||
          'حدث خطأ أثناء الاتصال بالخادم.',
      };
    }

    return { ok: true, status, data: payload as T };
  } catch {
    return {
      ok: false,
      status: 0,
      errorMessage:
        'تعذر الاتصال بالخادم. تأكد من الاتصال بالإنترنت.',
    };
  }
}

// =============== Mappers ===============

function mapBackendUser(u: any): AdminUserRow | null {
  if (!u || typeof u !== 'object') return null;

  const id = u.id || u.userId || u.guid;
  const email = u.email || u.username;
  const name = u.name || u.fullName || email || 'Unknown';

  if (!id || !email) return null;

  const rawRole = (u.role || 'User').toString().toLowerCase();
  const role: 'admin' | 'user' = rawRole.includes('admin') ? 'admin' : 'user';

  const allowedLanguages: string[] =
    u.allowedLanguages && Array.isArray(u.allowedLanguages)
      ? u.allowedLanguages
      : [];

  const createdAt =
    u.createdAt || u.registeredAt || u.signupDate || null;

  return {
    id: String(id),
    name: String(name),
    email: String(email),
    role,
    isGuest: !!u.isGuest,
    emailConfirmed: u.emailConfirmed ?? undefined,
    languages: allowedLanguages as LanguageId[],
    currentLanguageId: u.currentLanguageId ?? null,
    createdAt: createdAt ? String(createdAt) : undefined,
  };
}

function mapBackendLanguage(item: any): AdminLanguage | null {
  if (!item || typeof item !== 'object') return null;

  const id =
    item.id || item.languageId || item.code || item.key || null;
  if (!id) return null;

  const nameEn = item.nameEn || item.label || item.name || String(id).toUpperCase();
  const nativeLabel =
    item.nativeLabel || item.displayName || item.localName || nameEn;
  const ttsCode =
    item.ttsCode || item.speechCode || item.voiceCode || '';

  const isActive =
    typeof item.isActive === 'boolean'
      ? item.isActive
      : typeof item.active === 'boolean'
      ? item.active
      : typeof item.enabled === 'boolean'
      ? item.enabled
      : true;

  return {
    id: String(id),
    label: nameEn,
    nativeLabel: nativeLabel,
    ttsCode: ttsCode || String(id),
    isActive,
    nameEn,
  };
}

function mapBackendCode(item: any): AdminCode | null {
  if (!item || typeof item !== 'object') return null;

  const id = item.id || item.codeId || item.guid;
  const code = item.code || item.value || item.token;
  if (!id || !code) return null;

  const createdAt =
    item.createdAt || item.generatedAt || item.issuedAt || null;

  const remainingUses =
    typeof item.remainingUses === 'number'
      ? item.remainingUses
      : typeof item.RemainingUses === 'number'
      ? item.RemainingUses
      : undefined;

  const isActive =
    typeof item.isActive === 'boolean'
      ? item.isActive
      : typeof item.IsActive === 'boolean'
      ? item.IsActive
      : true;

  const used =
    typeof item.used === 'boolean'
      ? item.used
      : typeof item.isUsed === 'boolean'
      ? item.isUsed
      : typeof remainingUses === 'number'
      ? remainingUses <= 0
      : false;

  const disabled =
    typeof item.disabled === 'boolean'
      ? item.disabled
      : !isActive;

  const languages = Array.isArray(item.languages)
    ? item.languages.map((x: any) => String(x))
    : Array.isArray(item.Languages)
    ? item.Languages.map((x: any) => String(x))
    : [];

  const type = item.type ?? item.Type ?? undefined;
  const targetRole = item.targetRole ?? item.TargetRole ?? undefined;
  const expiresAt = item.expiresAt ?? item.ExpiresAt ?? item.expireAt ?? null;

  return {
    id: String(id),
    code: String(code),
    type: type ? String(type) : undefined,
    targetRole: targetRole ? String(targetRole) : undefined,
    languages,
    languageId: item.languageId ?? (languages[0] ?? null),
    used,
    disabled,
    isActive: !disabled,
    remainingUses,
    expiresAt: expiresAt ? String(expiresAt) : null,
    usedBy: item.usedBy ?? item.owner ?? null,
    createdAt: createdAt ? String(createdAt) : undefined,
  };
}

// =============== Component ===============

export default function AdminPage() {
  const [activeTab, setActiveTab] =
    useState<'users' | 'invites' | 'languages'>('users');

  // users
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  // edit user
  const [editUser, setEditUser] = useState<EditUserState>(null);

  // languages
  const [appLanguages, setAppLanguages] = useState<AdminLanguage[]>([]);
  const [languagesLoading, setLanguagesLoading] = useState(false);
  const [languagesError, setLanguagesError] = useState<string | null>(null);
  const [newLanguageNameEn, setNewLanguageNameEn] = useState('');

  // invite / language codes
  const [inviteCodes, setInviteCodes] = useState<AdminCode[]>([]);
  const [languageCodes, setLanguageCodes] = useState<AdminCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codesError, setCodesError] = useState<string | null>(null);

  // إنشاء أكواد
  const [inviteCount, setInviteCount] = useState(1);
  const [langCodeCount, setLangCodeCount] = useState(1);
  const [langCodeSelectedIds, setLangCodeSelectedIds] = useState<string[]>([]);
  const [inviteLangSelectedIds, setInviteLangSelectedIds] = useState<string[]>([]);
  const [inviteTargetRole, setInviteTargetRole] =
    useState<'User' | 'Admin'>('User');

  const { uiLang, theme } = useUiSettings();
  const isAr = uiLang === 'ar';
  const isDark = theme === 'dark';
  const isRtl = isAr;
  const swalBase = isDark ? swalDarkBase : swalLightBase;

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const totalUsers = users.length;
  const totalAdmins = useMemo(
    () => users.filter(u => u.role === 'admin').length,
    [users],
  );
  const totalNormalUsers = totalUsers - totalAdmins;

  function formatTargetRole(value?: string) {
    if (!value) return isAr ? 'غير محدد' : 'Not set';
    const lower = value.toString().toLowerCase();
    if (lower.includes('admin')) return isAr ? 'أدمن' : 'Admin';
    if (lower.includes('user') || lower === '0')
      return isAr ? 'مستخدم' : 'User';
    return value;
  }

  // ========== Route Guard ==========
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

  // ========== Load initial data ==========
  useEffect(() => {
    if (!user || user.role !== 'admin') return;

    void reloadUsers();
    void reloadLanguages();
    void reloadCodes();
  }, [user]);

  // ========== Loaders / Reloaders ==========

  async function reloadUsers() {
    setUsersLoading(true);
    setUsersError(null);

    const res = await authFetchJson<any>('/api/admin/users/list', {}, 'POST');

    setUsersLoading(false);

    if (!res.ok || !res.data) {
      setUsersError(
        res.errorMessage ||
          (isAr
            ? 'تعذر تحميل المستخدمين من الخادم.'
            : 'Could not load users from server.'),
      );
      return;
    }

    const payload: any = res.data;
    let list: any[] = [];

    if (Array.isArray(payload)) {
      list = payload;
    } else if (Array.isArray(payload.users)) {
      list = payload.users;
    } else if (Array.isArray(payload.items)) {
      list = payload.items;
    }

    const mapped = list
      .map(mapBackendUser)
      .filter((u): u is AdminUserRow => !!u);

    setUsers(mapped);
  }

  async function reloadLanguages() {
    setLanguagesLoading(true);
    setLanguagesError(null);

    const res = await authFetchJson<any>(
      '/api/admin/languages/list',
      {},
      'POST',
    );

    setLanguagesLoading(false);

    if (!res.ok || !res.data) {
      setLanguagesError(
        res.errorMessage ||
          (isAr
            ? 'تعذر تحميل اللغات من الخادم.'
            : 'Could not load languages from server.'),
      );
      return;
    }

    const payload: any = res.data;
    let list: any[] = [];

    if (Array.isArray(payload)) {
      list = payload;
    } else if (Array.isArray(payload.languages)) {
      list = payload.languages;
    } else if (Array.isArray(payload.items)) {
      list = payload.items;
    }

    const mapped = list
      .map(mapBackendLanguage)
      .filter((l): l is AdminLanguage => !!l);
    setAppLanguages(mapped);
  }

  async function reloadCodes() {
    setCodesLoading(true);
    setCodesError(null);

    try {
      const res = await authFetchJson<any>(
        '/api/admin/codes/list-grouped',
        null,
        'GET',
      );

      if (!res.ok || !res.data) {
        throw new Error(
          res.errorMessage ||
            (isAr ? 'تعذر تحميل الأكواد.' : 'Could not load codes.'),
        );
      }

      const payload: any = res.data;

      // Backend: { groups: [ { type, codes } ] }
      if (payload && Array.isArray(payload.groups)) {
        const allCodes: AdminCode[] = payload.groups
          .flatMap((g: any) => Array.isArray(g.codes) ? g.codes : [])
          .map(mapBackendCode)
          .filter((c: any) => !!c);

        const invites = allCodes.filter(c => c.type === CODE_TYPE_INVITE);
        const langs = allCodes.filter(c => c.type === CODE_TYPE_ADD_LANGUAGE);

        setInviteCodes(invites);
        setLanguageCodes(langs);
        setCodesLoading(false);
        return;
      }

      // fallback
      let list: any[] = [];
      if (Array.isArray(payload)) {
        list = payload;
      } else if (Array.isArray(payload.codes)) {
        list = payload.codes;
      } else if (Array.isArray(payload.items)) {
        list = payload.items;
      }

      const mappedAll = list
        .map(mapBackendCode)
        .filter((c): c is AdminCode => !!c);

      const invites = mappedAll.filter(c => c.type === CODE_TYPE_INVITE);
      const langs = mappedAll.filter(c => c.type === CODE_TYPE_ADD_LANGUAGE);

      setInviteCodes(invites);
      setLanguageCodes(langs);
      setCodesLoading(false);
    } catch (err: any) {
      setCodesLoading(false);
      setCodesError(
        err?.message ||
          (isAr
            ? 'تعذر تحميل الأكواد من الخادم.'
            : 'Could not load codes from server.'),
      );
    }
  }

  // ========== Users: edit / delete / toggle lang / role ==========

  function openEditUserRow(u: AdminUserRow) {
    setEditUser({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      newPassword: '',
    });
  }

  async function handleSaveEditUser() {
    if (!editUser) return;

    const trimmedName = editUser.name.trim();
    const trimmedEmail = editUser.email.trim().toLowerCase();
    const newPassword = editUser.newPassword.trim();

    if (!trimmedName || !trimmedEmail) {
      await Swal.fire({
        ...swalBase,
        icon: 'warning',
        title: isAr ? 'حقول مطلوبة' : 'Missing fields',
        text: isAr
          ? 'الاسم والبريد الإلكتروني مطلوبان.'
          : 'Name and email are required.',
      });
      return;
    }

    const updateRes = await authFetchJson<any>(
      '/api/admin/users/update',
      {
        id: editUser.id,
        data: {
          name: trimmedName,
          email: trimmedEmail,
          role: editUser.role === 'admin' ? 'Admin' : 'User',
        },
      },
      'PATCH',
    );

    if (!updateRes.ok) {
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: isAr ? 'لم يتم حفظ التعديلات' : 'Could not save changes',
        text:
          updateRes.errorMessage ||
          (isAr
            ? 'حدث خطأ أثناء حفظ بيانات المستخدم.'
            : 'An error occurred while saving user data.'),
      });
      return;
    }

    if (newPassword) {
      const pwdRes = await authFetchJson<any>(
        '/api/admin/users/reset-password',
        {
          id: editUser.id,
          newPassword,
        },
        'PATCH',
      );

      if (!pwdRes.ok) {
        await Swal.fire({
          ...swalBase,
          icon: 'error',
          title: isAr ? 'لم يتم تغيير كلمة المرور' : 'Password not changed',
          text:
            pwdRes.errorMessage ||
            (isAr
              ? 'تم حفظ البيانات لكن لم يتم تغيير كلمة المرور.'
              : 'User updated but password could not be changed.'),
        });
      }
    }

    setUsers(prev =>
      prev.map(u =>
        u.id === editUser.id
          ? {
              ...u,
              name: trimmedName,
              email: trimmedEmail,
              role: editUser.role,
            }
          : u,
      ),
    );

    setEditUser(null);

    await Swal.fire({
      ...swalBase,
      icon: 'success',
      title: isAr ? 'تم الحفظ' : 'Saved',
      timer: 1000,
      showConfirmButton: false,
    });
  }

  async function handleChangeUserRole(userId: string, role: 'admin' | 'user') {
    const res = await authFetchJson<any>(
      '/api/admin/users/update',
      {
        id: userId,
        data: {
          role: role === 'admin' ? 'Admin' : 'User',
        },
      },
      'PATCH',
    );

    if (!res.ok) {
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: isAr ? 'لم يتم تغيير الصلاحية' : 'Role not changed',
        text:
          res.errorMessage ||
          (isAr
            ? 'حدث خطأ أثناء تحديث صلاحيات المستخدم.'
            : 'An error occurred while updating the user role.'),
      });
      return;
    }

    setUsers(prev =>
      prev.map(u =>
        u.id === userId ? { ...u, role } : u,
      ),
    );
  }

  async function deleteUser(id: string) {
    const result = await Swal.fire({
      ...swalBase,
      icon: 'warning',
      title: isAr ? 'حذف المستخدم؟' : 'Delete user?',
      showCancelButton: true,
      confirmButtonText: isAr ? 'نعم، حذف' : 'Yes, delete',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
    });

    if (!result.isConfirmed) return;

    const res = await authFetchJson<any>(
      '/api/admin/users/delete',
      { id },
      'DELETE',
    );

    if (!res.ok) {
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: isAr ? 'لم يتم حذف المستخدم' : 'Could not delete user',
        text:
          res.errorMessage ||
          (isAr
            ? 'حدث خطأ أثناء حذف المستخدم.'
            : 'An error occurred while deleting user.'),
      });
      return;
    }

    setUsers(prev => prev.filter(u => u.id !== id));

    await Swal.fire({
      ...swalBase,
      icon: 'success',
      title: isAr ? 'تم الحذف' : 'Deleted',
      timer: 900,
      showConfirmButton: false,
    });
  }

  async function toggleUserLang(userRow: AdminUserRow, langId: LanguageId) {
    const current = userRow.languages ?? [];
    const updated = current.includes(langId)
      ? current.filter(l => l !== langId)
      : [...current, langId];

    const res = await authFetchJson<any>(
      '/api/admin/users/update',
      {
        id: userRow.id,
        data: {
          allowedLanguages: updated,
        },
      },
      'PATCH',
    );

    if (!res.ok) {
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: isAr ? 'لم يتم تحديث اللغات' : 'Could not update languages',
        text:
          res.errorMessage ||
          (isAr
            ? 'حدث خطأ أثناء تحديث اللغات المسموح بها لهذا المستخدم.'
            : 'An error occurred while updating allowed languages.'),
      });
      return;
    }

    setUsers(prev =>
      prev.map(u =>
        u.id === userRow.id ? { ...u, languages: updated } : u,
      ),
    );
  }

  // ========== Invite / Language Codes ==========

  async function createInviteCodesHandler() {
    const count = Number(inviteCount) || 0;
    if (count <= 0) {
      await Swal.fire({
        ...swalBase,
        icon: 'warning',
        title: isAr ? 'عدد غير صالح' : 'Invalid count',
        text: isAr
          ? 'أدخل عددًا أكبر من صفر.'
          : 'Please enter a count greater than zero.',
      });
      return;
    }

    const languages =
      inviteLangSelectedIds.length > 0
        ? inviteLangSelectedIds
        : appLanguages.map(l => l.id);

    const body = {
      count,
      languages,
      targetRole: inviteTargetRole, // "User" or "Admin"
    };

    const res = await authFetchJson<any>(
      '/api/admin/codes/invite',
      body,
      'POST',
    );

    if (!res.ok) {
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: isAr ? 'لم يتم إنشاء الأكواد' : 'Could not generate codes',
        text:
          res.errorMessage ||
          (isAr
            ? 'حدث خطأ أثناء الاتصال بالخادم.'
            : 'An error occurred while contacting the server.'),
      });
      return;
    }

    await reloadCodes();

    await Swal.fire({
      ...swalBase,
      icon: 'success',
      title: isAr ? 'تم إنشاء أكواد الدعوة' : 'Invite codes created',
      text: isAr
        ? 'تم إنشاء الأكواد بنجاح. يمكنك نسخها من القائمة بالأسفل.'
        : 'Codes were generated successfully. You can copy them from the list below.',
    });
  }

  async function createLanguageCodesHandler() {
    const count = Number(langCodeCount) || 0;

    if (langCodeSelectedIds.length === 0) {
      await Swal.fire({
        ...swalBase,
        icon: 'warning',
        title: isAr ? 'اختر لغة واحدة على الأقل' : 'Select at least one language',
        text: isAr
          ? 'يجب اختيار لغة أو أكثر لإنشاء أكواد لها.'
          : 'You must select at least one language to generate codes for.',
      });
      return;
    }

    if (count <= 0) {
      await Swal.fire({
        ...swalBase,
        icon: 'warning',
        title: isAr ? 'عدد غير صالح' : 'Invalid count',
        text: isAr
          ? 'أدخل عددًا أكبر من صفر.'
          : 'Please enter a count greater than zero.',
      });
      return;
    }

    const body = {
      languages: langCodeSelectedIds,
      count,
    };

    const res = await authFetchJson<any>(
      '/api/admin/codes/languages',
      body,
      'POST',
    );

    if (!res.ok) {
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: isAr ? 'لم يتم إنشاء الأكواد' : 'Could not generate codes',
        text:
          res.errorMessage ||
          (isAr
            ? 'حدث خطأ أثناء الاتصال بالخادم.'
            : 'An error occurred while contacting the server.'),
      });
      return;
    }

    await reloadCodes();

    await Swal.fire({
      ...swalBase,
      icon: 'success',
      title: isAr ? 'تم إنشاء أكواد اللغة' : 'Language codes created',
      text: isAr
        ? 'تم إنشاء الأكواد بنجاح. يمكنك نسخها من القائمة بالأسفل.'
        : 'Codes were generated successfully. You can copy them from the list below.',
    });
  }

  async function disableCodeHandler(code: AdminCode) {
    const resConfirm = await Swal.fire({
      ...swalBase,
      icon: 'warning',
      title: isAr ? 'تعطيل الكود؟' : 'Disable code?',
      text: isAr
        ? `سيتم تعطيل الكود ${code.code} ولن يمكن استخدامه بعد الآن.`
        : `This code ${code.code} will be disabled and can no longer be used.`,
      showCancelButton: true,
      confirmButtonText: isAr ? 'تعطيل' : 'Disable',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
    });

    if (!resConfirm.isConfirmed) return;

    const res = await authFetchJson<any>(
      '/api/admin/codes/disable',
      { id: code.id },
      'PATCH',
    );

    if (!res.ok) {
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: isAr ? 'لم يتم تعطيل الكود' : 'Could not disable code',
        text:
          res.errorMessage ||
          (isAr
            ? 'حدث خطأ أثناء تعطيل الكود.'
            : 'An error occurred while disabling the code.'),
      });
      return;
    }

    await reloadCodes();

    await Swal.fire({
      ...swalBase,
      icon: 'success',
      title: isAr ? 'تم تعطيل الكود' : 'Code disabled',
      timer: 1000,
      showConfirmButton: false,
    });
  }

  async function deleteCodeHandler(code: AdminCode) {
    const resConfirm = await Swal.fire({
      ...swalBase,
      icon: 'warning',
      title: isAr ? 'حذف نهائي للكود؟' : 'Delete code permanently?',
      text: isAr
        ? `سيتم حذف الكود ${code.code} نهائياً من النظام ولا يمكن استرجاعه.`
        : `This code ${code.code} will be permanently deleted and cannot be recovered.`,
      showCancelButton: true,
      confirmButtonText: isAr ? 'نعم، حذف نهائي' : 'Yes, delete permanently',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
      confirmButtonColor: '#ef4444',
    });

    if (!resConfirm.isConfirmed) return;

    const res = await authFetchJson<any>(
      '/api/admin/codes/delete',
      { id: code.id },
      'DELETE',
    );

    if (!res.ok) {
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: isAr ? 'لم يتم حذف الكود' : 'Could not delete code',
        text:
          res.errorMessage ||
          (isAr
            ? 'حدث خطأ أثناء حذف الكود.'
            : 'An error occurred while deleting the code.'),
      });
      return;
    }

    await reloadCodes();

    await Swal.fire({
      ...swalBase,
      icon: 'success',
      title: isAr ? 'تم حذف الكود نهائياً' : 'Code deleted permanently',
      timer: 1000,
      showConfirmButton: false,
    });
  }

  // ========== Languages: add / delete / toggle ==========

  async function handleAddLanguage() {
    const nameEn = newLanguageNameEn.trim();
    if (!nameEn) {
      await Swal.fire({
        ...swalBase,
        icon: 'warning',
        title: isAr ? 'اكمل الحقل' : 'Fill the field',
        text: isAr
          ? 'اسم اللغة بالإنجليزية مطلوب.'
          : 'English name of the language is required.',
      });
      return;
    }

    const res = await authFetchJson<any>(
      '/api/admin/languages/add-language',
      {
        nameEn,
        isActive: true,
      },
      'POST',
    );

    if (!res.ok) {
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: isAr ? 'لم تتم إضافة اللغة' : 'Could not add language',
        text:
          res.errorMessage ||
          (isAr
            ? 'حدث خطأ أثناء إضافة اللغة.'
            : 'An error occurred while adding the language.'),
      });
      return;
    }

    setNewLanguageNameEn('');
    await reloadLanguages();

    await Swal.fire({
      ...swalBase,
      icon: 'success',
      title: isAr ? 'تمت إضافة اللغة' : 'Language added',
      timer: 900,
      showConfirmButton: false,
    });
  }

  async function toggleLanguageHandler(lang: AdminLanguage) {
    const newActive = !lang.isActive;

    const resConfirm = await Swal.fire({
      ...swalBase,
      icon: 'warning',
      title: newActive
        ? (isAr ? 'تفعيل اللغة؟' : 'Enable language?')
        : (isAr ? 'تعطيل اللغة؟' : 'Disable language?'),
      text: isAr
        ? `سيتم ${newActive ? 'تفعيل' : 'تعطيل'} اللغة "${lang.nativeLabel}".`
        : `Language "${lang.nativeLabel}" will be ${newActive ? 'enabled' : 'disabled'}.`,
      showCancelButton: true,
      confirmButtonText: newActive ? (isAr ? 'تفعيل' : 'Enable') : (isAr ? 'تعطيل' : 'Disable'),
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
    });

    if (!resConfirm.isConfirmed) return;

    const res = await authFetchJson<any>(
      '/api/admin/languages/toggle',
      { id: lang.id, active: newActive },
      'PATCH',
    );

    if (!res.ok) {
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: isAr ? 'لم يتم تحديث حالة اللغة' : 'Could not update language',
        text:
          res.errorMessage ||
          (isAr
            ? 'حدث خطأ أثناء تفعيل/تعطيل اللغة.'
            : 'An error occurred while toggling language status.'),
      });
      return;
    }

    setAppLanguages(prev =>
      prev.map(l =>
        l.id === lang.id ? { ...l, isActive: newActive } : l,
      ),
    );

    await Swal.fire({
      ...swalBase,
      icon: 'success',
      title: newActive
        ? (isAr ? 'تم تفعيل اللغة' : 'Language enabled')
        : (isAr ? 'تم تعطيل اللغة' : 'Language disabled'),
      timer: 900,
      showConfirmButton: false,
    });
  }

  async function handleDeleteLanguage(lang: AdminLanguage) {
    const resConfirm = await Swal.fire({
      ...swalBase,
      icon: 'warning',
      title: isAr ? 'حذف اللغة؟' : 'Delete language?',
      text: isAr
        ? `سيتم حذف اللغة "${lang.nativeLabel}" (${lang.id}) نهائياً من النظام.`
        : `Language "${lang.nativeLabel}" (${lang.id}) will be permanently deleted from the system.`,
      showCancelButton: true,
      confirmButtonText: isAr ? 'نعم، حذف' : 'Yes, delete',
      cancelButtonText: isAr ? 'إلغاء' : 'Cancel',
      confirmButtonColor: '#ef4444',
    });

    if (!resConfirm.isConfirmed) return;

    const res = await authFetchJson<any>(
      '/api/admin/languages/delete',
      { id: lang.id },
      'DELETE',
    );

    if (!res.ok) {
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: isAr ? 'لم يتم حذف اللغة' : 'Could not delete language',
        text:
          res.errorMessage ||
          (isAr
            ? 'حدث خطأ أثناء حذف اللغة.'
            : 'An error occurred while deleting the language.'),
      });
      return;
    }

    setAppLanguages(prev => prev.filter(l => l.id !== lang.id));

    await Swal.fire({
      ...swalBase,
      icon: 'success',
      title: isAr ? 'تم حذف اللغة' : 'Language deleted',
      timer: 900,
      showConfirmButton: false,
    });
  }

  if (authLoading || !user || user.role !== 'admin') {
    return null;
  }

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
                <span>
                  {isAr ? 'لوحة تحكم الحسابات' : 'Accounts Dashboard'}
                </span>
              </h1>
              <p
                className={`
                  text-xs md:text-sm mt-1
                  ${isDark ? 'text-slate-400' : 'text-slate-600'}
                `}
              >
                {isAr
                  ? 'إدارة المستخدمين، الأكواد، واللغات.'
                  : 'Manage users, codes, and languages .'}
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
              {isAr ? 'الأكواد' : 'Codes'}
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
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isAr ? 'جاري التحميل...' : 'Loading...'}
                </p>
              ) : usersError ? (
                <p className={`text-xs ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>
                  {usersError}
                </p>
              ) : users.length === 0 ? (
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isAr ? 'لا يوجد مستخدمون بعد.' : 'No users found yet.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {users.map(row => (
                    <div
                      key={row.id}
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
                            {row.name}
                            <span
                              className={`
                                rounded-full px-2 py-0.5 text-[10px] border
                                ${
                                  row.role === 'admin'
                                    ? isDark
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      : 'bg-amber-50 text-amber-700 border-amber-300'
                                    : isDark
                                    ? 'bg-slate-700/40 text-slate-100 border-slate-500/60'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                }
                              `}
                            >
                              {row.role === 'admin'
                                ? isAr ? 'أدمن' : 'Admin'
                                : isAr ? 'مستخدم' : 'User'}
                            </span>
                            {row.isGuest && (
                              <span
                                className={`
                                  rounded-full px-2 py-0.5 text-[10px]
                                  ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}
                                `}
                              >
                                {isAr ? 'ضيف' : 'Guest'}
                              </span>
                            )}
                          </p>
                          <p className={`text-[11px] flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            <Mail size={11} />
                            <span>{row.email}</span>
                          </p>
                          {row.createdAt && (
                            <p className="text-[10px] text-slate-500">
                              {isAr ? 'تم الإنشاء في: ' : 'Created at: '}
                              {new Date(row.createdAt).toLocaleString()}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-1 md:mt-0">
                          <select
                            value={row.role}
                            onChange={e =>
                              handleChangeUserRole(row.id, e.target.value as 'admin' | 'user')
                            }
                            className={`
                              rounded-full border text-[11px] px-2 py-1
                              ${isDark ? 'border-slate-700 bg-slate-900/80 text-slate-100' : 'border-slate-200 bg-white text-slate-800'}
                            `}
                          >
                            <option value="user">{isAr ? 'مستخدم' : 'User'}</option>
                            <option value="admin">{isAr ? 'أدمن' : 'Admin'}</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => openEditUserRow(row)}
                            className={`
                              inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] transition-colors
                              ${isDark ? 'border-sky-500/60 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20' : 'border-sky-400 bg-sky-50 text-sky-700 hover:bg-sky-100'}
                            `}
                          >
                            <Pencil size={12} />
                            {isAr ? 'تعديل' : 'Edit'}
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteUser(row.id)}
                            className={`
                              inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] transition-colors
                              ${isDark ? 'border-rose-500/60 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20' : 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100'}
                            `}
                          >
                            <Trash2 size={12} />
                            {isAr ? 'حذف' : 'Delete'}
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1">
                        <p className={`text-[11px] mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {isAr ? 'اللغات المسموح بها لهذا المستخدم:' : 'Allowed languages for this user:'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {appLanguages.map(lang => {
                            const active = row.languages.includes(lang.id as LanguageId);
                            return (
                              <button
                                key={lang.id}
                                type="button"
                                onClick={() => toggleUserLang(row, lang.id as LanguageId)}
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

          {/* INVITES / CODES TAB */}
          {activeTab === 'invites' && (
            <>
              {/* Create codes */}
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
                <div className="flex flex-col md:flex-row md:justify-between gap-3 mb-3">
                  <div>
                    <h2 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      <Plus size={16} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                      {isAr ? 'إنشاء أكواد جديدة' : 'Create new codes'}
                    </h2>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {isAr
                        ? 'يمكنك إنشاء أكواد دعوة للتسجيل، أو أكواد لفتح لغة/لغات معيّنة.'
                        : 'You can generate invite codes for sign up, or language codes to unlock specific languages.'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Invite codes */}
                  <div className={`rounded-xl border p-3 text-[11px] ${isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'}`}>
                    <p className={`font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                      {isAr ? 'أكواد دعوة للتسجيل' : 'Invite codes (sign up)'}
                    </p>

                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="number"
                        min={1}
                        value={inviteCount}
                        onChange={e => setInviteCount(Number(e.target.value) || 1)}
                        className={`w-20 rounded-lg border px-2 py-1 text-[11px] ${isDark ? 'border-slate-700 bg-slate-900 text-slate-50' : 'border-slate-200 bg-white text-slate-900'}`}
                      />
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                        {isAr ? 'عدد الأكواد' : 'Number of codes'}
                      </span>
                    </div>

                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
  <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
    {isAr ? 'نوع الحساب:' : 'Target role:'}
  </span>

  <div
    className={`
      inline-flex rounded-full border p-1 gap-1
      ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}
    `}
  >
    <button
      type="button"
      onClick={() => setInviteTargetRole('User')}
      className={`
        px-3 py-1 rounded-full text-[11px] transition-colors
        ${
          inviteTargetRole === 'User'
            ? isDark
              ? 'bg-sky-500/20 text-sky-200 border border-sky-500/40'
              : 'bg-sky-600 text-white border border-sky-500'
            : isDark
            ? 'text-slate-300 hover:text-slate-100'
            : 'text-slate-700 hover:text-slate-900'
        }
      `}
    >
      {isAr ? 'مستخدم' : 'User'}
    </button>

    <button
      type="button"
      onClick={() => setInviteTargetRole('Admin')}
      className={`
        px-3 py-1 rounded-full text-[11px] transition-colors
        ${
          inviteTargetRole === 'Admin'
            ? isDark
              ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
              : 'bg-amber-500 text-white border border-amber-400'
            : isDark
            ? 'text-slate-300 hover:text-slate-100'
            : 'text-slate-700 hover:text-slate-900'
        }
      `}
    >
      {isAr ? 'أدمن' : 'Admin'}
    </button>
  </div>
</div>


                    <div
  className={`
    mb-2 rounded-lg border px-2 py-2 max-h-32 overflow-auto
    ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}
  `}
>
  <p
    className={`
      mb-1 text-[11px] font-semibold
      ${isDark ? 'text-slate-200' : 'text-slate-800'}
    `}
  >
    {isAr
      ? 'اختر اللغات التي يفتحها كود الدعوة:'
      : 'Select languages unlocked by the invite code:'}
  </p>

  {appLanguages.length === 0 ? (
    <p className="text-[11px] text-slate-500">
      {isAr ? 'لا توجد لغات متاحة بعد.' : 'No languages available yet.'}
    </p>
  ) : (
    <div className="flex flex-wrap gap-1.5">
      {appLanguages.map(lang => {
        const active = inviteLangSelectedIds.includes(lang.id);
        return (
          <button
            key={lang.id}
            type="button"
            onClick={() => {
              setInviteLangSelectedIds(prev =>
                prev.includes(lang.id)
                  ? prev.filter(id => id !== lang.id)
                  : [...prev, lang.id],
              );
            }}
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
            {lang.nativeLabel} ({lang.id})
          </button>
        );
      })}
    </div>
  )}
</div>


                    <p className="text-[10px] mb-2 text-slate-500">
                      {isAr
                        ? 'لو لم تختَر أي لغة، سيتم افتراضيًا استخدام كل اللغات المتاحة.'
                        : 'If you select no language, all available languages will be used by default.'}
                    </p>

                    <button
                      type="button"
                      onClick={createInviteCodesHandler}
                      className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${isDark ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
                    >
                      {isAr ? 'إنشاء أكواد دعوة' : 'Generate invite codes'}
                    </button>
                  </div>

                  {/* Language codes */}
                  <div className={`rounded-xl border p-3 text-[11px] ${isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'}`}>
                    <p className={`font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                      {isAr ? 'أكواد لفتح لغات' : 'Language unlock codes'}
                    </p>
                    <div className="flex flex-col gap-2 mb-2">
                     <div
  className={`
    rounded-lg border px-2 py-2 max-h-36 overflow-auto
    ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}
  `}
>
  <p
    className={`
      mb-1 text-[11px] font-semibold
      ${isDark ? 'text-slate-200' : 'text-slate-800'}
    `}
  >
    {isAr ? 'اختر لغة أو أكثر:' : 'Select one or more languages:'}
  </p>

  {appLanguages.length === 0 ? (
    <p className="text-[11px] text-slate-500">
      {isAr ? 'لا توجد لغات مضافة بعد.' : 'No languages available yet.'}
    </p>
  ) : (
    <div className="flex flex-wrap gap-1.5">
      {appLanguages.map(lang => {
        const active = langCodeSelectedIds.includes(lang.id);
        return (
          <button
            key={lang.id}
            type="button"
            onClick={() => {
              setLangCodeSelectedIds(prev =>
                prev.includes(lang.id)
                  ? prev.filter(id => id !== lang.id)
                  : [...prev, lang.id],
              );
            }}
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
            {lang.nativeLabel} ({lang.id})
          </button>
        );
      })}
    </div>
  )}
</div>


                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={langCodeCount}
                          onChange={e => setLangCodeCount(Number(e.target.value) || 1)}
                          className={`w-20 rounded-lg border px-2 py-1 text-[11px] ${isDark ? 'border-slate-700 bg-slate-900 text-slate-50' : 'border-slate-200 bg-white text-slate-900'}`}
                        />
                        <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                          {isAr ? 'عدد الأكواد' : 'Number of codes'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={createLanguageCodesHandler}
                      className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${isDark ? 'bg-indigo-500 text-slate-950 hover:bg-indigo-400' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
                    >
                      {isAr ? 'إنشاء أكواد لغة' : 'Generate language codes'}
                    </button>
                  </div>
                </div>

                <p className="mt-2 text-[10px] text-slate-500">
                  {isAr
                    ? 'هذه العمليات تتم بالكامل على الـ Backend. الأكواد تُخزَّن في قاعدة البيانات ويمكن تعطيلها أو حذفها من القائمة بالأسفل.'
                    : 'These operations are fully handled by the backend. Codes are stored in the database and can be disabled or deleted below.'}
                </p>
              </section>

              {/* List codes */}
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
                <h2 className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  {isAr ? 'الأكواد الموجودة' : 'Existing codes'}
                </h2>

                {codesLoading ? (
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {isAr ? 'جاري تحميل الأكواد...' : 'Loading codes...'}
                  </p>
                ) : codesError ? (
                  <p className={`text-xs ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>
                    {codesError}
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Invite codes list */}
                    <div>
                      <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {isAr ? 'أكواد الدعوة' : 'Invite codes'}
                      </p>
                      {inviteCodes.length === 0 ? (
                        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {isAr ? 'لا توجد أكواد دعوة.' : 'No invite codes.'}
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-auto pr-1">
                          {inviteCodes.map(code => (
                            <div
                              key={code.id}
                              className={`rounded-xl border px-3 py-3 ${isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-50'}`}
                            >
                              <p className={`text-lg font-mono tracking-widest ${isDark ? 'text-sky-300' : 'text-sky-700'}`}>
                                {code.code}
                              </p>

                              {code.targetRole && (
                                <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {isAr ? 'نوع الحساب: ' : 'Target role: '}
                                  <span className="font-medium">
                                    {formatTargetRole(code.targetRole)}
                                  </span>
                                </p>
                              )}

                              {code.languages && code.languages.length > 0 && (
                                <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {isAr ? 'اللغات: ' : 'Languages: '}
                                  {code.languages
                                    .map(id => {
                                      const l = appLanguages.find(al => al.id === id);
                                      return l ? `${l.nativeLabel} (${l.id})` : id;
                                    })
                                    .join(', ')}
                                </p>
                              )}

                              {typeof code.remainingUses === 'number' && (
                                <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {isAr ? 'مرات الاستخدام المتبقية: ' : 'Remaining uses: '}
                                  <span className="font-medium">{code.remainingUses}</span>
                                </p>
                              )}

                              <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                {isAr ? 'الحالة: ' : 'Status: '}
                                {code.disabled
                                  ? isAr ? 'معطّل' : 'Disabled'
                                  : code.used
                                  ? isAr ? 'مستخدم' : 'Used'
                                  : isAr ? 'متاح' : 'Available'}
                              </p>

                              {code.createdAt && (
                                <p className="text-[10px] mt-1 text-slate-500">
                                  {isAr ? 'تاريخ الإنشاء: ' : 'Created at: '}
                                  {new Date(code.createdAt).toLocaleString()}
                                </p>
                              )}

                              {/* ✅ Buttons: Disable + Delete */}
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => disableCodeHandler(code)}
                                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] transition-colors ${
                                        isDark
                                          ? 'border-amber-500/60 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                                          : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                      }`}
                                >
                                  <Trash2 size={12} />
                                  {isAr ? 'تعطيل' : 'Disable'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => deleteCodeHandler(code)}
                                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] transition-colors ${
                                    isDark
                                      ? 'border-red-500/70 bg-red-500/10 text-red-200 hover:bg-red-500/20'
                                      : 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                                  }`}
                                >
                                  <Trash2 size={12} />
                                  {isAr ? 'حذف نهائي' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Language codes list */}
                    <div>
                      <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {isAr ? 'أكواد اللغات' : 'Language codes'}
                      </p>
                      {languageCodes.length === 0 ? (
                        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {isAr ? 'لا توجد أكواد لغات.' : 'No language codes.'}
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-auto pr-1">
                          {languageCodes.map(code => (
                            <div
                              key={code.id}
                              className={`rounded-xl border px-3 py-3 ${isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-50'}`}
                            >
                              <p className={`text-lg font-mono tracking-widest ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                                {code.code}
                              </p>

                              <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                {isAr ? 'اللغات: ' : 'Languages: '}
                                {(() => {
                                  const ids =
                                    code.languages && code.languages.length
                                      ? code.languages
                                      : code.languageId
                                      ? [code.languageId]
                                      : [];

                                  if (!ids.length)
                                    return isAr ? 'غير معروفة' : 'Unknown';

                                  return ids
                                    .map(id => {
                                      const l = appLanguages.find(al => al.id === id);
                                      return l ? `${l.nativeLabel} (${l.id})` : id;
                                    })
                                    .join(', ');
                                })()}
                              </p>

                              {typeof code.remainingUses === 'number' && (
                                <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {isAr ? 'مرات الاستخدام المتبقية: ' : 'Remaining uses: '}
                                  <span className="font-medium">{code.remainingUses}</span>
                                </p>
                              )}

                              <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                {isAr ? 'الحالة: ' : 'Status: '}
                                {code.disabled
                                  ? isAr ? 'معطّل' : 'Disabled'
                                  : code.used
                                  ? isAr ? 'مستخدم' : 'Used'
                                  : isAr ? 'متاح' : 'Available'}
                              </p>

                              {code.createdAt && (
                                <p className="text-[10px] mt-1 text-slate-500">
                                  {isAr ? 'تاريخ الإنشاء: ' : 'Created at: '}
                                  {new Date(code.createdAt).toLocaleString()}
                                </p>
                              )}

                              {/* ✅ Buttons: Disable + Delete */}
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => disableCodeHandler(code)}
                                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] transition-colors ${
                                  isDark
                                    ? 'border-amber-500/60 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                                    : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                }`}

                                >
                                  <Trash2 size={12} />
                                  {isAr ? 'تعطيل' : 'Disable'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => deleteCodeHandler(code)}
                                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] transition-colors ${
                                    isDark
                                      ? 'border-red-500/70 bg-red-500/10 text-red-200 hover:bg-red-500/20'
                                      : 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                                  }`}
                                >
                                  <Trash2 size={12} />
                                  {isAr ? 'حذف نهائي' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
                <h2 className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  <Globe2 size={16} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                  {isAr ? 'اللغات المتاحة في التطبيق' : 'Available app languages'}
                </h2>
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isAr
                    ? 'يمكنك إضافة أو حذف لغات التدريب المستخدمة في التطبيق.'
                    : 'You can add or delete training languages used in the app.'}
                </span>
              </div>

              {/* إضافة لغة جديدة */}
              <div className={`mb-4 rounded-xl border p-3 space-y-2 text-[11px] ${isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'}`}>
                <p className={`font-semibold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                  {isAr ? 'إضافة لغة جديدة' : 'Add new language'}
                </p>
                <div className="grid gap-2 md:grid-cols-[minmax(0,1.8fr)_minmax(0,0.8fr)]">
                  <input
                    value={newLanguageNameEn}
                    onChange={e => setNewLanguageNameEn(e.target.value)}
                    className={`rounded-lg border px-2 py-1 text-[11px] ${isDark ? 'border-slate-700 bg-slate-900 text-slate-50' : 'border-slate-200 bg-white text-slate-900'}`}
                    placeholder={
                      isAr
                        ? 'اسم اللغة بالإنجليزية (مثلاً: Turkish)'
                        : 'Language name in English (e.g. Turkish)'
                    }
                  />
                  <button
                    type="button"
                    onClick={handleAddLanguage}
                    className={`inline-flex items-center justify-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${isDark ? 'bg-indigo-500 text-slate-950 hover:bg-indigo-400' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
                  >
                    {isAr ? 'إضافة اللغة' : 'Add language'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  {isAr
                    ? 'الـ Backend يتولى إنشاء معرّف اللغة وضبط الإعدادات.'
                    : 'The backend creates the language ID and settings.'}
                </p>
              </div>

              {/* قائمة اللغات */}
              {languagesLoading ? (
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isAr ? 'جاري تحميل اللغات...' : 'Loading languages...'}
                </p>
              ) : languagesError ? (
                <p className={`text-xs ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>
                  {languagesError}
                </p>
              ) : appLanguages.length === 0 ? (
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isAr ? 'لا توجد لغات في النظام بعد.' : 'No languages found in the system yet.'}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {appLanguages.map(lang => (
                    <div
                      key={lang.id}
                      className={`rounded-xl border px-3 py-3 flex flex-col justify-between ${
                        isDark
                          ? 'border-slate-800 bg-slate-950/80'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                            {lang.label}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] border ${
                                lang.isActive
                                  ? isDark
                                    ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : isDark
                                  ? 'bg-rose-500/15 text-rose-200 border-rose-500/30'
                                  : 'bg-rose-50 text-rose-700 border-rose-300'
                              }`}
                            >
                              {lang.isActive
                                ? (isAr ? 'مفعّلة' : 'Active')
                                : (isAr ? 'معطّلة' : 'Disabled')}
                            </span>
                          </p>

                          <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            ID:{' '}
                            <span className={isDark ? 'font-mono text-sky-300' : 'font-mono text-sky-700'}>
                              {lang.id}
                            </span>
                          </p>

                          {lang.ttsCode && (
                            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              TTS:{' '}
                              <span className={isDark ? 'font-mono text-emerald-300' : 'font-mono text-emerald-700'}>
                                {lang.ttsCode}
                              </span>
                            </p>
                          )}
                        </div>

                        {/* ✅ Buttons: Toggle + Delete */}
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => toggleLanguageHandler(lang)}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] transition-colors ${
                              lang.isActive
                                ? isDark
                                  ? 'border-amber-500/60 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                                  : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                : isDark
                                ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {lang.isActive
                              ? (isAr ? 'تعطيل' : 'Disable')
                              : (isAr ? 'تفعيل' : 'Enable')}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteLanguage(lang)}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] transition-colors ${
                              isDark
                                ? 'border-rose-500/60 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
                                : 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100'
                            }`}
                          >
                            <Trash2 size={12} />
                            {isAr ? 'حذف' : 'Delete'}
                          </button>
                        </div>
                      </div>

                      <p className="mt-2 text-[10px] text-slate-500">
                        {isAr
                          ? 'يمكنك تعطيل اللغة لمنع استخدامها في الأكواد والتمارين، أو حذفها نهائياً.'
                          : 'You can disable a language to prevent usage, or delete it permanently.'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {editUser && (
        <div className={`fixed inset-0 flex justify-center items-center p-4 z-50 ${isDark ? 'bg-black/60' : 'bg-black/30'}`}>
          <div className={`w-full max-w-md border p-4 rounded-2xl shadow-2xl ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.18)]'}`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {isAr ? 'تعديل بيانات المستخدم' : 'Edit user'}
              </h3>
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className={`transition-colors ${isDark ? 'text-slate-400 hover:text-slate-100' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <input
                value={editUser.name}
                onChange={e =>
                  setEditUser(prev => (prev ? { ...prev, name: e.target.value } : prev))
                }
                className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/70 ${
                  isDark
                    ? 'border-slate-700 bg-slate-900 text-slate-50'
                    : 'border-slate-300 bg-white text-slate-900'
                }`}
                placeholder={isAr ? 'اسم المستخدم' : 'Name'}
              />

              <input
                value={editUser.email}
                onChange={e =>
                  setEditUser(prev => (prev ? { ...prev, email: e.target.value } : prev))
                }
                className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/70 ${
                  isDark
                    ? 'border-slate-700 bg-slate-900 text-slate-50'
                    : 'border-slate-300 bg-white text-slate-900'
                }`}
                placeholder="user@example.com"
              />

              <select
                value={editUser.role}
                onChange={e =>
                  setEditUser(prev =>
                    prev ? { ...prev, role: e.target.value as 'admin' | 'user' } : prev
                  )
                }
                className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/70 ${
                  isDark
                    ? 'border-slate-700 bg-slate-900 text-slate-50'
                    : 'border-slate-300 bg-white text-slate-900'
                }`}
              >
                <option value="user">{isAr ? 'مستخدم' : 'User'}</option>
                <option value="admin">{isAr ? 'أدمن' : 'Admin'}</option>
              </select>

              <input
                value={editUser.newPassword}
                onChange={e =>
                  setEditUser(prev => (prev ? { ...prev, newPassword: e.target.value } : prev))
                }
                className={`w-full rounded-xl border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/70 ${
                  isDark
                    ? 'border-slate-700 bg-slate-900 text-slate-50'
                    : 'border-slate-300 bg-white text-slate-900'
                }`}
                type="password"
                placeholder={isAr ? 'كلمة مرور جديدة (اختياري)' : 'New password (optional)'}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className={`px-3 py-1.5 rounded-full text-[11px] border ${
                  isDark
                    ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveEditUser}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ${
                  isDark
                    ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                    : 'bg-sky-600 text-white hover:bg-sky-500'
                }`}
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
