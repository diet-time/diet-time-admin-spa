import type { PropsWithChildren, ReactNode } from 'react';
import { useAuthStore, type Role } from '@/app/store/authStore';
export function RoleGuard({ allowedRoles, children, fallback = null }: PropsWithChildren<{ allowedRoles: Role[]; fallback?: ReactNode }>) { const roles = useAuthStore((state) => state.user?.roles ?? []); return roles.includes('Admin') || roles.some((role) => allowedRoles.includes(role)) ? children : fallback; }
