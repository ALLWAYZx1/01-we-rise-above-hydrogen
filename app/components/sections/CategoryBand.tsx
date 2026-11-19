/**
 * CategoryBand — ENERGY PASS (2026-11-19) + DENSITY & RETAIL IMPACT
 * spec: a full-bleed, wall-to-wall category wall under a strong
 * section header. The six core collections (HOODIES / TEES /
 * CREWNECKS / HEADWEAR / JOGGERS / BAGS) run edge to edge in an
 * ASYMMETRIC editorial grid — the first and last tiles span double
 * width — each carrying the collection's real Storefront API image
 * (the celestial black/gold tile art set in Shopify admin on
 * 2026-11-18), its real title, and a gold arrow. Restrained hover:
 * a slow image settle-in and the title warming to gold. A
 * collection with no image still gets a tile (nebula panel +
 * silhouette) so the wall never breaks.
 */
import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';
import {GarmentSilhouette} from './GarmentSilhouette';
import type {SectionImage} from './section-types';

export interface CategoryTile {
  id: string;
  handle: string;
  title: string;
  image?: SectionImage | null;
}

export function CategoryBand({tiles}: {tiles: CategoryTile[]}) {
  if (tiles.length === 0) return null;
  return (
    <section
      data-section="category-band"
      aria-label="Shop by category"
      className="bg-[var(--wra-void)]"
    >
      <header className="flex flex-wrap items-end justify-between gap-4 px-5 pt-10 pb-5 md:px-10 md:pt-12 md:pb-6">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.3em] text-[var(--wra-gold)] uppercase">
            Shop by category
          </p>
          <h2 className="wra-display m-0 text-4xl leading-none font-bold tracking-tight text-[var(--wra-ivory)] uppercase md:text-5xl">
            Pick your armor
          </h2>
        </div>
        <Link
          className="wra-cta text-sm font-semibold tracking-[0.3em] text-[var(--wra-gold)] uppercase"
          to="/collections"
        >
          All collections →
        </Link>
      </header>
      <div className="grid grid-cols-2 gap-[3px] md:auto-rows-[250px] md:grid-cols-4 lg:auto-rows-[280px]">
        {tiles.map((tile, index) => {
          const wide = index === 0 || index === tiles.length - 1;
          return (
            <Link
              key={tile.id}
              to={`/collections/${tile.handle}`}
              className={`group relative block overflow-hidden bg-[var(--wra-panel)] ${
                wide
                  ? 'col-span-2 aspect-[16/10] md:aspect-auto'
                  : 'aspect-[4/3] md:aspect-auto'
              }`}
            >
              {tile.image ? (
                <Image
                  data={tile.image}
                  alt={tile.image.altText || tile.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  sizes="(min-width: 820px) 25vw, 50vw"
                />
              ) : (
                <>
                  <div className="wra-nebula-soft" aria-hidden="true" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <GarmentSilhouette className="h-[52%] w-auto" />
                  </div>
                </>
              )}
              <span className="absolute right-0 bottom-0 left-0 flex items-center justify-between bg-[var(--wra-void)]/85 px-4 py-3">
                <span className="text-sm font-bold tracking-[0.22em] text-[var(--wra-ivory)] uppercase transition-colors duration-500 group-hover:text-[var(--wra-gold)] md:text-base">
                  {tile.title}
                </span>
                <span className="text-lg font-bold text-[var(--wra-gold)] transition-transform duration-500 ease-out group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
