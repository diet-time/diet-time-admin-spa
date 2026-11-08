import { afterEach, describe, expect, it } from 'vitest';
import { queryClient } from './queryClient';
import { toast, useToastStore } from './store/toastStore';

afterEach(() => { queryClient.clear(); useToastStore.setState({ messages: [] }); });

describe('Mutation error notifications', () => {
  it('shows the server error in the shared toast panel', async () => {
    const error = { isAxiosError: true, response: { data: { message: 'Review pricing before publishing.' } } };
    const mutation = queryClient.getMutationCache().build(queryClient, { mutationFn: async () => { throw error; } });
    await expect(mutation.execute(undefined)).rejects.toBe(error);
    expect(useToastStore.getState().messages).toEqual([expect.objectContaining({ severity: 'error', message: 'Review pricing before publishing.' })]);
  });

  it('does not duplicate a message from an operation-specific error handler', async () => {
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationFn: async () => { throw new Error('network'); },
      onError: () => toast.error('Unable to update this order.'),
    });
    await expect(mutation.execute(undefined)).rejects.toThrow('network');
    expect(useToastStore.getState().messages).toHaveLength(1);
    expect(useToastStore.getState().messages[0]?.message).toBe('Unable to update this order.');
  });
});
