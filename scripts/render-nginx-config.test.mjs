import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderNginxConfig } from './render-nginx-config.mjs';

const template = readFileSync(new URL('../nginx.conf', import.meta.url), 'utf8');
test('proxies both versioned and unversioned API routes without duplicating the API prefix', () => {
  const config = renderNginxConfig(template, 'https://api.example.test:8443/api/v1/');
  assert.ok(config.includes('location ^~ /api/'));
  assert.ok(config.includes('proxy_pass https://api.example.test:8443;'));
  assert.ok(config.includes('proxy_set_header Host api.example.test:8443;'));
  assert.ok(config.includes('proxy_ssl_name api.example.test;'));
  assert.ok(config.includes('proxy_ssl_verify on;'));
  assert.ok(!config.includes('__DIET_TIME_'));
  assert.ok(!config.includes('proxy_cookie_flags'));
});
test('rejects missing, non-HTTP and credential-bearing upstreams', () => {
  for (const value of [undefined, '', 'file:///tmp/api', 'https://name:password@api.example.test', 'https://api.example.test/?x=1', 'https://api.example.test/#fragment', 'https://api.example.test;directive/']) {
    assert.throws(() => renderNginxConfig(template, value));
  }
});
