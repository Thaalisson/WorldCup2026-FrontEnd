import { createContext, useContext, useState, type ReactNode } from 'react';

export type AuthUser = { id: string; name: string; email: string; isAdmin: boolean };

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'bolao_auth';

function loadFromStorage(): { token: string; user: AuthUser } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Back-fill isAdmin for existing sessions that pre-date this field
    if (parsed?.user && parsed.user.isAdmin === undefined)
      parsed.user.isAdmin = false;
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = loadFromStorage();
  const [token, setToken] = useState<string | null>(stored?.token ?? null);
  const [user, setUser] = useState<AuthUser | null>(stored?.user ?? null);

  function login(newToken: string, newUser: AuthUser) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: newToken, user: newUser }));
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
