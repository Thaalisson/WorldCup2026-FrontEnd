const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:5001/api';

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('bolao_auth');
    return raw ? JSON.parse(raw).token : null;
  } catch {
    return null;
  }
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra
  };
}

function checkSession(response: Response): void {
  if (response.status === 401) {
    localStorage.removeItem('bolao_auth');
    window.location.reload();
    throw new Error('Sessão expirada. Faça login novamente.');
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: authHeaders()
  });
  checkSession(response);
  if (!response.ok) throw new Error(`${response.status} GET ${path}`);
  return response.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body)
  });
  checkSession(response);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`${response.status} POST ${path}: ${text}`);
  }
  return response.json();
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body)
  });
  checkSession(response);
  if (!response.ok) throw new Error(`${response.status} PUT ${path}`);
  return response.json();
}

export async function apiDelete(path: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  checkSession(response);
  if (!response.ok) throw new Error(`${response.status} DELETE ${path}`);
}
