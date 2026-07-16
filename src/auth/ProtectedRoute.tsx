import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuthStore } from '@/app/store/authStore';
export function ProtectedRoute() { const { status } = useAuthStore(); const location = useLocation(); if (status === 'checking') return <Box minHeight="100vh" display="grid" sx={{ placeItems: 'center' }}><CircularProgress aria-label="Checking session" /></Box>; if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />; return <Outlet />; }
