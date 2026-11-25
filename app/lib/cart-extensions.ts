import {getCartId, gql} from '@shopify/hydrogen';

import type {CartData} from '~/lib/cart';
import {cartHandlers} from '~/lib/cart-handlers';
import type {RequestStorefrontClient} from '~/lib/storefront';

// ─────────────────────────────────────────────────────────────────────────
// Cart operations the 2026.10 server handlers do NOT cover.
//
// The handler action set (verified against the installed package,
// dist/core/cart/actions) is: add / update / remove / discount-update /
// discount-apply / discount-remove / attributes-update / note-update.
// There are no gift-card intents and no buyer-identity intent — buyer
// identity in 2026.10 is owned by the customer-session sync, and gift
// cards were dropped from the handler surface entirely. The classic
// cart contract (Phase 0 checklist items 5–7) still needs all three, so
// they run here as direct Storefront API mutations, and the canonical
// cart is then re-read through the handlers so every result carries the
// same cart shape (base fragment + ~/lib/cart-handlers custom fragment).
// ─────────────────────────────────────────────────────────────────────────

export type CartExtensionError = {
  message: string;
  code?: string | null;
  field?: string[] | null;
};

export type CartExtensionResult = {
  cart: CartData | null;
  errors: CartExtensionError[];
  warnings: Array<{message: string; code?: string | null}>;
};

const CART_CREATE_MUTATION = gql(`
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
      }
      userErrors {
        code
        field
        message
      }
      warnings {
        code
        message
      }
    }
  }
`);

const CART_GIFT_CARD_CODES_ADD_MUTATION = gql(`
  mutation CartGiftCardCodesAdd($cartId: ID!, $giftCardCodes: [String!]!) {
    cartGiftCardCodesAdd(cartId: $cartId, giftCardCodes: $giftCardCodes) {
      cart {
        id
      }
      userErrors {
        code
        field
        message
      }
      warnings {
        code
        message
      }
    }
  }
`);

const CART_GIFT_CARD_CODES_REMOVE_MUTATION = gql(`
  mutation CartGiftCardCodesRemove($cartId: ID!, $appliedGiftCardIds: [ID!]!) {
    cartGiftCardCodesRemove(cartId: $cartId, appliedGiftCardIds: $appliedGiftCardIds) {
      cart {
        id
      }
      userErrors {
        code
        field
        message
      }
      warnings {
        code
        message
      }
    }
  }
`);

const CART_BUYER_IDENTITY_UPDATE_MUTATION = gql(`
  mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        id
      }
      userErrors {
        code
        field
        message
      }
      warnings {
        code
        message
      }
    }
  }
`);

type MutationPayload = {
  cart?: {id: string} | null;
  userErrors?: CartExtensionError[];
  warnings?: CartExtensionResult['warnings'];
};

async function runCartMutation(
  client: RequestStorefrontClient,
  document: unknown,
  variables: Record<string, unknown>,
  field: string,
): Promise<MutationPayload> {
  const result = (await client.graphql(document as never, {
    variables,
  } as never)) as {
    data?: Record<string, MutationPayload | null | undefined>;
    errors?: unknown;
  };
  const payload = result.data?.[field];
  if (!payload) {
    throw new Error(
      `Cart mutation ${field} failed: ${JSON.stringify(result.errors ?? 'no data returned')}`,
    );
  }
  return payload;
}

/** Re-reads the canonical cart through the server handlers. */
export async function readCart(
  client: RequestStorefrontClient,
  request: Request,
  cartId?: string,
): Promise<CartData | null> {
  let cartRequest = request;
  if (cartId) {
    const url = new URL('/api/cart', request.url);
    url.searchParams.set('cartId', cartId);
    cartRequest = new Request(url, {headers: request.headers});
  }
  const result = await cartHandlers.get({storefrontClient: client, request: cartRequest});
  return result.type === 'json' ? (result.data.cart ?? null) : null;
}

async function finishWithCart(
  client: RequestStorefrontClient,
  request: Request,
  payload: MutationPayload,
): Promise<CartExtensionResult> {
  const cart = payload.cart?.id
    ? await readCart(client, request, payload.cart.id)
    : null;
  return {
    cart,
    errors: payload.userErrors ?? [],
    warnings: payload.warnings ?? [],
  };
}

function noCartResult(operation: string): CartExtensionResult {
  return {
    cart: null,
    errors: [
      {
        message: `${operation} needs an existing cart, and this request has none.`,
      },
    ],
    warnings: [],
  };
}

/** Creates an empty cart (the classic updateDiscountCodes-on-no-cart path). */
export async function createEmptyCart(
  client: RequestStorefrontClient,
  request: Request,
): Promise<CartExtensionResult> {
  const payload = await runCartMutation(
    client,
    CART_CREATE_MUTATION,
    {input: {}},
    'cartCreate',
  );
  return finishWithCart(client, request, payload);
}

export async function addGiftCardCodes(
  client: RequestStorefrontClient,
  request: Request,
  giftCardCodes: string[],
): Promise<CartExtensionResult> {
  const cartId = getCartId(request);
  if (!cartId) return noCartResult('cart.addGiftCardCodes');
  const payload = await runCartMutation(
    client,
    CART_GIFT_CARD_CODES_ADD_MUTATION,
    {cartId, giftCardCodes},
    'cartGiftCardCodesAdd',
  );
  return finishWithCart(client, request, payload);
}

export async function removeGiftCardCodes(
  client: RequestStorefrontClient,
  request: Request,
  appliedGiftCardIds: string[],
): Promise<CartExtensionResult> {
  const cartId = getCartId(request);
  if (!cartId) return noCartResult('cart.removeGiftCardCodes');
  const payload = await runCartMutation(
    client,
    CART_GIFT_CARD_CODES_REMOVE_MUTATION,
    {cartId, appliedGiftCardIds},
    'cartGiftCardCodesRemove',
  );
  return finishWithCart(client, request, payload);
}

export async function updateBuyerIdentity(
  client: RequestStorefrontClient,
  request: Request,
  cartId: string,
  buyerIdentity: Record<string, unknown>,
): Promise<CartExtensionResult> {
  const payload = await runCartMutation(
    client,
    CART_BUYER_IDENTITY_UPDATE_MUTATION,
    {cartId, buyerIdentity},
    'cartBuyerIdentityUpdate',
  );
  return finishWithCart(client, request, payload);
}
