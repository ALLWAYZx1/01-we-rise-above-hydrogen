// @ts-nocheck
/**
 * Vercel Node function entry for the Hydrogen storefront.
 *
 * Mirrors the Oxygen worker entry (server.ts on main) but adapted for
 * Vercel Functions: env from process.env, an in-memory Web Cache API
 * implementation instead of the workerd `caches` global, and Vercel's
 * `waitUntil` so background work survives the response.
 *
 * NOTE: Vercel invokes a default-exported handler FUNCTION. It does not
 * call a worker-style `export default {fetch}` object — that shape dies
 * at launch with FUNCTION_INVOCATION_FAILED.
 */
import dns from 'node:dns';
import * as serverBuild from '../dist/server/index.js';

// Serverless runtimes can stall outbound fetches on a broken IPv6
// route (works locally, hangs on Vercel). Prefer IPv4.
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}
import {
  createRequestHandler,
  createHydrogenContext,
  InMemoryCache,
  storefrontRedirect,
} from '@shopify/hydrogen';
import {waitUntil} from '@vercel/functions';
import {AppSession} from '../app/lib/session.js';
import {CART_QUERY_FRAGMENT} from '../app/lib/fragments.js';

const cache = new InMemoryCache();

// Fire-and-forget. Deliberately NOT @vercel/functions' waitUntil:
// Hydrogen registers background promises (cache puts, session work)
// with it, and in Vercel's runtime a registered promise that never
// settles holds the response open until the platform timeout —
// observed as requests hanging with zero bytes sent while the same
// code answered in ~1s locally. With an in-process InMemoryCache,
// plain fire-and-forget loses nothing.
function safeWaitUntil(promise: Promise<unknown>) {
  Promise.resolve(promise).catch(() => {});
}

function getEnv() {
  return {
    SESSION_SECRET: process.env.SESSION_SECRET,
    PUBLIC_STORE_DOMAIN: process.env.PUBLIC_STORE_DOMAIN,
    PUBLIC_STOREFRONT_API_TOKEN: process.env.PUBLIC_STOREFRONT_API_TOKEN,
    PRIVATE_STOREFRONT_API_TOKEN: process.env.PRIVATE_STOREFRONT_API_TOKEN,
    PUBLIC_CHECKOUT_DOMAIN: process.env.PUBLIC_CHECKOUT_DOMAIN,
    PUBLIC_STOREFRONT_ID: process.env.PUBLIC_STOREFRONT_ID,
    SHOP_ID: process.env.SHOP_ID,
  };
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}: timeout ${ms}ms`)), ms),
    ),
  ]);
}

async function wraDiag(request: Request, env: ReturnType<typeof getEnv>) {
  const lines: string[] = [];
  const step = (s: string) => lines.push(s);
  step(
    `env: SESSION_SECRET=${env.SESSION_SECRET ? 'set' : 'MISSING'} DOMAIN=${env.PUBLIC_STORE_DOMAIN} PUBTOK=${env.PUBLIC_STOREFRONT_API_TOKEN ? 'set' : 'MISSING'} PRIVTOK=${env.PRIVATE_STOREFRONT_API_TOKEN ? 'set' : 'MISSING'}`,
  );
  let session: AppSession | null = null;
  try {
    session = await withTimeout(
      AppSession.init(request, [env.SESSION_SECRET]),
      6_000,
      'session',
    );
    step('session: OK');
  } catch (e) {
    step(`session: FAIL ${(e as Error).message}`);
    return new Response(lines.join('\n'), {
      headers: {'content-type': 'text/plain'},
    });
  }
  let hydrogenContext: ReturnType<typeof createHydrogenContext> | null = null;
  try {
    hydrogenContext = createHydrogenContext({
      env,
      request,
      cache,
      waitUntil: safeWaitUntil,
      session,
      i18n: {language: 'EN', country: 'US'},
      cart: {queryFragment: CART_QUERY_FRAGMENT},
    });
    step('context: OK');
  } catch (e) {
    step(`context: FAIL ${(e as Error).message}`);
    return new Response(lines.join('\n'), {
      headers: {'content-type': 'text/plain'},
    });
  }
  try {
    const data = await withTimeout(
      hydrogenContext.storefront.query('{ shop { name } }'),
      8_000,
      'storefront',
    );
    step(`storefront: OK ${JSON.stringify(data)}`);
  } catch (e) {
    step(`storefront: FAIL ${(e as Error).message}`);
  }
  try {
    const handleRequest = createRequestHandler({
      build: serverBuild,
      mode: process.env.NODE_ENV,
      getLoadContext: () => hydrogenContext,
    });
    const res = await withTimeout(
      handleRequest(new Request(new URL('/', request.url))),
      15_000,
      'handleRequest',
    );
    const body = await res.text();
    step(`handleRequest /: ${res.status} bytes=${body.length}`);
  } catch (e) {
    step(`handleRequest: FAIL ${(e as Error).message}`);
  }
  return new Response(lines.join('\n'), {
    headers: {'content-type': 'text/plain'},
  });
}

export default async function handler(request: Request): Promise<Response> {
  const t0 = Date.now();
  const mark = (phase: string) =>
    console.log(`[wra-handler] ${phase} +${Date.now() - t0}ms`);
  try {
    mark('enter');
    const env = getEnv();
    if (!env.SESSION_SECRET) {
      throw new Error('SESSION_SECRET environment variable is not set');
    }

    if (new URL(request.url).pathname === '/__wra_diag') {
      return await wraDiag(request, env);
    }

    const session = await withTimeout(
      AppSession.init(request, [env.SESSION_SECRET]),
      10_000,
      'session',
    );
    mark('session');

    const hydrogenContext = createHydrogenContext({
      env,
      request,
      cache,
      waitUntil: safeWaitUntil,
      session,
      i18n: {language: 'EN', country: 'US'},
      cart: {
        queryFragment: CART_QUERY_FRAGMENT,
      },
    });

    mark('context');

    const handleRequest = createRequestHandler({
      build: serverBuild,
      mode: process.env.NODE_ENV,
      getLoadContext: () => hydrogenContext,
    });

    // Watchdog: if anything upstream stalls (observed: requests hanging
    // to the platform timeout with zero bytes sent), fail visibly with
    // our own 500 instead of a platform 504 so the phase logs show
    // exactly where it stopped.
    const response = await Promise.race([
      handleRequest(request),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('handler watchdog: 25s')), 25_000),
      ),
    ]);
    mark('handled');

    if (hydrogenContext.session.isPending) {
      response.headers.set(
        'Set-Cookie',
        await hydrogenContext.session.commit(),
      );
    }

    if (response.status === 404) {
      return storefrontRedirect({
        request,
        response,
        storefront: hydrogenContext.storefront,
      });
    }

    return response;
  } catch (error) {
    console.error(error);
    return new Response('An unexpected error occurred', {status: 500});
  }
}
