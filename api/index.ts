// @ts-nocheck
/**
 * Vercel Node function entry for the Hydrogen storefront.
 *
 * Mirrors the Oxygen worker entry (server.ts on main) but adapted for
 * Vercel Functions: env from process.env, an in-memory Web Cache API
 * implementation instead of the workerd `caches` global, and Vercel's
 * `waitUntil` so background work survives the response.
 */
import * as serverBuild from '../dist/server/index.js';
import {
  createRequestHandler,
  createHydrogenContext,
  InMemoryCache,
  storefrontRedirect,
} from '@shopify/hydrogen';
import {waitUntil} from '@vercel/functions';
import {AppSession} from '../app/lib/session';
import {CART_QUERY_FRAGMENT} from '../app/lib/fragments';

const cache = new InMemoryCache();

// Vercel's waitUntil needs a live request scope; never let it break a request.
function safeWaitUntil(promise: Promise<unknown>) {
  try {
    waitUntil(promise);
  } catch {
    Promise.resolve(promise).catch(() => {});
  }
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

export default {
  async fetch(request: Request): Promise<Response> {
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
        cart: {
          queryFragment: CART_QUERY_FRAGMENT,
        },
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
      console.error(error);
      return new Response('An unexpected error occurred', {status: 500});
    }
  },
};
