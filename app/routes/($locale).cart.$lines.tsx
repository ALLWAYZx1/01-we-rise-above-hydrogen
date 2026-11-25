import {redirect} from 'react-router';
import type {Route} from './+types/($locale).cart.$lines';
import {legacyContext} from '~/lib/context';

/**
 * Automatically creates a new cart based on the URL and redirects straight to checkout.
 * Expected URL structure:
 * ```js
 * /cart/<variant_id>:<quantity>
 *
 * ```
 *
 * More than one `<variant_id>:<quantity>` separated by a comma, can be supplied in the URL, for
 * carts with more than one product variant.
 *
 * REACHABILITY (Phase 3 finding): the UNPREFIXED shape (/cart/...)
 * never reaches this route — the SDK's handleCheckoutRedirect
 * interceptor inside handleShopifyRoutes (root middleware) matches
 * the unprefixed cart-permalink pattern first and 302-bounces the
 * permalink to the store origin, where Shopify resolves it natively
 * (cart + discount handled there). This route serves the
 * locale-prefixed shape (/EN-US/cart/...), which the interceptor's
 * anchored pattern does not match, with the classic semantics.
 *
 * @example
 * Example path creating a cart with two product variants, different quantities, and a discount code in the querystring:
 * ```js
 * /cart/41007289663544:1,41007289696312:2?discount=HYDROBOARD
 *
 * ```
 */
export async function loader({request, context, params}: Route.LoaderArgs) {
  const {cart} = legacyContext(context);
  const {lines} = params;
  if (!lines) return redirect('/cart');
  const linesMap = lines.split(',').map((line) => {
    const lineDetails = line.split(':');
    const variantId = lineDetails[0];
    const quantity = parseInt(lineDetails[1], 10);

    return {
      merchandiseId: `gid://shopify/ProductVariant/${variantId}`,
      quantity,
    };
  });

  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);

  const discount = searchParams.get('discount');
  const discountArray = discount ? [discount] : [];

  // create a cart
  const result = await cart.create({
    lines: linesMap,
    discountCodes: discountArray,
  });

  const cartResult = result.cart;

  if (result.errors?.length || !cartResult) {
    throw new Response('Link may be expired. Try checking the URL.', {
      status: 410,
    });
  }

  // Update cart id in cookie (rides the redirect's own headers —
  // classic behavior, verified live in Phase 3).
  // redirect to checkout
  if (cartResult.checkoutUrl) {
    return redirect(cartResult.checkoutUrl, {
      headers: cart.setCartId(cartResult.id),
    });
  } else {
    throw new Error('No checkout URL found');
  }
}

export default function Component() {
  return null;
}
