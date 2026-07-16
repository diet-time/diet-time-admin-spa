import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { IdleSessionMonitor } from '@/auth/IdleSessionMonitor';
export function AdminLayout() { const [mobileOpen, setMobileOpen] = useState(false); const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ui.sidebarCollapsed') === 'true'); const navigate = useNavigate(); useEffect(() => { const forbidden = () => navigate('/forbidden'); window.addEventListener('api:forbidden', forbidden); return () => window.removeEventListener('api:forbidden', forbidden); }, [navigate]); const toggle = () => { setCollapsed((current) => { localStorage.setItem('ui.sidebarCollapsed', String(!current)); return !current; }); }; return <IdleSessionMonitor><Box display="flex" minHeight="100vh"><Sidebar open={mobileOpen} collapsed={collapsed} onClose={() => setMobileOpen(false)} onToggle={toggle} /><Box component="main" sx={{ flex: 1, minWidth: 0 }}><TopBar onMenu={() => setMobileOpen(true)} /><Box sx={{ p: { xs: 2, sm: 3, lg: 4 }, maxWidth: 1800, mx: 'auto' }}><Outlet /></Box></Box></Box></IdleSessionMonitor>; }
