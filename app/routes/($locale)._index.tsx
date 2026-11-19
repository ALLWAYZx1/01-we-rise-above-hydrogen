import {useLoaderData} from 'react-router';
import type {Route} from './+types/_index';
import '~/components/sections/wra-reskin.css';
import type {HomepageProductsQuery} from 'storefrontapi.generated';
import {MockShopNotice} from '~/components/MockShopNotice';
import {EditorialHero} from '~/components/sections/EditorialHero';
import {StatBand} from '~/components/sections/StatBand';
import {NumberedSequence} from '~/components/sections/NumberedSequence';
import {FeaturedProducts} from '~/components/sections/FeaturedProducts';
import {ProductTiles, type ProductTile} from '~/components/sections/ProductTiles';
import {ArtistStrip} from '~/components/sections/ArtistStrip';
import {StandardStatement} from '~/components/sections/StandardStatement';

/**
 * Homepage — SALVAGE WIRING (2026-11-18, branch salvage-homepage-wiring).
 *
 * PR #144 landed the fresh template + Forward port + WRA reskin on
 * main, but the reskin sections only ever rendered on the bench route
 * `($locale).bench-sections.tsx`; this route stayed the stock template
 * homepage. This file wires the reskin into the real homepage, in the
 * bench route's own order: type-only WE RISE ABOVE hero, StatBand,
 * the universe steps, the AWAITING ART featured row + tiles, the
 * Celestial Flame interstitial, the artist strip, and the statement
 * band. The bench route is untouched and still renders the same
 * sections plus its edge-case zone.
 *
 * SEO wording is recovered verbatim from the pre-PR#144 homepage
 * (old `app/routes/_index.tsx`, read at PR #141's branch tip
 * 9e61abf): title 'We Rise Above | No Final Form' and its description.
 * Deploying this must NOT regress the homepage title to the stock
 * 'Hydrogen | Home'. Root defaults live in `app/root.tsx`.
 *
 * TODO(analytics): GA G-F7SLHQZBWV / GTM GTM-TW29LW4X / Meta Pixel
 * 2793791147688986 are NOT added here. Live firing is unverified —
 * adding the tags in code before a real-browser firing check risks
 * double-firing against whatever the current deployment already
 * sends. Add them only after that check, in root.tsx.
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
  const [{products}] = await Promise.all([
    context.storefront.query(HOMEPAGE_PRODUCTS_QUERY),
    // Add other queries here, so that they are loaded in parallel
  ]);

  type HomepageProduct = HomepageProductsQuery['products']['nodes'][number];
  const featured = products.nodes.slice(0, 4);
  // Same product-tiles rule as the bench route: a product with no
  // usable image is omitted from the tiles rather than rendered as
  // an empty frame.
  const tiles: ProductTile[] = products.nodes
    .filter((product: HomepageProduct) => product.featuredImage != null)
    .slice(0, 3)
    .map((product: HomepageProduct) => ({
      product: {
        handle: product.handle,
        title: product.title,
        category: product.productType || undefined,
      },
      image: product.featuredImage!,
    }));

  return {
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
    featured,
    tiles,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  void context;
  return {};
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="home">
      {data.isShopLinked ? null : <MockShopNotice />}

      {/* Reskin §1 — the hero. TYPE-ONLY per the spec fallback: no
          Simulation Ascension campaign shot exists, and a catalog
          thumbnail must never be faked into this slot. */}
      <EditorialHero
        heading="We Rise Above"
        lines={['WE', 'RISE', 'ABOVE']}
        cta={{label: 'JOIN THE RISE', href: '/collections/all'}}
      />

      {/* Reskin §2 — confirmed real numbers (audited live catalog,
          2026-11-18: 68 products, 12 collections, shop 100268966179). */}
      <StatBand
        stats={[
          {value: '2026', label: 'EST.'},
          {value: '68', label: 'PIECES'},
          {value: '12', label: 'COLLECTIONS'},
          {value: '01', label: 'UNIVERSE'},
        ]}
      />

      {/* Reskin §3 — the universe steps, the spec's exact copy. */}
      <NumberedSequence
        heading="The universe steps"
        steps={[
          {
            number: '01',
            title: 'PRESSURE',
            copy: 'The weight builds. Everyone feels it. Most fold under it.',
          },
          {
            number: '02',
            title: 'ASCENSION',
            copy: 'PREZZURE takes it. RIZE turns it. The Simulation Hoodie carries the story out of the dark.',
          },
          {
            number: '03',
            title: 'THE RISE',
            copy: "We Rise Above. No final form. The universe doesn't cap — it compounds.",
          },
        ]}
      />

      {/* Reskin §4 — AWAITING ART hold frames: real titles, real
          prices, no catalog photos, no add-to-cart. */}
      <FeaturedProducts
        eyebrow="RIZE PIECES"
        heading="Featured products"
        products={data.featured}
        collectionCta={{label: 'Shop all', href: '/collections/all'}}
      />

      <ProductTiles tiles={data.tiles} />

      {/* Reskin §4 interstitial — Celestial Flame atmosphere frame.
          The 21:9 campaign banner does not exist, so this is pure
          atmosphere: nebula + starfield CSS, the headline, no photo,
          no CTA. */}
      <section
        data-section="flame-interstitial"
        className="relative overflow-hidden bg-[var(--wra-void)] text-[var(--wra-ivory)]"
      >
        <div className="wra-starfield" aria-hidden="true" />
        <div className="wra-nebula-layer" aria-hidden="true" />
        <div className="relative flex aspect-[21/9] items-center justify-center px-5">
          <h2 className="wra-display m-0 text-center text-[8vw] leading-none font-bold tracking-tight uppercase">
            The fire is family
          </h2>
        </div>
      </section>

      {/* The artist strip, restored from the pre-PR#144 homepage —
          Spotify · Apple Music · Anghami, every name a real link. */}
      <ArtistStrip />

      {/* Reskin §5 — the statement band. The manifesto line is VIBES'
          PROPOSAL (SOUNDWAVE crowns); the subline is brand canon,
          verbatim. */}
      <StandardStatement
        heading="RISE LIKE YOU MEANT IT ALL ALONG."
        subline="Pressure builds. We rise. No final form."
        columns={[]}
      />
    </div>
  );
}

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
    products(first: 8, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...HomepageProductItem
      }
    }
  }
` as const;
