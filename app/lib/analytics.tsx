import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {useLocation} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';

/**
 * ─────────────────────────────────────────────────────────────────────────
 * ANALYTICS (Phase 4: the Phase 1 inert bridge, made real).
 *
 * The classic Analytics.Provider / *View components / useAnalytics were
 * removed from Hydrogen in 2026.10. This module re-implements that
 * surface on an app-owned event bus:
 *
 *   • `Analytics.Provider` owns the bus: publish / subscribe /
 *     canTrack, plus the shop identity and the current + previous cart
 *     (the cart is registered by `AnalyticsCartSync` wherever the cart
 *     is awaited — PageLayout's cart aside — so Header's cart_viewed
 *     payload carries real cart state, as the classic provider's did).
 *   • The *View components publish their event once on mount
 *     (product_viewed / collection_viewed / search_viewed /
 *     cart_viewed); the provider itself publishes page_viewed on every
 *     route change.
 *   • Every published event is forwarded to the vendor tags wired into
 *     the root document by `AnalyticsScripts`: Google Analytics
 *     (gtag) and the Meta pixel (fbq), when those tags are configured.
 *
 * IDs are public tag identifiers, not secrets. They resolve server-side
 * in the root loader: PUBLIC_GA_MEASUREMENT_ID /
 * PUBLIC_META_PIXEL_ID env vars override the store's defaults below,
 * and an explicitly empty env value disables the tag.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const DEFAULT_GA_MEASUREMENT_ID = 'G-F7SLHQZBWV';
export const DEFAULT_META_PIXEL_ID = '2793791147688986';

type AnalyticsSubscriber = (data: unknown) => void;

export type AnalyticsContextValue = {
  publish: (eventName: string, data?: Record<string, unknown>) => void;
  subscribe: (
    eventName: string,
    callback: (data: unknown) => void,
  ) => () => void;
  canTrack: () => boolean;
  shop?: {id?: string} | null;
  cart?: CartApiQueryFragment | null;
  prevCart?: CartApiQueryFragment | null;
  customData?: Record<string, unknown>;
  registerCart: (cart: CartApiQueryFragment | null) => void;
};

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// Vendor event names for the bus events this app publishes.
const GA_EVENT_NAMES: Record<string, string> = {
  page_viewed: 'page_view',
  product_viewed: 'view_item',
  collection_viewed: 'view_item_list',
  search_viewed: 'search',
  cart_viewed: 'view_cart',
  product_added_to_cart: 'add_to_cart',
  product_removed_from_cart: 'remove_from_cart',
};

const META_EVENT_NAMES: Record<string, string> = {
  page_viewed: 'PageView',
  product_viewed: 'ViewContent',
  search_viewed: 'Search',
  product_added_to_cart: 'AddToCart',
};

/** GA parameters must be primitives; nested payloads stay on the bus. */
function primitiveParams(
  data: Record<string, unknown> | undefined,
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};
  if (!data) return params;
  for (const [key, value] of Object.entries(data)) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      params[key] = value;
    }
  }
  if (typeof data.url === 'string') params.page_location = data.url;
  if (typeof data.searchTerm === 'string') params.search_term = data.searchTerm;
  return params;
}

function forwardToVendors(
  eventName: string,
  data: Record<string, unknown> | undefined,
) {
  if (typeof window === 'undefined') return;
  const gaName = GA_EVENT_NAMES[eventName];
  if (gaName && typeof window.gtag === 'function') {
    window.gtag('event', gaName, primitiveParams(data));
  }
  const metaName = META_EVENT_NAMES[eventName];
  if (metaName && typeof window.fbq === 'function') {
    window.fbq('track', metaName, primitiveParams(data));
  }
}

function PageViewTracker() {
  const {publish} = useAnalytics();
  const location = useLocation();
  useEffect(() => {
    publish('page_viewed', {
      url: window.location.href,
      path: location.pathname,
    });
  }, [publish, location.pathname, location.search]);
  return null;
}

function AnalyticsProvider({
  shop,
  customData,
  children,
}: {
  shop?: {id?: string} | null;
  customData?: Record<string, unknown>;
  children?: React.ReactNode;
}) {
  const subscribersRef = useRef(new Map<string, Set<AnalyticsSubscriber>>());
  const cartRef = useRef<CartApiQueryFragment | null>(null);
  const [cart, setCart] = useState<CartApiQueryFragment | null>(null);
  const [prevCart, setPrevCart] = useState<CartApiQueryFragment | null>(null);

  const publish = useCallback(
    (eventName: string, data?: Record<string, unknown>) => {
      const subscribers = subscribersRef.current.get(eventName);
      if (subscribers) {
        for (const subscriber of [...subscribers]) subscriber(data);
      }
      forwardToVendors(eventName, data);
    },
    [],
  );

  const subscribe = useCallback(
    (eventName: string, callback: (data: unknown) => void) => {
      let set = subscribersRef.current.get(eventName);
      if (!set) {
        set = new Set();
        subscribersRef.current.set(eventName, set);
      }
      set.add(callback);
      return () => {
        set.delete(callback);
      };
    },
    [],
  );

  const canTrack = useCallback(
    () =>
      typeof window !== 'undefined' &&
      (typeof window.gtag === 'function' || typeof window.fbq === 'function'),
    [],
  );

  const registerCart = useCallback((next: CartApiQueryFragment | null) => {
    if (cartRef.current === next) return;
    setPrevCart(cartRef.current);
    cartRef.current = next;
    setCart(next);
  }, []);

  const value = useMemo<AnalyticsContextValue>(
    () => ({
      publish,
      subscribe,
      canTrack,
      shop,
      cart,
      prevCart,
      customData,
      registerCart,
    }),
    [publish, subscribe, canTrack, shop, cart, prevCart, customData, registerCart],
  );

  return (
    <AnalyticsContext.Provider value={value}>
      <PageViewTracker />
      {children}
    </AnalyticsContext.Provider>
  );
}

const FALLBACK_VALUE: AnalyticsContextValue = {
  publish: () => {},
  subscribe: () => () => {},
  canTrack: () => false,
  shop: undefined,
  cart: undefined,
  prevCart: undefined,
  customData: undefined,
  registerCart: () => {},
};

export function useAnalytics(): AnalyticsContextValue {
  return useContext(AnalyticsContext) ?? FALLBACK_VALUE;
}

/** Registers the awaited cart with the analytics provider (see header). */
export function AnalyticsCartSync({
  cart,
}: {
  cart: CartApiQueryFragment | null;
}) {
  const {registerCart} = useAnalytics();
  useEffect(() => {
    registerCart(cart);
  }, [cart, registerCart]);
  return null;
}

function usePublishOnMount(
  eventName: string,
  data: Record<string, unknown> | undefined,
) {
  const {publish} = useAnalytics();
  const dataRef = useRef(data);
  useEffect(() => {
    publish(eventName, dataRef.current);
  }, [publish, eventName]);
  return null;
}

function ProductView({data}: {data?: Record<string, unknown>}) {
  return usePublishOnMount('product_viewed', data);
}

function CollectionView({data}: {data?: Record<string, unknown>}) {
  return usePublishOnMount('collection_viewed', data);
}

function SearchView({data}: {data?: Record<string, unknown>}) {
  return usePublishOnMount('search_viewed', data);
}

function CartView({data}: {data?: Record<string, unknown>}) {
  return usePublishOnMount('cart_viewed', data);
}

function PageView({data}: {data?: Record<string, unknown>}) {
  return usePublishOnMount('page_viewed', data);
}

export const Analytics = {
  Provider: AnalyticsProvider,
  ProductView,
  CollectionView,
  SearchView,
  CartView,
  PageView,
};

// ── Vendor tag scripts for the root document ────────────────────────────

const TAG_ID_PATTERN = /^[A-Za-z0-9-]+$/;

export function AnalyticsScripts({
  gaId,
  metaPixelId,
  nonce,
}: {
  gaId?: string;
  metaPixelId?: string;
  nonce?: string;
}) {
  const ga = gaId && TAG_ID_PATTERN.test(gaId) ? gaId : null;
  const pixel =
    metaPixelId && TAG_ID_PATTERN.test(metaPixelId) ? metaPixelId : null;
  return (
    <>
      {ga ? (
        <>
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${ga}`}
          />
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${ga}');`,
            }}
          />
        </>
      ) : null}
      {pixel ? (
        <>
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${pixel}');fbq('track', 'PageView');`,
            }}
          />
          <noscript>
            <img
              alt=""
              height="1"
              width="1"
              style={{display: 'none'}}
              src={`https://www.facebook.com/tr?id=${pixel}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      ) : null}
    </>
  );
}
