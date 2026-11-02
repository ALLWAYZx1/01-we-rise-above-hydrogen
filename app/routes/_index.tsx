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
import {Reveal} from '~/components/Reveal';

const HERO_IMAGE_BASE =
  'https://cdn.shopify.com/s/files/1/1002/6896/6179/files/hero-centerpiece-front-2560x1440.jpg?v=1792867452';
const HERO_SRCSET = `${HERO_IMAGE_BASE}&width=720 720w, ${HERO_IMAGE_BASE}&width=1080 1080w, ${HERO_IMAGE_BASE}&width=1440 1440w, ${HERO_IMAGE_BASE}&width=1920 1920w, ${HERO_IMAGE_BASE}&width=2560 2560w`;
const HERO_SIZES = '(min-width: 1200px) 1440px, 100vw';
const ENERGY_FRONT_BASE =
  'https://cdn.shopify.com/s/files/1/1002/6896/6179/files/energy-temple-black-front-1920x1280.jpg?v=1792950396';
const ENERGY_REAR_BASE =
  'https://cdn.shopify.com/s/files/1/1002/6896/6179/files/energy-temple-blackgold-rear-1920x1280.jpg?v=1792950396';

function energySrcSet(base: string) {
  return `${base}&width=640 640w, ${base}&width=960 960w, ${base}&width=1200 1200w, ${base}&width=1920 1920w`;
}

export const meta: Route.MetaFunction = () => {
  return [{title: 'We Rise Above | No Final Form'}, {name: 'description', content: 'Streetwear armor for the ones still rising. Faith. Discipline. Hard work. No final form.'}];
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
      <section className="wra-hero">
        <div className="wra-embers" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <img
          className="wra-hero-emblem"
          src="https://cdn.shopify.com/s/files/1/1002/6896/6179/files/Luminous_Gold_P_Emblem.png?v=1792758842&width=300"
          srcSet="https://cdn.shopify.com/s/files/1/1002/6896/6179/files/Luminous_Gold_P_Emblem.png?v=1792758842&width=150 150w, https://cdn.shopify.com/s/files/1/1002/6896/6179/files/Luminous_Gold_P_Emblem.png?v=1792758842&width=300 300w, https://cdn.shopify.com/s/files/1/1002/6896/6179/files/Luminous_Gold_P_Emblem.png?v=1792758842&width=450 450w"
          sizes="150px"
          alt="We Rise Above emblem"
          width="150"
          height="150"
        />
        <p className="wra-hero-eyebrow">We Rise Above — Season 00</p>
        <h1 className="wra-hero-title">
          Built by
          <br />
          <span className="wra-hero-gold">the <span className="wra-hero-gold">pressure.</span></span>
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
        <figure className="wra-hero-centerpiece">
          <img
            src={`${HERO_IMAGE_BASE}&width=1440`}
            srcSet={HERO_SRCSET}
            sizes={HERO_SIZES}
            alt="ALLWAYZ between the angel and the demon under the eclipse — Never Settle hoodie, We Rise Above Season 00"
            width="2560"
            height="1440"
            fetchPriority="high"
            decoding="async"
          />
        </figure>
      </section>
      <section className="wra-section"><p className="eyebrow">First things first</p><h2>Wear the rise.</h2><p className="collection-intro">Pieces with presence. Built for the days that test you and the nights that define you.</p><FeaturedCollection collection={data.featuredCollection} /></section>
      <CategoryTiles collections={data.collections} />
      <RecommendedProducts products={data.recommendedProducts} />
      <section className="wra-duality" aria-label="Angel and demon duality"><Link to="/collections/all"><span>Chapter I · The light</span><strong>Angel energy.</strong><p>Move with faith. Protect your peace. Keep your purpose in sight.</p></Link><Link to="/collections/all"><span>Chapter II · The fire</span><strong>Demon mode.</strong><p>Face the pressure. Own your shadow. Turn every limit into fuel.</p></Link></section>
      <section className="wra-creed"><p className="eyebrow">The code we live by</p><h2>The creed.</h2><div className="wra-creed-words">{["FAITH","DISCIPLINE","HARD WORK","NEVER SETTLE","KEEP RISING","STAY TRUE"].map((word) => <span key={word}>{word}</span>)}</div><p className="wra-creed-tagline">NO FINAL FORM.</p></section>
    </div>
  );
}

function FeaturedCollection({
  collection,
}: {
  collection: FeaturedCollectionFragment;
}) {
  if (!collection) return null;
  const image = collection?.image;
  return (
    <section
      className={`wra-feature${image ? " has-image" : " no-image"}`}
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
      <p className="wra-trust-mini">
        Printed to order ◆ Ships from the USA ◆ Secure Shopify checkout ◆
        RISE10 — 10% off your first order
      </p>
      <br />
    </section>
  );
}

function EnergySection() {
  return (
    <section className="wra-energy" aria-labelledby="wra-energy-heading">
      <p className="wra-hero-eyebrow">The energy</p>
      <h2 id="wra-energy-heading" className="wra-energy-title">
        Built like <span className="wra-hero-gold">machines.</span>
        <br />
        Worn like armor.
      </h2>
      <div className="wra-energy-grid">
        <figure className="wra-energy-card wra-energy-card-lead">
          <img
            src={`${ENERGY_FRONT_BASE}&width=1200`}
            srcSet={energySrcSet(ENERGY_FRONT_BASE)}
            sizes="(min-width: 768px) 58vw, 100vw"
            alt="Matte black supercar with ember underglow in a black stone celestial temple"
            width="1920"
            height="1280"
            loading="lazy"
            decoding="async"
          />
          <figcaption>Forged in the temple ◆ Season 00</figcaption>
        </figure>
        <figure className="wra-energy-card">
          <img
            src={`${ENERGY_REAR_BASE}&width=1200`}
            srcSet={energySrcSet(ENERGY_REAR_BASE)}
            sizes="(min-width: 768px) 42vw, 100vw"
            alt="Black and gold supercar, rear three-quarter, under ember light in a black stone celestial temple"
            width="1920"
            height="1280"
            loading="lazy"
            decoding="async"
          />
          <figcaption>Black and gold ◆ No final form</figcaption>
        </figure>
      </div>
      <p className="wra-energy-bridge">
        Pressure builds the machines. Pressure builds the armor. One temple,
        one creed.
      </p>
      <div className="wra-energy-ctas">
        <Link className="wra-hero-cta" to="/collections/all">
          Shop the collection
        </Link>
        <a
          className="wra-hero-cta wra-hero-cta-ghost"
          href="#wra-signup-heading"
        >
          Join the rise
        </a>
      </div>
    </section>
  );
}

function PromoBar() {
  return (
    <div className="wra-promo">
      <p>
        <strong>RISE10</strong> — 10% off your first order
      </p>
    </div>
  );
}

function KineticBand() {
  const line = 'Pressure builds ◆ We rise ◆ No final form ◆ ';
  return (
    <div className="wra-kinetic" aria-hidden="true">
      <div className="wra-kinetic-track">
        <span>{line.repeat(3)}</span>
        <span>{line.repeat(3)}</span>
      </div>
    </div>
  );
}

function TrustStrip() {
  const items = [
    'Printed to order',
    'Ships from the USA',
    'Secure Shopify checkout',
    'RISE10 — 10% off your first order',
  ];
  const payments = [
    'Visa',
    'Mastercard',
    'Amex',
    'Discover',
    'Apple Pay',
    'Shop Pay',
  ];
  return (
    <section className="wra-trust" aria-label="Why shop with us">
      <ul className="wra-trust-list">
        {items.map((item) => (
          <li key={item}>
            <span className="wra-trust-mark" aria-hidden="true">
              ◆
            </span>
            {item}
          </li>
        ))}
      </ul>
      <ul className="wra-pay" aria-label="Accepted payment methods">
        {payments.map((name) => (
          <li key={name} className="wra-pay-chip">
            {name}
          </li>
        ))}
      </ul>
    </section>
  );
}

function GhostBand() {
  return (
    <div className="wra-ghost" aria-hidden="true">
      <span>No final form</span>
    </div>
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
    images(first: 12) {
      nodes {
        id
        altText
        url
        width
        height
      }
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
