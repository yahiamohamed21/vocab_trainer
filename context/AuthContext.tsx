'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { AdminUser } from '@/lib/types';
import { loadUsers, saveUsers } from '@/lib/storage';
import { LANGUAGES } from '@/lib/constants';

type AuthContextValue = {
  currentUser: AdminUser | null;
  loading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ ok: true; user: AdminUser } | { ok: false; error: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const CURRENT_USER_KEY = 'vt_currentUserId';

function createSeedAdmin(): AdminUser {
  return {
    id: 'seed-admin-1',
    name: 'Super Admin',
    email: 'admin@example.com',
    password: 'admin123',
    createdAt: new Date().toISOString(),
    role: 'admin',
    languages: LANGUAGES.map(l => l.id),
  };
}

function createSeedUser(): AdminUser {
  return {
    id: 'seed-user-1',
    name: 'Demo User',
    email: 'user@example.com',
    password: 'user123',
    createdAt: new Date().toISOString(),
    role: 'user',
    languages: LANGUAGES.map(l => l.id),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      let users = loadUsers();

      // تأكيد وجود الأدمن واليوزر الافتراضيين دائمًا بناءً على الإيميل
      const hasSeedAdmin = users.some(
        u => u.email.toLowerCase() === 'admin@example.com',
      );
      const hasSeedUser = users.some(
        u => u.email.toLowerCase() === 'user@example.com',
      );

      const newUsers: AdminUser[] = [...users];
      if (!hasSeedAdmin) {
        newUsers.push(createSeedAdmin());
      }
      if (!hasSeedUser) {
        newUsers.push(createSeedUser());
      }

      if (!hasSeedAdmin || !hasSeedUser) {
        saveUsers(newUsers);
        users = newUsers;
      }

      const storedId =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(CURRENT_USER_KEY)
          : null;

      if (!storedId) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      const user = users.find(u => u.id === storedId) || null;
      setCurrentUser(user || null);
    } catch {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    let users = loadUsers();

    // نحاول نلاقي اليوزر بشكل عادي
    let user =
      users.find(
        u =>
          u.email.toLowerCase() === trimmedEmail &&
          u.password === trimmedPassword,
      ) || null;

    // باكدور آمن في الديف: لو دخل الأدمن الافتراضي وما اتلاقاش في التخزين → نعيد إنشاءه
    if (!user &&
      trimmedEmail === 'admin@example.com' &&
      trimmedPassword === 'admin123'
    ) {
      const existingAdmin = users.find(
        u => u.email.toLowerCase() === 'admin@example.com',
      );

      if (existingAdmin) {
        user = existingAdmin;
      } else {
        const seedAdmin = createSeedAdmin();
        users = [...users, seedAdmin];
        saveUsers(users);
        user = seedAdmin;
      }
    }

    if (!user) {
      return { ok: false as const, error: 'INVALID_CREDENTIALS' };
    }

    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CURRENT_USER_KEY, user.id);
    }

    return { ok: true as const, user };
  }

  function logout() {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CURRENT_USER_KEY);
    }
  }

  const value: AuthContextValue = {
    currentUser,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
