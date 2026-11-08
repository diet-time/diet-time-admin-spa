import { Alert, Box, Portal } from '@mui/material';
import { useEffect } from 'react';
import { useToastStore, type ToastMessage } from '@/app/store/toastStore';

function Toast({ message }: { message: ToastMessage }) {
  const dismiss = useToastStore(state => state.dismiss);
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(message.id), Math.max(0, message.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [dismiss, message.id, message.expiresAt]);

  return <Alert
    severity={message.severity}
    variant="filled"
    role={message.severity === 'error' ? 'alert' : 'status'}
    onClose={() => dismiss(message.id)}
    closeText="Dismiss notification"
    sx={{ width: '100%', borderRadius: '10px', boxShadow: '0 8px 28px rgba(23,53,45,.18)',
      alignItems: 'flex-start', overflowWrap: 'anywhere', '& .MuiAlert-message': { minWidth: 0 } }}
  >{message.message}</Alert>;
}

export function ToastViewport() {
  const messages = useToastStore(state => state.messages);
  if (!messages.length) return null;
  return <Portal><Box
    component="section"
    aria-label="Notifications"
    style={{ position: 'fixed', top: 16, right: 16 }}
    sx={{ zIndex: theme => theme.zIndex.snackbar, width: 'min(380px, calc(100vw - 32px))',
      maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', display: 'flex', flexDirection: 'column',
      gap: 1, pointerEvents: 'none', '& > *': { pointerEvents: 'auto', flexShrink: 0 } }}
  >{messages.map(message => <Toast key={message.id} message={message} />)}</Box></Portal>;
}
