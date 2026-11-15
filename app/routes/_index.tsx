import {Await, useLoaderData, Link} from 'react-router';
import type {Route} from './+types/_index';
import {Suspense} from 'react';
import type {CSSProperties} from 'react';
import {Image} from '@shopify/hydrogen';
import type {
  FeaturedCollectionFragment,
  RecommendedProductsQuery,
} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';
import {MockShopNotice} from '~/components/MockShopNotice';
import {Reveal} from '~/components/Reveal';

const HERO_IMAGE_BASE =
  'https://cdn.shopify.com/s/files/1/1002/6896/6179/files/zordon-key-art-clean.jpg?v=1794047529';
const HERO_SRCSET = `${HERO_IMAGE_BASE}&width=480 480w, ${HERO_IMAGE_BASE}&width=720 720w, ${HERO_IMAGE_BASE}&width=1080 1080w, ${HERO_IMAGE_BASE}&width=1440 1440w, ${HERO_IMAGE_BASE}&width=1920 1920w`;
const HERO_SIZES = '(min-width: 1200px) 1200px, (min-width: 768px) 90vw, 100vw';
const ENERGY_FRONT_BASE =
  'https://cdn.shopify.com/s/files/1/1002/6896/6179/files/energy-temple-black-front-1920x1280.jpg?v=1792950396';
const ENERGY_REAR_BASE =
  'https://cdn.shopify.com/s/files/1/1002/6896/6179/files/energy-temple-blackgold-rear-1920x1280.jpg?v=1792950396';

function energySrcSet(base: string) {
  return `${base}&width=640 640w, ${base}&width=960 960w, ${base}&width=1200 1200w, ${base}&width=1920 1920w`;
}

export function links() {
  return [
    {
      rel: 'preload',
      as: 'image',
      imageSrcSet: HERO_SRCSET,
      imageSizes: HERO_SIZES,
      fetchPriority: 'high',
    },
  ];
}

export const meta: Route.MetaFunction = () => {
  const title = 'We Rise Above | No Final Form';
  const description =
    'Streetwear armor for the ones still rising. Faith. Discipline. Hard work. No final form.';
  const image = `${HERO_IMAGE_BASE}&width=1200`;
  return [
    {title},
    {name: 'description', content: description},
    {property: 'og:type', content: 'website'},
    {property: 'og:title', content: title},
    {property: 'og:description', content: description},
    {property: 'og:url', content: 'https://weriseabove.life/'},
    {property: 'og:image', content: image},
    {name: 'twitter:card', content: 'summary_large_image'},
    {name: 'twitter:title', content: title},
    {name: 'twitter:description', content: description},
    {name: 'twitter:image', content: image},
  ];
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
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://weriseabove.life/#organization',
        name: 'We Rise Above',
        url: 'https://weriseabove.life/',
      },
      {
        '@type': 'WebSite',
        '@id': 'https://weriseabove.life/#website',
        name: 'We Rise Above',
        url: 'https://weriseabove.life/',
        publisher: {'@id': 'https://weriseabove.life/#organization'},
      },
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
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
          Pressure builds. We rise. A collection of expressive streetwear for
          the ones still becoming. Faith, discipline, hard work. No final form.
        </p>
        <div className="wra-hero-ctas">
          <Link className="wra-hero-cta" to="/collections/all">
            Explore the collection
          </Link>
          <Link
            className="wra-hero-cta wra-hero-cta-ghost"
            to="/collections/hoodies"
          >
            Discover hoodies
          </Link>
        </div>
        <figure className="wra-hero-centerpiece">
          <img
            src={`${HERO_IMAGE_BASE}&width=720`}
            srcSet={HERO_SRCSET}
            sizes={HERO_SIZES}
            alt="ALLWAYZ standing center under the eclipse in the Never Settle hoodie — PREZZUREVERSE key art, We Rise Above"
            width="2000"
            height="1120"
            fetchPriority="high"
            decoding="async"
          />
        </figure>
      </section>
      <PressStrip />
      <section className="wra-flagship" aria-labelledby="wra-flagship-title">
        <div className="wra-flagship-media">
          <img
            src="https://cdn.shopify.com/s/files/1/1002/6896/6179/files/unisex-sculpted-heavyweight-hoodie-black-front-6ae8cf4d5a063.jpg?v=1793642347&width=1200"
            alt="Black Sculpted Heavyweight hoodie, front view"
            width="1200"
            height="1500"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="wra-flagship-copy">
          <p className="eyebrow">The signature piece · Season 00</p>
          <h2 id="wra-flagship-title">Built with weight. Made to rise.</h2>
          <p>
            The Ascension artwork on a 15 oz brushed-fleece silhouette.
            Organic combed ring-spun cotton and recycled polyester, finished
            with a double-layer hood.
          </p>
          <p className="wra-flagship-spec">15 OZ · BRUSHED FLEECE · MADE TO ORDER</p>
          <Link
            className="wra-flagship-link"
            to="/products/prezzure-rize-like-the-matrix-ascension-hoodie-sculpted-heavyweight"
          >
            Discover the Sculpted Heavyweight
          </Link>
        </div>
      </section>
      <section className="wra-section"><p className="eyebrow">First things first</p><h2>Wear the rise.</h2><p className="collection-intro">Pieces with presence. Built for the days that test you and the nights that define you.</p><FeaturedCollection collection={data.featuredCollection} /></section>
      <CategoryTiles collections={data.collections} />
      <RecommendedProducts products={data.recommendedProducts} />
      <section className="wra-duality" aria-label="Angel and demon duality"><Link to="/collections/all"><span>Chapter I · The light</span><strong>Angel energy.</strong><p>Move with faith. Protect your peace. Keep your purpose in sight.</p></Link><Link to="/collections/all"><span>Chapter II · The fire</span><strong>Demon mode.</strong><p>Face the pressure. Own your shadow. Turn every limit into fuel.</p></Link></section>
      <section className="wra-creed"><p className="eyebrow">The code we live by</p><h2>The creed.</h2><div className="wra-creed-words">{["FAITH","DISCIPLINE","HARD WORK","NEVER SETTLE","KEEP RISING","STAY TRUE"].map((word) => <span key={word}>{word}</span>)}</div><p className="wra-creed-tagline">NO FINAL FORM.</p></section>
      <TrustStrip />
      </div>
    </>
  );
}

function PressStrip() {
  const itemStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    minWidth: '200px',
    flex: '1 1 200px',
  };
  const labelStyle: CSSProperties = {
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    fontSize: '0.85rem',
  };
  const subStyle: CSSProperties = {opacity: 0.75, fontSize: '0.9rem'};
  const linkStyle: CSSProperties = {
    color: '#d4af37',
    fontWeight: 700,
    textDecoration: 'none',
  };
  return (
    <section
      aria-label="As seen and heard"
      style={{
        background: '#0b0b14',
        color: '#f5f0e6',
        borderTop: '1px solid rgba(212,175,55,0.35)',
        borderBottom: '1px solid rgba(212,175,55,0.35)',
        padding: '1.75rem 1.25rem',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          color: '#d4af37',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          margin: '0 0 1.1rem',
        }}
      >
        The artist behind the armor
      </p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.25rem 2.5rem',
          justifyContent: 'center',
          maxWidth: '1000px',
          margin: '0 auto',
        }}
      >
        <div style={itemStyle}>
          <span style={labelStyle}>\uD83D\uDCFA Heard on TAXI TV</span>
          <span style={subStyle}>
            &ldquo;Make It Through (Clean)&rdquo; aired Nov 2, 2026
          </span>
        </div>
        <div style={itemStyle}>
          <span style={labelStyle}>\u2B50 Next Music Star &mdash; Round 2</span>
          <span style={subStyle}>
            Advanced out of Round 1 &mdash; top 5 move on.{' '}
            <a
              style={linkStyle}
              href="https://thenextmusicstar.com/2026/allwayz"
              target="_blank"
              rel="noreferrer"
            >
              Vote for ALLWAYZ &rarr;
            </a>
          </span>
        </div>
        <div style={itemStyle}>
          <span style={labelStyle}>\uD83C\uDFA7 Streaming everywhere</span>
          <span style={subStyle}>
            Spotify &middot; Apple Music &middot;{' '}
            <a
              style={linkStyle}
              href="https://play.anghami.com/album/1090332643"
              target="_blank"
              rel="noreferrer"
            >
              Anghami
            </a>
          </span>
        </div>
      </div>
    </section>
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
