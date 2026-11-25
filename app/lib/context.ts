import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {Env} from '~/lib/env';
import type {I18nLocale} from '~/lib/i18n';
import type {RequestStorefrontClient} from '~/lib/storefront';

/**
 * ─────────────────────────────────────────────────────────────────────────
 * PHASE 1 LEGACY BRIDGE — temporary, scheduled for deletion in Phases 2–3.
 *
 * The classic shell built one `createHydrogenContext` object and every
 * loader/component read `context.storefront` / `context.cart` /
 * `context.customerAccount` / `context.env` off it. Hydrogen 2026.10
 * removed that factory; the new shell passes a React Router
 * `RouterContextProvider` with typed handles (see ~/lib/storefront,
 * ~/lib/env, ~/lib/worker-context). Until Phases 2–3 port each consumer
 * to the handles, the root middleware (app/root.tsx) attaches the legacy
 * properties below onto the context instance at runtime, and consumers
 * read them through the typed `legacyContext()` accessor below.
 * (Module augmentation of `RouterContextProvider` cannot work here:
 * React Router 8.5 ships several parallel declarations of that class —
 * production, development, and the react-server build the generated
 * route types bind — and an augmentation only merges with one of them.)
 *
 * What is REAL here: the storefront adapter — it forwards to the genuine
 * 2026.10 Storefront client (`.graphql()`), so every `storefront.query`
 * in the app hits the real catalog. What is DEFERRED:
 *   • cart.get() resolves `null` (the cart drawer renders empty) and all
 *     cart mutations throw a Phase 2 error — cart server handlers are
 *     Phase 2's exit gate.
 *   • customerAccount.isLoggedIn() resolves `false`; every other customer
 *     account method throws a Phase 2 error — customer-account wiring is
 *     Phase 2, account routes are Phase 3.
 *   • per-query cache strategies (CacheLong etc.) are accepted but not
 *     forwarded — the 2026.10 client caches through the worker cache
 *     instance it was constructed with. Parity check scheduled Phase 5.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface LegacyStorefront {
  i18n: I18nLocale;
  query: <T = unknown>(
    query: unknown,
    options?: {variables?: Record<string, unknown>; cache?: unknown},
  ) => Promise<T>;
  CacheLong: () => unknown;
  CacheShort: () => unknown;
  CacheNone: () => unknown;
  CacheCustom: (options?: Record<string, unknown>) => unknown;
}

export interface CartMutationResult {
  cart: CartApiQueryFragment;
  errors?: Array<{message: string; code?: string; field?: string[]}> | null;
  warnings?: Array<{message: string; code?: string}> | null;
}

export interface LegacyCart {
  get: () => Promise<CartApiQueryFragment | null>;
  setCartId: (cartId: string) => Headers;
  create: (input?: Record<string, unknown>) => Promise<CartMutationResult>;
  addLines: (lines: unknown) => Promise<CartMutationResult>;
  updateLines: (lines: unknown) => Promise<CartMutationResult>;
  removeLines: (lineIds: string[]) => Promise<CartMutationResult>;
  updateDiscountCodes: (
    discountCodes: string[],
  ) => Promise<CartMutationResult>;
  addGiftCardCodes: (giftCardCodes: string[]) => Promise<CartMutationResult>;
  removeGiftCardCodes: (
    giftCardCodes: string[],
  ) => Promise<CartMutationResult>;
  updateBuyerIdentity: (
    buyerIdentity: Record<string, unknown>,
  ) => Promise<CartMutationResult>;
}

export interface LegacyCustomerAccount {
  i18n: I18nLocale;
  isLoggedIn: () => Promise<boolean>;
  login: (...args: unknown[]) => Promise<Response>;
  logout: (...args: unknown[]) => Promise<Response>;
  authorize: () => Promise<Response>;
  handleAuthStatus: () => Promise<void>;
  // The classic client inferred result types from the codegen'd query
  // documents. Until Phases 2–3 replace these calls with typed
  // handlers, results default to `any` (explicit generics still win at
  // annotated call sites).
  query: <T = any>(
    query: unknown,
    options?: {variables?: Record<string, unknown>},
  ) => Promise<T>;
  mutate: <T = any>(
    mutation: unknown,
    options?: {variables?: Record<string, unknown>},
  ) => Promise<T>;
  getAccessToken: () => Promise<string | undefined>;
}

/**
 * The legacy context shape the root middleware attaches to the request
 * context instance. Consumers access it via `legacyContext(context)`.
 */
export interface LegacyContext {
  storefront: LegacyStorefront;
  cart: LegacyCart;
  customerAccount: LegacyCustomerAccount;
  env: Env;
}

/**
 * Typed accessor for the legacy context properties. The middleware
 * (app/root.tsx) attaches them to the RouterContextProvider instance at
 * runtime; this cast is where the Phase 1 bridge keeps that honest.
 */
export function legacyContext(context: unknown): LegacyContext {
  return context as LegacyContext;
}

function phase2Error(feature: string): Error {
  return new Error(
    `${feature} is not available on the Phase 1 shell — it lands with the ` +
      `Phase 2 cart / customer-account server handlers.`,
  );
}

export function createLegacyStorefront(
  client: RequestStorefrontClient,
  i18n: I18nLocale,
): LegacyStorefront {
  return {
    i18n,
    async query<T = unknown>(
      query: unknown,
      options?: {variables?: Record<string, unknown>; cache?: unknown},
    ): Promise<T> {
      // TODO(Phase 5): the classic client honored per-query cache
      // strategies (options.cache); the 2026.10 client caches via its
      // construction-time cache instance, so the strategy is accepted
      // here for signature parity but not forwarded.
      const result = (await client.graphql(
        query as never,
        {variables: options?.variables} as never,
      )) as {data?: unknown; errors?: unknown};
      if (!result.data) {
        throw new Error(
          `Storefront query failed: ${JSON.stringify(result.errors ?? 'no data returned')}`,
        );
      }
      return result.data as T;
    },
    CacheLong: () => ({mode: 'public', maxAge: 3600, staleWhileRevalidate: 82800}),
    CacheShort: () => ({mode: 'public', maxAge: 1, staleWhileRevalidate: 86399}),
    CacheNone: () => ({mode: 'no-store'}),
    CacheCustom: (options?: Record<string, unknown>) => ({...options}),
  };
}

export function createLegacyCart(): LegacyCart {
  const deferred = (feature: string) => async (): Promise<CartMutationResult> => {
    throw phase2Error(feature);
  };
  return {
    // TODO(Phase 2): cart reads move to the /api/cart server handlers;
    // until then the cart resolves empty so the shell can render.
    get: async () => null,
    setCartId: (_cartId: string) => new Headers(),
    create: deferred('cart.create'),
    addLines: deferred('cart.addLines'),
    updateLines: deferred('cart.updateLines'),
    removeLines: deferred('cart.removeLines'),
    updateDiscountCodes: deferred('cart.updateDiscountCodes'),
    addGiftCardCodes: deferred('cart.addGiftCardCodes'),
    removeGiftCardCodes: deferred('cart.removeGiftCardCodes'),
    updateBuyerIdentity: deferred('cart.updateBuyerIdentity'),
  };
}

export function createLegacyCustomerAccount(
  i18n: I18nLocale,
): LegacyCustomerAccount {
  const deferred =
    (feature: string) =>
    async (): Promise<never> => {
      throw phase2Error(feature);
    };
  return {
    i18n,
    // TODO(Phase 2): real session-backed login state arrives with the
    // customer-account middleware wiring.
    isLoggedIn: async () => false,
    login: deferred('customerAccount.login'),
    logout: deferred('customerAccount.logout'),
    authorize: deferred('customerAccount.authorize'),
    handleAuthStatus: deferred('customerAccount.handleAuthStatus'),
    query: deferred('customerAccount.query'),
    mutate: deferred('customerAccount.mutate'),
    getAccessToken: deferred('customerAccount.getAccessToken'),
  };
}

export function setLegacyContext(
  context: unknown,
  legacy: {
    storefront: LegacyStorefront;
    cart: LegacyCart;
    customerAccount: LegacyCustomerAccount;
    env: Env;
  },
): void {
  const target = context as unknown as Record<string, unknown>;
  target.storefront = legacy.storefront;
  target.cart = legacy.cart;
  target.customerAccount = legacy.customerAccount;
  target.env = legacy.env;
}
