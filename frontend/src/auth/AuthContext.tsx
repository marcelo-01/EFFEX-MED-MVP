import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api';
import { getToken, onUnauthorized, setToken } from '../api/http';
import type { AuthResponse, User } from '../api/types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  registerDoctor: (data: Parameters<typeof authApi.registerDoctor>[0]) => Promise<User>;
  registerPatient: (data: Parameters<typeof authApi.registerPatient>[0]) => Promise<User>;
  logout: () => void;
  /** Atualiza os dados do usuário logado (ex.: depois de editar o perfil). */
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => getToken() !== null);

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  useEffect(() => {
    onUnauthorized(logout);
    return () => onUnauthorized(null);
  }, [logout]);

  // Recupera a sessão salva ao recarregar a página.
  useEffect(() => {
    if (!token || user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    authApi
      .me()
      .then((me) => !cancelled && setUser(me))
      .catch(() => !cancelled && logout())
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, user, logout]);

  const authenticate = useCallback((response: AuthResponse) => {
    setToken(response.token);
    setTokenState(response.token);
    setUser(response.user);
    return response.user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login: (email, password) => authApi.login(email, password).then(authenticate),
      registerDoctor: (data) => authApi.registerDoctor(data).then(authenticate),
      registerPatient: (data) => authApi.registerPatient(data).then(authenticate),
      logout,
      updateUser: (updated) => setUser(updated),
    }),
    [user, token, loading, authenticate, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}

export function homePathFor(user: User) {
  return user.role === 'DOCTOR' ? '/medico/conversas' : '/paciente/conversas';
}
