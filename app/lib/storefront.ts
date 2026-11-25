import {
  type CacheInstance,
  createShopifyRequestContext,
  createStorefrontClient,
  defineShopifyI18n,
  type PublicStorefrontClient,
  type RequestScopedPrivateStorefrontClient,
} from '@shopify/hydrogen';
import {createContext} from 'react-router';

import type {Env} from '~/lib/env';
import {getLocaleFromRequest, type I18nLocale} from '~/lib/i18n';
import {
  getBuyerIp,
  getMockShopDomain,
  getPrivateStorefrontToken,
  getStoreDomain,
  shouldUseMockShop,
} from '~/lib/shop';

// Real store: private token + trusted buyer IP. mock.shop: tokenless public
// access (it is auth-free and rejects any private token, even a placeholder).
//
// WRA divergence from repo 06: the locale is resolved per request from the
// URL path prefix (`getLocaleFromRequest`, behavior preserved from the
// classic shell). Hydrogen 2026.10's request context takes an i18n
// *definition* (and the private client additionally requires a buyer IP,
// which only the definition-based input accepts), so each request builds
// a single-locale definition pinned to the classically parsed locale and
// passes it with an explicit `locale` override — the resolved locale is
// therefore exactly the classic one.
// Phase 3 locale ruling (2026-11-24): the classic scheme is kept. The
// classic parser accepts ANY /XX-YY first segment dynamically, so no
// fixed module-scope locale list can reproduce it; the per-request
// single-locale definition stays, pinned by the explicit `locale`
// override below. One SDK constraint shapes the code: defineShopifyI18n
// forbids the default locale (EN-US) inside pathname routing.locales
// ("served unprefixed so each page has one canonical URL"), so an
// explicit /EN-US prefix resolves through the default-locale definition
// instead. The URL still routes and renders EN/US exactly as the
// classic app did; only the SDK's own URL generation treats EN-US as
// unprefixed (the app builds links from `pathPrefix`, not the SDK).
// The live store's bare-language prefixes (/fr /es /de /ja) are NOT the
// classic app's scheme — see the Phase 3 report's parity items.
function i18nDefinition(locale: I18nLocale) {
  const isDefaultLocale =
    locale.language === 'EN' && locale.country === 'US';
  if (!locale.pathPrefix || isDefaultLocale) {
    return defineShopifyI18n({
      defaultLocale: {language: locale.language, country: locale.country},
    });
  }
  return defineShopifyI18n({
    defaultLocale: {language: 'EN', country: 'US'},
    routing: {
      type: 'pathname',
      locales: [
        {
          language: locale.language,
          country: locale.country,
          pathSegment: locale.pathPrefix.slice(1).toLowerCase(),
        },
      ],
    },
  });
}

export type RequestStorefrontClient =
  | RequestScopedPrivateStorefrontClient
  | PublicStorefrontClient;

export function createRequestStorefrontClient(
  request: Request,
  env: Env,
  cache: CacheInstance,
  waitUntil: ExecutionContext['waitUntil'],
): RequestStorefrontClient {
  const locale = getLocaleFromRequest(request);
  const i18n = i18nDefinition(locale);

  if (shouldUseMockShop(env)) {
    return createStorefrontClient({
      type: 'public',
      requestContext: createShopifyRequestContext({
        request,
        i18n,
        locale: {language: locale.language, country: locale.country},
      }),
      config: {
        storeDomain: getMockShopDomain(env),
        cache,
        waitUntil,
      },
    });
  }

  // The cast: the concrete private-client type is generic over the i18n
  // definition's literal type, which the exported
  // RequestStorefrontClient union does not admit. The runtime object is
  // the genuine client either way; the app only relies on `.graphql()`
  // (see ~/lib/context).
  return createStorefrontClient({
    type: 'private',
    requestContext: createShopifyRequestContext({
      request,
      i18n,
      locale: {language: locale.language, country: locale.country},
      buyerIp: getBuyerIp(request.headers),
    }),
    config: {
      storeDomain: getStoreDomain(env),
      privateStorefrontToken: getPrivateStorefrontToken(env),
      storefrontId: env.PUBLIC_STOREFRONT_ID,
      cache,
      waitUntil,
    },
  }) as unknown as RequestStorefrontClient;
}

export const storefrontClientContext = createContext<RequestStorefrontClient>();
