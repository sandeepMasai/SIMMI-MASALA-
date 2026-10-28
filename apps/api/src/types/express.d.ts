import type { Permission, UserRole } from '@simmi/shared';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
}

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: AuthUser;
      csrfToken?: string;
    }
  }
}

export {};
