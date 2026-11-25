import type {CartDataFromHandlers} from '@shopify/hydrogen';
import {createCartComponents} from '@shopify/hydrogen/react';

import type {cartHandlers} from '~/lib/cart-handlers';

// The 2026.10 cart client contract: components read cart state through
// these hooks and mutate through intent-based forms that post to
// /api/cart (see ~/lib/cart-handlers). Cart data is typed from the
// handlers themselves, custom fragment included.
//
// Phase 2 delivers this module as the contract Phase 4 binds to. The
// CartProvider is intentionally NOT mounted yet: repo 01's cart UI still
// renders from loader data through the legacy bridge (~/lib/context),
// and mounting the provider changes client cart behavior (it loads the
// cart from /api/cart in the browser), which belongs to the Phase 4
// component rebuild — not to this server-layer phase.
export type CartData = CartDataFromHandlers<typeof cartHandlers>;
export const {CartProvider, useCart, useCartForm} = createCartComponents<typeof cartHandlers>();
