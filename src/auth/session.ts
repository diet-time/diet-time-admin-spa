import { useAuthStore } from '@/app/store/authStore';

const sessionKey = 'diet-time-admin-session';
const adminUser = {
  id: 'local-admin',
  name: 'Admin',
  email: 'admin@localhost',
  roles: ['Admin'] as const,
};

export const loginWithLocalCredentials = (username: string, password: string) => {
  if (username !== 'admin' || password !== 'admin') return false;
  localStorage.setItem(sessionKey, 'authenticated');
  useAuthStore.getState().setSession({ ...adminUser, roles: [...adminUser.roles] });
  return true;
};

export const restoreSession = async () => {
  if (localStorage.getItem(sessionKey) === 'authenticated') {
    useAuthStore.getState().setSession({ ...adminUser, roles: [...adminUser.roles] });
  } else {
    useAuthStore.getState().clear();
  }
};

export const endSession = async () => {
  localStorage.removeItem(sessionKey);
  useAuthStore.getState().clear();
};
