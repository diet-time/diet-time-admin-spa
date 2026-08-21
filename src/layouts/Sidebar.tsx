import { AdminPanelSettingsOutlined, CalendarMonthOutlined, CategoryOutlined, ChevronLeft, ChevronRight, DashboardOutlined, DinnerDiningOutlined, ExpandLess, ExpandMore, HistoryOutlined, ImageOutlined, MenuBookOutlined, PaymentsOutlined, RestaurantMenuOutlined, SpaOutlined, WarningAmberOutlined } from '@mui/icons-material';
import { Box, Collapse, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import { colors } from '@/theme/theme';
import { useQuery } from '@tanstack/react-query';
import { accessControlApi } from '@/api/accessControlApi';
import { canReadPath } from '@/auth/screenPermissionRoutes';

const expandedWidth = 264;
const collapsedWidth = 76;

interface NavItem {
  key: string;
  path: string;
  icon: ReactNode;
  children?: Array<{ label: string; path: string }>;
}

const items: NavItem[] = [
  { key: 'dashboard', path: '/', icon: <DashboardOutlined /> },
  { key: 'meals', path: '/meals', icon: <DinnerDiningOutlined /> },
  { key: 'mealPlans', path: '/meal-plans', icon: <MenuBookOutlined />, children: [
    { label: 'Plan Templates', path: '/meal-plans' },
    { label: 'Package Options', path: '/admin/package-options' },
    { label: 'Durations', path: '/admin/durations' },
    { label: 'Plan Pricing', path: '/admin/plan-pricing' },
  ] },
  { key: 'operations', path: '/operations', icon: <CalendarMonthOutlined />, children: [
    { label: 'Delivery Calendar', path: '/operations/delivery-calendar' },
    { label: 'Holidays / Closures', path: '/operations/closures' },
  ] },
  { key: 'categories', path: '/categories', icon: <CategoryOutlined /> },
  { key: 'ingredients', path: '/ingredients', icon: <SpaOutlined /> },
  { key: 'allergens', path: '/allergens', icon: <WarningAmberOutlined /> },
  { key: 'mealTypes', path: '/meal-types', icon: <RestaurantMenuOutlined /> },
  { key: 'pricing', path: '/pricing', icon: <PaymentsOutlined /> },
  { key: 'media', path: '/media', icon: <ImageOutlined /> },
  { key: 'audit', path: '/audit', icon: <HistoryOutlined /> },
  { key: 'administration', path: '/administration', icon: <AdminPanelSettingsOutlined />, children: [
    { label: 'Settings', path: '/settings' },
    { label: 'Users', path: '/users' },
    { label: 'Roles', path: '/roles' },
  ] },
];

export function Sidebar({ open, collapsed, onClose, onToggle }: {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const location = useLocation();
  const permissions = useQuery({ queryKey: ['access-control', 'me', 'screens'], queryFn: accessControlApi.myScreens, staleTime: 60_000 });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ mealPlans: location.pathname.startsWith('/meal-plans') || ['/admin/package-options', '/admin/durations', '/admin/plan-pricing'].some(path => location.pathname.startsWith(path)), operations: location.pathname.startsWith('/operations'), administration: ['/settings', '/users', '/roles'].some(path => location.pathname.startsWith(path)) });
  const width = collapsed ? collapsedWidth : expandedWidth;
  const visibleItems = items.map(item => item.children && permissions.data
    ? { ...item, children: item.children.filter(child => canReadPath(permissions.data, child.path)) }
    : item).filter(item => !permissions.data || (item.children ? item.children.length > 0 : canReadPath(permissions.data, item.path)));

  const content = (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', bgcolor: colors.emerald, color: 'white' }}>
      <Toolbar sx={{ gap: 1.5, minHeight: '72px !important', px: 2, flexShrink: 0 }}>
        <Box sx={{ width: 38, height: 38, flexShrink: 0, borderRadius: 2.5, bgcolor: colors.lime, color: colors.dark, display: 'grid', placeItems: 'center', fontWeight: 900 }}>DT</Box>
        {!collapsed && <Typography fontWeight={800} noWrap>{t('appName')}</Typography>}
      </Toolbar>

      <List
        component="nav"
        aria-label="Main navigation"
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', px: 1, py: 1, scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,.4) transparent' }}
      >
        {visibleItems.map((item) => {
          const active = item.path === '/'
            ? location.pathname === '/'
            : item.children?.some(child => location.pathname.startsWith(child.path)) ?? location.pathname.startsWith(item.path);
          return (
            <Box key={item.path}>
              <ListItemButton
                component={item.children ? 'button' : NavLink}
                to={item.children ? undefined : item.path}
                onClick={() => item.children ? setOpenGroups((value) => ({ ...value, [item.key]: !value[item.key] })) : onClose()}
                selected={active}
                title={collapsed ? t(item.key) : undefined}
                sx={{
                  borderRadius: 2,
                  minHeight: 48,
                  my: 0.4,
                  color: 'inherit',
                  '&.Mui-selected': { bgcolor: 'rgba(206,241,123,.18)', color: colors.lime },
                  '&.Mui-selected:hover': { bgcolor: 'rgba(206,241,123,.24)' },
                }}
              >
                <ListItemIcon sx={{ minWidth: collapsed ? 42 : 46, color: 'inherit' }}>{item.icon}</ListItemIcon>
                {!collapsed && <ListItemText primary={t(item.key)} primaryTypographyProps={{ fontWeight: active ? 700 : 500 }} />}
                {item.children && !collapsed && (openGroups[item.key] ? <ExpandLess /> : <ExpandMore />)}
              </ListItemButton>
              {item.children && !collapsed && (
                <Collapse in={!!openGroups[item.key]}>
                  <List disablePadding>
                    {item.children.map((child) => (
                      <ListItemButton
                        key={child.path}
                        component={NavLink}
                        to={child.path}
                        onClick={onClose}
                        sx={{ pl: 7, borderRadius: 2, minHeight: 42, '&.active': { color: colors.lime, fontWeight: 700 } }}
                      >
                        {child.label}
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              )}
            </Box>
          );
        })}
      </List>

      {desktop && (
        <Box sx={{ flexShrink: 0, display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end', px: 1.5, py: 1, borderTop: '1px solid rgba(255,255,255,.12)' }}>
          <IconButton aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={onToggle} sx={{ color: 'white' }}>
            {collapsed ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        </Box>
      )}
    </Box>
  );

  return (
    <Drawer
      variant={desktop ? 'permanent' : 'temporary'}
      open={desktop || open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: desktop ? width : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          border: 0,
          overflow: 'hidden',
          bgcolor: colors.emerald,
          transition: theme.transitions.create('width'),
        },
      }}
    >
      {content}
    </Drawer>
  );
}
