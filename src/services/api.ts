const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:5001/api';

// Single in-flight refresh promise — prevents multiple concurrent refresh calls
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(r => r.ok)
      .catch(() => false)
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = {
    method,
    credentials: 'include',
    ...(body !== undefined
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  };

  let response = await fetch(`${API_BASE_URL}${path}`, opts);

  // On 401 outside of auth endpoints: try refresh then retry once
  if (response.status === 401 && !path.startsWith('/auth/')) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      response = await fetch(`${API_BASE_URL}${path}`, opts);
    }
    if (response.status === 401) {
      localStorage.removeItem('bolao_user');
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
