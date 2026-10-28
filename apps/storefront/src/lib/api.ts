const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

const GUEST_KEY = 'simmi_guest_cart';

export function getGuestCartKey() {
  let key = localStorage.getItem(GUEST_KEY);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(GUEST_KEY, key);
  }
  return key;
}

export function getCsrfToken() {
  const match = document.cookie.match(/(?:^|; )simmi_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export async function ensureCsrf() {
  if (getCsrfToken()) return getCsrfToken();
  const res = await fetch(`${API_BASE}/auth/csrf`, { credentials: 'include' });
  const json = await res.json();
  return json.data.csrfToken as string;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  const method = (options.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = await ensureCsrf();
    headers.set('x-csrf-token', csrf);
  }
  headers.set('x-guest-cart-key', getGuestCartKey());

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const message = data?.error?.message || res.statusText || 'Request failed';
    throw Object.assign(new Error(message), { status: res.status, code: data?.error?.code, details: data?.error });
  }
  return data.data as T;
}
