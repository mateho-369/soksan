import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { apiFetch, errorMessage, getToken, setToken } from '../lib/http';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  /** True while the stored session is being re-validated on first load. */
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Gate for actions that require a session. Returns true when signed in;
   * otherwise redirects to /login (remembering where the user came from).
   */
  requireAuth: (navigate: NavigateFunction) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Re-validate a stored token once on app start; drop it if the API rejects it.
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      if (!getToken()) {
        setInitializing(false);
        return;
      }
      try {
        const res = await apiFetch('/auth/me');
        if (res.ok) {
          const me = await res.json();
          if (!cancelled) setUser(me);
        } else {
          setToken(null);
        }
      } catch {
        /* offline — keep the token, retry on next load */
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };
    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await errorMessage(res, 'Could not log in. Please try again.'));
    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, referralCode?: string) => {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password,
          // Phase 8 — badge-only referral; unknown codes are ignored.
          referral_code: referralCode?.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(await errorMessage(res, 'Could not create your account. Please try again.'));
      const data = await res.json();
      setToken(data.token);
      setUser(data.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      /* logging out locally even if the API call fails */
    }
    setToken(null);
    setUser(null);
  }, []);

  const requireAuth = useCallback(
    (navigate: NavigateFunction) => {
      if (user) return true;
      navigate('/login');
      return false;
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, initializing, login, register, logout, requireAuth }),
    [user, initializing, login, register, logout, requireAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
