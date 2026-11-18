// Production Node entry for the Hydrogen storefront.
//
// The React Router build emits an Oxygen Worker bundle at
// dist/server/index.js (entry: server.ts) plus client assets at
// dist/client. This entry runs that exact Worker under
// @shopify/mini-oxygen — the same workerd runtime Oxygen uses —
// loading it the way mini-oxygen's own preview server does
// (modulesRoot + an ESModule entry), and serves it, assets included,
// on PORT. `npm start` therefore boots the same artifact that
// deploys to Oxygen.
//
// History: this file previously delegated to a generated Node adapter
// at api/handler.js (built by scripts/build-node-handler.mjs from
// api/index.ts). The Oxygen pipeline switch (PRs #131/#132) dropped
// that generation step, and the adapter's contract no longer exists:
// it imported dist/server/index.js as a React Router server build,
// but that path is now the Worker bundle itself. The import of the
// missing file is what killed `npm start` with ERR_MODULE_NOT_FOUND.
import {createServer} from 'node:http';
import {existsSync, readFileSync} from 'node:fs';
import {Readable} from 'node:stream';
import {dirname, resolve} from 'node:path';
import {createMiniOxygen, Request as WorkerRequest} from '@shopify/mini-oxygen';

const port = Number(process.env.PORT || 3000);
const workerFile = resolve('dist/server/index.js');
const assetsDir = resolve('dist/client');

if (!existsSync(workerFile) || !existsSync(assetsDir)) {
  console.error(
    'We Rise Above: build output missing (dist/server/index.js / dist/client). Run `npm run build` first.',
  );
  process.exit(1);
}

// The Worker build stamps its Oxygen compatibility date into
// dist/server/oxygen.json; run it under the same date.
let compatibilityDate = '2025-04-01';
try {
  const oxygenJson = JSON.parse(
    readFileSync(resolve('dist/server/oxygen.json'), 'utf-8'),
  );
  if (oxygenJson.compatibility_date) {
    compatibilityDate = oxygenJson.compatibility_date;
  }
} catch {
  // Fall back to the default above.
}

// The Worker reads its configuration from bindings; on a Node host
// those are the process environment (same variable names the retired
// adapter used: SESSION_SECRET, PUBLIC_STORE_DOMAIN,
// PUBLIC_STOREFRONT_API_TOKEN, PRIVATE_STOREFRONT_API_TOKEN,
// PUBLIC_CHECKOUT_DOMAIN, PUBLIC_STOREFRONT_ID, SHOP_ID).
const env = {};
for (const [key, value] of Object.entries(process.env)) {
  if (typeof value === 'string') env[key] = value;
}

const miniOxygen = createMiniOxygen({
  assets: {directory: assetsDir},
  workers: [
    {
      name: 'we-rise-above',
      modulesRoot: dirname(workerFile),
      modules: [
        {
          type: 'ESModule',
          path: workerFile,
          contents: readFileSync(workerFile, 'utf-8'),
        },
      ],
      bindings: env,
      compatibilityDate,
    },
  ],
});

await miniOxygen.ready;

const server = createServer(async (request, response) => {
  try {
    const url = new URL(
      request.url || '/',
      `http://${request.headers.host || 'localhost'}`,
    );
    const method = (request.method || 'GET').toUpperCase();
    const hasBody = method !== 'GET' && method !== 'HEAD';
    const workerRequest = new WorkerRequest(url, {
      method,
      headers: request.headers,
      body: hasBody ? Readable.toWeb(request) : undefined,
      duplex: hasBody ? 'half' : undefined,
    });

    const workerResponse = await miniOxygen.dispatchFetch(workerRequest);

    response.statusCode = workerResponse.status;
    workerResponse.headers.forEach((value, name) => {
      if (name.toLowerCase() !== 'set-cookie') {
        response.setHeader(name, value);
      }
    });
    const cookies =
      typeof workerResponse.headers.getSetCookie === 'function'
        ? workerResponse.headers.getSetCookie()
        : [];
    if (cookies.length) {
      response.setHeader('Set-Cookie', cookies);
    } else {
      const cookie = workerResponse.headers.get('set-cookie');
      if (cookie) response.setHeader('Set-Cookie', cookie);
    }

    if (workerResponse.body) {
      Readable.fromWeb(workerResponse.body).pipe(response);
    } else {
      response.end();
    }
  } catch (error) {
    console.error('We Rise Above request failed:', error);
    if (!response.headersSent) response.statusCode = 500;
    response.end('Internal Server Error');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`We Rise Above listening on 0.0.0.0:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    try {
      server.close();
      await miniOxygen.dispose();
    } finally {
      process.exit(0);
    }
  });
}
