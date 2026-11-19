/**
 * FeaturedProducts — ported from Forward's `featured-products` section.
 *
 * Translation notes:
 * - Forward resolved products through a Weaverse loader and, when none
 *   were picked, rendered placeholder cards built on `IMAGES_PLACEHOLDERS`
 *   from `@weaverse/hydrogen/next` — Weaverse-hosted CDN art. That is on
 *   the kill list twice over (editor dependency + placeholder CDN), so the
 *   port renders an honest empty state instead: heading, a plain
 *   "nothing here yet" line, no fake products, no borrowed images.
 *
 * RESKIN v1 (spec §4 + its fallback): the catalog's product photography
 * is daylight catalog work, which the spec bans from tiles, and no
 * campaign shots exist yet — so the featured row launches as
 * IMAGE-HOLD FRAMES, exactly as the spec prescribes: DEEP BLACK 3:4
 * frames carrying a gold garment silhouette labeled AWAITING ART, with
 * the REAL product title (ivory small caps, below the frame) and the
 * REAL price (gold, tabular, right-aligned on the title's baseline)
 * from the live catalog data. The frames are holds, not shoppable
 * tiles: no add-to-cart, no product photo, no fake imagery. On hover
 * the frame holds still while a champagne light sweep crosses it once
 * (400ms); the middle two frames lift 4px over a faint gold glow.
 * Layout: centered "RIZE PIECES" eyebrow, the row framed by gold
 * hairlines above and below, gallery spacing (32px+) — gallery first,
 * grid second. When the campaign shots land, the frames take the real
 * art and the tiles become shoppable; until then this is the honest
 * state of the row.
 */
import {Link} from 'react-router';
import {Money} from '@shopify/hydrogen';
import type {
  CollectionItemFragment,
  ProductItemFragment,
  RecommendedProductFragment,
} from 'storefrontapi.generated';
import {GarmentSilhouette} from './GarmentSilhouette';
import type {SectionCta} from './section-types';

export type FeaturedProduct =
  | CollectionItemFragment
  | ProductItemFragment
  | RecommendedProductFragment;

export interface FeaturedProductsProps {
  eyebrow?: string;
  heading: string;
  products: FeaturedProduct[];
  collectionCta?: SectionCta;
}

export function FeaturedProducts({
  eyebrow,
  heading,
  products,
  collectionCta,
}: FeaturedProductsProps) {
  return (
    <section
      data-section="featured-products"
      aria-labelledby="featured-products-title"
      className="bg-[var(--wra-void)] px-5 py-10 text-[var(--wra-ivory)] md:px-10 md:py-12"
    >
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6 text-center">
          {eyebrow ? (
            <p className="mb-3 text-xs font-semibold tracking-[0.3em] text-[var(--wra-gold)] uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h2
            id="featured-products-title"
            className="wra-display text-4xl font-bold tracking-tight uppercase md:text-5xl"
          >
            {heading}
          </h2>
        </header>
        {products.length > 0 ? (
          <div className="border-y border-[var(--wra-gold-line)] py-6 md:py-8">
            {/* ENERGY PASS — a horizontal snap rail on small screens,
                the four-across grid on desktop. Same real products,
                same AWAITING ART hold frames. */}
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:pb-0">
              {products.map((product, index) => (
                <article
                  key={product.id}
                  className={`wra-tile min-w-[70%] snap-start sm:min-w-[44%] md:min-w-0 ${
                    index === 1 || index === 2
                      ? 'transition-[transform,box-shadow] duration-700 ease-out md:hover:-translate-y-1 md:hover:shadow-[0_0_44px_rgba(212,175,55,0.14)]'
                      : ''
                  }`}
                  data-hold-frame={product.handle}
                >
                  <div className="wra-hold flex aspect-[3/4] items-center justify-center bg-[var(--wra-panel)]">
                    <GarmentSilhouette className="h-[62%] w-auto" />
                    <span className="absolute inset-x-0 bottom-4 text-center text-[11px] font-semibold tracking-[0.3em] text-[var(--wra-gold)] uppercase">
                      Awaiting art
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between gap-4">
                    <h3 className="wra-tile-title m-0 text-lg leading-snug font-semibold tracking-[0.06em] uppercase">
                      {product.title}
                    </h3>
                    <p className="m-0 shrink-0 text-base text-[var(--wra-gold)] tabular-nums">
                      <Money data={product.priceRange.minVariantPrice} />
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <p
            data-empty-state="featured-products"
            className="border border-dashed border-[var(--wra-gold-line)] px-6 py-12 text-center text-[var(--wra-ivory-70)]"
          >
            Nothing here yet — the next drop fills this grid.
          </p>
        )}
        {collectionCta ? (
          <div className="mt-6 text-center">
            <Link
              className="wra-cta inline-block text-sm font-semibold tracking-[0.3em] text-[var(--wra-gold)] uppercase"
              to={collectionCta.href}
            >
              {collectionCta.label}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
