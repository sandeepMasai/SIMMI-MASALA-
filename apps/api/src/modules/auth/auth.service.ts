import {
  CUSTOMER_ROLE,
  ROLE_PERMISSIONS,
  isAdminRole,
  type Permission,
  type UserDto,
} from '@simmi/shared';
import { UserModel } from '../users/user.model.js';
import { PasswordResetModel } from './password-reset.model.js';
import { generateToken, hashPassword, hashToken, verifyPassword } from './password.js';
import { AppError } from '../../utils/errors.js';
import type { AuthUser } from '../../types/express.js';
import { isEmailConfigured } from '../../config/env.js';
import { sendEmail } from '../../integrations/email/email.service.js';
import { logger } from '../../config/logger.js';

export function toUserDto(user: {
  _id: { toString(): string };
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  emailVerifiedAt?: Date | null;
  accountStatus: string;
  createdAt?: Date;
  permissionsOverride?: string[] | Permission[];
}): UserDto {
  const role = user.role as UserDto['role'];
  const permissions = isAdminRole(role)
    ? ([...ROLE_PERMISSIONS[role], ...((user.permissionsOverride ?? []) as Permission[])] as Permission[])
    : undefined;
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    role,
    permissions,
    emailVerified: Boolean(user.emailVerifiedAt),
    accountStatus: user.accountStatus as UserDto['accountStatus'],
    createdAt: (user.createdAt ?? new Date()).toISOString(),
  };
}

export function toAuthUser(user: {
  _id: { toString(): string };
  name: string;
  email: string;
  role: string;
  permissionsOverride?: string[] | Permission[];
}): AuthUser {
  const role = user.role as AuthUser['role'];
  const permissions = isAdminRole(role)
    ? ([...ROLE_PERMISSIONS[role], ...((user.permissionsOverride ?? []) as Permission[])] as Permission[])
    : [];
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role,
    permissions,
  };
}

export async function registerCustomer(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}) {
  const existing = await UserModel.findOne({ email: input.email.toLowerCase() });
  if (existing) throw new AppError('CONFLICT', 'Email already registered', 409);

  const passwordHash = await hashPassword(input.password);
  const verificationToken = generateToken();
  const user = await UserModel.create({
    name: input.name,
    email: input.email.toLowerCase(),
    phone: input.phone,
    passwordHash,
    role: CUSTOMER_ROLE,
    emailVerificationTokenHash: hashToken(verificationToken),
  });

  if (isEmailConfigured()) {
    await sendEmail({
      to: user.email,
      subject: 'Verify your Simmi Masala account',
      text: `Your verification token: ${verificationToken}`,
    });
  } else {
    logger.warn({ email: user.email }, 'Email not configured; verification token generated but not sent');
  }

  return toAuthUser(user);
}

export async function loginUser(email: string, password: string, adminOnly = false) {
  const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    throw new AppError('UNAUTHORIZED', 'Invalid email or password', 401);
  }
  if (user.accountStatus === 'disabled') {
    throw new AppError('FORBIDDEN', 'Account is disabled', 403);
  }
  if (adminOnly && !isAdminRole(user.role)) {
    throw new AppError('FORBIDDEN', 'Admin access required', 403);
  }
  if (!adminOnly && isAdminRole(user.role)) {
    throw new AppError('FORBIDDEN', 'Use the admin login endpoint', 403);
  }
  user.lastLoginAt = new Date();
  await user.save();
  return toAuthUser(user);
}

export async function requestPasswordReset(email: string) {
  const user = await UserModel.findOne({ email: email.toLowerCase() });
  // Always succeed to avoid account enumeration
  if (!user) return { queued: false as const };

  const token = generateToken();
  await PasswordResetModel.create({
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  if (isEmailConfigured()) {
    await sendEmail({
      to: user.email,
      subject: 'Reset your Simmi Masala password',
      text: `Password reset token (expires in 1 hour): ${token}`,
    });
    return { queued: true as const };
  }

  logger.warn({ email: user.email }, 'Email not configured; password reset token not emailed');
  return { queued: false as const, devToken: process.env.NODE_ENV === 'production' ? undefined : token };
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = hashToken(token);
  const record = await PasswordResetModel.findOne({ tokenHash, usedAt: null });
  if (!record || record.expiresAt.getTime() < Date.now()) {
    throw new AppError('VALIDATION_ERROR', 'Invalid or expired reset token', 400);
  }
  const user = await UserModel.findById(record.userId).select('+passwordHash');
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);
  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  record.usedAt = new Date();
  await record.save();
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await UserModel.findById(userId).select('+passwordHash');
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new AppError('UNAUTHORIZED', 'Current password is incorrect', 401);
  }
  user.passwordHash = await hashPassword(newPassword);
  await user.save();
}
