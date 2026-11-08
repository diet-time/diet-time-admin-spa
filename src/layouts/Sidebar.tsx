import { AdminPanelSettingsOutlined, CalendarMonthOutlined, ChevronLeft, ChevronRight, DashboardOutlined, DinnerDiningOutlined, ExpandLess, ExpandMore, HistoryOutlined, MenuBookOutlined, ReceiptLongOutlined, StorageOutlined } from '@mui/icons-material';
import { Box, Collapse, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Toolbar, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import { colors } from '@/theme/theme';
import { useQuery } from '@tanstack/react-query';
import { accessControlApi } from '@/api/accessControlApi';
import { canReadPath } from '@/auth/screenPermissionRoutes';

const expandedWidth = 240;
const collapsedWidth = 64;

interface NavItem {
  key: string;
  path: string;
  icon: ReactNode;
  children?: Array<{ label: string; path: string }>;
}

const items: NavItem[] = [
  { key: 'dashboard', path: '/', icon: <DashboardOutlined /> },
  { key: 'orders', path: '/orders', icon: <ReceiptLongOutlined />, children: [
    { label: 'dailyOrders', path: '/orders/daily' },
    { label: 'customers', path: '/customers' },
  ] },

  { key: 'meals', path: '/meals', icon: <DinnerDiningOutlined /> },
  { key: 'mealPlans', path: '/meal-plans', icon: <MenuBookOutlined /> },
  { key: 'operations', path: '/operations', icon: <CalendarMonthOutlined />, children: [
    { label: 'Delivery Calendar', path: '/operations/delivery-calendar' },
    { label: 'Holidays / Closures', path: '/operations/closures' },
  ] },
  { key: 'masterData', path: '/master-data', icon: <StorageOutlined />, children: [
    { label: 'categories', path: '/categories' },
    { label: 'ingredients', path: '/ingredients' },
    { label: 'allergens', path: '/allergens' },
    { label: 'mealTypes', path: '/meal-types' },
    { label: 'pricing', path: '/pricing' },
    { label: 'media', path: '/media' },
    { label: 'packageOptions', path: '/admin/package-options' },
    { label: 'durations', path: '/admin/durations' },
    { label: 'planPricing', path: '/admin/plan-pricing' },
  ] },
  { key: 'audit', path: '/audit', icon: <HistoryOutlined /> },
  { key: 'administration', path: '/administration', icon: <AdminPanelSettingsOutlined />, children: [
    { label: 'Settings', path: '/settings' },
    { label: 'Users', path: '/users' },
    { label: 'Roles', path: '/roles' },
  ] },
];

const matchesPath = (pathname: string, path: string) => pathname === path || (path !== '/' && pathname.startsWith(`${path}/`));
const activeGroup = (pathname: string) => items.find(item => item.children && (matchesPath(pathname, item.path) || item.children.some(child => matchesPath(pathname, child.path))))?.key ?? null;

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
  const compact = desktop && collapsed;
  const [openGroup, setOpenGroup] = useState<string | null>(() => activeGroup(location.pathname));
  const [flyout, setFlyout] = useState<{ key: string; anchor: HTMLElement } | null>(null);
  useEffect(() => {
    setOpenGroup(activeGroup(location.pathname));
    setFlyout(null);
  }, [location.pathname]);
  const width = compact ? collapsedWidth : expandedWidth;
  const visibleItems = items.map(item => item.children && permissions.data
    ? { ...item, children: item.children.filter(child => canReadPath(permissions.data, child.path)) }
    : item).filter(item => !permissions.data || (item.children ? item.children.length > 0 : canReadPath(permissions.data, item.path)));
  const flyoutItem = compact ? visibleItems.find(item => item.key === flyout?.key) : undefined;

  const content = (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', bgcolor: colors.emerald, color: 'white' }}>
      <Toolbar sx={{ gap: 1, minHeight: '64px !important', px: '16px !important', flexShrink: 0 }}>
        <Box sx={{ width: 32, height: 32, flexShrink: 0, borderRadius: 2, bgcolor: colors.lime, color: colors.dark, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 12 }}>DT</Box>
        {!compact && <Typography fontWeight={800} fontSize={14} noWrap>{t('appName')}</Typography>}
      </Toolbar>

      <List
        component="nav"
        aria-label="Main navigation"
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', px: 1, py: 1, scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,.4) transparent' }}
      >
        {visibleItems.map((item) => {
          const active = matchesPath(location.pathname, item.path) || !!item.children?.some(child => matchesPath(location.pathname, child.path));
          const expanded = compact ? flyoutItem?.key === item.key : openGroup === item.key;
          return (
            <Box key={item.path}>
              <Tooltip title={compact ? t(item.key) : ''} placement={theme.direction === 'rtl' ? 'left' : 'right'}>
                <ListItemButton
                  component={item.children ? 'button' : NavLink}
                  to={item.children ? undefined : item.path}
                  onClick={(event: MouseEvent<HTMLElement>) => {
                    if (!item.children) { onClose(); return; }
                    if (compact) setFlyout({ key: item.key, anchor: event.currentTarget });
                    else setOpenGroup(current => current === item.key ? null : item.key);
                  }}
                  selected={active}
                  aria-label={t(item.key)}
                  aria-expanded={item.children ? expanded : undefined}
                  aria-controls={item.children && expanded ? `nav-${item.key}` : undefined}
                  aria-haspopup={item.children && compact ? 'menu' : undefined}
                  sx={{
                    width: '100%',
                    borderRadius: 2,
                    minHeight: { xs: 44, md: 40 },
                    px: 1.5,
                    py: 0.5,
                    my: 0.25,
                    color: 'inherit',
                    '&:hover': { bgcolor: 'rgba(255,255,255,.08)' },
                    '&.Mui-focusVisible': { outline: `2px solid ${colors.lime}`, outlineOffset: -2 },
                    '&.Mui-selected': { bgcolor: 'rgba(206,241,123,.18)', color: colors.lime },
                    '&.Mui-selected:hover': { bgcolor: 'rgba(206,241,123,.24)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: compact ? 0 : 34, color: 'inherit', '& svg': { fontSize: 20 } }}>{item.icon}</ListItemIcon>
                  {!compact && <ListItemText primary={t(item.key)} primaryTypographyProps={{ fontSize: 13, fontWeight: active ? 700 : 500 }} />}
                  {item.children && !compact && (expanded ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />)}
                </ListItemButton>
              </Tooltip>
              {item.children && !compact && (
                <Collapse in={expanded} unmountOnExit>
                  <List id={`nav-${item.key}`} aria-label={t(item.key)} disablePadding sx={{ marginInlineStart: '22px', paddingInlineStart: '10px', borderInlineStart: '1px solid rgba(255,255,255,.2)', my: 0.5 }}>
                    {item.children.map((child) => (
                      <ListItemButton
                        key={child.path}
                        component={NavLink}
                        to={child.path}
                        end
                        onClick={onClose}
                        selected={matchesPath(location.pathname, child.path)}
                        aria-current={matchesPath(location.pathname, child.path) ? 'page' : undefined}
                        sx={{ px: 1.5, py: 0.5, borderRadius: 1.5, minHeight: { xs: 44, md: 34 }, fontSize: 12.5, '&.Mui-selected': { bgcolor: 'rgba(206,241,123,.12)', color: colors.lime, fontWeight: 700 }, '&.Mui-selected:hover': { bgcolor: 'rgba(206,241,123,.2)' } }}
                      >
                        {t(child.label)}
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              )}
            </Box>
          );
        })}
      </List>

      <Menu
        anchorEl={flyout?.anchor}
        open={!!flyoutItem}
        onClose={() => setFlyout(null)}
        anchorOrigin={{ vertical: 'top', horizontal: theme.direction === 'rtl' ? 'left' : 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: theme.direction === 'rtl' ? 'right' : 'left' }}
        slotProps={{ list: { id: flyoutItem ? `nav-${flyoutItem.key}` : undefined, 'aria-label': flyoutItem ? t(flyoutItem.key) : undefined }, paper: { sx: { minWidth: 208, maxHeight: 'calc(100vh - 32px)' } } }}
      >
        {flyoutItem?.children?.map(child => (
          <MenuItem key={child.path} component={NavLink} to={child.path} end selected={matchesPath(location.pathname, child.path)} onClick={() => { setFlyout(null); onClose(); }} sx={{ fontSize: 13, minHeight: 40 }}>
            {t(child.label)}
          </MenuItem>
        ))}
      </Menu>

      {desktop && (
        <Box sx={{ flexShrink: 0, display: 'flex', justifyContent: compact ? 'center' : 'flex-end', px: 1, py: 0.5, borderTop: '1px solid rgba(255,255,255,.12)' }}>
          <IconButton aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'} onClick={onToggle} sx={{ color: 'white' }}>
            {(compact !== (theme.direction === 'rtl')) ? <ChevronRight /> : <ChevronLeft />}
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
