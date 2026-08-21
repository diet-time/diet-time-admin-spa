import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { accessControlApi } from '@/api/accessControlApi';
import { permissionForPath } from './screenPermissionRoutes';

export const useCurrentScreenPermission = () => {
  const { pathname } = useLocation();
  const query = useQuery({ queryKey: ['access-control', 'me', 'screens'], queryFn: accessControlApi.myScreens, staleTime: 60_000 });
  const permission = query.data ? permissionForPath(query.data, pathname) : undefined;
  return { ...query, permission };
};
