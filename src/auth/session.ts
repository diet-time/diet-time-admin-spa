import { useAuthStore } from '@/app/store/authStore';
import type { Role } from '@/app/store/authStore';
import { apiClient, refreshAccessToken, setAccessToken } from '@/api/apiClient';
import type { ApiEnvelope, AuthSessionApi, AuthUserApi } from '@/api/apiTypes';

const supportedRoles = new Set<Role>(['Admin', 'Dietitian', 'ContentManager', 'Finance', 'Operations', 'Viewer']);

const toAuthUser = (user: AuthUserApi) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  roles: user.roles.filter((role): role is Role => supportedRoles.has(role as Role)),
});

const applySession = (session: AuthSessionApi) => {
  setAccessToken(session.accessToken);
  useAuthStore.getState().setSession(toAuthUser(session.user));
};

export const login = async (email: string, password: string) => {
  const response = await apiClient.post<ApiEnvelope<AuthSessionApi>>('/auth/login', { email, password });
  applySession(response.data.data);
};

export const restoreSession = async () => {
  try {
    applySession(await refreshAccessToken());
  } catch {
    setAccessToken(null);
    useAuthStore.getState().clear();
  }
};

export const endSession = async () => {
  try {
    await apiClient.post('/auth/logout', {});
  } finally {
    setAccessToken(null);
    useAuthStore.getState().clear();
  }
};
