import {useLoaderData} from 'react-router';
import type {Route} from './+types/($locale).cart';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {cartHandlers} from '~/lib/cart-handlers';
import {storefrontClientContext} from '~/lib/storefront';
import {CartMain} from '~/components/CartMain';

export const meta: Route.MetaFunction = () => {
  return [{title: `Hydrogen | Cart`}];
};

// Phase 3: the classic cart action — the CartForm dispatch over
// LinesAdd / LinesUpdate / LinesRemove / DiscountCodesUpdate /
// GiftCardCodesAdd / GiftCardCodesRemove / BuyerIdentityUpdate — is
// retired. Cart mutations are owned by the /api/cart server handlers
// registered in the root middleware (Phase 2), and this route is
// loader-only: it reads the cart through those same handlers, the exact
// code path behind GET /api/cart. The cart UI components still post
// their legacy forms to this route until the Phase 4 component port
// binds them to the /api/cart intents — that is a Phase 4 carry item,
// recorded in the Phase 3 report.
export async function loader({context, request}: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const result = await cartHandlers.get({storefrontClient, request});
  if (result.type !== 'json') return null;
  return (result.data.cart ?? null) as unknown as CartApiQueryFragment | null;
}

export default function Cart() {
  const cart = useLoaderData<typeof loader>();

  return (
    <div className="cart cosmic-cart">
      <h1>Cart</h1>
      <CartMain layout="page" cart={cart} />
    </div>
  );
}
