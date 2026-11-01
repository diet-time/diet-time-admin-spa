import { useEffect, useState } from 'react';
import { AssignmentOutlined, CheckCircleOutline, LocalShippingOutlined, NotificationsNone, ReportProblemOutlined, StorefrontOutlined, TaskAltOutlined } from '@mui/icons-material';
import { Alert, Badge, Box, Button, ButtonBase, CircularProgress, Divider, IconButton, Popover, Stack, Tooltip, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notificationsApi, type StaffNotification } from '@/api/notificationsApi';
import { useAuthStore } from '@/app/store/authStore';

const notificationIcon = (type: string) => type === 'DELIVERY_OVERDUE' || type === 'ORDER_REJECTED' || type === 'ORDER_CANCELLED' ? <ReportProblemOutlined color="warning" />
  : type === 'DELIVERED' ? <LocalShippingOutlined color="success" /> : type === 'COLLECTED' ? <StorefrontOutlined color="success" />
    : type === 'ORDER_APPROVED' ? <CheckCircleOutline color="success" /> : <AssignmentOutlined color="primary" />;

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
    <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { role: 'dialog', 'aria-label': 'Notifications', sx: { width: 390, maxWidth: 'calc(100vw - 24px)', mt: 1, borderRadius: 2 } } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" px={2} py={1.5} gap={1}>
        <Typography fontWeight={750}>Notifications</Typography>
        {permitted && <Button size="small" disabled={!count.data || mutation.isPending} onClick={() => mutation.mutate(undefined)}>Mark All as Read</Button>}
      </Stack><Divider />
      {error && <Alert severity="error">{error}</Alert>}
      {!permitted ? <Typography p={2} color="text.secondary">Order notifications are available to Admin staff.</Typography>
        : list.isPending ? <Stack alignItems="center" p={3}><CircularProgress size={22} aria-label="Loading notifications" /></Stack>
          : list.isError ? <Alert severity="error" action={<Button onClick={() => void list.refetch()}>Retry</Button>}>Unable to load notifications.</Alert>
            : !list.data?.items.length ? <Stack alignItems="center" spacing={1} p={4}><TaskAltOutlined color="disabled" /><Typography color="text.secondary">No notifications yet.</Typography></Stack>
              : <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>{list.data.items.map(notification => <Box key={notification.id} component="article" aria-label={notification.title} sx={{ bgcolor: notification.readAt ? 'background.paper' : '#EEF7F4', borderBottom: '1px solid', borderColor: 'divider' }}>
                <ButtonBase disabled={mutation.isPending} onClick={() => void openNotification(notification)} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, width: '100%', px: 2, pt: 1.5, pb: notification.readAt ? 1.5 : 0.5, textAlign: 'start' }}>
                  <Box pt={0.25}>{notificationIcon(notification.eventType)}</Box><Box flex={1} minWidth={0}>
                    <Typography variant="body2" fontWeight={notification.readAt ? 500 : 800}>{notification.title}{!notification.readAt && <Box component="span" aria-label="Unread" sx={{ display: 'inline-block', ml: 1, width: 6, height: 6, bgcolor: 'error.main', borderRadius: '50%' }} />}</Typography>
                    <Typography variant="body2" color="text.secondary">{notification.message}</Typography>
                    <Typography variant="caption" display="block" mt={0.5}>{notification.orderNumber}</Typography>
                    <Typography variant="caption" color="text.secondary">{new Date(notification.createdAt).toLocaleString('en-QA', { timeZone: 'Asia/Qatar' })} (Qatar)</Typography>
                  </Box>
                </ButtonBase>
                {!notification.readAt && <Box pl={6.25} pb={1}><Button size="small" disabled={mutation.isPending} onClick={() => mutation.mutate(notification.id)}>Mark as Read</Button></Box>}
              </Box>)}</Box>}
      {permitted && list.data && list.data.totalCount > 20 && <Stack direction="row" justifyContent="space-between" p={1}>
        <Button size="small" disabled={page === 1 || list.isFetching} onClick={() => setPage(value => value - 1)}>Newer</Button>
        <Typography variant="caption" alignSelf="center">Page {page}</Typography>
        <Button size="small" disabled={page * 20 >= list.data.totalCount || list.isFetching} onClick={() => setPage(value => value + 1)}>Older</Button>
      </Stack>}
    </Popover>
  </>;
}
