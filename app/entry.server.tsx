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
    // First-party measurement + marketing origins the storefront loads
    // from app/root.tsx (see the GTM and Meta Pixel blocks there).
    // Without these, the browser refused to load gtm.js / fbevents.js
    // at all — the loaders were inline (nonce-approved) but the
    // external scripts, their beacons, and the GTM noscript iframe
    // fell outside the default policy, so no page views reached GA4
    // or the Meta dataset from the Hydrogen storefront.
    scriptSrc: [
      'https://www.googletagmanager.com',
      'https://connect.facebook.net',
    ],
    connectSrc: [
      // Shopify Inbox chat services (see app/components/ShopifyInbox.tsx).
      'https://*.shopifysvc.com',
      // GA4 collection + Google Ads signals fired through GTM.
      'https://www.google-analytics.com',
      'https://*.google-analytics.com',
      'https://www.googletagmanager.com',
      'https://www.google.com',
      // Meta Pixel event posts.
      'https://connect.facebook.net',
      'https://www.facebook.com',
      // Footer email capture POSTs to the Klaviyo client API
      // (see app/components/KlaviyoSignup.tsx).
      'https://a.klaviyo.com',
    ],
    frameSrc: [
      // Shopify Inbox chat renders its conversation UI in an iframe
      // served from Shopify's chat services.
      'https://*.shopifysvc.com',
      // GTM noscript fallback iframe (app/root.tsx).
      'https://www.googletagmanager.com',
    ],
    imgSrc: [
      // Meta Pixel noscript fallback beacon (app/root.tsx).
      'https://www.facebook.com',
      // GA4 / Google Ads tracking pixels loaded as images by tags.
      'https://www.google-analytics.com',
      'https://www.google.com',
      'https://www.googletagmanager.com',
    ],
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
