import {createRequestHandler, RouterContextProvider} from 'react-router';
import * as serverBuild from 'virtual:react-router/server-build';

import {envContext} from '~/lib/env';
import {cacheContext, waitUntilContext} from '~/lib/worker-context';

/**
 * Export a fetch handler in module format for Oxygen / mini-oxygen.
 *
 * Ported from the repo 06 shell (Hydrogen 2026.10 pattern).
 *
 * Gap 4 (resolved in Phase 2): the classic shell called
 * `storefrontRedirect` here on 404 responses to honor Shopify-managed
 * redirects. Hydrogen 2026.10 removed that helper; WRA now answers 404
 * redirects inside the root middleware (app/root.tsx) via
 * `handleShopifyRedirects` + route templates, the repo 06 pattern.
 * This entry stays a plain pass-through, exactly as repo 06's does.
 */
export default {
  async fetch(
    rawRequest: Request,
    env: Env,
    executionContext: ExecutionContext,
  ): Promise<Response> {
    try {
      const request = toPublicRequest(rawRequest);
      const method = request.method;
      if ((method === 'GET' || method === 'HEAD') && request.body) {
        return new Response(`${method} requests cannot have a body`, {
          status: 400,
        });
      }

      const url = new URL(request.url);
      if (url.pathname.includes('//')) {
        return new Response(null, {
          status: 301,
          headers: {location: url.pathname.replace(/[/]+/g, '/')},
        });
      }

      const routerContext = new RouterContextProvider();
      routerContext.set(envContext, env);
      routerContext.set(cacheContext, await caches.open('hydrogen-v1'));
      routerContext.set(
        waitUntilContext,
        executionContext.waitUntil.bind(executionContext),
      );

      const handleRequest = createRequestHandler(
        serverBuild,
        process.env.NODE_ENV,
      );
      return handleRequest(request, routerContext);
    } catch (error) {
      console.error(error);
      return new Response('An unexpected error occurred', {status: 500});
    }
  },
};

// Behind a proxy that terminates TLS, such as a tunnel, the worker sees `http:`
// with `x-forwarded-proto: https`. Customer Account OAuth needs the public
// `https:` origin.
function toPublicRequest(request: Request): Request {
  const url = new URL(request.url);
  if (
    url.protocol !== 'http:' ||
    request.headers.get('x-forwarded-proto') !== 'https'
  ) {
    return request;
  }
  url.protocol = 'https:';
  return new Request(url, request);
}
