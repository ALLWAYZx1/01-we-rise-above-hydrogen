import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {extname, resolve, sep} from 'node:path';
import handler from './api/handler.js';

const clientRoot = resolve('dist/client');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function serveAsset(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
  } catch {
    return false;
  }
  const filePath = resolve(clientRoot, `.${pathname}`);
  if (filePath !== clientRoot && !filePath.startsWith(clientRoot + sep)) return false;
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return false;
    response.statusCode = 200;
    response.setHeader('Content-Type', contentTypes[extname(filePath)] || 'application/octet-stream');
    response.setHeader('Content-Length', info.size);
    response.setHeader(
      'Cache-Control',
      pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
    );
    if (request.method === 'HEAD') response.end();
    else createReadStream(filePath).pipe(response);
    return true;
  } catch {
    return false;
  }
}

const port = Number(process.env.PORT || 3000);
const server = createServer(async (request, response) => {
  if (await serveAsset(request, response)) return;
  Promise.resolve(handler(request, response)).catch((error) => {
    console.error('We Rise Above request failed:', error);
    if (!response.headersSent) response.statusCode = 500;
    response.end('Internal Server Error');
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`We Rise Above listening on 0.0.0.0:${port}`);
});