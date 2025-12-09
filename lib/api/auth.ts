// lib/api/auth.ts
import {
  AuthResponse,
  BackendUser,
  LoginRequest,
  RegisterWithCodeRequest,
  UpdateSettingsRequest,
} from './models';
import {
  post,
  get,
  setAuthTokens,
  clearAuthTokens,
  configureApiClient,
  type AuthTokens,
} from './httpClient';

// Simple facade around /api/auth/* and /api/account/*

export async function login(req: LoginRequest): Promise<AuthResponse> {
  const res = await post<AuthResponse>('/api/auth/login', req, { auth: false });
  // Update global tokens
  const tokens: AuthTokens = {
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
  };
  setAuthTokens(tokens);
  return res;
}

export async function registerWithCode(
  req: RegisterWithCodeRequest,
): Promise<AuthResponse> {
  const res = await post<AuthResponse>('/api/auth/register-with-code', req, {
    auth: false,
  });
  const tokens: AuthTokens = {
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
  };
  setAuthTokens(tokens);
  return res;
}

export async function guestLogin(): Promise<AuthResponse> {
  const res = await post<AuthResponse>('/api/auth/guest', undefined, {
    auth: false,
  });
  const tokens: AuthTokens = {
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
  };
  setAuthTokens(tokens);
  return res;
}

/**
 * Fetch the current user using the existing access token.
 */
export async function getMe(): Promise<BackendUser> {
  return get<BackendUser>('/api/account/me');
}

/**
 * Update user settings (UI language, theme, TTS, current language).
 */
export async function updateSettings(req: UpdateSettingsRequest): Promise<void> {
  await post('/api/account/settings', req, { method: 'PATCH' as any });
}

/**
 * Initialize the apiClient config from AuthContext:
 * - baseUrl (optional override)
 * - onUnauthorized: e.g. logout + redirect to /login
 * - onTokenUpdate: keep session/localStorage in sync with refreshes
 */
export function initApiClient(options: {
  baseUrl?: string;
  onUnauthorized?: () => void;
  onTokenUpdate?: (tokens: AuthTokens) => void;
}) {
  configureApiClient(options);
}

/**
 * Clear auth state (global tokens). AuthContext should also clear localStorage.
 */
export function logout() {
  clearAuthTokens();
}
