import type {Route} from './+types/api.cart-bridge';
import {legacyContext} from '~/lib/context';

// ─────────────────────────────────────────────────────────────────────────
// Phase 4 cart bridge route (/api/cart-bridge).
//
// The /api/cart server handlers have no gift-card or buyer-identity
// intent — in 2026.10 those operations exist only as direct Storefront
// API mutations (~/lib/cart-extensions, exposed through the legacy cart
// bridge in ~/lib/context). The cart UI's gift-card and buyer-identity
// forms post their classic action names here as JSON; this action runs
// the matching bridge mutation and returns the canonical cart result
// ({cart, errors, warnings}) the forms revalidate against.
// ─────────────────────────────────────────────────────────────────────────

type BridgeRequest = {
  action?: string;
  giftCardCodes?: string[];
  buyerIdentity?: Record<string, unknown>;
};

function jsonError(status: number, message: string) {
  return Response.json({cart: null, errors: [{message}], warnings: []}, {status});
}

export async function action({context, request}: Route.ActionArgs) {
  const body = (await request.json().catch(() => null)) as BridgeRequest | null;
  if (!body?.action) {
    return jsonError(400, 'Cart bridge requests must name an action.');
  }
  const cart = legacyContext(context).cart;
  try {
    switch (body.action) {
      case 'GiftCardCodesAdd':
        return Response.json(await cart.addGiftCardCodes(body.giftCardCodes ?? []));
      case 'GiftCardCodesRemove':
        return Response.json(
          await cart.removeGiftCardCodes(body.giftCardCodes ?? []),
        );
      case 'BuyerIdentityUpdate':
        return Response.json(
          await cart.updateBuyerIdentity(body.buyerIdentity ?? {}),
        );
      default:
        return jsonError(400, `Unknown cart bridge action: ${body.action}`);
    }
  } catch (error) {
    return jsonError(
      500,
      error instanceof Error ? error.message : 'Cart bridge request failed.',
    );
  }
}

export function loader() {
  return jsonError(405, 'Method not allowed.');
}
