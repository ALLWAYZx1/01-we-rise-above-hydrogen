import {useLoaderData, type RouterContextProvider} from 'react-router';
import '~/components/sections/wra-reskin.css';
import type {BenchSpotlightQuery, ProductItemFragment} from 'storefrontapi.generated';
import {StatBand} from '~/components/sections/StatBand';
import {StandardStatement} from '~/components/sections/StandardStatement';
import {NumberedSequence} from '~/components/sections/NumberedSequence';
import {EditorialHero} from '~/components/sections/EditorialHero';
import {HomeHero} from '~/components/sections/HomeHero';
import {FeaturedProducts} from '~/components/sections/FeaturedProducts';
import {ProductTiles, type ProductTile} from '~/components/sections/ProductTiles';
import {CollectionHero} from '~/components/sections/CollectionHero';
import {
  ProductSpotlight,
  type SpotlightProduct,
} from '~/components/sections/ProductSpotlight';
import type {Collection, ProductConnection} from '@shopify/hydrogen/storefront-api-types';
import {legacyContext} from '~/lib/context';

/**
 * BENCH-ONLY route for the Forward section port (2026-11-18).
 * Renders each ported section with real WRA catalog data (loader below)
 * plus a labelled edge-case zone that feeds every section empty/missing
 * data to prove the honest empty states. Not linked from any menu.
 *
 * RESKIN v1 (2026-11-18): the main renders now carry the spec's own
 * content and order — type-only WE RISE ABOVE hero, the confirmed stat
 * band (EST. 2026 / 68 / 12 / 01 UNIVERSE), the prophecy sequence, the
 * AWAITING ART featured row + tiles, the Celestial Flame interstitial,
 * and the statement band (manifesto line is VIBES' PROPOSAL, awaiting
 * SOUNDWAVE's crown). Both hero surfaces render type-only: no campaign
 * shot exists and no catalog thumbnail may stand in (spec §1/§4).
 * The edge-case zone below keeps the port's original proof cases.
 */

// NOTE: this bench route deliberately avoids the scaffold's `./+types/*`
// imports — in this bench copy those resolve to nothing for EVERY route
// (all 36 pre-existing typecheck errors are that scaffold quirk). Typing
// the loader against RouterContextProvider keeps this file clean.
export const meta = () => {
  return [{title: 'Bench | Forward Sections'}];
};

export async function loader({
  context,
}: {
  context: RouterContextProvider;
}) {
  const {storefront} = legacyContext(context);
  const [
    {products: heroProducts},
    {products: catalogProducts},
    {collection: benchCollection},
    {product: spotlightMainRaw},
    {product: spotlightNoColorRaw},
  ] = await Promise.all([
    storefront.query<{products: {nodes: Array<ProductItemFragment & {productType: string}>}}>(BENCH_HERO_QUERY),
    storefront.query<{products: {nodes: Array<ProductItemFragment & {productType: string}>}}>(BENCH_PRODUCTS_QUERY),
    storefront.query<{collection: Collection | null}>(BENCH_COLLECTION_QUERY, {
      variables: {handle: 'hoodies'},
    }),
    storefront.query<BenchSpotlightQuery>(BENCH_SPOTLIGHT_QUERY, {
      variables: {handle: 'evil-eye-evil-ai-hoodie'},
    }),
    storefront.query<BenchSpotlightQuery>(BENCH_SPOTLIGHT_QUERY, {
      variables: {handle: 'two-sides-one-purpose-all-over-print-hoodie'},
    }),
  ]);
  const heroProduct = heroProducts.nodes[0] ?? null;
  const featured = catalogProducts.nodes.slice(0, 4);
  // Forward's product-tiles rule, kept: a product with no usable image is
  // omitted from the tiles rather than rendered as an empty frame. On this
  // catalog every product carries a featured image, so in practice the
  // filter drops nothing — the rule is exercised in the edge-case zone.
  const tiles: ProductTile[] = catalogProducts.nodes
    .filter((product) => product.featuredImage != null)
    .slice(0, 3)
    .map((product) => ({
      product: {
        handle: product.handle,
        title: product.title,
        category: product.productType || undefined,
      },
      image: product.featuredImage!,
    }));
  const spotlightMain = spotlightMainRaw
    ? toSpotlightProduct(spotlightMainRaw)
    : null;
  const spotlightNoColor = spotlightNoColorRaw
    ? toSpotlightProduct(spotlightNoColorRaw)
    : null;
  // CONSTRUCTED cases (the real catalog cannot supply them — every one of
  // the 68 products has images and every variant is in stock, verified
  // against the Storefront API 2026-11-18). Both are derived from the
  // real products above and labelled CONSTRUCTED on the page:
  const spotlightNoImage: SpotlightProduct | null = spotlightMain
    ? {
        ...spotlightMain,
        images: [],
        variants: spotlightMain.variants.map((variant) => ({
          ...variant,
          image: null,
        })),
      }
    : null;
  const spotlightSoldOutSize: SpotlightProduct | null = spotlightNoColor
    ? (() => {
        // Mark every variant of the LAST size value unavailable.
        const sizeOption = spotlightNoColor.options.find(
          (option) => option.values.length > 1,
        );
        const lastValue =
          sizeOption?.values[sizeOption.values.length - 1]?.name;
        if (!lastValue) return spotlightNoColor;
        return {
          ...spotlightNoColor,
          variants: spotlightNoColor.variants.map((variant) =>
            variant.selectedOptions.some(
              (option) => option.value === lastValue,
            )
              ? {...variant, availableForSale: false}
              : variant,
          ),
        };
      })()
    : null;

  return {
    heroProduct,
    featured,
    tiles,
    benchCollection,
    spotlightMain,
    spotlightNoColor,
    spotlightNoImage,
    spotlightSoldOutSize,
  };
}

/** Map a Storefront API product (BenchSpotlight fragment) to the section's
 * local shape. This is the locally-written mapper the work order requires —
 * Forward's mapper was not copied. */
function toSpotlightProduct(
  raw: NonNullable<BenchSpotlightQuery['product']>,
): SpotlightProduct {
  return {
    id: raw.id,
    title: raw.title,
    handle: raw.handle,
    description: raw.description,
    productType: raw.productType,
    vendor: raw.vendor,
    options: raw.options.map((option) => ({
      name: option.name,
      values: option.optionValues.map((value) => ({
        name: value.name,
        swatchColor: value.swatch?.color ?? null,
      })),
    })),
    variants: raw.variants.nodes.map((variant) => ({
      id: variant.id,
      title: variant.title,
      availableForSale: variant.availableForSale,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice ?? null,
      sku: variant.sku ?? null,
      image: variant.image ?? null,
      selectedOptions: variant.selectedOptions,
    })),
    images: raw.images.nodes,
  };
}

export default function BenchSections() {
  const {
    heroProduct,
    featured,
    tiles,
    benchCollection,
    spotlightMain,
    spotlightNoColor,
    spotlightNoImage,
    spotlightSoldOutSize,
  } = useLoaderData<typeof loader>();
  return (
    <div className="bench-sections">
      <p className="bg-[#12100D] px-5 py-3 text-xs tracking-[0.2em] text-[#D4AF37] uppercase">
        Bench — Forward sections · WRA reskin v1
      </p>

      {/* Spec §1 — the hero. TYPE-ONLY per the spec fallback: no
          Simulation Ascension campaign shot exists, and a catalog
          thumbnail must never be faked into this slot. */}
      <EditorialHero
        heading="We Rise Above"
        lines={['WE', 'RISE', 'ABOVE']}
        cta={{label: 'JOIN THE RISE', href: '/collections/all'}}
      />

      {/* Second hero surface, also type-only on the bench (its image
          path waits for real campaign art). */}
      <HomeHero
        eyebrow="We Rise Above"
        heading="Pressure makes the pattern"
        copy="Streetwear built from the days that tried to break us — printed on demand, worn on purpose."
        cta={{label: 'Shop the catalog', href: '/collections/all'}}
        stats={[
          {value: '68', label: 'Products live'},
          {value: '12', label: 'Collections'},
          {value: '0', label: 'Inventory wasted'},
        ]}
        image={null}
        featuredProduct={null}
      />

      {/* Spec §2 — confirmed real numbers (audited live catalog,
          2026-11-18: 68 products, 12 collections, shop 100268966179). */}
      <StatBand
        stats={[
          {value: '2026', label: 'EST.'},
          {value: '68', label: 'PIECES'},
          {value: '12', label: 'COLLECTIONS'},
          {value: '01', label: 'UNIVERSE'},
        ]}
      />

      {/* Spec §3 — the universe steps, the spec's exact copy. */}
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

      {/* Spec §4 — AWAITING ART hold frames: real titles, real prices,
          no catalog photos, no add-to-cart. */}
      <FeaturedProducts
        eyebrow="RIZE PIECES"
        heading="Featured products"
        products={featured}
        collectionCta={{label: 'Shop all', href: '/collections/all'}}
      />

      <ProductTiles tiles={tiles} />

      {/* Spec §4 interstitial — Celestial Flame atmosphere frame. The
          21:9 campaign banner does not exist, so per the reskin brief
          this is pure atmosphere: nebula + starfield CSS, the headline,
          no photo, no CTA. */}
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

      {/* Spec §5 — the statement band, synced with the homepage
          (ENERGY PASS + DENSITY SPEC): canon line primary,
          campaign line secondary beneath it. */}
      <StandardStatement
        heading="Pressure builds. We rise. No final form."
        subline="RISE LIKE YOU MEANT IT ALL ALONG."
        columns={[]}
      />

      {benchCollection ? (
        <CollectionHero
          collection={benchCollection}
          eyebrowPrefix="Collection"
          ctaLabel="Shop hoodies"
        />
      ) : null}

      <div data-spotlight-case="color-and-size">
        <ProductSpotlight
          eyebrowPrefix="Spotlight"
          product={spotlightMain}
          specs={
            spotlightMain
              ? [
                  {label: 'Type', value: spotlightMain.productType ?? '—'},
                  {label: 'Vendor', value: spotlightMain.vendor ?? '—'},
                  {
                    label: 'Images',
                    value: String(spotlightMain.images.length),
                  },
                ]
              : []
          }
        />
      </div>

      <div data-spotlight-case="no-color-option">
        <ProductSpotlight
          eyebrowPrefix="Spotlight — no Color option (real product)"
          product={spotlightNoColor}
          specs={
            spotlightNoColor
              ? [
                  {label: 'Type', value: spotlightNoColor.productType ?? '—'},
                  {label: 'Vendor', value: spotlightNoColor.vendor ?? '—'},
                  {
                    label: 'Options',
                    value: spotlightNoColor.options
                      .map((option) => option.name)
                      .join(', '),
                  },
                ]
              : []
          }
        />
      </div>

      <section
        data-bench-zone="edge-cases"
        className="border-t-4 border-dashed border-[#D4AF37] bg-[#12100D] px-5 py-10"
      >
        <h2 className="mb-6 text-sm font-bold tracking-[0.2em] text-[#D4AF37] uppercase">
          Edge cases — empty / missing data (each zone must render its honest
          empty state, never crash)
        </h2>
        <div data-edge-case="stat-band-empty">
          <StatBand stats={[]} />
        </div>
        <div data-edge-case="standard-statement-no-columns">
          <StandardStatement
            heading="Statement with no supporting columns."
            columns={[]}
          />
        </div>
        <div data-edge-case="numbered-sequence-no-steps">
          <NumberedSequence heading="Sequence with no steps yet." steps={[]} />
        </div>
        <div data-edge-case="editorial-hero-no-image">
          <EditorialHero
            heading="Editorial hero carrying the page with no image."
            copy="Forward's own rule: a cleared image drops the section to one column instead of taking the route down."
            image={null}
          />
        </div>
        <div data-edge-case="home-hero-no-image">
          <HomeHero
            heading="Home hero with no image panel."
            copy="Copy and stats carry the hero; the featured-product badge goes with the missing panel."
            stats={[{value: '68', label: 'Products live'}]}
            image={null}
            featuredProduct={
              heroProduct
                ? {title: heroProduct.title, handle: heroProduct.handle}
                : null
            }
          />
        </div>
        <div data-edge-case="featured-products-empty">
          <FeaturedProducts heading="Featured products — none picked" products={[]} />
        </div>
        <div data-edge-case="product-tiles-empty">
          <ProductTiles tiles={[]} />
        </div>
        {benchCollection ? (
          <>
            <div data-edge-case="collection-hero-no-description">
              {/* Constructed from the real collection: description removed. */}
              <CollectionHero
                collection={{...benchCollection, description: ''}}
                eyebrowPrefix="Collection"
                ctaLabel="Shop hoodies"
              />
            </div>
            <div data-edge-case="collection-hero-with-image">
              {/* Constructed pairing: no WRA collection has an image, so the
                  hero product's real featured image stands in to prove the
                  image path renders. */}
              <CollectionHero
                collection={{
                  ...benchCollection,
                  image: heroProduct?.featuredImage ?? null,
                }}
                eyebrowPrefix="Collection — image path"
                ctaLabel="Shop hoodies"
              />
            </div>
          </>
        ) : null}
        <div data-spotlight-case="no-image-constructed">
          <p className="mb-2 text-xs text-[rgba(245,239,226,0.7)]">
            CONSTRUCTED case — the real catalog has no imageless product;
            this is the real spotlight product with its images stripped.
          </p>
          <ProductSpotlight
            eyebrowPrefix="Spotlight — no image (constructed)"
            product={spotlightNoImage}
          />
        </div>
        <div data-spotlight-case="sold-out-size-constructed">
          <p className="mb-2 text-xs text-[rgba(245,239,226,0.7)]">
            CONSTRUCTED case — every real variant is in stock; here the last
            size of the real no-Color product is marked sold out.
          </p>
          <ProductSpotlight
            eyebrowPrefix="Spotlight — one size sold out (constructed)"
            product={spotlightSoldOutSize}
          />
        </div>
        <div data-edge-case="spotlight-null-product">
          <ProductSpotlight eyebrowPrefix="Spotlight" product={null} />
        </div>
      </section>
    </div>
  );
}

const BENCH_SPOTLIGHT_QUERY = `#graphql
  fragment BenchSpotlightVariant on ProductVariant {
    id
    title
    availableForSale
    sku
    price {
      amount
      currencyCode
    }
    compareAtPrice {
      amount
      currencyCode
    }
    image {
      id
      url
      altText
      width
      height
    }
    selectedOptions {
      name
      value
    }
  }
  fragment BenchSpotlightProduct on Product {
    id
    title
    handle
    description
    productType
    vendor
    options {
      name
      optionValues {
        name
        swatch {
          color
        }
      }
    }
    variants(first: 100) {
      nodes {
        ...BenchSpotlightVariant
      }
    }
    images(first: 10) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
  }
  query BenchSpotlight(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...BenchSpotlightProduct
    }
  }
` as const;

const BENCH_COLLECTION_QUERY = `#graphql
  query BenchCollection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      title
      handle
      description
      image {
        id
        url
        altText
        width
        height
      }
    }
  }
` as const;

const BENCH_PRODUCTS_QUERY = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment BenchProductItem on Product {
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
  query BenchProducts($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 8, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...BenchProductItem
      }
    }
  }
` as const;

const BENCH_HERO_QUERY = `#graphql
  query BenchHero($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        featuredImage {
          id
          url
          altText
          width
          height
        }
      }
    }
  }
` as const;
