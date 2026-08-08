import { Alert, Box, CircularProgress } from '@mui/material';
import type { PropsWithChildren, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useCurrentScreenPermission } from '@/auth/useScreenPermission';

export function ScreenAccessBoundary({ children }: PropsWithChildren) {
  const { pathname } = useLocation();
  const { isLoading, isError, permission } = useCurrentScreenPermission();
  if (pathname === '/forbidden') return children;
  if (isLoading) return <Box minHeight={240} display="grid" sx={{ placeItems: 'center' }}><CircularProgress aria-label="Loading screen permissions" /></Box>;
  if (isError) return <Alert severity="error">Your screen permissions could not be loaded. Try signing in again.</Alert>;
  if (!permission?.canRead) return <Alert severity="warning">You do not have read permission for this screen.</Alert>;
  return children;
}

export function WriteGuard({ children, fallback = null }: PropsWithChildren<{ fallback?: ReactNode }>) {
  const { permission } = useCurrentScreenPermission();
  return permission?.canWrite ? children : fallback;
}
