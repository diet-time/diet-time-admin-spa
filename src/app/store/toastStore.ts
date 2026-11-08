import { create } from 'zustand';
import type { AlertColor } from '@mui/material';

export const TOAST_DURATION = 5_000;
export interface ToastMessage {
  id: number;
  message: string;
  severity: AlertColor;
  expiresAt: number;
}

let nextId = 0;
export const useToastStore = create<{
  messages: ToastMessage[];
  add: (message: string, severity: AlertColor) => void;
  dismiss: (id: number) => void;
}>((set) => ({
  messages: [],
  add: (message, severity) => set(state => ({ messages: [...state.messages,
    { id: ++nextId, message, severity, expiresAt: Date.now() + TOAST_DURATION }],
  })),
  dismiss: id => set(state => ({ messages: state.messages.filter(message => message.id !== id) })),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().add(message, 'success'),
  error: (message: string) => useToastStore.getState().add(message, 'error'),
  info: (message: string) => useToastStore.getState().add(message, 'info'),
  warning: (message: string) => useToastStore.getState().add(message, 'warning'),
};
