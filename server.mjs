import {access, readFile, stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import {extname, resolve, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {Readable} from 'node:stream';

const root = fileURLToPath(new URL('.', import.meta.url));
const clientDirectory = resolve(root, 'dist/client');
const serverBundlePath = resolve(root, 'dist/server/index.js');
const port = Number.parseInt(process.env.PORT || '3000', 10);
const host = '0.0.0.0';

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

process.env.NODE_ENV ??= 'production';
await access(serverBundlePath);
const {default: worker} = await import(pathToFileURL(serverBundlePath).href);
if (typeof worker?.fetch !== 'function') {
  throw new TypeError(`Expected ${serverBundlePath} to export a default fetch handler`);
}

// Hydrogen's worker entry calls caches.open(). Render runs plain Node, so use
// a process-local Web Cache-compatible store for this single-process service.
const cacheBuckets = new Map();
function cacheKey(input) {
  if (typeof input === 'string') return new URL(input, 'http://localhost').href;
  if (input instanceof URL) return input.href;
  return input.url;
}
function createCache() {
  const entries = new Map();
  return {
    async match(input) {
      const key = cacheKey(input);
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= Date.now()) {
        entries.delete(key);
        return undefined;
      }
      return entry.response.clone();
    },
    async put(input, response) {
      const key = cacheKey(input);
      const cacheControl = response.headers.get('cache-control') || '';
      const maxAge = Number(cacheControl.match(/(?:s-maxage|max-age)=(\d+)/i)?.[1] || 0);
      const stale = Number(cacheControl.match(/stale-while-revalidate=(\d+)/i)?.[1] || 0);
      const ttl = maxAge + stale;
      if (ttl > 0) {
        entries.set(key, {
          response: response.clone(),
          expiresAt: Date.now() + ttl * 1000,
        });
      }
    },
    async delete(input) {
      return entries.delete(cacheKey(input));
    },
  };
}

globalThis.caches ??= {
  async open(name) {
    if (!cacheBuckets.has(name)) cacheBuckets.set(name, createCache());
    return cacheBuckets.get(name);
  },
};

const envNames = [
  'MOCK_SHOP',
  'PRIVATE_STOREFRONT_API_TOKEN',
  'PUBLIC_CHECKOUT_DOMAIN',
  'PUBLIC_STORE_DOMAIN',
  'PUBLIC_STOREFRONT_API_TOKEN',
  'PUBLIC_STOREFRONT_ID',
  'PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID',
  'PUBLIC_GA_MEASUREMENT_ID',
  'PUBLIC_META_PIXEL_ID',
  'SESSION_SECRET',
  'SHOP_ID',
];
const env = Object.fromEntries(
  envNames
    .filter((name) => process.env[name] !== undefined)
    .map((name) => [name, process.env[name]]),
);
const storeDomainIsMock =
  env.PUBLIC_STORE_DOMAIN === 'mock.shop' ||
  Boolean(env.PUBLIC_STORE_DOMAIN?.endsWith('.mock.shop'));
const realStoreConfigured = Boolean(
  env.PRIVATE_STOREFRONT_API_TOKEN && env.PUBLIC_STORE_DOMAIN && !storeDomainIsMock,
);
if (!realStoreConfigured && env.MOCK_SHOP !== '1') env.MOCK_SHOP = '1';

if (env.MOCK_SHOP === '1') {
  process.stdout.write(
    '[WRA Render] Starting in MOCK mode (mock.shop). ' +
      'Set PRIVATE_STOREFRONT_API_TOKEN and PUBLIC_STORE_DOMAIN in Render to enable the real catalog.\n',
  );
} else {
  process.stdout.write(`[WRA Render] Real storefront mode configured for ${env.PUBLIC_STORE_DOMAIN}.\n`);
}

const pendingTasks = new Set();
const executionContext = {
  waitUntil(promise) {
    const task = Promise.resolve(promise)
      .catch((error) => console.error('[WRA Render] Background task failed:', error))
      .finally(() => pendingTasks.delete(task));
    pendingTasks.add(task);
  },
};

const contentTypes = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function serveStatic(pathname, method) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return new Response('Bad request', {status: 400});
  }

  const filePath = resolve(clientDirectory, `.${decodedPath}`);
  if (filePath !== clientDirectory && !filePath.startsWith(`${clientDirectory}${sep}`)) {
    return new Response('Not found', {status: 404});
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return null;
    const body = method === 'HEAD' ? null : await readFile(filePath);
    const headers = new Headers({
      'content-type': contentTypes[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'content-length': String(fileStat.size),
      'x-content-type-options': 'nosniff',
    });
    headers.set(
      'cache-control',
      pathname.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=0, must-revalidate',
    );
    return new Response(body, {status: 200, headers});
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return null;
    throw error;
  }
}

async function toFetchRequest(incoming, requestUrlOverride) {
  const protocol = incoming.headers['x-forwarded-proto']?.split(',')[0]?.trim() || 'http';
  const hostHeader = incoming.headers.host || `${host}:${port}`;
  const url = requestUrlOverride || `${protocol}://${hostHeader}${incoming.url || '/'}`;
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  const method = incoming.method || 'GET';
  const init = {method, headers};
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = Readable.toWeb(incoming);
    init.duplex = 'half';
  }
  return new Request(url, init);
}

async function sendResponse(outgoing, response, method) {
  outgoing.statusCode = response.status;
  response.headers.forEach((value, name) => {
    if (name.toLowerCase() !== 'set-cookie') outgoing.setHeader(name, value);
  });
  const cookies = response.headers.getSetCookie?.();
  if (cookies?.length) outgoing.setHeader('set-cookie', cookies);
  if (method === 'HEAD' || !response.body) {
    outgoing.end();
    return;
  }
  Readable.fromWeb(response.body).pipe(outgoing);
}

const server = createServer(async (incoming, outgoing) => {
  try {
    const method = incoming.method || 'GET';
    const url = new URL(incoming.url || '/', `http://${incoming.headers.host || 'localhost'}`);
    if (method === 'GET' || method === 'HEAD') {
      const staticResponse = await serveStatic(url.pathname, method);
      if (staticResponse) {
        await sendResponse(outgoing, staticResponse, method);
        return;
      }
    }

    const request = await toFetchRequest(incoming, url.href);
    const response = await worker.fetch(request, env, executionContext);
    await sendResponse(outgoing, response, method);
  } catch (error) {
    console.error('[WRA Render] Request failed:', error);
    if (!outgoing.headersSent) {
      outgoing.statusCode = 500;
      outgoing.setHeader('content-type', 'text/plain; charset=utf-8');
    }
    outgoing.end('Internal Server Error');
  }
});

server.listen(port, host, () => {
  process.stdout.write(`[WRA Render] Node server listening on http://${host}:${port}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
