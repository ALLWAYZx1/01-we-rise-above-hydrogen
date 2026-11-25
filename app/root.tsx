import {
  Outlet,
  useRouteError,
  isRouteErrorResponse,
  type ShouldRevalidateFunction,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router';
import type {Route} from './+types/root';

import {
  FOOTER_QUERY,
  HEADER_QUERY,
  type FooterQuery,
  type HeaderQuery,
} from '~/lib/fragments';
import {PageLayout} from './components/PageLayout';
import {useNonce} from '~/lib/csp';
import {envContext} from '~/lib/env';
import {cacheContext, waitUntilContext} from '~/lib/worker-context';
import {createRequestStorefrontClient, storefrontClientContext} from '~/lib/storefront';
import {getLocaleFromRequest} from '~/lib/i18n';
import {getStoreDomain} from '~/lib/shop';
import {
  createLegacyCart,
  createLegacyCustomerAccount,
  createLegacyStorefront,
  legacyContext,
  setLegacyContext,
} from '~/lib/context';
import {
  createEphemeralSessionManager,
  createRequestSessionManager,
} from '~/lib/session';
import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';
import cosmicStyles from '~/styles/cosmic.css?url';
import wraCommerceStyles from '~/styles/wra-commerce.css?url';
import tailwindCss from '~/styles/tailwind.css?url';

// Root middleware (2026.10 pattern, modeled on repo 06): builds the
// request's Storefront client, publishes it on the typed context handle,
// and — Phase 1 bridge — attaches the legacy context properties
// (storefront / cart / customerAccount / env) that existing loaders and
// components still read. See ~/lib/context for the bridge contract and
// its deletion schedule (Phases 2–3).
export const middleware: Route.MiddlewareFunction[] = [
  async ({request, context}, next) => {
    const env = context.get(envContext);
    const storefrontClient = createRequestStorefrontClient(
      request,
      env,
      context.get(cacheContext),
      context.get(waitUntilContext),
    );
    context.set(storefrontClientContext, storefrontClient);

    const session = await (env.SESSION_SECRET
      ? createRequestSessionManager(request, env.SESSION_SECRET)
      : createEphemeralSessionManager(request));

    const i18n = getLocaleFromRequest(request);
    setLegacyContext(context, {
      storefront: createLegacyStorefront(storefrontClient, i18n),
      cart: createLegacyCart(),
      customerAccount: createLegacyCustomerAccount(i18n),
      env,
    });

    const response = await next();
    const commitHeaders = await session.commit?.();
    if (commitHeaders) {
      for (const [name, value] of new Headers(commitHeaders).entries()) {
        response.headers.append(name, value);
      }
    }
    return response;
  },
];

export const shouldRevalidate: ShouldRevalidateFunction = ({formMethod, currentUrl, nextUrl}) => {
  // revalidate when a mutation is performed e.g add to cart, login...
  if (formMethod && formMethod !== 'GET') return true;
  // revalidate when manually revalidating via useRevalidator
  if (currentUrl.toString() === nextUrl.toString()) return true;

  return false;
};

export function links() {
  return [
    {rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg'},
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
  ];
}

export function meta() {
  return [
    {title: 'We Rise Above | No Final Form'},
    {
      name: 'description',
      content:
        'We Rise Above — premium streetwear engineered for the ones still rising. No Final Form.',
    },
    {property: 'og:title', content: 'We Rise Above | No Final Form'},
    {
      property: 'og:description',
      content:
        'Premium streetwear engineered for the ones still rising. No Final Form.',
    },
    {property: 'og:type', content: 'website'},
    {name: 'twitter:card', content: 'summary_large_image'},
    // TODO(analytics): GA (G-F7SLHQZBWV) + Meta Pixel (2793791147688986) — the Phase 4
    // analytics wiring lands with the 2026.10 tracker components; see the
    // Analytics bridge note in ~/lib/legacy-components.
  ];
}

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context}: Route.LoaderArgs) {
  const legacy = legacyContext(context);
  const [header] = await Promise.all([
    legacy.storefront.query<HeaderQuery>(HEADER_QUERY, {
      cache: legacy.storefront.CacheLong(),
      variables: {headerMenuHandle: 'main-menu'}, // Adjust to your header menu handle
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {header};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, then it should still lead to
 * 400 or 500 errors, it just won't block the page from rendering
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  const legacy = legacyContext(context);
  // Put any loaders here that are not critical
  const cart = legacy.cart.get();

  // Deferred: Promise for the login state (PageLayout awaits it).
  const isLoggedIn = legacy.customerAccount.isLoggedIn();

  // Deferred: Promise for Footer Query.
  const footer = legacy.storefront
    .query<FooterQuery>(FOOTER_QUERY, {
      cache: legacy.storefront.CacheLong(),
      variables: {footerMenuHandle: 'footer'}, // Adjust to your footer menu handle
    })
    .catch((error: unknown) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });
  return {
    cart,
    footer,
    isLoggedIn,
    publicStoreDomain: legacy.env.PUBLIC_STORE_DOMAIN ?? getStoreDomain(legacy.env),
  };
}

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="stylesheet" href={tailwindCss} />
        <link rel="stylesheet" href={resetStyles} />
        <link rel="stylesheet" href={appStyles} />
        <link rel="stylesheet" href={cosmicStyles} />
        <link rel="stylesheet" href={wraCommerceStyles} />
        <Meta />
        <Links />
      </head>
      <body>
        {/* TODO(Phase 4): the classic Analytics.Provider is gone in
            2026.10; page/cart trackers (PageViewedTracker,
            CartAnalyticsTracker) mount here with the GA + Meta wiring. */}
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  const data = useRouteLoaderData<RootLoader>('root');

  if (!data) {
    return <Outlet />;
  }

  return (
    <PageLayout {...data}>
      <Outlet />
    </PageLayout>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let errorMessage = 'Unknown error';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="route-error">
      <h1>Oops</h1>
      <h2>{errorStatus}</h2>
      {errorMessage && (
        <fieldset>
          <pre>{errorMessage}</pre>
        </fieldset>
      )}
      <a href="/">Go back home</a>
    </div>
  );
}

type RootLoader = typeof loader;
