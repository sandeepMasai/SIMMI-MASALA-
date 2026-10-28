const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

/** In-memory CSRF — API cookies are on a different origin, so document.cookie is empty. */
let cachedCsrf = '';

export function setCsrfToken(token: string) {
  cachedCsrf = token;
}

export function getCsrfToken() {
  if (cachedCsrf) return cachedCsrf;
  const match = document.cookie.match(/(?:^|; )simmi_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export async function ensureCsrf() {
  const existing = getCsrfToken();
  if (existing) return existing;
  const res = await fetch(`${API_BASE}/auth/csrf`, { credentials: 'include' });
  const json = await res.json();
  if (!res.ok || !json?.data?.csrfToken) {
    throw new Error(json?.error?.message || 'Failed to obtain CSRF token');
  }
  cachedCsrf = json.data.csrfToken as string;
  return cachedCsrf;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.json !== undefined) headers.set('Content-Type', 'application/json');
  const method = (options.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers.set('x-csrf-token', await ensureCsrf());
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });
  const data = await res.json().catch(() => ({}));
  if (typeof data?.data?.csrfToken === 'string') {
    setCsrfToken(data.data.csrfToken);
  }
  if (!res.ok || data.success === false) {
    throw Object.assign(new Error(data?.error?.message || res.statusText), {
      status: res.status,
      code: data?.error?.code,
    });
  }
  return data.data as T;
}
