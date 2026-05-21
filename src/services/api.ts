const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:5001/api';
const TOKEN_KEY = 'bolao_token';

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// Single in-flight refresh promise — prevents multiple concurrent refresh calls
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async r => {
        if (!r.ok) return false;
        try {
          const data = await r.json();
          if (data?.token) setStoredToken(data.token);
        } catch {}
        return true;
      })
      .catch(() => false)
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

function buildOpts(method: string, body?: unknown): RequestInit {
  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return {
    method,
    credentials: 'include',
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response = await fetch(`${API_BASE_URL}${path}`, buildOpts(method, body));

  // On 401 outside of auth endpoints: try refresh then retry once
  if (response.status === 401 && !path.startsWith('/auth/')) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      response = await fetch(`${API_BASE_URL}${path}`, buildOpts(method, body));
    }
    if (response.status === 401) {
      localStorage.removeItem('bolao_user');
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/';
      throw new Error('Sessão expirada.');
    }
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`${response.status} ${method} ${path}${text ? ': ' + text : ''}`);
  }

  if (response.status === 204) return undefined as T;
  const ct = response.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) return undefined as T;
  return response.json();
}

export const apiGet    = <T>(path: string)                    => request<T>('GET',    path);
export const apiPost   = <T>(path: string, body: unknown)     => request<T>('POST',   path, body);
export const apiPut    = <T>(path: string, body: unknown)     => request<T>('PUT',    path, body);
export const apiDelete =    (path: string)                    => request<void>('DELETE', path);
