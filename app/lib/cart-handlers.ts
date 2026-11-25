import {createCartServerHandlers, gql} from '@shopify/hydrogen';

// Cart server handlers (Hydrogen 2026.10 pattern, modeled on repo 06).
// Registered in the root middleware (app/root.tsx) via handleShopifyRoutes;
// they serve /api/cart. POST bodies follow the runtime's field-based
// JSON protocol — exactly one of lines / discountCodes / attributes /
// note per body; line entries partition into add (merchandiseId, no
// id), update (id + quantity) and remove (id + quantity 0) — or
// classic form posts; the runtime derives its intents (add / update /
// remove / discount-update / ...) from that shape. There are NO
// gift-card or buyer-identity operations in the protocol — those run
// as direct Storefront mutations in ~/lib/cart-extensions.
//
// FRAGMENT DELTA — verified field-by-field in Phase 2 against repo 01's
// classic CART_QUERY_FRAGMENT (kept verbatim in ~/lib/fragments as the
// parity reference):
//   The handlers compose their own cart query from the library's base
//   fragment (HydrogenCartFragment), which already covers the classic
//   selections for the cart id/checkoutUrl/totalQuantity/note/attributes,
//   cost subtotal+total, discountCodes, and the line fields (id, quantity,
//   attributes, cost incl. compareAtAmountPerQuantity, merchandise
//   id/title/image/product/selectedOptions, sellingPlanAllocation,
//   parentRelationship). The classic fragment additionally selected
//   appliedGiftCards and buyerIdentity, two TOP-LEVEL Cart fields the
//   base lacks — so the custom CartFragment below re-selects exactly
//   those. (The classic cost.totalDutyAmount/totalTaxAmount selections
//   are NOT carried over: both fields are deprecated in the 2026-10
//   Storefront API — "tax and duty amounts are no longer available" —
//   which is why the base fragment dropped them; selecting them fails
//   the repo's gql check under --fail-on-warn.)
//   Deliberately NOT re-selected: `lines`. Repo 06's handlers note that
//   re-selecting lines breaks the library's cart type merge.
//   Phase 4 VERIFIED that warning empirically: adding a lines(first:250)
//   re-selection (merchandise price / compareAtPrice /
//   availableForSale / requiresShipping + ComponentizableCartLine
//   lineComponents) to this fragment made the merged CartData type
//   unassignable in ~/lib/cart-extensions (TS2322 — the merged
//   lines.nodes union loses id / quantity / cost on one branch), so
//   typecheck fails with it and the re-selection was reverted. The
//   line-level deltas are therefore closed as NOT restorable on the
//   2026.10 handler contract; the component contract types in
//   ~/lib/storefrontapi-types were aligned down to what the handlers
//   actually select in Phase 4:
//     • line merchandise does not carry price / compareAtPrice /
//       availableForSale / requiresShipping (it gains sku and
//       product.productType instead);
//     • ComponentizableCartLine nodes do not carry lineComponents
//       (children render through parentRelationship, which the base
//       fragment does select);
//     • lines are capped at first: 250 (classic used $numCartLines).
const cartFragment = gql(`
  fragment CartFragment on Cart {
    appliedGiftCards {
      id
      lastCharacters
      amountUsed {
        amount
        currencyCode
      }
    }
    buyerIdentity {
      countryCode
      email
      phone
      customer {
        id
        email
        firstName
        lastName
        displayName
      }
    }
  }
`);

export const cartHandlers = createCartServerHandlers({
  fragment: cartFragment,
  rateLimitHandling: 'response',
});
