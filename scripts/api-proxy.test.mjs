import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { once } from 'node:events';
import { createServer as createViteServer } from 'vite';

test('same-origin Vite proxy preserves refresh cookies and both API route prefixes', async () => {
  const calls = [];
  const upstream = createHttpServer((request, response) => {
    calls.push({ url: request.url, cookie: request.headers.cookie });
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/api/v1/auth/login') {
      response.setHeader('Set-Cookie', 'diet_time_refresh=proxy-test; Path=/api/v1/auth; HttpOnly; SameSite=Strict');
      response.end(JSON.stringify({ data: { accessToken: 'test-access' } }));
    } else if (request.url === '/api/v1/auth/refresh') {
      response.statusCode = request.headers.cookie === 'diet_time_refresh=proxy-test' ? 200 : 401;
      response.end(JSON.stringify({ data: { accessToken: 'rotated-access' } }));
    } else response.end(JSON.stringify({ data: { unreadCount: 3 } }));
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const oldApiUrl = process.env.VITE_API_BASE_URL;
  process.env.VITE_API_BASE_URL = `http://127.0.0.1:${upstream.address().port}/api/v1/`;
  let vite;
  try {
    vite = await createViteServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' });
    await vite.listen();
    const origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
    const login = await fetch(`${origin}/api/v1/auth/login`, { method: 'POST' });
    assert.equal(login.status, 200);
    assert.match(login.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    const refresh = await fetch(`${origin}/api/v1/auth/refresh`, { method: 'POST', headers: { Cookie: 'diet_time_refresh=proxy-test' } });
    assert.equal(refresh.status, 200);
    assert.equal((await refresh.json()).data.accessToken, 'rotated-access');
    const admin = await fetch(`${origin}/api/admin/notifications/unread-count`);
    assert.equal((await admin.json()).data.unreadCount, 3);
    assert.deepEqual(calls.map(call => call.url), ['/api/v1/auth/login', '/api/v1/auth/refresh', '/api/admin/notifications/unread-count']);
    assert.equal(calls[1].cookie, 'diet_time_refresh=proxy-test');
  } finally {
    await vite?.close();
    upstream.closeAllConnections();
    await new Promise(resolve => upstream.close(resolve));
    if (oldApiUrl === undefined) delete process.env.VITE_API_BASE_URL;
    else process.env.VITE_API_BASE_URL = oldApiUrl;
  }
});
