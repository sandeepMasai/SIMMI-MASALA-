import type { NextFunction, Request, Response } from 'express';
import { isAdminRole, ROLE_PERMISSIONS, type Permission } from '@simmi/shared';
import { assertCsrf, readSession } from '../modules/auth/session.js';
import { AppError } from '../utils/errors.js';

export function authenticateCustomer(req: Request, _res: Response, next: NextFunction) {
  try {
    assertCsrf(req);
    const user = readSession(req, 'customer');
    if (!user) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function optionalCustomer(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase())) {
      assertCsrf(req);
    }
    const user = readSession(req, 'customer');
    if (user) req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function authenticateAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    assertCsrf(req);
    const user = readSession(req, 'admin');
    if (!user || !isAdminRole(user.role)) {
      throw new AppError('UNAUTHORIZED', 'Admin authentication required', 401);
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function authorize(...required: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user || !isAdminRole(user.role)) {
        throw new AppError('FORBIDDEN', 'Insufficient permissions', 403);
      }
      const rolePerms = ROLE_PERMISSIONS[user.role];
      const effective = new Set<Permission>([...rolePerms, ...(user.permissions ?? [])]);
      const missing = required.filter((p) => !effective.has(p));
      if (missing.length) {
        throw new AppError('FORBIDDEN', 'Insufficient permissions', 403, { missing });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
