import {Analytics as ShopifyAnalytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
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
import favicon64 from '~/../public/favicon-64.png';
import favicon32 from '~/../public/favicon-32.png';
import faviconIco from '~/../public/favicon.ico';
import appleTouchIcon from '~/../public/apple-touch-icon.png';
import {FOOTER_QUERY, HEADER_QUERY} from '~/lib/fragments';
import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';
import flipStyles from '~/styles/flip.css?url';
import daylightStyles from '~/styles/daylight.css?url';
import luxuryStyles from '~/styles/luxury.css?url';
import {PageLayout} from './components/PageLayout';
import {ShopifyInbox} from './components/ShopifyInbox';

export const meta: Route.MetaFunction = () => [
  {title: 'We Rise Above | Streetwear, Music & Creative Culture'},
  {
    name: 'description',
    content: 'Pressure builds. We rise. Streetwear, music and creative culture. No final form.',
  },
  {tagName: 'link', rel: 'canonical', href: 'https://weriseabove.life/'},
  {property: 'og:type', content: 'website'},
  {property: 'og:site_name', content: 'We Rise Above'},
  {property: 'og:title', content: 'We Rise Above | Streetwear, Music & Creative Culture'},
  {
    property: 'og:description',
    content: 'Pressure builds. We rise. Streetwear, music and creative culture. No final form.',
  },
  {property: 'og:url', content: 'https://weriseabove.life/'},
  {name: 'twitter:card', content: 'summary'},
  {name: 'twitter:title', content: 'We Rise Above | Streetwear, Music & Creative Culture'},
  {
    name: 'twitter:description',
    content: 'Pressure builds. We rise. Streetwear, music and creative culture. No final form.',
  },
];

export type RootLoader = typeof loader;

/**
 * This is important to avoid re-fetching root queries on sub-navigations
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
}) => {
  // revalidate when a mutation is performed e.g add to cart, login...
  if (formMethod && formMethod !== 'GET') return true;

  // revalidate when manually revalidating via useRevalidator
  if (currentUrl.toString() === nextUrl.toString()) return true;

  // Defaulting to no revalidation for root loader data to improve performance.
  // When using this feature, you risk your UI getting out of sync with your server.
  // Use with caution. If you are uncomfortable with this optimization, update the
  // line below to `return defaultShouldRevalidate` instead.
  // For more details see: https://remix.run/docs/en/main/route/should-revalidate
  return false;
};

/**
 * The main and reset stylesheets are added in the Layout component
 * to prevent a bug in development HMR updates.
 *
 * It avoids the "failed to execute 'insertBefore' on 'Node'" error
 * that occurs after editing and navigating to another page.
 *
 * It's a temporary fix until React Router ships a fix.
 * https://github.com/remix-run/remix/issues/9242
 */
export function links() {
  return [
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    // WRA Luminous Gold P Emblem (declared brand mark, 2026-10-31).
    // Small sizes use the P-monogram core crop so the mark stays
    // legible at tab size; the touch icon carries the full crest.
    {rel: 'icon', type: 'image/x-icon', href: faviconIco},
    {rel: 'icon', type: 'image/png', sizes: '64x64', href: favicon64},
    {rel: 'icon', type: 'image/png', sizes: '32x32', href: favicon32},
    {rel: 'apple-touch-icon', sizes: '180x180', href: appleTouchIcon},
  ];
}

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  const {storefront, env} = args.context;

  return {
    ...deferredData,
    ...criticalData,
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    shop: getShopAnalytics({
      storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
    }),
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      withPrivacyBanner: false,
      // localize the privacy banner
      country: args.context.storefront.i18n.country,
      language: args.context.storefront.i18n.language,
    },
  };
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context}: Route.LoaderArgs) {
  const {storefront} = context;

  const [header] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'main-menu', // Adjust to your header menu handle
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {header};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the whole page should 200 or 500 error.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  const {storefront, customerAccount, cart} = context;

  // defer the footer query (below the fold)
  const footer = storefront
    .query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        footerMenuHandle: 'footer', // Adjust to your header menu handle
      },
    })
    .catch((error: Error) => {
      // Log query errors, but don't throw so the page can still render
      console.error(error);
      return null;
    });
  return {
    cart: cart.get(),
    isLoggedIn: customerAccount.isLoggedIn(),
    footer,
  };
}

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {/* Google Tag Manager - WRA container (fresh stack) */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-TW29LW4X');`,
          }}
        />
        {/* Meta Pixel - WRA RIZE dataset (fresh stack) */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','2793791147688986');fbq('track','PageView');`,
          }}
        />
        <link rel="stylesheet" href={resetStyles}></link>
        <link rel="stylesheet" href={appStyles}></link>
        <link rel="stylesheet" href={flipStyles}></link>
        <link rel="stylesheet" href={daylightStyles}></link>
        <link rel="stylesheet" href={luxuryStyles}></link>
        <Meta />
        <Links />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-TW29LW4X"
            height="0"
            width="0"
            style={{display: 'none', visibility: 'hidden'}}
            title="Google Tag Manager"
          />
        </noscript>
        {/* Meta Pixel (noscript) */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{display: 'none'}}
            src="https://www.facebook.com/tr?id=2793791147688986&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
        <ShopifyInbox />
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
    <ShopifyAnalytics.Provider
      cart={data.cart}
      shop={data.shop}
      consent={data.consent}
    >
      <PageLayout {...data}>
        <Outlet />
      </PageLayout>
    </ShopifyAnalytics.Provider>
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

  if (errorStatus === 404) {
    return (
      <main className="daylight-page">
        <section className="daylight-hero" aria-labelledby="not-found-title">
          <p className="daylight-eyebrow">WE RISE ABOVE · NO FINAL FORM</p>
          <div className="daylight-astar" aria-hidden="true">✦</div>
          <h1 id="not-found-title">YOU DRIFTED.</h1>
          <p className="daylight-hero-copy">This page is in another phase.</p>
          <div className="daylight-actions">
            <a className="daylight-button" href="/">Back home</a>
            <a className="daylight-text-link" href="/collections/hoodies">Shop hoodies</a>
          </div>
        </section>
      </main>
    );
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
    </div>
  );
}
