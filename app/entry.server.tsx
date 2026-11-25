import {createContentSecurityPolicy} from '@shopify/hydrogen';
import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {ServerRouter, type EntryContext, type RouterContextProvider} from 'react-router';

import {NonceProvider} from '~/lib/csp';
import {envContext} from '~/lib/env';
import {getMockShopDomain, getStoreDomain, shouldUseMockShop} from '~/lib/shop';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: RouterContextProvider,
) {
  const env = context.get(envContext);

  // IMPORTANT: in Hydrogen 2026.10, custom directive arrays EXTEND that
  // directive's defaults (Shopify domains, 'self', nonce/'unsafe-inline'
  // fallbacks); they replace only defaults that are solely 'none'. The arrays
  // below are the ones this template has always shipped: preserve 'self',
  // data:, blob:, and https://cdn.shopify.com in imgSrc. Add third-party hosts
  // only when the matching integration is enabled.
  const csp = createContentSecurityPolicy({
    shop: {
      storeDomain: shouldUseMockShop(env) ? getMockShopDomain(env) : getStoreDomain(env),
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
    },
    directives: {
      scriptSrc: ["'self'", 'https://cdn.shopify.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://cdn.shopify.com'],
    },
  });

  const body = await renderToReadableStream(
    <NonceProvider value={csp.nonce}>
      <ServerRouter context={reactRouterContext} url={request.url} nonce={csp.nonce} />
    </NonceProvider>,
    {
      nonce: csp.nonce,
      signal: request.signal,
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  csp.applyResponseHeaders(responseHeaders);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
