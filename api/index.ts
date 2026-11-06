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
 *
 * CORRECTION (2026-10-27 audit): the function is invoked with the
 * legacy Node signature `handler(req, res)` — `req.url` is a RELATIVE
 * path and `req.headers` a plain object — not with a Fetch Request.
 * The app logic lives in `appHandler` (Fetch API); the default export
 * at the bottom of this file adapts both invocation contracts to it.
 */
import dns from 'node:dns';
import * as serverBuild from '../dist/server/index.js';

// Serverless runtimes can stall outbound fetches on a broken IPv6
// route (works locally, hangs on Vercel). Prefer IPv4.
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Best-effort DNS preference; unsupported runtimes can safely ignore it.
}
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

async function appHandler(request: Request): Promise<Response> {
  const t0 = Date.now();
  const mark = (phase: string) =>
    console.log(`[wra-handler] ${phase} +${Date.now() - t0}ms`);
  try {
    mark('enter');
    const env = getEnv();
    if (!env.SESSION_SECRET) {
      throw new Error('SESSION_SECRET environment variable is not set');
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

/**
 * --- Vercel invocation-contract adapter ---------------------------------
 *
 * Everything above is written against the Fetch API:
 * `appHandler(request: Request): Promise<Response>`.
 *
 * The deployed Vercel Node runtime does NOT invoke /api functions that
 * way. @vercel/node calls the default export with the legacy Node
 * signature `handler(req, res)`:
 *   - `req` is an http.IncomingMessage: `req.url` is a RELATIVE path
 *     ('/collections/all'), and `req.headers` is a plain object
 *     (there is no `.get()` method on it).
 *   - The platform completes the invocation from the `res` object; a
 *     returned Fetch Response is ignored.
 *
 * The previous revision assumed a Fetch Request. In production that
 * produced `TypeError: Invalid URL` (thrown on '/'), earlier
 * `request.headers.get is not a function`, and — because the returned
 * Response was never written to `res` — invocations that hung until
 * the platform killed them at maxDuration: HTTP 504
 * FUNCTION_INVOCATION_TIMEOUT. (The same code "worked locally" because
 * local tests call the export with a real Fetch Request.)
 *
 * This adapter normalizes BOTH contracts onto the Fetch handler —
 * absolute URL built from the forwarded host/proto headers, plain
 * headers converted, request body read for non-GET methods — and
 * writes the resulting Response (status, headers, every Set-Cookie,
 * body) onto `res` when one was supplied, so behaviour is identical
 * whichever way the runtime invokes the function.
 */

type NodeReq = {
  url?: string;
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  [key: string]: unknown;
};

type NodeRes = {
  statusCode: number;
  setHeader(name: string, value: string | string[]): void;
  end(data?: unknown): void;
};

function isFetchRequest(value: unknown): value is Request {
  if (typeof Request !== 'undefined' && value instanceof Request) {
    return true;
  }
  // Duck-type fallback for cross-realm Request objects.
  const candidate = value as Request;
  return (
    typeof candidate?.url === 'string' &&
    /^https?:\/\//.test(candidate.url) &&
    typeof candidate?.headers?.get === 'function'
  );
}

function nodeHeadersToFetchHeaders(
  nodeHeaders: Record<string, string | string[] | undefined>,
): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(nodeHeaders ?? {})) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(name, v);
    } else {
      headers.set(name, value);
    }
  }
  return headers;
}

async function readNodeBody(req: NodeReq): Promise<Buffer | undefined> {
  const method = (req.method ?? 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of req as AsyncIterable<Buffer | string>) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function toFetchRequest(req: NodeReq): Promise<Request> {
  const headers = nodeHeadersToFetchHeaders(req.headers ?? {});
  const proto = headers.get('x-forwarded-proto') ?? 'https';
  const host =
    headers.get('x-forwarded-host') ?? headers.get('host') ?? 'localhost';
  const url = new URL(req.url ?? '/', `${proto}://${host}`);
  const method = (req.method ?? 'GET').toUpperCase();
  const body = await readNodeBody(req);
  return new Request(url, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : body,
  });
}

async function writeFetchResponse(
  res: NodeRes,
  response: Response,
): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, name) => {
    if (name.toLowerCase() === 'set-cookie') return; // handled below
    res.setHeader(name, value);
  });
  const setCookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [];
  if (setCookies.length) {
    res.setHeader('Set-Cookie', setCookies);
  } else {
    const single = response.headers.get('set-cookie');
    if (single) res.setHeader('Set-Cookie', single);
  }
  // Buffer the (streamed) body before ending the Node response: this
  // guarantees the invocation always terminates — a half-piped stream
  // was one of the hang modes this adapter exists to eliminate.
  const body = Buffer.from(await response.arrayBuffer());
  res.end(body);
}

export default async function handler(
  reqOrRequest: unknown,
  res?: NodeRes,
): Promise<Response | undefined> {
  const nodeStyle = res !== undefined || !isFetchRequest(reqOrRequest);
  const request = nodeStyle
    ? await toFetchRequest(reqOrRequest as NodeReq)
    : (reqOrRequest as Request);
  const response = await appHandler(request);
  if (nodeStyle && res) {
    await writeFetchResponse(res, response);
    return undefined;
  }
  return response;
}
