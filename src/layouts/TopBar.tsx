import { Language, Logout, Menu, NotificationsNone, Search } from '@mui/icons-material';
import { AppBar, Avatar, Box, IconButton, InputAdornment, Menu as MuiMenu, MenuItem, TextField, Toolbar, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/app/store/authStore';
import { endSession } from '@/auth/session';
import { Breadcrumbs } from './Breadcrumbs';

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const segment = location.pathname.split('/').filter(Boolean)[0] ?? 'dashboard';
  const titleKey = segment === 'meal-plans' ? 'mealPlans' : segment === 'meal-types' ? 'mealTypes' : segment === 'audit' ? 'audit' : segment;
  const pageTitle = location.pathname.startsWith('/admin/package-options') ? 'Package Options'
    : location.pathname.startsWith('/admin/durations') ? 'Durations'
      : location.pathname.startsWith('/admin/plan-pricing') ? 'Plan Pricing'
        : t(titleKey);

  const toggleLanguage = async () => {
    await i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar');
  };
  const logout = async () => {
    await endSession();
    navigate('/login');
  };

  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <Toolbar sx={{ minHeight: '72px !important', gap: { xs: 0.5, sm: 2 }, px: { xs: 1, sm: 3 } }}>
        <IconButton onClick={onMenu} sx={{ display: { md: 'none' } }} aria-label="Open navigation"><Menu /></IconButton>
        <Box sx={{ minWidth: 0, flex: { xs: 1, md: '0 1 520px' }, maxWidth: { md: 520 } }}>
          <Typography variant="h3" noWrap>{pageTitle}</Typography>
          <Box sx={{ display: { xs: 'none', sm: 'block' }, minWidth: 0, overflow: 'hidden' }}><Breadcrumbs /></Box>
        </Box>
        <Box flex={{ xs: 0, md: 1 }} />
        <TextField
          placeholder={`${t('search')}...`}
          aria-label="Global search"
          sx={{ width: { sm: 220, lg: 320 }, display: { xs: 'none', sm: 'block' } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search /></InputAdornment> } }}
        />
        <Tooltip title={i18n.language === 'ar' ? 'English' : 'Arabic'}>
          <IconButton onClick={toggleLanguage} aria-label="Switch language"><Language /></IconButton>
        </Tooltip>
        <Tooltip title="Notifications"><IconButton aria-label="Notifications"><NotificationsNone /></IconButton></Tooltip>
        <IconButton onClick={(event) => setAnchor(event.currentTarget)} aria-label="User menu">
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14 }}>
            {user?.name.split(' ').map((value) => value[0]).slice(0, 2).join('')}
          </Avatar>
        </IconButton>
        <MuiMenu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography fontWeight={700}>{user?.name}</Typography>
            <Typography variant="caption" color="text.secondary">{user?.roles.join(', ')}</Typography>
          </Box>
          <MenuItem onClick={logout}><Logout fontSize="small" sx={{ mr: 1 }} />{t('logout')}</MenuItem>
        </MuiMenu>
      </Toolbar>
    </AppBar>
  );
}
