import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { apiClient } from '@/api/apiClient';
import { MasterDataExportButton } from './MasterDataExportButton';

vi.mock('@/api/apiClient', () => ({ apiClient: { get: vi.fn() } }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

it('downloads the complete bilingual export as a blob with no page filters', async () => {
  const blob = new Blob(['English,Arabic']);
  vi.mocked(apiClient.get).mockResolvedValue({ data: blob });
  const create = vi.fn(() => 'blob:master-export');
  vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: vi.fn() });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  render(<MasterDataExportButton />);
  fireEvent.click(screen.getByRole('button', { name: 'Export all master data' }));
  await waitFor(() => expect(click).toHaveBeenCalledOnce());
  expect(apiClient.get).toHaveBeenCalledWith('/admin/master-data/export', { responseType: 'blob', skipGlobalLoading: true });
  expect(create).toHaveBeenCalledWith(blob);
});

it('prevents duplicate requests and allows retry after failure', async () => {
  let reject!: (reason: Error) => void;
  vi.mocked(apiClient.get).mockReturnValue(new Promise((_, fail) => { reject = fail; }));
  render(<MasterDataExportButton />);
  const button = screen.getByRole('button', { name: 'Export all master data' });
  fireEvent.click(button); fireEvent.click(button);
  expect(apiClient.get).toHaveBeenCalledOnce();
  expect(button).toBeDisabled();
  reject(new Error('network'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to export master data');
  expect(screen.getByRole('button', { name: 'Export all master data' })).toBeEnabled();
});
