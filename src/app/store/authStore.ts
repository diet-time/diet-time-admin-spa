import { create } from 'zustand';

export type Role = 'Admin' | 'Dietitian' | 'ContentManager' | 'Finance' | 'Operations' | 'Viewer';
export interface AuthUser { id: string; name: string; email: string; roles: Role[] }

interface AuthState {
  user: AuthUser | null;
  status: 'checking' | 'authenticated' | 'anonymous';
  setSession: (user: AuthUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'checking',
  setSession: (user) => set({ user, status: 'authenticated' }),
  clear: () => set({ user: null, status: 'anonymous' }),
}));
