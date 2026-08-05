import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { accessControlApi } from '@/api/accessControlApi';

export const useCurrentScreenPermission = () => {
  const { pathname } = useLocation();
  const query = useQuery({ queryKey: ['access-control', 'me', 'screens'], queryFn: accessControlApi.myScreens, staleTime: 60_000 });
  const permission = query.data
    ?.filter(screen => screen.routeUrl && (pathname === screen.routeUrl || (screen.routeUrl !== '/' && pathname.startsWith(`${screen.routeUrl}/`))))
    .sort((a, b) => (b.routeUrl?.length ?? 0) - (a.routeUrl?.length ?? 0))[0];
  return { ...query, permission };
};
