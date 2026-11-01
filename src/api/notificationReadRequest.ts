/** Personal read receipts are available from any header, including read-only screens. */
export const isNotificationReadRequest = (method: string, url: string) => method === 'PATCH' &&
  /\/api\/(?:v\d+\/)?admin\/notifications\/(?:read-all|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/read)$/i.test(url);
