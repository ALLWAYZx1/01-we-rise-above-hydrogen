import {createCartCookie, getCartId} from '@shopify/hydrogen';
import {gql as customerAccountGql} from '@shopify/hydrogen/customer-account';
import type {RouterContextProvider} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CartData} from '~/lib/cart';
import {
  addGiftCardCodes,
  createEmptyCart,
  removeGiftCardCodes,
  updateBuyerIdentity,
  type CartExtensionResult,
} from '~/lib/cart-extensions';
import {cartHandlers} from '~/lib/cart-handlers';
import {
  requireCustomerAccount,
  type CustomerAccount,
} from '~/lib/customer-account';
import type {Env} from '~/lib/env';
import type {I18nLocale} from '~/lib/i18n';
import type {RequestStorefrontClient} from '~/lib/storefront';

/**
 * ─────────────────────────────────────────────────────────────────────────
 * LEGACY BRIDGE — temporary, scheduled for deletion in Phase 3.
 *
 * The classic shell built one `createHydrogenContext` object and every
 * loader/component read `context.storefront` / `context.cart` /
 * `context.customerAccount` / `context.env` off it. Hydrogen 2026.10
 * removed that factory; the new shell passes a React Router
 * `RouterContextProvider` with typed handles (see ~/lib/storefront,
 * ~/lib/env, ~/lib/worker-context, ~/lib/customer-account). Until
 * Phase 3 ports each consumer to the handles, the root middleware
 * (app/root.tsx) attaches the legacy properties below onto the context
 * instance at runtime, and consumers read them through the typed
 * `legacyContext()` accessor below.
 * (Module augmentation of `RouterContextProvider` cannot work here:
 * React Router 8.5 ships several parallel declarations of that class —
 * production, development, and the react-server build the generated
 * route types bind — and an augmentation only merges with one of them.)
 *
 * What is REAL here (Phase 2):
 *   • the storefront adapter — forwards to the genuine 2026.10
 *     Storefront client (`.graphql()`), so every `storefront.query`
 *     in the app hits the real catalog.
 *   • the cart — `get()` and the line/discount mutations run through
 *     the 2026.10 cart server handlers (~/lib/cart-handlers), the same
 *     handlers that serve /api/cart in the root middleware. Gift-card
 *     and buyer-identity operations, which the handler action set does
 *     not cover, run through ~/lib/cart-extensions. The cart id lives
 *     in the handlers' `cart` cookie; `setCartId()` writes it with the
 *     SDK's own cookie serializer.
 *   • the customer account — backed by ~/lib/customer-account: session
 *     state, login/authorize/logout through the customer session, the
 *     auth guard through `requireCustomerAccount`, and query/mutate
 *     through the Customer Account client with a per-call access
 *     token. When Customer Accounts are unavailable for a request
 *     (mock shop, missing SHOP_ID / client id / SESSION_SECRET, or a
 *     non-HTTPS origin), isLoggedIn() is false, query/mutate return a
 *     descriptive error result, and login/logout/authorize throw that
 *     same descriptive error — no placeholder stubs remain.
 *   • per-query cache strategies (CacheLong etc.) are accepted but not
 *     forwarded — the 2026.10 client caches through the worker cache
 *     instance it was constructed with. Parity check scheduled Phase 5.
 *
 * Known shape note: the handlers' cart data is returned under the
 * classic CartApiQueryFragment type the bridge declares. The top-level
 * shape matches (the custom fragment in ~/lib/cart-handlers restores
 * appliedGiftCards / buyerIdentity); the line-level
 * differences are Phase 4 component-contract items, listed in
 * ~/lib/cart-handlers (merchandise price fields, lineComponents,
 * first:250 cap).
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
  // documents. Until Phase 3 replaces these calls with typed handlers,
  // results default to `any` (explicit generics still win at annotated
  // call sites).
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
 * runtime; this cast is where the bridge keeps that honest.
 */
export function legacyContext(context: unknown): LegacyContext {
  return context as LegacyContext;
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

// ── Cart ────────────────────────────────────────────────────────────────

function toMutationResult(result: CartExtensionResult): CartMutationResult {
  return {
    cart: result.cart as unknown as CartApiQueryFragment,
    errors: result.errors.map((error) => ({
      message: error.message,
      code: error.code ?? undefined,
      field: error.field ?? undefined,
    })),
    warnings: result.warnings.map((warning) => ({
      message: warning.message,
      code: warning.code ?? undefined,
    })),
  };
}

export function createLegacyCart(deps: {
  storefrontClient: RequestStorefrontClient;
  request: Request;
}): LegacyCart {
  const {storefrontClient, request} = deps;

  // Runs one operation through the cart server handlers — the exact
  // code path that serves POST /api/cart — and maps the handler result
  // onto the classic mutation result shape. The runtime's JSON protocol
  // is field-based, not intent-based: a body carries exactly one of
  // lines / discountCodes / attributes / note (the `intent` keys below
  // are documentation only and are ignored by the parser), and line
  // entries partition by shape — merchandiseId without id = add, id +
  // quantity = update, id + quantity 0 = remove. There is no `lineIds`
  // field; a remove sent that way is rejected with invalid_cart_request.
  async function postIntent(
    body: Record<string, unknown>,
  ): Promise<CartMutationResult> {
    const cookie = request.headers.get('cookie');
    const intentRequest = new Request(new URL('/api/cart', request.url), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(cookie ? {cookie} : {}),
      },
      body: JSON.stringify(body),
    });
    const result = await cartHandlers.post({
      storefrontClient,
      request: intentRequest,
    });
    if (result.type === 'json') {
      const data = result.data as {
        cart?: CartData | null;
        userErrors?: CartExtensionResult['errors'];
        warnings?: CartExtensionResult['warnings'];
      };
      if (!data.cart) {
        throw new Error('Cart mutation returned no cart.');
      }
      return toMutationResult({
        cart: data.cart,
        errors: data.userErrors ?? [],
        warnings: data.warnings ?? [],
      });
    }
    if (result.type === 'error') {
      throw new Error(
        `Cart request failed (${result.error.code}): ${result.error.message}`,
      );
    }
    throw new Error('Cart request returned an unexpected redirect for a JSON intent.');
  }

  return {
    get: async () => {
      const result = await cartHandlers.get({storefrontClient, request});
      if (result.type !== 'json') return null;
      // GraphQL errors come back as a null cart + errors (the handler
      // logs them server-side); the classic get() contract resolves
      // null for a missing/unreadable cart.
      return (result.data.cart ?? null) as unknown as CartApiQueryFragment | null;
    },
    setCartId: (cartId: string) => {
      const headers = new Headers();
      headers.append('set-cookie', createCartCookie(cartId));
      return headers;
    },
    create: async (input: Record<string, unknown> = {}) => {
      const lines = (input.lines as unknown[] | undefined) ?? [];
      let result =
        lines.length > 0
          ? await postIntent({intent: 'add', lines})
          : toMutationResult(await createEmptyCart(storefrontClient, request));

      const discountCodes = input.discountCodes as string[] | undefined;
      if (discountCodes?.length && result.cart) {
        result = await postIntent({
          intent: 'discount-update',
          cartId: result.cart.id,
          discountCodes,
        });
      }

      const buyerIdentity = input.buyerIdentity as
        | Record<string, unknown>
        | undefined;
      if (buyerIdentity && result.cart) {
        result = toMutationResult(
          await updateBuyerIdentity(
            storefrontClient,
            request,
            result.cart.id,
            buyerIdentity,
          ),
        );
      }

      return result;
    },
    addLines: (lines: unknown) => postIntent({intent: 'add', lines}),
    updateLines: (lines: unknown) => postIntent({intent: 'update', lines}),
    removeLines: (lineIds: string[]) =>
      // Removal is an update to quantity 0 in the runtime's protocol.
      postIntent({lines: lineIds.map((id) => ({id, quantity: 0}))}),
    updateDiscountCodes: async (discountCodes: string[]) => {
      // Classic behavior: applying a discount with no cart creates one.
      if (!getCartId(request)) {
        const created = await createEmptyCart(storefrontClient, request);
        if (!created.cart) return toMutationResult(created);
        return postIntent({
          intent: 'discount-update',
          cartId: created.cart.id,
          discountCodes,
        });
      }
      return postIntent({intent: 'discount-update', discountCodes});
    },
    addGiftCardCodes: async (giftCardCodes: string[]) =>
      toMutationResult(
        await addGiftCardCodes(storefrontClient, request, giftCardCodes),
      ),
    removeGiftCardCodes: async (giftCardCodes: string[]) =>
      toMutationResult(
        await removeGiftCardCodes(storefrontClient, request, giftCardCodes),
      ),
    updateBuyerIdentity: async (buyerIdentity: Record<string, unknown>) => {
      const cartId = getCartId(request);
      if (!cartId) {
        return toMutationResult({
          cart: null,
          errors: [
            {
              message:
                'cart.updateBuyerIdentity needs an existing cart, and this request has none.',
            },
          ],
          warnings: [],
        });
      }
      return toMutationResult(
        await updateBuyerIdentity(
          storefrontClient,
          request,
          cartId,
          buyerIdentity,
        ),
      );
    },
  };
}

// ── Customer account ────────────────────────────────────────────────────

const CUSTOMER_ACCOUNT_UNAVAILABLE =
  'Customer Accounts are not available for this request (mock shop, or a ' +
  'missing SHOP_ID / PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID / SESSION_SECRET, ' +
  'or a non-HTTPS origin).';

type ClassicLoginOptions = {
  countryCode?: string;
  acrValues?: string;
  loginHint?: string;
  loginHintMode?: string;
  locale?: string;
};

export function createLegacyCustomerAccount(deps: {
  i18n: I18nLocale;
  request: Request;
  context: Readonly<RouterContextProvider>;
  customerAccount: CustomerAccount | null;
}): LegacyCustomerAccount {
  const {i18n, request, context, customerAccount} = deps;

  function unavailable(): Error {
    return new Error(CUSTOMER_ACCOUNT_UNAVAILABLE);
  }

  async function graphql<T>(
    document: unknown,
    options?: {variables?: Record<string, unknown>},
  ): Promise<T> {
    if (!customerAccount) {
      return {
        data: null,
        errors: [{message: CUSTOMER_ACCOUNT_UNAVAILABLE}],
      } as T;
    }
    const {client, session, sessionManager, requestContext} = customerAccount;
    const accessToken = await session.getOrRefreshAccessToken(
      sessionManager,
      requestContext,
    );
    if (!accessToken) {
      return {
        data: null,
        errors: [{message: 'Customer is not logged in.'}],
      } as T;
    }
    const doc =
      typeof document === 'string' ? customerAccountGql(document) : document;
    const result = await client.graphql(doc as never, {
      accessToken,
      variables: options?.variables,
    } as never);
    return {data: result.data, errors: result.errors} as T;
  }

  return {
    i18n,
    isLoggedIn: async () => {
      if (!customerAccount) return false;
      return customerAccount.session.isLoggedIn(
        customerAccount.sessionManager,
        customerAccount.requestContext,
      );
    },
    login: async (...args: unknown[]) => {
      if (!customerAccount) throw unavailable();
      const options = (args[0] ?? {}) as ClassicLoginOptions;
      const {session, sessionManager, requestContext} = customerAccount;
      // The classic login() read `return_to` off the request URL; the
      // session's prepareLoginUrl takes it explicitly. The remaining
      // Phase 0 params (acr_values, login_hint, login_hint_mode,
      // locale, country) map one-to-one onto PrepareLoginUrlOptions.
      const returnTo =
        new URL(request.url).searchParams.get('return_to') ?? undefined;
      const url = await session.prepareLoginUrl(sessionManager, requestContext, {
        countryCode: options.countryCode,
        acrValues: options.acrValues,
        loginHint: options.loginHint,
        loginHintMode: options.loginHintMode,
        locale: options.locale,
        returnTo,
      });
      return new Response(null, {status: 302, headers: {location: url}});
    },
    logout: async () => {
      if (!customerAccount) throw unavailable();
      const {session, sessionManager, requestContext} = customerAccount;
      // session.logout clears the local tokens and returns Shopify's
      // end-session URL, which lands the customer back on `/` (the
      // handler's default post-logout redirect).
      const url = await session.logout(sessionManager, requestContext, {});
      return new Response(null, {status: 302, headers: {location: url}});
    },
    authorize: async () => {
      if (!customerAccount) throw unavailable();
      const {session, sessionManager, requestContext} = customerAccount;
      const url = await session.handleOAuthCallback(
        sessionManager,
        requestContext,
        request,
      );
      return new Response(null, {status: 302, headers: {location: url}});
    },
    handleAuthStatus: async () => {
      // With no customer account there is no login to send anyone to;
      // the account catch-all's own redirect to /account applies (the
      // Phase 0 observable behavior in mock mode). With one, the guard
      // throws the login/refresh redirects itself.
      if (!customerAccount) return;
      const url = new URL(request.url);
      await requireCustomerAccount(context, url.pathname + url.search);
    },
    query: graphql,
    mutate: graphql,
    getAccessToken: async () => {
      if (!customerAccount) return undefined;
      return customerAccount.session.getAccessToken(
        customerAccount.sessionManager,
        customerAccount.requestContext,
      );
    },
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
