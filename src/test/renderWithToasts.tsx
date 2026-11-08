import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useToastStore } from '@/app/store/toastStore';
import { ToastViewport } from '@/components/feedback/ToastViewport';

export function renderWithToasts(ui: ReactNode) {
  useToastStore.setState({ messages: [] });
  return render(ui, { wrapper: ({ children }) => <><ToastViewport />{children}</> });
}
