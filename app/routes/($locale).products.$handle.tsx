import {Suspense} from 'react';
import {Await, redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/($locale).products.$handle';
import {getSelectedProductOptions} from '@shopify/hydrogen';
import {useOptimisticVariant, getProductOptions, getAdjacentAndFirstAvailableVariants, useSelectedOptionInUrlParam} from '~/lib/legacy-components';
import type {ProductQuery, ProductRecommendationsQuery} from 'storefrontapi.generated';
import {Analytics} from '~/lib/analytics';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductImage} from '~/components/ProductImage';
import {ProductForm} from '~/components/ProductForm';
import {ProductItem} from '~/components/ProductItem';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {legacyContext} from '~/lib/context';

export const meta: Route.MetaFunction = ({loaderData: data}) => {
  return [
    {title: `Hydrogen | ${data?.product.title ?? ''}`},
    {
      rel: 'canonical',
      href: `/products/${data?.product.handle}`,
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  // "You may also like" — starts only once the product (and its id) is
  // known, but is NOT awaited: it streams in below the fold so moving
  // product → product never waits on it, and a failed recommendations
  // call resolves to an empty list and renders nothing (2026-11-25,
  // ALLWAYZ's order: product pages need the rail; the flow between
  // products has to stay smooth).
  const recommendations = legacyContext(args.context)
    .storefront.query<ProductRecommendationsQuery>(
      PRODUCT_RECOMMENDATIONS_QUERY,
      {variables: {productId: criticalData.product.id}},
    )
    .then(
      ({productRecommendations}) => productRecommendations ?? [],
      () => [] as ProductRecommendationsQuery['productRecommendations'],
    );

  return {...deferredData, ...criticalData, recommendations};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = legacyContext(context);

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const [{product}] = await Promise.all([
    storefront.query<ProductQuery>(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions({searchParams: new URL(request.url).searchParams})},
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: product});

  return {
    product,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context, params}: Route.LoaderArgs) {
  // Put any API calls that is not critical to be available on first page render
  // For example: product reviews, product recommendations, social feeds.

  return {};
}

export default function Product() {
  const {product, recommendations} = useLoaderData<typeof loader>();

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const {title, descriptionHtml} = product;

  return (
    <>
    <div className="product cosmic-product">
      <div className="wra-product-starfield" aria-hidden="true" />
      <div className="product-stage">
        <ProductImage image={selectedVariant?.image} />
      </div>
      <div className="product-main">
        <p className="shelf-kicker">We Rise Above</p>
        <h1>{title}</h1>
        <p className="shelf-canon">No final form.</p>
        <ProductPrice
          price={selectedVariant?.price}
          compareAtPrice={selectedVariant?.compareAtPrice}
        />
        <br />
        <ProductForm
          productOptions={productOptions}
          selectedVariant={selectedVariant}
        />
        <br />
        <br />
        <p>
          <strong>Description</strong>
        </p>
        <br />
        <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
        <br />
      </div>
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
    {/* You may also like — the product → product path. Cards carry
        the hover back-view and prefetch on intent, so the next
        product is one tap from here instead of a trip back out to
        the collection. Renders nothing when no recommendations
        come back. */}
    <Suspense fallback={null}>
      <Await resolve={recommendations}>
        {(items) =>
          items.length > 0 ? (
            <section className="product-recommendations">
              <p className="shelf-kicker">Keep moving</p>
              <h2>You may also like</h2>
              <div className="recommendations-grid">
                {items.slice(0, 4).map((item) => (
                  <ProductItem key={item.id} product={item} loading="lazy" />
                ))}
              </div>
            </section>
          ) : null
        }
      </Await>
    </Suspense>
    </>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;

// The fragment mirrors the ProductItem fragment on the collection
// routes field-for-field (including media(first: 2), which is what
// gives the rail's cards their hover back-view), so the rail renders
// through the same ProductItem component as the collection grids.
const PRODUCT_RECOMMENDATIONS_QUERY = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    media(first: 2) {
      nodes {
        __typename
        ... on MediaImage {
          image {
            id
            altText
            url
            width
            height
          }
        }
      }
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
  }
  query ProductRecommendations(
    $productId: ID!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    productRecommendations(productId: $productId, intent: RELATED) {
      ...ProductItem
    }
  }
` as const;
