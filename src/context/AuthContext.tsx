import { createContext, useContext, useState, type ReactNode } from 'react';
import { apiPost } from '../services/api';

export type AuthUser = { id: string; name: string; email: string; isAdmin: boolean };

type AuthContextValue = {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_KEY = 'bolao_user';

function loadUser(): AuthUser | null {
  try {
    // Clean up old token-based storage from previous sessions
    localStorage.removeItem('bolao_auth');
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (u?.isAdmin === undefined) u.isAdmin = false;
    return u;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUser);

  function login(newUser: AuthUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setUser(newUser);
  }

  async function logout() {
    localStorage.removeItem(USER_KEY);
    setUser(null);
    try { await apiPost('/auth/logout', {}); } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
