import { expect, it } from 'vitest';
import { isNotificationReadRequest } from './notificationReadRequest';

it('permits only notification read receipts outside screen write permissions', () => {
  const id = '00000000-0000-0000-0000-000000000001';
  expect(isNotificationReadRequest('PATCH', `/api/admin/notifications/${id}/read`)).toBe(true);
  expect(isNotificationReadRequest('PATCH', 'https://admin.test/api/v1/admin/notifications/read-all')).toBe(true);
  expect(isNotificationReadRequest('POST', '/api/admin/notifications/read-all')).toBe(false);
  expect(isNotificationReadRequest('PATCH', '/api/admin/orders/id/payment')).toBe(false);
  expect(isNotificationReadRequest('PATCH', `/api/admin/notifications/${id}/read/other`)).toBe(false);
});
