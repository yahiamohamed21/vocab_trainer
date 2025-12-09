// lib/api/httpClient.ts
// Core HTTP client with JWT + refresh handling for VocabTrainer API.

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://vocabtrainerapi.runasp.net';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// This mirrors the "Result" schema from the backend.
export interface ApiResult {
  succeeded: boolean;
  errorCode?: string | null;
  message?: string | null;
}

export class ApiError extends Error {
  status: number;
  errorCode?: string;
  details?: any;

  constructor(
    status: number,
    message: string,
    errorCode?: string,
    details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.details = details;
  }
}

type ResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer';

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  auth?: boolean;
  responseType?: ResponseType;
  _skipRefresh?: boolean;
}

export interface ApiClientConfig {
  baseUrl?: string;
  onUnauthorized?: () => void;
  onTokenUpdate?: (tokens: AuthTokens) => void;
}

let currentTokens: AuthTokens | null = null;

let config: Required<ApiClientConfig> = {
  baseUrl: API_BASE_URL,
  onUnauthorized: () => {},
  onTokenUpdate: () => {},
};

export function configureApiClient(partial: ApiClientConfig) {
  config = {
    ...config,
    ...partial,
    baseUrl: partial.baseUrl ?? config.baseUrl,
  };
}

export function setAuthTokens(tokens: AuthTokens | null) {
  currentTokens = tokens;
}

export function clearAuthTokens() {
  currentTokens = null;
}

export function getAuthTokens(): AuthTokens | null {
  return currentTokens;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    auth = true,
    responseType = 'json',
    body,
    headers,
    _skipRefresh,
    ...rest
  } = options;

  const url = path.startsWith('http') ? path : `${config.baseUrl}${path}`;

  const finalHeaders: HeadersInit = {
    ...(headers || {}),
  };

  let requestBody: BodyInit | undefined;

  if (body instanceof FormData || body instanceof Blob) {
    requestBody = body;
  } else if (body !== undefined) {
    finalHeaders['Content-Type'] =
      finalHeaders['Content-Type'] ?? 'application/json';
    requestBody = JSON.stringify(body);
  }

  if (auth && currentTokens?.accessToken) {
    finalHeaders['Authorization'] = `Bearer ${currentTokens.accessToken}`;
  }

  const response = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    body: requestBody,
  });

  if (
    response.status === 401 &&
    auth &&
    !_skipRefresh &&
    currentTokens?.refreshToken
  ) {
    const refreshSucceeded = await tryRefreshToken();
    if (refreshSucceeded) {
      return apiRequest<T>(path, { ...options, _skipRefresh: true });
    }

    config.onUnauthorized();
    throw new ApiError(401, 'Unauthorized', 'unauthorized');
  }

  if (!response.ok) {
    let errorBody: any = null;
    let message = `Request failed with status ${response.status}`;
    let errorCode: string | undefined;

    try {
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        errorBody = await response.json();
        if (errorBody) {
          if (typeof errorBody.message === 'string') {
            message = errorBody.message;
          }
          if (typeof errorBody.errorCode === 'string') {
            errorCode = errorBody.errorCode;
          }
        }
      } else {
        const text = await response.text();
        if (text) message = text;
      }
    } catch {}

    throw new ApiError(response.status, message, errorCode, errorBody);
  }

  if (responseType === 'blob')
    return (await response.blob()) as unknown as T;
  if (responseType === 'arrayBuffer')
    return (await response.arrayBuffer()) as unknown as T;
  if (responseType === 'text')
    return (await response.text()) as unknown as T;

  const text = await response.text();
  if (!text) return undefined as unknown as T;
  return JSON.parse(text) as T;
}

async function tryRefreshToken(): Promise<boolean> {
  if (!currentTokens?.refreshToken) return false;

  try {
    type RefreshResponse = {
      accessToken: string;
      refreshToken: string;
      user?: any;
    };

    const res = await apiRequest<RefreshResponse>('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: currentTokens.refreshToken },
      auth: false,
      _skipRefresh: true,
    });

    if (!res?.accessToken || !res?.refreshToken) return false;

    const newTokens: AuthTokens = {
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
    };

    currentTokens = newTokens;
    config.onTokenUpdate(newTokens);

    return true;
  } catch {
    return false;
  }
}

export function get<T = unknown>(
  path: string,
  options?: Omit<ApiRequestOptions, 'method'>
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'GET' });
}

export function post<T = unknown>(
  path: string,
  body?: any,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'POST', body });
}

export function patch<T = unknown>(
  path: string,
  body?: any,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'PATCH', body });
}

export function del<T = unknown>(
  path: string,
  body?: any,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: 'DELETE', body });
}
