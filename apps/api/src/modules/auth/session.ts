import crypto from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';
import { env } from '../../config/env.js';
import type { AuthUser } from '../../types/express.js';
import { AppError } from '../../utils/errors.js';

export const CUSTOMER_COOKIE = 'simmi_session';
export const ADMIN_COOKIE = 'simmi_admin_session';
export const CSRF_COOKIE = 'simmi_csrf';

interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  role: AuthUser['role'];
  permissions: AuthUser['permissions'];
  exp: number;
  kind: 'customer' | 'admin';
}

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sign(payload: SessionPayload): string {
  const body = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', env.SESSION_SECRET).update(body).digest();
  return `${body}.${base64url(sig)}`;
}

function verify(token: string): SessionPayload | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = base64url(crypto.createHmac('sha256', env.SESSION_SECRET).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const normalized = body.replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    const json = JSON.parse(Buffer.from(normalized + pad, 'base64').toString());
    if (typeof json.exp !== 'number' || json.exp < Date.now()) return null;
    return json as SessionPayload;
  } catch {
    return null;
  }
}

function cookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE ?? env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: maxAgeMs,
    path: '/',
  };
}

export function createSessionToken(user: AuthUser, kind: 'customer' | 'admin', ttlHours = 24 * 7) {
  return sign({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions,
    kind,
    exp: Date.now() + ttlHours * 60 * 60 * 1000,
  });
}

export function setSessionCookie(res: Response, token: string, kind: 'customer' | 'admin') {
  const name = kind === 'admin' ? ADMIN_COOKIE : CUSTOMER_COOKIE;
  res.cookie(name, token, cookieOptions(7 * 24 * 60 * 60 * 1000));
  const csrf = crypto.randomBytes(24).toString('hex');
  res.cookie(CSRF_COOKIE, csrf, { ...cookieOptions(7 * 24 * 60 * 60 * 1000), httpOnly: false });
  return csrf;
}

export function clearSessionCookies(res: Response, kind: 'customer' | 'admin') {
  const name = kind === 'admin' ? ADMIN_COOKIE : CUSTOMER_COOKIE;
  res.clearCookie(name, { path: '/' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
}

export function readSession(req: Request, kind: 'customer' | 'admin'): AuthUser | null {
  const name = kind === 'admin' ? ADMIN_COOKIE : CUSTOMER_COOKIE;
  const token = req.cookies?.[name] as string | undefined;
  if (!token) return null;
  const payload = verify(token);
  if (!payload || payload.kind !== kind) return null;
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    permissions: payload.permissions,
  };
}

export function assertCsrf(req: Request) {
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return;
  const header = req.headers['x-csrf-token'];
  const cookie = req.cookies?.[CSRF_COOKIE];
  if (!header || !cookie || String(header) !== String(cookie)) {
    throw new AppError('CSRF_INVALID', 'Invalid CSRF token', 403);
  }
}
