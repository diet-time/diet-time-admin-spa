import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Stack } from '@mui/material';
import { useAuthStore } from '@/app/store/authStore';
import { restoreSession } from './session';

export function ProtectedRoute() {
  const status = useAuthStore(state => state.status);
  const location = useLocation();
  if (status === 'checking') return <Box minHeight="100vh" display="grid" sx={{ placeItems: 'center' }}><CircularProgress aria-label="Checking session" /></Box>;
  if (status === 'unavailable') return <Box minHeight="100vh" display="grid" sx={{ placeItems: 'center', p: 3 }}><Stack spacing={2} maxWidth={440}><Alert severity="warning">Unable to restore your session. Check your connection and try again.</Alert><Button variant="contained" onClick={() => void restoreSession()}>Retry connection</Button></Stack></Box>;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
