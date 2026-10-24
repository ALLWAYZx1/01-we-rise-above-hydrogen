import {Await, useLoaderData, Link} from 'react-router';
import type {Route} from './+types/_index';
import {Suspense} from 'react';
import {Image} from '@shopify/hydrogen';
import type {
  FeaturedCollectionFragment,
  RecommendedProductsQuery,
} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';
import {MockShopNotice} from '~/components/MockShopNotice';

export const meta: Route.MetaFunction = () => {
  return [{title: 'We Rise Above | Streetwear, Music & Creative Culture'}];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context}: Route.LoaderArgs) {
  const [{collections}] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTION_QUERY),
    // Add other queries here, so that they are loaded in parallel
  ]);

  return {
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
    featuredCollection:
      collections.nodes.find(
        (collection: FeaturedCollectionFragment) =>
          collection.handle === 'hoodies',
      ) ?? collections.nodes[0],
    collections: collections.nodes,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error: Error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });

  return {
    recommendedProducts,
  };
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="home">
      {data.isShopLinked ? null : <MockShopNotice />}
      <section className="wra-hero wra-hero--detonation">
        <div className="wra-hero-burst" aria-hidden="true" />
        <img
          className="wra-hero-emblem"
          src="https://cdn.shopify.com/s/files/1/1002/6896/6179/files/Luminous_Gold_P_Emblem.png?v=1792758842"
          alt="We Rise Above emblem"
          width="112"
          height="112"
        />
        <p className="wra-hero-eyebrow">We Rise Above — Season 00</p>
        <h1 className="wra-hero-title">
          Pressure builds.
          <br />
          <span className="wra-hero-gold">We rise.</span>
        </h1>
        <p className="wra-hero-copy">
          Heavyweight streetwear forged under pressure. Cut heavy, printed
          with intent, made for the late nights and the days that carry
          weight. No final form. Still rising.
        </p>
        <div className="wra-hero-ctas">
          <Link className="wra-hero-cta" to="/collections/all">
            Shop everything
          </Link>
          <Link
            className="wra-hero-cta wra-hero-cta-ghost"
            to="/collections/hoodies"
          >
            Shop hoodies
          </Link>
        </div>
        <p className="wra-hero-edition">SEASON 00 <span>·</span> BUILT UNDER PRESSURE</p>
      </section>
      <div className="wra-marquee" aria-hidden="true">
        <div className="wra-marquee-track">
          <span>
            Faith · Discipline · Hard work · Never settle · Keep rising · Stay
            true ·{' '}
          </span>
          <span>
            Faith · Discipline · Hard work · Never settle · Keep rising · Stay
            true ·{' '}
          </span>
        </div>
      </div>
      <div className="wra-kinetic-band" aria-label="Pressure builds. We rise. No final form.">
        <div className="wra-kinetic-track" aria-hidden="true">
          <span>PRESSURE BUILDS · WE RISE · NO FINAL FORM · </span>
          <span>PRESSURE BUILDS · WE RISE · NO FINAL FORM · </span>
        </div>
      </div>
      <FeaturedBanner collection={data.featuredCollection} />
      <CategoryTiles collections={data.collections} />
      <SeasonLookbook collection={data.featuredCollection} />
      <CreedBand />
      <RecommendedProducts products={data.recommendedProducts} />
      <section className="wra-closing-cta" aria-labelledby="wra-closing-heading">
        <p className="wra-closing-kicker">The next chapter starts here</p>
        <h2 id="wra-closing-heading">JOIN THE <span>RISE</span></h2>
        <p className="wra-closing-code">RISE10</p>
        <p className="wra-closing-copy">Your first order. Ten percent off. A place in the rise.</p>
        <Link className="wra-closing-link" to="#wra-signup-heading">
          Get on the list <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </div>
  );
}

function FeaturedBanner({
  collection,
}: {
  collection: FeaturedCollectionFragment;
}) {
  if (!collection) return null;
  const image = collection?.image;
  return (
    <section
      className="wra-feature"
      aria-label={`Featured: ${collection.title}`}
    >
      {image && (
        <div className="wra-feature-media">
          <Image
            data={image}
            sizes="(min-width: 768px) 50vw, 100vw"
            alt={image.altText || collection.title}
          />
        </div>
      )}
      <div className="wra-feature-body">
        <p className="wra-hero-eyebrow">The heavyweight lineup</p>
        <h2 className="wra-feature-title">{collection.title}</h2>
        <p className="wra-feature-copy">
          Cut heavy, printed with intent. The hoodies carry the weight so you
          don&apos;t have to.
        </p>
        <Link
          className="wra-hero-cta"
          to={`/collections/${collection.handle}`}
        >
          Shop {collection.title.toLowerCase()}
        </Link>
      </div>
    </section>
  );
}

const TILE_ORDER = [
  'hoodies',
  'tees',
  'crewnecks',
  'headwear',
  'joggers',
  'bags',
];

function CategoryTiles({
  collections,
}: {
  collections: FeaturedCollectionFragment[];
}) {
  const tiles = TILE_ORDER.map((handle) =>
    collections.find((collection) => collection?.handle === handle),
  ).filter(
    (collection): collection is FeaturedCollectionFragment =>
      Boolean(collection),
  );
  if (!tiles.length) return null;
  return (
    <section className="wra-tiles" aria-labelledby="wra-tiles-heading">
      <h2 id="wra-tiles-heading">Shop the lineup</h2>
      <div className="wra-tiles-grid">
        {tiles.map((collection) => (
          <Link
            key={collection.id}
            className="wra-tile"
            to={`/collections/${collection.handle}`}
          >
            {collection.image ? (
              <Image
                data={collection.image}
                sizes="(min-width: 768px) 33vw, 50vw"
                alt={collection.image.altText || collection.title}
              />
            ) : (
              <span className="wra-tile-fallback" aria-hidden="true">
                {collection.title}
              </span>
            )}
            <span className="wra-tile-label">{collection.title} →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SeasonLookbook({
  collection,
}: {
  collection: FeaturedCollectionFragment;
}) {
  return (
    <section className="wra-lookbook" aria-labelledby="wra-lookbook-heading">
      <div className="wra-lookbook-intro">
        <p className="wra-lookbook-kicker">An editorial in three movements</p>
        <h2 id="wra-lookbook-heading">SEASON <span>00</span></h2>
        <p>Not a finish line. A first signal. Three ways to carry the pressure and keep moving.</p>
      </div>
      <div className="wra-lookbook-visual">
        {collection?.image ? (
          <Image
            data={collection.image}
            sizes="(min-width: 900px) 62vw, 100vw"
            alt={collection.image.altText || 'Season 00 heavyweight collection'}
          />
        ) : (
          <div className="wra-lookbook-art" role="img" aria-label="Abstract ember light over a black field" />
        )}
        <span className="wra-lookbook-stamp">WRA / 00</span>
      </div>
      <div className="wra-lookbook-index">
        <article>
          <span className="wra-lookbook-number">01</span>
          <div><h3>THE WEIGHT</h3><p>Heavyweight pieces. Nothing lightweight about the intent.</p></div>
        </article>
        <article>
          <span className="wra-lookbook-number">02</span>
          <div><h3>THE WORK</h3><p>Made for the long hours, the quiet focus, the next rep.</p></div>
        </article>
        <article>
          <span className="wra-lookbook-number">03</span>
          <div><h3>THE RISE</h3><p>There is no final form. Keep becoming.</p></div>
        </article>
      </div>
    </section>
  );
}

function CreedBand() {
  return (
    <section className="wra-creed">
      <p className="wra-creed-line">
        The avalanche is <span className="wra-hero-gold">PREZZURE</span>.
        <br />
        The mountain is <span className="wra-hero-gold">RIZE</span>.
      </p>
      <p className="wra-creed-sub">Pressure builds. We rise. No final form.</p>
      <Link className="wra-creed-link" to="/pages/about">
        Read the creed →
      </Link>
    </section>
  );
}

function RecommendedProducts({
  products,
}: {
  products: Promise<RecommendedProductsQuery | null>;
}) {
  return (
    <section
      className="recommended-products"
      aria-labelledby="recommended-products"
    >
      <h2 id="recommended-products">Built under pressure</h2>
      <Suspense fallback={<div>Loading...</div>}>
        <Await resolve={products}>
          {(response) => (
            <div className="recommended-products-grid">
              {response
                ? response.products.nodes.map((product) => (
                    <ProductItem key={product.id} product={product} />
                  ))
                : null}
            </div>
          )}
        </Await>
      </Suspense>
      <br />
    </section>
  );
}

const FEATURED_COLLECTION_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 12, sortKey: UPDATED_AT) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
` as const;
