import {Link, useLoaderData} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {Route} from './+types/($locale)._index';
import type {
  HomepageCollectionsQuery,
  HomepageProductsQuery,
} from 'storefrontapi.generated';
import {MockShopNotice} from '~/components/MockShopNotice';
import {EditorialHero} from '~/components/sections/EditorialHero';
import {MarqueeBand} from '~/components/sections/MarqueeBand';
import {StatBand} from '~/components/sections/StatBand';
import {CategoryBand, type CategoryTile} from '~/components/sections/CategoryBand';
import {NumberedSequence} from '~/components/sections/NumberedSequence';
import {FeaturedProducts} from '~/components/sections/FeaturedProducts';
import {ProductTiles, type ProductTile} from '~/components/sections/ProductTiles';
import {ArtistStrip} from '~/components/sections/ArtistStrip';
import {StandardStatement} from '~/components/sections/StandardStatement';
import {
  CampaignFeature,
  CampaignSplit,
} from '~/components/sections/CampaignGallery';
import {ProductItem} from '~/components/ProductItem';

/**
 * Homepage — COSMIC ENERGY, campaign density.
 *
 * Canonical copy only: "Pressure builds. We rise." / "No final form." /
 * "WE RISE ABOVE". Real Shopify products and collections. The hero shares
 * the first screen with a shop CTA, then a real garment campaign and a
 * dense drop grid. No invented rankings, scarcity, or sub-brands.
 */

const OG_IMAGE =
  'https://cdn.shopify.com/s/files/1/1002/6896/6179/files/zordon-key-art-clean.jpg?v=1794047529&width=1200';

export const meta: Route.MetaFunction = () => {
  const title = 'We Rise Above | No Final Form';
  const description =
    'Streetwear armor for the ones still rising. Faith. Discipline. Hard work. No final form.';
  return [
    {title},
    {name: 'description', content: description},
    {property: 'og:type', content: 'website'},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {property: 'og:url', content: 'https://weriseabove.life/'},
    {property: 'og:image', content: OG_IMAGE},
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: title},
    {name: 'twitter:description', content: description},
    {name: 'twitter:image', content: OG_IMAGE},
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context}: Route.LoaderArgs) {
  const [{products}, {collections}] = await Promise.all([
    context.storefront.query(HOMEPAGE_PRODUCTS_QUERY),
    context.storefront.query(HOMEPAGE_COLLECTIONS_QUERY),
  ]);

  type HomepageProduct = HomepageProductsQuery['products']['nodes'][number];
  const allProducts: HomepageProduct[] = products.nodes;
  const newDrops = allProducts.slice(0, 8);
  const featured = allProducts.slice(0, 4);
  const campaign =
    allProducts.find((product: HomepageProduct) => product.featuredImage) ??
    null;

  const tiles: ProductTile[] = allProducts
    .filter((product: HomepageProduct) => product.featuredImage != null)
    .slice(0, 6)
    .map((product: HomepageProduct) => ({
      product: {
        handle: product.handle,
        title: product.title,
        category: product.productType || undefined,
      },
      image: product.featuredImage!,
    }));

  type HomepageCollection =
    HomepageCollectionsQuery['collections']['nodes'][number];
  const CATEGORY_ORDER = [
    'hoodies',
    'tees',
    'crewnecks',
    'headwear',
    'joggers',
    'bags',
  ] as const;
  const categories: CategoryTile[] = CATEGORY_ORDER.flatMap((handle) => {
    const match = collections.nodes.find(
      (collection: HomepageCollection) =>
        collection.handle === handle ||
        collection.title.trim().toLowerCase() === handle,
    );
    if (!match) return [];
    return [{
      id: match.id,
      handle: match.handle,
      title: match.title,
      image: match.image ?? null,
    }];
  });

  return {
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
    newDrops,
    campaign,
    featured,
    tiles,
    categories,
    collections: collections.nodes.slice(0, 6),
  };
}

function loadDeferredData({context}: Route.LoaderArgs) {
  void context;
  return {};
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="home cosmic-home">
      {data.isShopLinked ? null : <MockShopNotice />}

      {/* Compact hero — identity preserved, less dead space */}
      <EditorialHero
        heading="We Rise Above"
        lines={['WE', 'RISE', 'ABOVE']}
        kicker="Pressure builds. We rise."
        subline="No final form."
        cta={{label: 'SHOP THE DROP', href: '/collections/all'}}
      />

      <MarqueeBand />

      {data.campaign?.featuredImage ? (
        <section data-section="campaign-piece" className="px-4 py-8 md:px-8 md:py-12">
          <div className="campaign-piece mx-auto grid max-w-[1400px] items-center gap-6 md:grid-cols-[0.86fr_1.14fr] md:gap-12">
            <Link
              className="campaign-piece-media"
              prefetch="intent"
              to={`/products/${data.campaign.handle}`}
            >
              <Image
                alt={data.campaign.featuredImage.altText || data.campaign.title}
                aspectRatio="4/5"
                data={data.campaign.featuredImage}
                sizes="(min-width: 768px) 40vw, 100vw"
              />
            </Link>
            <div>
              <p className="campaign-kicker">We Rise Above</p>
              <h2 className="wra-display">Pressure builds.</h2>
              <p className="campaign-line">We rise. No final form.</p>
              <p className="campaign-product">{data.campaign.title}</p>
              <p className="campaign-price">
                <Money data={data.campaign.priceRange.minVariantPrice} />
              </p>
              <Link
                className="wra-cta"
                prefetch="intent"
                to={`/products/${data.campaign.handle}`}
              >
                View the piece
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Dense New Drops grid — product-forward, real catalog only */}
      <section data-section="new-drops" className="px-4 py-8 md:px-8 md:py-10">
        <div className="mx-auto max-w-[1400px]">
          <h2 className="wra-display mb-4 text-2xl font-bold uppercase tracking-tight md:text-3xl">New Drops</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {data.newDrops.map((product) => (
              <ProductItem key={product.id} product={product} />
            ))}
          </div>
          <div className="mt-4 text-center">
            <a href="/collections/all" className="wra-cta text-sm font-semibold uppercase tracking-widest">Shop All</a>
          </div>
        </div>
      </section>

      <CategoryBand tiles={data.categories} />

      <StatBand
        stats={[
          {value: '2026', label: 'EST.'},
          {value: '68', label: 'PIECES'},
          {value: '12', label: 'COLLECTIONS'},
          {value: '01', label: 'UNIVERSE'},
        ]}
      />

      <NumberedSequence
        heading="The universe steps"
        steps={[
          {number: '01', title: 'PRESSURE', copy: 'The weight builds. Everyone feels it. Most fold under it.'},
          {number: '02', title: 'ASCENSION', copy: 'PREZZURE takes it. RIZE turns it. The Simulation Hoodie carries the story out of the dark.'},
          {number: '03', title: 'THE RISE', copy: "We Rise Above. No final form. The universe doesn't cap — it compounds."},
        ]}
      />

      {/* Campaign feature — ALLWAYZ campaign art (2026-11-20) */}
      <CampaignFeature />

      {/* Featured Collections campaign block */}
      <section data-section="featured-collections" className="px-4 py-8 md:px-8">
        <div className="mx-auto max-w-[1400px]">
          <h2 className="wra-display mb-4 text-2xl font-bold uppercase">Featured Collections</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {data.collections.map((col) => (
              <a key={col.id} href={`/collections/${col.handle}`} className="block overflow-hidden rounded border border-[var(--cosmic-edge)]">
                {col.image && <img src={col.image.url} alt={col.title} className="aspect-square w-full object-cover" />}
                <p className="p-2 text-center text-sm font-semibold uppercase">{col.title}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <FeaturedProducts
        eyebrow="RIZE PIECES"
        heading="Featured products"
        products={data.featured}
        collectionCta={{label: 'Shop all', href: '/collections/all'}}
      />

      <ProductTiles tiles={data.tiles} />

      {/* Campaign split — ALLWAYZ campaign art (2026-11-20) */}
      <CampaignSplit />

      <section data-section="flame-interstitial" className="relative overflow-hidden bg-[var(--wra-void)] text-[var(--wra-ivory)]">
        <div className="wra-starfield" aria-hidden="true" />
        <div className="wra-nebula-layer" aria-hidden="true" />
        <div className="relative flex items-center justify-center px-5 py-12 md:py-16">
          <h2 className="wra-display m-0 text-center text-[9vw] leading-none font-bold tracking-tight uppercase md:text-[7vw]">
            The fire is family
          </h2>
        </div>
      </section>

      <ArtistStrip />

      <StandardStatement
        heading="Pressure builds. We rise. No final form."
        subline="RISE LIKE YOU MEANT IT ALL ALONG."
        columns={[]}
      />
    </div>
  );
}

const HOMEPAGE_COLLECTIONS_QUERY = `#graphql
  fragment HomepageCollectionItem on Collection {
    id
    handle
    title
    image {
      id
      altText
      url
      width
      height
    }
  }
  query HomepageCollections($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 12, sortKey: TITLE) {
      nodes {
        ...HomepageCollectionItem
      }
    }
  }
` as const;

const HOMEPAGE_PRODUCTS_QUERY = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment HomepageProductItem on Product {
    id
    handle
    title
    productType
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
  query HomepageProducts($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 12, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...HomepageProductItem
      }
    }
  }
` as const;
