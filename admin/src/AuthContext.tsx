// ─────────────────────────────────────────────
//  관리자 세션
//  일반 사용자 계정으로도 로그인은 되지만 관리자 API는 403이 난다.
//  그래서 로그인 직후 role을 확인하고, ADMIN이 아니면 들여보내지 않는다.
// ─────────────────────────────────────────────
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, authApi, setUnauthorizedHandler, tokenStorage } from './api/client';
import type { UserResponse } from './api/types';

interface AuthState {
  admin: UserResponse | null;
  restoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<UserResponse | null>(null);
  const [restoring, setRestoring] = useState(true);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setAdmin(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // 새로고침해도 로그인 상태가 유지되도록 저장된 토큰을 확인한다
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (!tokenStorage.get()) return;
        const me = await authApi.me();
        if (!alive) return;
        if (me.role === 'ADMIN') setAdmin(me);
        else tokenStorage.clear();
      } catch {
        tokenStorage.clear();
      } finally {
        if (alive) setRestoring(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);

    if (res.user.role !== 'ADMIN') {
      // 토큰을 남겨두면 다음 새로고침에 어정쩡한 상태가 된다
      tokenStorage.clear();
      throw new ApiError(403, '관리자 권한이 없는 계정입니다.');
    }

    tokenStorage.set(res.accessToken, res.refreshToken);
    setAdmin(res.user);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ admin, restoring, login, logout }),
    [admin, restoring, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있습니다.');
  return ctx;
}
