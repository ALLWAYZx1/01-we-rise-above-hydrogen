/**
 * CollectionHero — ported from Forward's `collection-hero` section.
 *
 * Translation notes:
 * - Forward pulled the collection from a Weaverse data context
 *   (`useStorefrontContext`) because the editor owned the page. Here the
 *   collection is an ordinary prop resolved by Hydrogen's collection
 *   route loader — the map's ruling: the loader owns the collection, the
 *   section never knows where it came from.
 * - Forward's collection shape was its own (`heroImage`, `fieldCode`).
 *   The port uses the real Storefront API Collection shape: `image`,
 *   `title`, `description`, `handle`. `fieldCode` has no WRA equivalent
 *   and is dropped; the eyebrow is just the caller's `eyebrowPrefix`.
 * - `next/image` → Hydrogen `Image`; Forward's Link wrapper → React
 *   Router `Link`.
 * - Preserved behavior: a collection with no image renders the title
 *   panel alone rather than a broken frame, and the CTA keeps its own
 *   top gap whether or not a description is present. On the real WRA
 *   catalog NO collection has an image, so the fallback is the primary
 *   path, not an edge case.
 *
 * RESKIN v1: dressed in the locked tokens so the bench reads as one
 * skin — VOID BLACK ground, DEEP BLACK panel for the copy column,
 * ivory display-serif title, body at ivory 80%, gold-bordered CTA that
 * fills gold (gold ground, void text) on hover.
 */
import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {SectionImage} from './section-types';

export interface CollectionHeroCollection {
  title: string;
  description?: string | null;
  handle: string;
  image?: SectionImage | null;
}

export interface CollectionHeroProps {
  collection: CollectionHeroCollection;
  eyebrowPrefix: string;
  ctaLabel: string;
  /** Defaults to the collection's own page when not supplied. */
  ctaHref?: string;
}

export function CollectionHero({
  collection,
  eyebrowPrefix,
  ctaLabel,
  ctaHref,
}: CollectionHeroProps) {
  const href = ctaHref ?? `/collections/${collection.handle}`;
  return (
    <section
      data-section="collection-hero"
      className={`relative mx-3 mt-5 grid grid-cols-1 items-stretch overflow-hidden bg-[var(--wra-void)] text-[var(--wra-ivory)] md:mx-7 ${
        collection.image ? 'md:grid-cols-[1.3fr_0.7fr]' : ''
      }`}
    >
      {collection.image ? (
        <div className="relative min-h-[40svh] min-w-0 overflow-hidden bg-[var(--wra-panel)] md:min-h-[60svh]">
          <Image
            className="absolute inset-0 h-full w-full object-cover object-center saturate-[0.75] contrast-105"
            data={collection.image}
            alt={collection.image.altText || collection.title}
            sizes="(min-width: 820px) 65vw, 100vw"
            loading="eager"
          />
        </div>
      ) : null}
      <div className="relative flex flex-col justify-center bg-[var(--wra-panel)] px-5 pt-12 pb-14 md:p-14">
        <p className="text-xs font-semibold tracking-[0.22em] text-[var(--wra-gold)] uppercase">
          {eyebrowPrefix}
        </p>
        <h1 className="wra-display mt-4 max-w-xl text-4xl leading-[1.05] font-bold tracking-tight uppercase md:text-6xl">
          {collection.title}
        </h1>
        {collection.description ? (
          <p className="mt-6 max-w-md text-lg leading-relaxed text-[var(--wra-ivory-80)]">
            {collection.description}
          </p>
        ) : null}
        {/* The CTA owns its gap: the description above it is optional. */}
        <Link
          className="mt-8 inline-block self-start border border-[var(--wra-gold)] px-6 py-3 text-sm font-bold tracking-[0.14em] text-[var(--wra-gold)] uppercase transition-colors duration-700 hover:bg-[var(--wra-gold)] hover:text-[var(--wra-void)]"
          to={href}
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
