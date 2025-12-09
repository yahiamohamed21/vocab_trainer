'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { AdminUser } from '@/lib/types';
import { safeGetItem, safeSetItem } from '@/lib/storage';
import {
  configureApiClient,
  setAuthTokens,
  getAuthTokens,
  clearAuthTokens,
  get,
  post,
  ApiError,
  type AuthTokens,
} from '@/lib/api/httpClient';

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
  loginAsGuest: () => Promise<{ ok: boolean; user?: AdminUser; error?: string }>;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY_SESSION = 'vocab_trainer_session_user';

interface StoredSession {
  user: AdminUser;
  accessToken: string | null;
  refreshToken: string | null;
}

/**
 * Map backend user model into existing AdminUser type.
 * Adjust field mapping as needed when you see real /api/account/me responses.
 */
function mapApiUserToAdminUser(apiUser: any): AdminUser {
  const roleRaw = (apiUser?.role ?? apiUser?.userRole ?? 'user')
    .toString()
    .toLowerCase();

  const role: 'admin' | 'user' =
    roleRaw === 'admin' || roleRaw === 'administrator' ? 'admin' : 'user';

  const allowedLangs: string[] =
    apiUser?.allowedLanguages ??
    apiUser?.languages ??
    apiUser?.allowedLanguageIds ??
    [];

  return {
    id: apiUser?.id ?? apiUser?.userId ?? '',
    name: apiUser?.name ?? apiUser?.fullName ?? apiUser?.email ?? 'User',
    email: apiUser?.email ?? '',
    password: '',
    createdAt: apiUser?.createdAt ?? new Date().toISOString(),
    languages: Array.isArray(allowedLangs) ? allowedLangs : [],
    role,
  };
}

function loadStoredSession(): StoredSession | null {
  const raw = safeGetItem(STORAGE_KEY_SESSION);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    // New shape: { user, accessToken, refreshToken }
    if (parsed && typeof parsed === 'object' && 'user' in parsed) {
      return {
        user: parsed.user as AdminUser,
        accessToken:
          typeof parsed.accessToken === 'string' || parsed.accessToken === null
            ? parsed.accessToken
            : null,
        refreshToken:
          typeof parsed.refreshToken === 'string' || parsed.refreshToken === null
            ? parsed.refreshToken
            : null,
      };
    }

    // Backward-compat: previously we might have stored just the user object
    return {
      user: parsed as AdminUser,
      accessToken: null,
      refreshToken: null,
    };
  } catch {
    return null;
  }
}

function saveStoredSession(session: StoredSession | null) {
  if (!session) {
    safeSetItem(STORAGE_KEY_SESSION, '');
    return;
  }
  safeSetItem(STORAGE_KEY_SESSION, JSON.stringify(session));
}

/**
 * Fetch current user from backend using /api/account/me and map to AdminUser.
 * Uses the global httpClient tokens (Authorization is attached automatically).
 */
async function fetchCurrentUserFromApi(): Promise<AdminUser | null> {
  try {
    const apiUser = await get<any>('/api/account/me');
    if (!apiUser) return null;
    return mapApiUserToAdminUser(apiUser);
  } catch (error) {
    console.error('Failed to fetch current user:', error);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  function setSession(
    newUser: AdminUser | null,
    accessToken: string | null,
    refreshToken: string | null,
  ) {
    if (!newUser) {
      saveStoredSession(null);
      setUser(null);
      return;
    }

    const session: StoredSession = {
      user: newUser,
      accessToken,
      refreshToken,
    };

    saveStoredSession(session);
    setUser(newUser);
  }

  useEffect(() => {
    // Configure the shared HTTP client once.
    configureApiClient({
      onUnauthorized: () => {
        // Called when refresh fails or we get a hard 401.
        clearAuthTokens();
        saveStoredSession(null);
        setUser(null);
        if (typeof window !== 'undefined') {
          // Redirect to login; you can also show SweetAlert2 here if desired.
          window.location.href = '/login';
        }
      },
      onTokenUpdate: (tokens: AuthTokens) => {
        // Keep localStorage in sync when refresh succeeds.
        const session = loadStoredSession();
        if (session?.user) {
          saveStoredSession({
            user: session.user,
            accessToken: tokens.accessToken,
            // If you allow missing/empty refreshTokens, normalize to null in storage
            refreshToken: tokens.refreshToken || null,
          });
        }
      },
    });

    (async () => {
      const session = loadStoredSession();

      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }

      // If we have tokens, seed them into the http client.
      if (session.accessToken) {
        const tokens: AuthTokens = {
          accessToken: session.accessToken,
          // httpClient.AuthTokens.refreshToken is a string; use empty string if null.
          refreshToken: session.refreshToken ?? '',
        };
        setAuthTokens(tokens);
      }

      // If there is no accessToken, behave as "local-only" user (no backend).
      if (!session.accessToken) {
        setUser(session.user ?? null);
        setLoading(false);
        return;
      }

      // Try to fetch the current user from backend; refresh will be handled by httpClient if needed.
      const apiUser = await fetchCurrentUserFromApi();
      if (!apiUser) {
        clearAuthTokens();
        saveStoredSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      const effectiveTokens = getAuthTokens();
      setSession(
        apiUser,
        effectiveTokens?.accessToken ?? session.accessToken,
        effectiveTokens?.refreshToken ?? session.refreshToken,
      );
      setLoading(false);
    })();
  }, []);

  async function login(email: string, password: string) {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = password.trim();

    try {
      const res = await post<any>(
        '/api/auth/login',
        {
          email: trimmedEmail,
          password: trimmedPass,
        },
        { auth: false },
      );

      // Flexible extraction of tokens (adjust based on your real API response)
      const accessToken: string | null =
        res?.accessToken ?? res?.token ?? res?.jwt ?? null;
      const refreshToken: string | null =
        res?.refreshToken ?? res?.refresh ?? null;

      if (!accessToken) {
        return {
          ok: false,
          error:
            'تم الاتصال بالخادم لكن لم يتم استلام رمز الدخول. راجع إعدادات الـ API.',
        };
      }

      const tokens: AuthTokens = {
        accessToken,
        refreshToken: refreshToken ?? '',
      };
      setAuthTokens(tokens);

      // Prefer user from login response if present; otherwise fetch via /api/account/me
      const apiUserRaw = res?.user ?? res?.currentUser ?? null;
      const apiUser =
        apiUserRaw != null
          ? mapApiUserToAdminUser(apiUserRaw)
          : await fetchCurrentUserFromApi();

      if (!apiUser) {
        return {
          ok: false,
          error: 'تعذر قراءة بيانات المستخدم من الخادم.',
        };
      }

      const effectiveTokens = getAuthTokens();
      setSession(
        apiUser,
        effectiveTokens?.accessToken ?? accessToken,
        effectiveTokens?.refreshToken ?? refreshToken ?? null,
      );

      return { ok: true, user: apiUser };
    } catch (error) {
      console.error('Login error:', error);

      if (error instanceof ApiError && error.status === 401) {
        return {
          ok: false,
          error: 'بيانات الدخول غير صحيحة',
        };
      }

      return {
        ok: false,
        error: 'حدث خطأ أثناء الاتصال بالخادم',
      };
    }
  }

  async function signup(
    name: string,
    email: string,
    password: string,
    inviteCode: string,
  ) {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = password.trim();
    const trimmedCode = inviteCode.trim();

    try {
      const res = await post<any>(
        '/api/auth/register-with-code',
        {
          name: trimmedName,
          email: trimmedEmail,
          password: trimmedPass,
          code: trimmedCode,
        },
        { auth: false },
      );

      const accessToken: string | null =
        res?.accessToken ?? res?.token ?? res?.jwt ?? null;
      const refreshToken: string | null =
        res?.refreshToken ?? res?.refresh ?? null;

      if (!accessToken) {
        return {
          ok: false,
          error:
            'تم إنشاء الحساب لكن لم يتم استلام رمز الدخول. راجع إعدادات الـ API.',
        };
      }

      const tokens: AuthTokens = {
        accessToken,
        refreshToken: refreshToken ?? '',
      };
      setAuthTokens(tokens);

      const apiUserRaw = res?.user ?? res?.currentUser ?? null;
      const apiUser =
        apiUserRaw != null
          ? mapApiUserToAdminUser(apiUserRaw)
          : await fetchCurrentUserFromApi();

      if (!apiUser) {
        return {
          ok: false,
          error: 'تم إنشاء الحساب لكن تعذر جلب بيانات المستخدم من الخادم.',
        };
      }

      const effectiveTokens = getAuthTokens();
      setSession(
        apiUser,
        effectiveTokens?.accessToken ?? accessToken,
        effectiveTokens?.refreshToken ?? refreshToken ?? null,
      );

      return { ok: true, user: apiUser };
    } catch (error) {
      console.error('Signup error:', error);
      let msg =
        'تعذر إنشاء الحساب. يرجى مراجعة الأدمن أو المحاولة لاحقاً.';

      if (error instanceof ApiError && error.details?.message) {
        msg = error.details.message;
      }

      return {
        ok: false,
        error: msg,
      };
    }
  }

  async function loginAsGuest() {
    try {
      const res = await post<any>(
        '/api/auth/guest',
        {},
        { auth: false },
      );

      const accessToken: string | null =
        res?.accessToken ?? res?.token ?? res?.jwt ?? null;
      const refreshToken: string | null =
        res?.refreshToken ?? res?.refresh ?? null;

      if (!accessToken) {
        return {
          ok: false,
          error:
            'تم إنشاء جلسة الضيف لكن لم يتم استلام رمز الدخول. راجع إعدادات الـ API.',
        };
      }

      const tokens: AuthTokens = {
        accessToken,
        refreshToken: refreshToken ?? '',
      };
      setAuthTokens(tokens);

      const apiUserRaw = res?.user ?? res?.currentUser ?? null;
      const apiUser =
        apiUserRaw != null
          ? mapApiUserToAdminUser(apiUserRaw)
          : await fetchCurrentUserFromApi();

      if (!apiUser) {
        return {
          ok: false,
          error: 'تم إنشاء جلسة الضيف لكن تعذر جلب بيانات المستخدم.',
        };
      }

      const effectiveTokens = getAuthTokens();
      setSession(
        apiUser,
        effectiveTokens?.accessToken ?? accessToken,
        effectiveTokens?.refreshToken ?? refreshToken ?? null,
      );

      return { ok: true, user: apiUser };
    } catch (error) {
      console.error('Guest login error:', error);
      return {
        ok: false,
        error: 'تعذر إنشاء جلسة ضيف. حاول مرة أخرى.',
      };
    }
  }

  function logout() {
    clearAuthTokens();
    saveStoredSession(null);
    setUser(null);
  }

  /**
   * Public API: refresh current user from backend using /api/account/me.
   * Type remains () => void for compatibility; it runs an internal async task.
   */
  function refreshUser() {
    (async () => {
      const tokens = getAuthTokens();
      if (!tokens?.accessToken) {
        logout();
        return;
      }

      const apiUser = await fetchCurrentUserFromApi();
      if (!apiUser) {
        logout();
        return;
      }

      const effectiveTokens = getAuthTokens();
      setSession(
        apiUser,
        effectiveTokens?.accessToken ?? tokens.accessToken,
        effectiveTokens?.refreshToken ?? null,
      );
    })();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        loginAsGuest,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
