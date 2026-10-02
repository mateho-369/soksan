// Central API client. Every backend call goes through apiFetch() so the
// base URL, auth header and transport live in exactly one place. Pages keep
// using the Response object (res.ok / res.json()) as before.

export const API_BASE: string = import.meta.env?.VITE_API_BASE_URL ?? '/api/v1';

const TOKEN_KEY = 'soksan-token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode) — session simply won't persist */
  }
}

/**
 * fetch() wrapper: prefixes API_BASE, attaches the bearer token when present
 * and defaults Content-Type for JSON bodies. Callers still receive the raw
 * Response so existing `.ok` / `.json()` handling keeps working.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

/** Extracts a human-friendly message from an API error response. */
export async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.message === 'string' && data.message) return data.message;
    if (typeof data?.error === 'string' && data.error) return data.error;
  } catch {
    /* non-JSON error body */
  }
  return fallback;
}
