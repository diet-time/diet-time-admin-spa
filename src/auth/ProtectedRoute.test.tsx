import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/app/store/authStore';
import { ProtectedRoute } from './ProtectedRoute';
import { restoreSession } from './session';

vi.mock('./session', () => ({ restoreSession: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); useAuthStore.setState({ user: null, status: 'checking' }); });
function Location() { const location = useLocation(); return <p>{location.pathname + location.search}</p>; }
function show() { return render(<MemoryRouter initialEntries={['/orders/daily?serviceDate=2026-11-02']}><Location /><Routes><Route element={<ProtectedRoute />}><Route path="/orders/daily" element={<p>Daily orders</p>} /></Route><Route path="/login" element={<p>Sign in</p>} /></Routes></MemoryRouter>); }

it('does not redirect during restoration and keeps the original URL after success', () => {
  show(); expect(screen.getByLabelText('Checking session')).toBeInTheDocument();
  expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
  act(() => useAuthStore.getState().setSession({ id: 'admin', name: 'Admin', email: 'admin@example.test', roles: ['Admin'] }));
  expect(screen.getByText('Daily orders')).toBeInTheDocument();
  expect(screen.getByText('/orders/daily?serviceDate=2026-11-02')).toBeInTheDocument();
});
it('offers connection retry without navigating away or rendering protected content', () => {
  useAuthStore.getState().sessionUnavailable(); show();
  expect(screen.queryByText('Daily orders')).not.toBeInTheDocument();
  expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry connection' }));
  expect(restoreSession).toHaveBeenCalledOnce();
  expect(screen.getByText('/orders/daily?serviceDate=2026-11-02')).toBeInTheDocument();
});
it('redirects a rejected session to login', () => {
  useAuthStore.getState().clear(); show();
  expect(screen.getByText('Sign in')).toBeInTheDocument();
});
