import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function renderNginxConfig(template, apiBaseUrl) {
  const target = new URL(apiBaseUrl);
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.search || target.hash ||
      !/^(?:[a-z0-9.-]+|\[[a-f0-9:.]+\])$/i.test(target.hostname)) {
    throw new Error('VITE_API_BASE_URL must be an HTTP(S) API URL without credentials, query or fragment.');
  }
  return template.replaceAll('__DIET_TIME_API_ORIGIN__', target.origin)
    .replaceAll('__DIET_TIME_API_HOST__', target.host)
    .replaceAll('__DIET_TIME_API_HOSTNAME__', target.hostname);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const template = readFileSync('nginx.conf', 'utf8');
  writeFileSync('nginx.generated.conf', renderNginxConfig(template, process.env.VITE_API_BASE_URL));
}
