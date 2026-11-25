/**
 * ProductTiles — ported from Forward's `product-tiles` section.
 *
 * Translation notes:
 * - Forward's loader paired each selected product with the detail image
 *   of its first colorway, from Forward's custom colorway model, and
 *   DROPPED any product without one. The pairing rule survives; the model
 *   does not. Here the route loader builds render-ready tiles from the
 *   real Storefront API shape — product + its featured image — and omits
 *   products with no usable image (see the bench route loader). The
 *   section itself receives only finished tiles and never sees a loader,
 *   a selection, or a data source.
 * - Empty tiles render nothing at all.
 *
 * RESKIN v1 (spec §4) launched each full-bleed panel as a hold: a
 * DEEP BLACK field with the gold garment silhouette and an AWAITING
 * ART label, the real product's category and title in the caption
 * block, still linking to the real product page — because the spec
 * banned the tiles' catalog photography and no campaign shots
 * existed. The loader's image pairing was retained in the tile data
 * (unused by that skin) so the panels could take real art the day
 * it existed without a data change.
 *
 * ART LIVE (2026-11-20, ALLWAYZ's ruling — the ProductTiles twin of
 * the Featured Products fix in PR #163): the hold outlived its
 * brief — live screenshots showed AWAITING ART on products that DO
 * carry real featured art in Shopify (the same products render it
 * on collection pages), while both route loaders already pair each
 * product's featured image into the tile data. The panels now
 * render that REAL image full-bleed whenever one is paired; the
 * AWAITING ART hold remains ONLY for a tile paired with no image.
 * Selection, titles, captions, and links are unchanged.
 */
import {Link} from 'react-router';
import {Image} from '~/lib/legacy-components';
import {GarmentSilhouette} from './GarmentSilhouette';
import type {SectionImage} from './section-types';

export interface ProductTile {
  product: {
    handle: string;
    title: string;
    /** Display category — the product's `productType` on Shopify. */
    category?: string;
  };
  /** The product's paired featured image. Null only when the
   *  product genuinely has no image — the tile then renders the
   *  AWAITING ART hold instead of a photo. */
  image: SectionImage | null;
}

export interface ProductTilesProps {
  tiles: ProductTile[];
}

export function ProductTiles({tiles}: ProductTilesProps) {
  if (tiles.length === 0) return null;
  return (
    <section
      data-section="product-tiles"
      className="grid grid-cols-1 bg-[var(--wra-void)] md:grid-cols-3"
    >
      {tiles.map(({product, image}) => (
        <Link
          className="wra-tile wra-hold group relative block min-h-[360px] overflow-hidden bg-[var(--wra-panel)] text-[var(--wra-ivory)] md:min-h-[440px]"
          to={`/products/${product.handle}`}
          key={product.handle}
          data-hold-frame={product.handle}
        >
          {image ? (
            <Image
              alt={image.altText || product.title}
              className="absolute inset-0 h-full w-full object-cover"
              data={image}
              sizes="(min-width: 768px) 33vw, 100vw"
            />
          ) : null}
          <div className="wra-nebula-soft" aria-hidden="true" />
          {image ? null : (
            <>
              <div className="absolute inset-0 flex items-center justify-center">
                <GarmentSilhouette className="h-[46%] w-auto" />
              </div>
              <span className="absolute top-5 left-5 text-[11px] font-semibold tracking-[0.3em] text-[var(--wra-gold)] uppercase">
                Awaiting art
              </span>
            </>
          )}
          <div className="absolute right-5 bottom-5 left-5 grid gap-1 bg-[var(--wra-void)]/90 p-5">
            {product.category ? (
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[var(--wra-gold)] uppercase">
                {product.category}
              </span>
            ) : null}
            <strong className="wra-display wra-tile-title w-fit text-xl leading-tight font-bold uppercase">
              {product.title}
            </strong>
            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase">
              Inspect product →
            </span>
          </div>
        </Link>
      ))}
    </section>
  );
}
