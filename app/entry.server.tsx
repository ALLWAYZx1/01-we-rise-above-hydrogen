import type {EntryContext} from 'react-router';
import {ServerRouter} from 'react-router';
import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {
  createContentSecurityPolicy,
  type HydrogenRouterContextProvider,
} from '@shopify/hydrogen';

/**
 * Worker-compatible server entry (Shopify Oxygen / workerd).
 *
 * This file is bundled into the shared React Router server build
 * (dist/server) that BOTH hosting targets consume:
 *
 * - Oxygen wraps that build into a workerd worker (worker.mjs), which
 *   has no Node.js built-ins. The previous revision of this file
 *   imported `PassThrough` from 'node:stream' (with
 *   renderToPipeableStream and @react-router/node's
 *   createReadableStreamFromReadable), and the Oxygen deploy failed
 *   with: No such module "node:stream" imported from "worker.mjs".
 *
 * - Vercel consumes the same build through api/index.ts, whose
 *   handler speaks the Fetch API (Request in, Response out) — a web
 *   ReadableStream body is natively supported there (Node >= 18).
 *
 * Streaming is preserved: renderToReadableStream streams the shell
 * and deferred data just like the pipeable variant did; bots wait for
 * the complete document (body.allReady), matching prior behaviour.
 * The Node pipeable implementation is preserved, unwired, in
 * app/entry.server.node.tsx for reference.
 */
export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: HydrogenRouterContextProvider,
) {
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
    // Shopify Inbox chat (see app/components/ShopifyInbox.tsx): the
    // widget talks to Shopify's chat services and renders its
    // conversation UI in an iframe served from them. The loader script
    // itself comes from cdn.shopify.com, which the default policy
    // already allows.
    connectSrc: ['https://*.shopifysvc.com'],
    frameSrc: ['https://*.shopifysvc.com'],
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <ServerRouter
        context={reactRouterContext}
        url={request.url}
        nonce={nonce}
      />
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error: unknown) {
        responseStatusCode = 500;
        console.error(error);
      },
    },
  );

  const userAgent = request.headers.get('user-agent');
  if (userAgent && isbot(userAgent)) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Content-Security-Policy', header);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
