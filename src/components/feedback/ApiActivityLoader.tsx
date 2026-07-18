import { Backdrop, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useApiActivityStore } from '@/app/store/apiActivityStore';
import { colors } from '@/theme/theme';

export function ApiActivityLoader() {
  const activeRequests = useApiActivityStore((state) => state.activeRequests);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (activeRequests === 0) {
      setVisible(false);
      return;
    }

    const timer = window.setTimeout(() => setVisible(true), 180);
    return () => window.clearTimeout(timer);
  }, [activeRequests]);

  return <Backdrop
    open={visible}
    aria-live="polite"
    aria-label="Diet Time is loading"
    sx={{ zIndex: (theme) => theme.zIndex.modal + 100, bgcolor: 'rgba(247,246,241,.78)', backdropFilter: 'blur(2px)' }}
  >
    <Stack alignItems="center" spacing={1.5} sx={{ minWidth: 190, p: 3, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: '0 18px 55px rgba(23,53,45,.18)' }}>
      <Box sx={{ width: 74, height: 74, position: 'relative', display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={74} thickness={3} sx={{ position: 'absolute', color: colors.emerald }} />
        <Box sx={{ width: 50, height: 50, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: colors.lime, color: colors.dark, fontWeight: 900, letterSpacing: '-.04em' }}>
          DT
        </Box>
      </Box>
      <Box textAlign="center">
        <Typography variant="h3" color="primary.main">Diet Time</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.25}>Loading, please wait…</Typography>
      </Box>
    </Stack>
  </Backdrop>;
}
