// @ts-nocheck
/**
 * Node-compatible request adapter for the Hydrogen server build.
 * This is bundled after `shopify hydrogen build` so local TypeScript
 * imports are resolved and the generated React Router build stays external.
 */
import dns from 'node:dns';
import * as serverBuild from '../dist/server/index.js';
import {
  createRequestHandler,
  createHydrogenContext,
  InMemoryCache,
  storefrontRedirect,
} from '@shopify/hydrogen';
import {AppSession} from '../app/lib/session.js';
import {CART_QUERY_FRAGMENT} from '../app/lib/fragments.js';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Best-effort preference for environments with unreliable IPv6 routing.
}

const cache = new InMemoryCache();

function safeWaitUntil(promise) {
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

async function appHandler(request) {
  try {
    const env = getEnv();
    if (!env.SESSION_SECRET) {
      throw new Error('SESSION_SECRET environment variable is not set');
    }

    const session = await AppSession.init(request, [env.SESSION_SECRET]);
    const hydrogenContext = createHydrogenContext({
      env,
      request,
      cache,
      waitUntil: safeWaitUntil,
      session,
      i18n: {language: 'EN', country: 'US'},
      cart: {queryFragment: CART_QUERY_FRAGMENT},
    });

    const handleRequest = createRequestHandler({
      build: serverBuild,
      mode: process.env.NODE_ENV,
      getLoadContext: () => hydrogenContext,
    });

    const response = await handleRequest(request);

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
    console.error('We Rise Above request failed:', error);
    return new Response('Internal Server Error', {status: 500});
  }
}

function nodeHeadersToFetchHeaders(nodeHeaders = {}) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(nodeHeaders)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else {
      headers.set(name, value);
    }
  }
  return headers;
}

async function readNodeBody(request) {
  const method = (request.method ?? 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') return undefined;
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function toFetchRequest(request) {
  const headers = nodeHeadersToFetchHeaders(request.headers);
  const protocol = headers.get('x-forwarded-proto') ?? 'https';
  const host =
    headers.get('x-forwarded-host') ?? headers.get('host') ?? 'localhost';
  const url = new URL(request.url ?? '/', `${protocol}://${host}`);
  const method = (request.method ?? 'GET').toUpperCase();
  const body = await readNodeBody(request);

  return new Request(url, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : body,
  });
}

async function writeFetchResponse(nodeResponse, response) {
  nodeResponse.statusCode = response.status;
  response.headers.forEach((value, name) => {
    if (name.toLowerCase() !== 'set-cookie') {
      nodeResponse.setHeader(name, value);
    }
  });

  const cookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [];
  if (cookies.length) {
    nodeResponse.setHeader('Set-Cookie', cookies);
  } else {
    const cookie = response.headers.get('set-cookie');
    if (cookie) nodeResponse.setHeader('Set-Cookie', cookie);
  }

  const body = Buffer.from(await response.arrayBuffer());
  nodeResponse.end(body);
}

function isFetchRequest(value) {
  return (
    typeof Request !== 'undefined' &&
    value instanceof Request
  );
}

export default async function handler(requestOrFetchRequest, nodeResponse) {
  const nodeStyle = nodeResponse !== undefined || !isFetchRequest(requestOrFetchRequest);
  const request = nodeStyle
    ? await toFetchRequest(requestOrFetchRequest)
    : requestOrFetchRequest;
  const response = await appHandler(request);

  if (nodeStyle && nodeResponse) {
    await writeFetchResponse(nodeResponse, response);
    return undefined;
  }

  return response;
}
