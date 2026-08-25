// ─────────────────────────────────────────────
//  AuthContext — 로그인 세션 한 곳에서 관리
// ─────────────────────────────────────────────
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authApi, setUnauthorizedHandler, tokenStorage } from '../api/Client';
import type { UserResponse } from '../types/Api';

interface AuthState {
  user: UserResponse | null;
  /** 앱 시작 직후 저장된 토큰을 확인하는 동안 true */
  restoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname: string) => Promise<void>;
  logout: () => Promise<void>;
  /** 닉네임 변경 후 화면에 즉시 반영하려고 쓴다 */
  setUser: (user: UserResponse) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [restoring, setRestoring] = useState(true);

  const logout = useCallback(async () => {
    await tokenStorage.remove();
    setUser(null);
  }, []);

  // 토큰이 만료되면 Client가 여기를 불러 세션을 비운다
  useEffect(() => {
    setUnauthorizedHandler(() => { void logout(); });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // 앱을 다시 열었을 때 저장된 토큰으로 세션을 되살린다
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const token = await tokenStorage.get();
        if (!token) return;
        const me = await authApi.getMe();
        if (alive) setUser(me);
      } catch {
        // 토큰이 썩었거나 서버가 꺼져 있다 — 로그인 화면에서 다시 시작한다
        await tokenStorage.remove();
      } finally {
        if (alive) setRestoring(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    await tokenStorage.set(res.accessToken);
    setUser(res.user);
  }, []);

  const register = useCallback(async (email: string, password: string, nickname: string) => {
    const res = await authApi.register({ email, password, nickname });
    await tokenStorage.set(res.accessToken);
    setUser(res.user);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, restoring, login, register, logout, setUser }),
    [user, restoring, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있습니다.');
  return ctx;
}
