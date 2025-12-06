'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { AdminUser, InviteCode } from '@/lib/types';
import {
  loadUsers,
  saveUsers,
  safeGetItem,
  safeSetItem,
  loadInviteCodes,
  saveInviteCodes,
} from '@/lib/storage';

interface AuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; user?: AdminUser; error?: string }>;
  signup: (
    name: string,
    email: string,
    password: string,
    inviteCode: string
  ) => Promise<{ ok: boolean; user?: AdminUser; error?: string }>;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY_SESSION = 'vocab_trainer_session_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // ================================
  //   LOAD USER SESSION ON START
  // ================================
  useEffect(() => {
    const raw = safeGetItem(STORAGE_KEY_SESSION);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AdminUser;
        setUser(parsed);
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  // ================================
  //   LOGIN FUNCTION
  // ================================
  async function login(email: string, password: string) {
    const users = loadUsers();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = password.trim();

    const found = users.find(
      (u) => u.email.toLowerCase() === trimmedEmail && u.password === trimmedPass
    );

    if (!found) {
      return {
        ok: false,
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      };
    }

    // حفظ الجلسة
    safeSetItem(STORAGE_KEY_SESSION, JSON.stringify(found));
    setUser(found);

    return { ok: true, user: found };
  }

  // ================================
  //   SIGNUP FUNCTION (WITH INVITE)
  // ================================
  async function signup(
    name: string,
    email: string,
    password: string,
    inviteCode: string
  ) {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = password.trim();
    const trimmedCode = inviteCode.trim();

    // تحميل المستخدمين الحاليين
    const users = loadUsers();

    // التحقق من أن الإيميل غير مستخدم من قبل
    const emailExists = users.some(
      (u) => u.email.toLowerCase() === trimmedEmail
    );
    if (emailExists) {
      return {
        ok: false,
        error: 'هذا البريد الإلكتروني مسجل بالفعل',
      };
      }

    // تحميل أكواد الدعوة
    const inviteCodes = loadInviteCodes();

    // البحث عن كود الدعوة
    const invite = inviteCodes.find(
      (c) => c.code.trim().toLowerCase() === trimmedCode.toLowerCase()
    );

    if (!invite) {
      return {
        ok: false,
        error: 'كود الدعوة غير صحيح، يرجى مراجعة الأدمن',
      };
    }

    if (invite.used) {
      return {
        ok: false,
        error: 'هذا الكود تم استخدامه من قبل، يرجى مراجعة الأدمن',
      };
    }

    // إنشاء المستخدم الجديد، اللغات تأتي من كود الدعوة
    const now = new Date().toISOString();
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : String(Date.now());

    const newUser: AdminUser = {
      id,
      name: trimmedName,
      email: trimmedEmail,
      password: trimmedPass,
      createdAt: now,
      languages: invite.languages ?? [],
      role: 'user',
    };

    // حفظ المستخدمين
    const updatedUsers = [...users, newUser];
    saveUsers(updatedUsers);

    // تحديث حالة كود الدعوة
    const updatedInviteCodes: InviteCode[] = inviteCodes.map((c) =>
      c.code === invite.code
        ? {
            ...c,
            used: true,
            usedBy: trimmedEmail,
          }
        : c
    );
    saveInviteCodes(updatedInviteCodes);

    // بدء جلسة للمستخدم الجديد مباشرة
    safeSetItem(STORAGE_KEY_SESSION, JSON.stringify(newUser));
    setUser(newUser);

    return { ok: true, user: newUser };
  }

  // ================================
  //   LOGOUT FUNCTION
  // ================================
  function logout() {
    safeSetItem(STORAGE_KEY_SESSION, '');
    setUser(null);
  }

  // ================================
  //   REFRESH SESSION FROM STORAGE
  // ================================
  function refreshUser() {
    const raw = safeGetItem(STORAGE_KEY_SESSION);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AdminUser;
        setUser(parsed);
      } catch {
        setUser(null);
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ================================
//   HOOK
// ================================
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
