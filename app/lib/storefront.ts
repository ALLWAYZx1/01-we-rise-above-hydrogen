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
// TODO(Phase 3, locale batch): replace the per-request definition with
// one module-scope multi-locale definition when the prefix scheme is
// ruled on (Phase 0 finding: live prefixes are bare-language /fr /es /de
// /ja, the classic parser reads /EN-US-style prefixes).
function i18nDefinition(locale: I18nLocale) {
  if (!locale.pathPrefix) {
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
