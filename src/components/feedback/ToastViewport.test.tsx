import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast, useToastStore } from '@/app/store/toastStore';
import { ToastViewport } from './ToastViewport';

describe('Shared toast notifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ messages: [] });
  });
  afterEach(() => {
    cleanup();
    useToastStore.setState({ messages: [] });
    vi.useRealTimers();
  });

  it('appears in a fixed top-right panel and disappears after five seconds', () => {
    render(<ToastViewport />);
    act(() => toast.success('Order updated.'));
    expect(screen.getByRole('region', { name: 'Notifications' })).toHaveStyle({ position: 'fixed', top: '16px', right: '16px' });
    expect(screen.getByRole('status')).toHaveTextContent('Order updated.');
    act(() => vi.advanceTimersByTime(4999));
    expect(screen.getByText('Order updated.')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText('Order updated.')).not.toBeInTheDocument();
  });

  it('gives repeated messages their own five-second lifetime', () => {
    render(<ToastViewport />);
    act(() => toast.info('Saved'));
    act(() => vi.advanceTimersByTime(3000));
    act(() => toast.info('Saved'));
    expect(screen.getAllByText('Saved')).toHaveLength(2);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getAllByText('Saved')).toHaveLength(1);
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('allows manual dismissal without dismissing other messages', () => {
    render(<ToastViewport />);
    act(() => { toast.error('Unable to save'); toast.warning('Check the package'); });
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to save');
    fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss notification' })[0]!);
    expect(screen.queryByText('Unable to save')).not.toBeInTheDocument();
    expect(screen.getByText('Check the package')).toBeInTheDocument();
  });

  it('keeps the original expiry when the viewport remounts during navigation', () => {
    const view = render(<ToastViewport />);
    act(() => toast.success('Published'));
    act(() => vi.advanceTimersByTime(3000));
    view.unmount();
    render(<ToastViewport />);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByText('Published')).not.toBeInTheDocument();
  });
});
