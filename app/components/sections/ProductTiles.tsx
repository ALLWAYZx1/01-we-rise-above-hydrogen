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
 * RESKIN v1 (spec §4): the tiles' catalog photography is daylight
 * catalog work, banned from tiles by the spec, and no campaign shots
 * exist — so each full-bleed panel renders as a hold: a DEEP BLACK
 * field with the gold garment silhouette and an AWAITING ART label,
 * the real product's category and title in the caption block, still
 * linking to the real product page. The loader's image pairing is
 * retained in the tile data (unused by this skin) so the panels can
 * take real campaign art the day it exists without a data change.
 */
import {Link} from 'react-router';
import {GarmentSilhouette} from './GarmentSilhouette';
import type {SectionImage} from './section-types';

export interface ProductTile {
  product: {
    handle: string;
    title: string;
    /** Display category — the product's `productType` on Shopify. */
    category?: string;
  };
  image: SectionImage;
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
      {tiles.map(({product}) => (
        <Link
          className="wra-tile wra-hold group relative block min-h-[360px] overflow-hidden bg-[var(--wra-panel)] text-[var(--wra-ivory)] md:min-h-[440px]"
          to={`/products/${product.handle}`}
          key={product.handle}
          data-hold-frame={product.handle}
        >
          <div className="wra-nebula-soft" aria-hidden="true" />
          <div className="absolute inset-0 flex items-center justify-center">
            <GarmentSilhouette className="h-[46%] w-auto" />
          </div>
          <span className="absolute top-5 left-5 text-[11px] font-semibold tracking-[0.3em] text-[var(--wra-gold)] uppercase">
            Awaiting art
          </span>
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
