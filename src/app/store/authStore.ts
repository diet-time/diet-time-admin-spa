import { create } from 'zustand';

export type Role = string;
export interface AuthUser { id: string; name: string; email: string; roles: Role[] }

interface AuthState {
  user: AuthUser | null;
  status: 'checking' | 'authenticated' | 'anonymous' | 'unavailable';
  beginSessionCheck: () => void;
  sessionUnavailable: () => void;
  setSession: (user: AuthUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'checking',
  beginSessionCheck: () => set({ status: 'checking' }),
  sessionUnavailable: () => set({ status: 'unavailable' }),
  setSession: (user) => set({ user, status: 'authenticated' }),
  clear: () => set({ user: null, status: 'anonymous' }),
}));
