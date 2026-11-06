import {useLoaderData} from 'react-router';
import type {Route} from './+types/collections.new-arrivals';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {ProductItem} from '~/components/ProductItem';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import type {ProductItemFragment} from 'storefrontapi.generated';

const NEW_ARRIVALS_HANDLE = 'new-arrivals';

export const meta: Route.MetaFunction = ({data}) => [
  {title: 'New Arrivals | We Rise Above'},
  {
    name: 'description',
    content:
      data?.collection.description ||
      'Fresh additions to We Rise Above. Discover the latest pieces and choose your armor.',
  },
];

export async function loader({context, request}: Route.LoaderArgs) {
  const paginationVariables = getPaginationVariables(request, {pageBy: 8});
  const {collection} = await context.storefront.query(NEW_ARRIVALS_QUERY, {
    variables: {
      handle: NEW_ARRIVALS_HANDLE,
      ...paginationVariables,
    },
  });

  if (!collection) {
    throw new Response('New Arrivals collection not found', {status: 404});
  }

  redirectIfHandleIsLocalized(request, {
    handle: NEW_ARRIVALS_HANDLE,
    data: collection,
  });

  return {collection};
}

export default function NewArrivals() {
  const {collection} = useLoaderData<typeof loader>();

  return (
    <div className="collection">
      <p className="eyebrow">We Rise Above · Just landed</p>
      <h1>New Arrivals</h1>
      <p className="collection-intro">
        Fresh additions. Same code. No final form.
      </p>
      {collection.description ? (
        <p className="collection-description">{collection.description}</p>
      ) : null}
      <PaginatedResourceSection<ProductItemFragment>
        connection={collection.products}
        resourcesClassName="products-grid"
      >
        {({node: product, index}) => (
          <ProductItem
            key={product.id}
            product={product}
            loading={index < 8 ? 'eager' : undefined}
          />
        )}
      </PaginatedResourceSection>
      <Analytics.CollectionView
        data={{
          collection: {
            id: collection.id,
            handle: collection.handle,
          },
        }}
      />
    </div>
  );
}

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyNewArrivalItem on MoneyV2 {
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
    images(first: 12) {
      nodes {
        id
        altText
        url
        width
        height
      }
    }
    priceRange {
      minVariantPrice {
        ...MoneyNewArrivalItem
      }
      maxVariantPrice {
        ...MoneyNewArrivalItem
      }
    }
  }
` as const;

const NEW_ARRIVALS_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query NewArrivals(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      products(
        first: $first
        last: $last
        before: $startCursor
        after: $endCursor
      ) {
        nodes {
          ...ProductItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          startCursor
          endCursor
        }
      }
    }
  }
` as const;
