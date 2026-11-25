import type {
  Article,
  BlogConnection,
  Collection,
  CountryCode,
  CurrencyCode,
  PageInfo,
  Product,
  ProductVariant,
  ShopPolicy,
} from '@shopify/hydrogen/storefront-api-types';

/**
 * ─────────────────────────────────────────────────────────────────────────
 * PHASE 1 BRIDGE — hand-maintained replacements for the deleted codegen
 * output (`storefrontapi.generated.d.ts`). tsconfig maps the bare
 * specifier `storefrontapi.generated` to this module so the 21 importing
 * files compile unchanged.
 *
 * Where a fragment selects a subset of a schema type, the alias is the
 * schema type itself (a safe superset). Where components depend on the
 * exact selected shape (cart, product cards, search results, homepage),
 * the type is hand-shaped from the query documents in the routes —
 * mirroring what codegen used to emit. Phases 3–4 retire this module
 * batch by batch, replacing each alias with
 * `StorefrontApi.ResultOf<typeof QUERY>` at the query site, exactly as
 * repo 06 does.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type {HeaderQuery, FooterQuery} from '~/lib/fragments';

// ── Cart (hand-shaped from CART_QUERY_FRAGMENT in ~/lib/fragments) ──────

export type MoneyFragment = {
  amount: string;
  currencyCode: CurrencyCode;
};

type CartLineImage = {
  id: string | null;
  url: string;
  altText: string | null;
  width: number;
  height: number;
};

// Aligned in Phase 4 to the cart server handlers' base fragment (see
// the Phase 4 verdict in ~/lib/cart-handlers): merchandise carries no
// price / compareAtPrice / availableForSale / requiresShipping — the
// cart UI prices lines from `cost`, never from merchandise.
type CartLineMerchandise = {
  id: string;
  title: string;
  image: CartLineImage | null;
  product: {handle: string; title: string; id: string; vendor: string};
  selectedOptions: Array<{name: string; value: string}>;
};

type CartLineCommon = {
  id: string;
  quantity: number;
  attributes: Array<{key: string; value: string}>;
  cost: {
    totalAmount: MoneyFragment;
    amountPerQuantity: MoneyFragment;
    compareAtAmountPerQuantity: MoneyFragment | null;
  };
  merchandise: CartLineMerchandise;
  parentRelationship: {parent: {id: string}} | null;
};

// Phase 4: the classic union's ComponentizableCartLine variant carried
// `lineComponents`, which the 2026.10 handlers cannot select (see the
// cart-handlers verdict). Component children arrive as their own nodes
// linked by parentRelationship, which CartMain already maps.
export type CartLineFragment = CartLineCommon;

export type CartApiQueryFragment = {
  id: string;
  updatedAt: string;
  checkoutUrl: string;
  totalQuantity: number;
  note: string | null;
  attributes: Array<{key: string; value: string}>;
  discountCodes: Array<{code: string; applicable: boolean}>;
  appliedGiftCards: Array<{
    id: string;
    lastCharacters: string;
    amountUsed: MoneyFragment;
  }>;
  buyerIdentity: {
    countryCode: CountryCode | null;
    customer: {
      id: string;
      email: string | null;
      firstName: string | null;
      lastName: string | null;
      displayName: string;
    } | null;
    email: string | null;
    phone: string | null;
  };
  lines: {nodes: CartLineFragment[]};
  cost: {
    subtotalAmount: MoneyFragment;
    totalAmount: MoneyFragment;
    // No totalDutyAmount / totalTaxAmount: both fields are deprecated
    // in the 2026-10 Storefront API and are never selected (Phase 2).
  };
};

// ── Product cards (hand-shaped; ProductItem / FeaturedProducts) ─────────

export type ProductCardImage = {
  id: string | null;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

export type ProductItemFragment = {
  __typename?: 'Product';
  id: string;
  handle: string;
  title: string;
  featuredImage: ProductCardImage | null;
  media: {
    nodes: Array<{
      __typename: string;
      image?: ProductCardImage | null;
    }>;
  };
  priceRange: {
    minVariantPrice: MoneyFragment;
    maxVariantPrice: MoneyFragment;
  };
};

// The collection grid reuses the same card shape (both fragments were
// generated from product-card documents in this codebase).
export type CollectionItemFragment = ProductItemFragment;

// ── Schema-superset aliases ─────────────────────────────────────────────

export type ProductFragment = Product;
export type CollectionFragment = Collection;
export type ProductVariantFragment = ProductVariant;
export type ArticleItemFragment = Article;
export type PolicyItemFragment = ShopPolicy;

export type ProductQuery = {
  // The product query selects selectedOrFirstAvailableVariant, which
  // the Storefront API guarantees for any product with variants.
  product: (Product & {selectedOrFirstAvailableVariant: ProductVariant}) | null;
};

// ── Homepage (hand-shaped from the _index queries) ──────────────────────

// Hand-shaped from the HomepageProductItem fragment in the _index
// route (the card shape plus productType, which the tiles mapping reads).
export type HomepageProductsQuery = {
  products: {nodes: Array<ProductItemFragment & {productType: string}>};
};

export type HomepageCollectionItem = {
  id: string;
  handle: string;
  title: string;
  image: ProductCardImage | null;
};

export type HomepageCollectionsQuery = {
  collections: {nodes: HomepageCollectionItem[]};
};

// ── Blog / policies index queries ───────────────────────────────────────

export type BlogsQuery = {
  blogs: BlogConnection;
};

export type PoliciesQuery = {
  shop: {
    privacyPolicy: ShopPolicy | null;
    shippingPolicy: ShopPolicy | null;
    termsOfService: ShopPolicy | null;
    refundPolicy: ShopPolicy | null;
    subscriptionPolicy: ShopPolicy | null;
  };
};

export type BenchSpotlightQuery = {
  product: Product | null;
};

// ── Search (hand-shaped from the queries in the search route) ───────────

type SearchImage = {
  url: string;
  altText: string | null;
  width: number;
  height: number;
};

export type RegularSearchQuery = {
  articles: {
    nodes: Array<{
      __typename: 'Article';
      handle: string;
      id: string;
      title: string;
      trackingParameters?: string | null;
    }>;
  };
  pages: {
    nodes: Array<{
      __typename: 'Page';
      handle: string;
      id: string;
      title: string;
      trackingParameters?: string | null;
    }>;
  };
  products: {
    nodes: Array<{
      __typename: 'Product';
      handle: string;
      id: string;
      publishedAt: string;
      title: string;
      trackingParameters?: string | null;
      vendor: string;
      selectedOrFirstAvailableVariant: {
        id: string;
        image: SearchImage | null;
        price: MoneyFragment;
        compareAtPrice: MoneyFragment | null;
        selectedOptions: Array<{name: string; value: string}>;
        product: {handle: string; title: string};
      } | null;
    }>;
    pageInfo: PageInfo;
  };
};

export type PredictiveSearchQuery = {
  predictiveSearch: {
    articles: Array<{
      __typename: 'Article';
      id: string;
      title: string;
      handle: string;
      blog: {handle: string};
      image: SearchImage | null;
      trackingParameters?: string | null;
    }>;
    collections: Array<{
      __typename: 'Collection';
      id: string;
      title: string;
      handle: string;
      image: SearchImage | null;
      trackingParameters?: string | null;
    }>;
    pages: Array<{
      __typename: 'Page';
      id: string;
      title: string;
      handle: string;
      trackingParameters?: string | null;
    }>;
    products: Array<{
      __typename: 'Product';
      id: string;
      title: string;
      handle: string;
      trackingParameters?: string | null;
      selectedOrFirstAvailableVariant: {
        id: string;
        image: SearchImage | null;
        price: MoneyFragment;
      } | null;
    }>;
    queries: Array<{
      __typename: 'SearchQuerySuggestion';
      text: string;
      styledText: string;
      trackingParameters?: string | null;
    }>;
  } | null;
};
