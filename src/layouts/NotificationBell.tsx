import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';
import { AccessTimeRounded, AssignmentOutlined, CheckCircleOutline, CloseRounded, DoneAllRounded, LocalShippingOutlined, NotificationsNone, RefreshRounded, ReportProblemOutlined, StorefrontOutlined, TaskAltOutlined } from '@mui/icons-material';
import { Alert, Badge, Box, Button, ButtonBase, Chip, CircularProgress, IconButton, Popover, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notificationsApi, type StaffNotification } from '@/api/notificationsApi';
import { useAuthStore } from '@/app/store/authStore';

const notificationVisual = (type: string) => {
  if (type === 'DELIVERY_OVERDUE') return { icon: <ReportProblemOutlined />, label: 'Overdue', color: '#B42318', tint: '#FFF0ED' };
  if (type === 'ORDER_REJECTED') return { icon: <ReportProblemOutlined />, label: 'Rejected', color: '#B42318', tint: '#FFF0ED' };
  if (type === 'ORDER_CANCELLED') return { icon: <ReportProblemOutlined />, label: 'Cancelled', color: '#986000', tint: '#FFF6E6' };
  if (type === 'DELIVERED') return { icon: <LocalShippingOutlined />, label: 'Delivered', color: '#087A58', tint: '#E8F7EF' };
  if (type === 'COLLECTED') return { icon: <StorefrontOutlined />, label: 'Collected', color: '#087A58', tint: '#E8F7EF' };
  if (type === 'ORDER_APPROVED') return { icon: <CheckCircleOutline />, label: 'Confirmed', color: '#087A58', tint: '#E8F7EF' };
  return { icon: <AssignmentOutlined />, label: 'Pending Confirmation', color: '#2667A0', tint: '#EAF3FD' };
};

export function NotificationBell() {
  const user = useAuthStore(state => state.user);
  const audience = user?.roles.includes('Admin') ? 'admin' : 'restricted';
  const permitted = !!user?.roles.includes('Admin');
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string>();
  const client = useQueryClient();
  const navigate = useNavigate();
  const key = ['admin-notifications', user?.id, audience];
  const count = useQuery({ queryKey: [...key, 'count'], queryFn: ({ signal }) => notificationsApi.unreadCount(signal), enabled: permitted, refetchInterval: 45_000 });
  const list = useQuery({ queryKey: [...key, 'list', page], queryFn: ({ signal }) => notificationsApi.list(page, signal), enabled: permitted && !!anchor, refetchInterval: 45_000 });
  useEffect(() => { setAnchor(null); setPage(1); setError(undefined); }, [user?.id, audience]);
  const mutation = useMutation({
    mutationFn: (id?: string) => id ? notificationsApi.read(id) : notificationsApi.readAll(),
    onSuccess: async () => { setError(undefined); await client.invalidateQueries({ queryKey: key }); },
    onError: () => setError('Unable to mark notifications as read. Please try again.'),
  });
  const openNotification = async (notification: StaffNotification) => {
    try {
      if (!notification.readAt) await mutation.mutateAsync(notification.id);
      setAnchor(null);
      navigate(notification.targetUrl);
    } catch { /* Keep the inbox open with retry feedback. */ }
  };

  return <>
    <Tooltip title={count.isError ? 'Notifications unavailable' : 'Notifications'}><IconButton aria-label="Notifications" aria-haspopup="dialog" aria-expanded={!!anchor} onClick={event => { setPage(1); setAnchor(event.currentTarget); }}>
      <Badge color="error" badgeContent={count.data ?? 0} max={99} invisible={!permitted || !count.data}><NotificationsNone /></Badge>
    </IconButton></Tooltip>
    <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { role: 'dialog', 'aria-label': 'Notifications', sx: { display: 'flex', flexDirection: 'column', maxHeight: 'calc(100dvh - 80px)', '& > *': { flexShrink: 0 }, width: 400, maxWidth: 'calc(100vw - 24px)', mt: 1.25, borderRadius: 3, overflow: 'hidden', border: '1px solid #E1EAE5', boxShadow: '0 18px 60px rgba(18,52,40,.18)' } } }}>
      <Stack direction="row" alignItems="center" gap={1} px={1.5} py={1} sx={{ color: 'white', background: 'linear-gradient(120deg, #064E3B, #0D7258)' }}>
        <Box sx={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 2, bgcolor: 'rgba(255,255,255,.13)' }}><NotificationsNone /></Box>
        <Box flex={1}><Typography fontWeight={800}>Notifications</Typography>{!!count.data && <Chip size="small" label={count.data + ' unread'} sx={{ height: 19, color: 'inherit', bgcolor: 'rgba(255,255,255,.13)' }} />}</Box>
        {permitted && <Tooltip title="Refresh notifications"><span><IconButton size="small" aria-label="Refresh notifications" disabled={count.isFetching || list.isFetching} sx={{ color: 'inherit' }} onClick={() => void client.invalidateQueries({ queryKey: key })}>{count.isFetching || list.isFetching ? <CircularProgress size={18} color="inherit" /> : <RefreshRounded fontSize="small" />}</IconButton></span></Tooltip>}
        <IconButton size="small" aria-label="Close notifications" sx={{ color: 'inherit' }} onClick={() => setAnchor(null)}><CloseRounded fontSize="small" /></IconButton>
      </Stack>
      {permitted && <Stack direction="row" alignItems="center" justifyContent="space-between" px={2} py={1} borderBottom="1px solid" borderColor="divider">
        <Typography variant="caption" color="text.secondary">{count.isPending ? 'Checking for updates…' : count.isError ? 'Unread count unavailable' : count.data ? null : 'All caught up'}</Typography>
        <Button size="small" sx={{ minHeight: 28 }} startIcon={<DoneAllRounded fontSize="small" />} disabled={!count.data || mutation.isPending} onClick={() => mutation.mutate(undefined)}>Mark All as Read</Button>
      </Stack>}
      {error && <Alert severity="error">{error}</Alert>}
      {list.isError && permitted && <Alert severity="error" action={<Button onClick={() => void list.refetch()}>Retry</Button>}>Unable to refresh notifications.{list.data ? ' Showing the last loaded updates.' : ''}</Alert>}
      {!permitted ? <Typography p={2} color="text.secondary">Order notifications are available to Admin staff.</Typography>
        : list.isPending ? <Stack spacing={1.25} p={2} aria-label="Loading notifications">{[0, 1, 2].map(index => <Skeleton key={index} variant="rounded" height={96} />)}</Stack>
          : list.data && !list.data.items.length ? <Stack alignItems="center" spacing={1} py={5} px={3}><Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: '#EDF7F1', display: 'grid', placeItems: 'center' }}><TaskAltOutlined sx={{ color: '#19815E', fontSize: 32 }} /></Box><Typography fontWeight={750}>You're all caught up</Typography><Typography variant="body2" color="text.secondary">No notifications yet.</Typography></Stack>
            : list.data ? <Stack aria-label="Notification list" sx={{ minHeight: 0, flex: '1 1 auto', overflowY: 'auto' }}>{list.data.items.map(notification => {
              const visual = notificationVisual(notification.eventType);
              return <Box key={notification.id} component="article" aria-label={notification.title} sx={{ bgcolor: notification.readAt ? 'background.paper' : '#F0F8F4', borderBottom: '1px solid', borderColor: 'divider', overflowWrap: 'anywhere' }}>
                <ButtonBase disabled={mutation.isPending} onClick={() => void openNotification(notification)} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, width: '100%', px: 1.5, py: 1, pb: notification.readAt ? 1 : 0.25, textAlign: 'start' }}>
                  <Box sx={{ flexShrink: 0, width: 26, height: 26, borderRadius: 1, '& svg': { fontSize: 18 }, color: visual.color, bgcolor: visual.tint, display: 'grid', placeItems: 'center' }}>{visual.icon}</Box><Box flex={1} minWidth={0}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={0.75} mb={0.25}><Typography variant="body2" fontWeight={750} sx={{ overflowWrap: 'anywhere' }}>{notification.customerName || notification.title}</Typography>{!notification.readAt && <Box component="span" aria-label="Unread" sx={{ flexShrink: 0, width: 7, height: 7, bgcolor: 'primary.main', borderRadius: '50%' }} />}</Stack>
                    <Chip size="small" label={visual.label} sx={{ height: 18, mb: 0.25, fontSize: 10, fontWeight: 750, color: visual.color, bgcolor: visual.tint }} />
                    <Typography variant="body2" color="text.secondary">{notification.message}</Typography>
                    <Typography variant="caption" fontWeight={700} display="block" mt={0.25}>{notification.orderNumber}</Typography>
                    <Stack direction="row" gap={0.5} alignItems="center" mt={0.25} color="text.secondary"><AccessTimeRounded sx={{ fontSize: 12 }} /><Typography variant="caption" title={new Date(notification.createdAt).toLocaleString('en-QA', { timeZone: 'Asia/Qatar' }) + ' (Qatar)'}>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</Typography></Stack>
                  </Box>
                </ButtonBase>
                {!notification.readAt && <Box textAlign="right" px={1.5} pb={0.25}><Button size="small" sx={{ fontSize: 11, minHeight: 24 }} disabled={mutation.isPending} onClick={() => mutation.mutate(notification.id)}>Mark as Read</Button></Box>}
              </Box>;
            })}</Stack> : null}
      {permitted && list.data && list.data.totalCount > 20 && <Stack direction="row" justifyContent="space-between" p={1}>
        <Button size="small" disabled={page === 1 || list.isFetching} onClick={() => setPage(value => value - 1)}>Newer</Button>
        <Typography variant="caption" alignSelf="center">Page {page}</Typography>
        <Button size="small" disabled={page * 20 >= list.data.totalCount || list.isFetching} onClick={() => setPage(value => value + 1)}>Older</Button>
      </Stack>}
    </Popover>
  </>;
}
