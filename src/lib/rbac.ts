import type { Permission, Role } from '../types/domain';

/**
 * Centralized RBAC permission matrix.
 * Never scatter role-name checks across components or services.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: [
    'catalog:manage',
    'inventory:manage',
    'orders:manage',
    'orders:assign_dealer',
    'kyc:review',
    'commission:run',
    'commission:approve',
    'withdrawals:approve',
    'settings:manage',
    'audit:view',
    'dealer:portal',
    'member:portal',
  ],
  ADMIN: [
    'catalog:manage',
    'inventory:manage',
    'orders:manage',
    'orders:assign_dealer',
    'kyc:review',
    'commission:run',
    'settings:manage',
    'audit:view',
  ],
  FINANCE: [
    'commission:run',
    'commission:approve',
    'withdrawals:approve',
    'audit:view',
  ],
  INVENTORY_MANAGER: ['catalog:manage', 'inventory:manage'],
  ORDER_MANAGER: ['orders:manage', 'orders:assign_dealer'],
  KYC_OFFICER: ['kyc:review', 'audit:view'],
  SUPPORT: ['orders:manage'],
  DEALER: ['dealer:portal', 'member:portal'],
  MEMBER: ['member:portal'],
  CUSTOMER: [],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyAdminPermission(role: Role): boolean {
  const adminPerms: Permission[] = [
    'catalog:manage',
    'inventory:manage',
    'orders:manage',
    'kyc:review',
    'commission:run',
    'withdrawals:approve',
    'settings:manage',
    'audit:view',
  ];
  return adminPerms.some((perm) => hasPermission(role, perm));
}

export const ROLE_LABELS: Record<Role, { en: string; bn: string }> = {
  SUPER_ADMIN: { en: 'Super Admin', bn: 'সুপার অ্যাডমিন' },
  ADMIN: { en: 'Admin', bn: 'অ্যাডমিন' },
  FINANCE: { en: 'Finance Officer', bn: 'ফিন্যান্স অফিসার' },
  INVENTORY_MANAGER: { en: 'Inventory Manager', bn: 'ইনভেন্টরি ম্যানেজার' },
  ORDER_MANAGER: { en: 'Order Manager', bn: 'অর্ডার ম্যানেজার' },
  KYC_OFFICER: { en: 'KYC Officer', bn: 'কেওয়াইসি অফিসার' },
  SUPPORT: { en: 'Support Staff', bn: 'সাপোর্ট স্টাফ' },
  DEALER: { en: 'Regional Dealer', bn: 'আঞ্চলিক ডিলার' },
  MEMBER: { en: 'Approved Member', bn: 'অনুমোদিত মেম্বার' },
  CUSTOMER: { en: 'Guest / Customer', bn: 'ক্রেতা / অতিথি' },
};
