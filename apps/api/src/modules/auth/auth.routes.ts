import { Router } from 'express';
import { loginSchema, passwordSchema, registerSchema, emailSchema } from '@simmi/shared';
import { z } from 'zod';
import { asyncHandler } from '../../utils/async-handler.js';
import { validateRequest } from '../../middleware/validate-request.js';
import { authRateLimit } from '../../middleware/rate-limit.js';
import {
  changePassword,
  loginUser,
  registerCustomer,
  requestPasswordReset,
  resetPassword,
  toUserDto,
} from './auth.service.js';
import {
  clearSessionCookies,
  createSessionToken,
  readSession,
  setSessionCookie,
  assertCsrf,
} from './session.js';
import { sendSuccess } from '../../utils/response.js';
import { UserModel } from '../users/user.model.js';
import { AppError } from '../../utils/errors.js';
import { mergeGuestCart } from '../cart/cart.service.js';

export const authRouter: import("express").Router = Router();

authRouter.get(
  '/csrf',
  asyncHandler(async (req, res) => {
    const crypto = await import('node:crypto');
    const token = crypto.randomBytes(24).toString('hex');
    res.cookie('simmi_csrf', token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    sendSuccess(res, { csrfToken: token });
  }),
);

authRouter.post(
  '/register',
  authRateLimit,
  validateRequest({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    assertCsrf(req);
    const authUser = await registerCustomer(req.body);
    const token = createSessionToken(authUser, 'customer');
    const csrf = setSessionCookie(res, token, 'customer');
    const guestKey = req.headers['x-guest-cart-key'] as string | undefined;
    if (guestKey) await mergeGuestCart(authUser.id, guestKey);
    const user = await UserModel.findById(authUser.id);
    sendSuccess(res, { user: toUserDto(user!), csrfToken: csrf }, 201);
  }),
);

authRouter.post(
  '/login',
  authRateLimit,
  validateRequest({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    assertCsrf(req);
    const authUser = await loginUser(req.body.email, req.body.password, false);
    const token = createSessionToken(authUser, 'customer');
    const csrf = setSessionCookie(res, token, 'customer');
    const guestKey = req.headers['x-guest-cart-key'] as string | undefined;
    if (guestKey) await mergeGuestCart(authUser.id, guestKey);
    const user = await UserModel.findById(authUser.id);
    sendSuccess(res, { user: toUserDto(user!), csrfToken: csrf });
  }),
);

authRouter.post(
  '/admin/login',
  authRateLimit,
  validateRequest({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    assertCsrf(req);
    const authUser = await loginUser(req.body.email, req.body.password, true);
    const token = createSessionToken(authUser, 'admin');
    const csrf = setSessionCookie(res, token, 'admin');
    const user = await UserModel.findById(authUser.id);
    sendSuccess(res, { user: toUserDto(user!), csrfToken: csrf });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    assertCsrf(req);
    clearSessionCookies(res, 'customer');
    sendSuccess(res, { ok: true });
  }),
);

authRouter.post(
  '/admin/logout',
  asyncHandler(async (req, res) => {
    assertCsrf(req);
    clearSessionCookies(res, 'admin');
    sendSuccess(res, { ok: true });
  }),
);

authRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const user = readSession(req, 'customer') ?? readSession(req, 'admin');
    if (!user) throw new AppError('UNAUTHORIZED', 'Not authenticated', 401);
    const doc = await UserModel.findById(user.id);
    if (!doc) throw new AppError('UNAUTHORIZED', 'Not authenticated', 401);
    sendSuccess(res, { user: toUserDto(doc) });
  }),
);

authRouter.post(
  '/forgot-password',
  authRateLimit,
  validateRequest({ body: z.object({ email: emailSchema }) }),
  asyncHandler(async (req, res) => {
    assertCsrf(req);
    const result = await requestPasswordReset(req.body.email);
    sendSuccess(res, {
      message: 'If an account exists, reset instructions were processed.',
      emailConfigured: result.queued,
      ...(result.devToken ? { devToken: result.devToken } : {}),
    });
  }),
);

authRouter.post(
  '/reset-password',
  authRateLimit,
  validateRequest({
    body: z.object({ token: z.string().min(10), password: passwordSchema }),
  }),
  asyncHandler(async (req, res) => {
    assertCsrf(req);
    await resetPassword(req.body.token, req.body.password);
    sendSuccess(res, { ok: true });
  }),
);

authRouter.post(
  '/change-password',
  asyncHandler(async (req, res) => {
    assertCsrf(req);
    const session = readSession(req, 'customer') ?? readSession(req, 'admin');
    if (!session) throw new AppError('UNAUTHORIZED', 'Not authenticated', 401);
    const body = z
      .object({ currentPassword: z.string().min(1), newPassword: passwordSchema })
      .parse(req.body);
    await changePassword(session.id, body.currentPassword, body.newPassword);
    sendSuccess(res, { ok: true });
  }),
);
