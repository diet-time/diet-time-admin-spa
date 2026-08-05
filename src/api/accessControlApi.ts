import { apiClient } from './apiClient';
import type { AccessRole, AccessUser, ApiEnvelope, ScreenPermission } from './apiTypes';
import { setCachedScreenPermissions } from '@/auth/screenPermissionCache';

export interface ScreenPermissionInput { screenId: string; canRead: boolean; canWrite: boolean }
export interface RoleInput { roleName: string; description?: string; isActive: boolean; screens: ScreenPermissionInput[] }
export interface UserInput {
  email: string; firstName: string; lastName: string; mobile?: string; password?: string;
  isActive: boolean; roleIds: string[];
}

const data = <T>(response: { data: ApiEnvelope<T> }) => response.data.data;

export const accessControlApi = {
  screens: async () => data(await apiClient.get<ApiEnvelope<ScreenPermission[]>>('access-control/screens')),
  myScreens: async () => {
    const screens = data(await apiClient.get<ApiEnvelope<ScreenPermission[]>>('access-control/me/screens'));
    setCachedScreenPermissions(screens);
    return screens;
  },
  roles: async () => data(await apiClient.get<ApiEnvelope<AccessRole[]>>('access-control/roles')),
  users: async () => data(await apiClient.get<ApiEnvelope<AccessUser[]>>('access-control/users')),
  createRole: async (body: RoleInput) => (await apiClient.post('access-control/roles', body)).data,
  updateRole: async (id: string, body: RoleInput) => (await apiClient.put(`access-control/roles/${id}`, body)).data,
  createUser: async (body: UserInput & { password: string }) => (await apiClient.post('access-control/users', body)).data,
  updateUser: async (id: string, body: UserInput) => (await apiClient.put(`access-control/users/${id}`, body)).data,
};
