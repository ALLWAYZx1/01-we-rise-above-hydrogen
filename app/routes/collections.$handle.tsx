import {useLoaderData, Form, Link} from 'react-router';
import type {Route} from './+types/collections.$handle';
import pageStyles from '~/styles/daylight-pages.css?url';

export function links() { return [{rel: 'stylesheet', href: pageStyles}]; }
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {ProductItem} from '~/components/ProductItem';
import type {ProductItemFragment} from 'storefrontapi.generated';

export const meta: Route.MetaFunction = ({data}) => [
  {title: `WE RISE ABOVE | ${data?.collection.title ?? 'Collection'}`},
  {name: 'description', content: data?.collection.description || 'Explore WE RISE ABOVE.'},
];

export async function loader({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  if (!handle) throw new Response('Collection not found', {status: 404});
  const url = new URL(request.url);
  const sort = url.searchParams.get('sort') || 'featured';
  const sortMap: Record<string, {sortKey: 'COLLECTION_DEFAULT' | 'CREATED' | 'PRICE' | 'BEST_SELLING'; reverse: boolean}> = {
    featured: {sortKey: 'COLLECTION_DEFAULT', reverse: false},
    newest: {sortKey: 'CREATED', reverse: true},
    price_asc: {sortKey: 'PRICE', reverse: false},
    price_desc: {sortKey: 'PRICE', reverse: true},
    best_selling: {sortKey: 'BEST_SELLING', reverse: false},
  };
  const chosen = sortMap[sort] || sortMap.featured;
  const filters: Array<Record<string, string>> = [];
  const vendor = url.searchParams.get('vendor');
  const productType = url.searchParams.get('type');
  const tag = url.searchParams.get('tag');
  if (vendor) filters.push({productVendor: vendor});
  if (productType) filters.push({productType});
  if (tag) filters.push({tag});
  const paginationVariables = getPaginationVariables(request, {pageBy: 12});
  const {collection} = await context.storefront.query(COLLECTION_QUERY, {
    variables: {handle, ...paginationVariables, sortKey: chosen.sortKey, reverse: chosen.reverse, filters},
  });
  if (!collection) throw new Response(`Collection ${handle} not found`, {status: 404});
  redirectIfHandleIsLocalized(request, {handle, data: collection});
  return {collection, sort, vendor: vendor || '', productType: productType || '', tag: tag || ''};
}

export default function Collection() {
  const {collection, sort, vendor, productType, tag} = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const hasFilters = Boolean(vendor || productType || tag);
  return (
    <main className="daylight-collection-page">
      <nav className="daylight-breadcrumb" aria-label="Breadcrumb"><Link to="/collections">Collections</Link><span aria-hidden="true">/</span><span>{collection.title}</span></nav>
      <header className="daylight-collection-heading">
        <p className="daylight-eyebrow">WE RISE ABOVE</p>
        <h1>{collection.title}</h1>
        {collection.description ? <p>{collection.description}</p> : null}
      </header>
      <Form method="get" className="daylight-filters">
        <label>Sort by
          <select name="sort" defaultValue={sort}>
            <option value="featured">Featured</option><option value="best_selling">Best selling</option><option value="newest">Newest</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option>
          </select>
        </label>
        <label>Vendor <input name="vendor" defaultValue={vendor} placeholder="Filter by vendor" /></label>
        <label>Product type <input name="type" defaultValue={productType} placeholder="Filter by type" /></label>
        <label>Tag <input name="tag" defaultValue={tag} placeholder="Filter by tag" /></label>
        <button className="daylight-button" type="submit">Apply filters</button>
        {hasFilters || sort !== 'featured' ? <Link className="daylight-text-link" to={`/collections/${collection.handle}`}>Clear</Link> : null}
      </Form>
      <p className="daylight-result-count">{hasFilters ? 'Filtered selection' : 'Explore the collection'}</p>
      {collection.products.nodes.length ? (
        <PaginatedResourceSection<ProductItemFragment> connection={collection.products} resourcesClassName="daylight-product-grid">
          {({node: product, index}) => <ProductItem key={product.id} product={product} loading={index < 4 ? 'eager' : undefined} />}
        </PaginatedResourceSection>
      ) : <div className="daylight-empty-state"><h2>No pieces found</h2><p>Try clearing a filter or exploring the full collection.</p><Link className="daylight-button" to={`/collections/${collection.handle}`}>Reset collection</Link></div>}
      <Analytics.CollectionView data={{collection: {id: collection.id, handle: collection.handle}}} />
    </main>
  );
}

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 { amount currencyCode }
  fragment ProductItem on Product {
    id handle title vendor productType tags
    featuredImage { id altText url width height }
    priceRange { minVariantPrice { ...MoneyProductItem } maxVariantPrice { ...MoneyProductItem } }
  }
` as const;

const COLLECTION_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query DaylightCollection(
    $handle: String!, $country: CountryCode, $language: LanguageCode,
    $first: Int, $last: Int, $startCursor: String, $endCursor: String,
    $sortKey: ProductCollectionSortKeys, $reverse: Boolean, $filters: [ProductFilter!]
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id handle title description
      products(first: $first, last: $last, before: $startCursor, after: $endCursor, sortKey: $sortKey, reverse: $reverse, filters: $filters) {
        nodes { ...ProductItem }
        pageInfo { hasPreviousPage hasNextPage endCursor startCursor }
      }
    }
  }
` as const;
