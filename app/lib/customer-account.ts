import type { ShopifyRequestContext } from "@shopify/hydrogen";
import {
  createCustomerAccountClient,
  createCustomerAccountServerHandlers,
  createCustomerSession,
  type CustomerAccountClient,
  type CustomerSession,
  type WritableCustomerSessionManager,
} from "@shopify/hydrogen/customer-account";
import { createContext, redirect, type RouterContextProvider } from "react-router";

import type { Env } from "~/lib/env";
import { createRequestSessionManager } from "~/lib/session";
import { shouldUseMockShop } from "~/lib/shop";

export type CustomerAccount = {
  client: CustomerAccountClient;
  session: CustomerSession;
  sessionManager: WritableCustomerSessionManager;
  requestContext: ShopifyRequestContext;
};

// `null` when Customer Accounts are unavailable (see `createRequestCustomerAccount`).
export const customerAccountContext = createContext<CustomerAccount | null>(null);

// Reused across requests so concurrent token refreshes for the same customer
// share one request to Shopify.
let cached:
  | {
      key: string;
      session: ReturnType<typeof createCustomerSession>;
      handlers: ReturnType<typeof createCustomerAccountServerHandlers>;
    }
  | undefined;

/**
 * Customer Accounts need a real store, `SHOP_ID`, `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID`,
 * `SESSION_SECRET`, and HTTPS (the OAuth callback must be an HTTPS origin).
 */
export async function createRequestCustomerAccount(
  request: Request,
  env: Env,
  requestContext: ShopifyRequestContext,
) {
  const {
    SHOP_ID: shopId,
    PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: customerAccountApiClientId,
    SESSION_SECRET: sessionSecret,
  } = env;
  if (shouldUseMockShop(env) || !shopId || !customerAccountApiClientId || !sessionSecret) return;
  if (new URL(request.url).protocol !== "https:") return;

  const key = `${shopId}:${customerAccountApiClientId}`;
  if (cached?.key !== key) {
    const session = createCustomerSession({ shopId, customerAccountApiClientId });
    const handlers = createCustomerAccountServerHandlers({
      customerSession: session,
      defaultPostLoginRedirectPathname: "/account",
    });
    cached = { key, session, handlers };
  }

  return {
    handlers: cached.handlers,
    customerAccount: {
      client: createCustomerAccountClient({ shopId, requestContext }),
      session: cached.session,
      sessionManager: await createRequestSessionManager(request, sessionSecret),
      requestContext,
    } satisfies CustomerAccount,
  };
}

export type CustomerAccess = {
  client: CustomerAccountClient;
  accessToken: string;
};

/**
 * The signed-in customer's client + access token, or `null` when Customer
 * Accounts are unavailable or the visitor is signed out / has no usable
 * token. Replaces the classic `customerAccount.query/mutate` calls, which
 * hid the auth state; the 2026.10 client takes the token per call.
 */
export async function getCustomerAccess(
  context: Readonly<RouterContextProvider>,
  _returnTo: string,
): Promise<CustomerAccess | null> {
  const customerAccount = context.get(customerAccountContext);
  if (!customerAccount) return null;
  const { client, session, sessionManager, requestContext } = customerAccount;
  if (!(await session.isLoggedIn(sessionManager, requestContext))) return null;
  const accessToken = await session.getAccessToken(sessionManager, requestContext);
  if (!accessToken) return null;
  return { client, accessToken };
}

/**
 * Like `getCustomerAccess`, but enforces sign-in the way the classic
 * `customerAccount.handleAuthStatus()` did: signed-out visitors go to the
 * login handler; a signed-in visitor whose token expired goes through the
 * refresh handler once (the `refreshed=1` guard prevents loops).
 */
export async function requireCustomerAccount(
  context: Readonly<RouterContextProvider>,
  returnTo: string,
): Promise<CustomerAccess> {
  const customerAccount = context.get(customerAccountContext);
  if (!customerAccount) {
    throw redirect("/");
  }
  const { client, session, sessionManager, requestContext } = customerAccount;
  if (!(await session.isLoggedIn(sessionManager, requestContext))) {
    throw redirect(
      "/account/login?return_to=" + encodeURIComponent(returnTo),
    );
  }
  const accessToken = await session.getAccessToken(sessionManager, requestContext);
  if (!accessToken) {
    if (returnTo.includes("refreshed=1")) {
      throw redirect("/account/login");
    }
    const separator = returnTo.includes("?") ? "&" : "?";
    throw redirect(
      "/account/refresh?return_to=" +
        encodeURIComponent(returnTo + separator + "refreshed=1"),
    );
  }
  return { client, accessToken };
}
