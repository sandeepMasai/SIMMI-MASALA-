export const CUSTOMER_ROLE = 'customer' as const;

export const ADMIN_ROLES = [
  'super_admin',
  'product_manager',
  'order_manager',
  'support_manager',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type UserRole = typeof CUSTOMER_ROLE | AdminRole;

export const PERMISSIONS = [
  'products:read',
  'products:write',
  'inventory:read',
  'inventory:write',
  'orders:read',
  'orders:write',
  'customers:read',
  'customers:write',
  'coupons:read',
  'coupons:write',
  'reports:read',
  'settings:read',
  'settings:write',
  'admins:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  super_admin: PERMISSIONS,
  product_manager: [
    'products:read',
    'products:write',
    'inventory:read',
    'inventory:write',
    'reports:read',
  ],
  order_manager: [
    'orders:read',
    'orders:write',
    'customers:read',
    'inventory:read',
    'reports:read',
    'coupons:read',
  ],
  support_manager: ['customers:read', 'customers:write', 'orders:read', 'orders:write'],
};

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  if (role === CUSTOMER_ROLE) return false;
  const perms = ROLE_PERMISSIONS[role];
  return perms?.includes(permission) ?? false;
}

export function isAdminRole(role: string): role is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}
