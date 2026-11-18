/**
 * HomeHero — ported from Forward's `home-hero` section.
 *
 * Translation notes:
 * - Forward resolved its featured product through a Weaverse loader
 *   (`loaderData.featuredProduct`) and its image through `weaverseImage()`;
 *   its stats were a parsed textarea string; its copy was nested Weaverse
 *   children; its strings came from Forward's i18n dictionary. All of that
 *   machinery is gone: the route loader resolves data and passes ordinary
 *   typed props — `heading`, `copy`, `cta`, `stats[]`, `image`,
 *   `featuredProduct`.
 * - `next/image` → Hydrogen `Image`; Forward's market-localizing Link
 *   wrapper → React Router `Link` (the scaffold's `($locale)` routes keep
 *   the current market prefix on relative links).
 * - Composition preserved: copy column with a stat row along the bottom,
 *   image panel with a featured-product badge in the corner.
 * - Missing image drops the image panel (badge goes with it); the copy
 *   column and stats still carry the hero.
 *
 * RESKIN v1: dressed in the locked tokens — VOID BLACK ground, ivory
 * display-serif headline, body at ivory 80%, the CTA as gold text with
 * the draw-in underline, the stat row seamed by a gold hairline, the
 * featured badge as a DEEP BLACK panel with a gold hairline edge. On
 * the bench this surface renders TYPE-ONLY (spec §1 fallback — no
 * campaign shot exists and no catalog thumbnail may stand in); the
 * image path remains for the day a real campaign asset lands.
 */
import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {SectionCta, SectionImage} from './section-types';
import type {Stat} from './StatBand';

export interface HomeHeroFeaturedProduct {
  title: string;
  handle: string;
}

export interface HomeHeroProps {
  eyebrow?: string;
  heading: string;
  copy?: string;
  cta?: SectionCta;
  stats: Stat[];
  image?: SectionImage | null;
  /** Resolved by the route loader; `null`/absent renders no badge. */
  featuredProduct?: HomeHeroFeaturedProduct | null;
}

export function HomeHero({
  eyebrow,
  heading,
  copy,
  cta,
  stats,
  image,
  featuredProduct,
}: HomeHeroProps) {
  return (
    <section
      data-section="home-hero"
      aria-labelledby="home-hero-title"
      className={`grid grid-cols-1 bg-[var(--wra-void)] text-[var(--wra-ivory)] ${
        image ? 'md:grid-cols-[minmax(390px,0.78fr)_minmax(0,1.22fr)]' : ''
      }`}
    >
      <div className="flex flex-col justify-center px-5 py-14 md:p-[clamp(48px,6vw,100px)]">
        {eyebrow ? (
          <p className="mb-4 text-xs font-semibold tracking-[0.22em] text-[var(--wra-gold)] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1
          id="home-hero-title"
          className="wra-display text-5xl leading-[1.02] font-bold tracking-tight uppercase md:text-7xl"
        >
          {heading}
        </h1>
        {copy ? (
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--wra-ivory-80)]">
            {copy}
          </p>
        ) : null}
        {cta ? (
          <Link
            className="wra-cta mt-9 inline-block self-start text-sm font-semibold tracking-[0.3em] text-[var(--wra-gold)] uppercase"
            to={cta.href}
          >
            {cta.label}
          </Link>
        ) : null}
        {stats.length > 0 ? (
          <dl className="mt-12 grid grid-cols-3 border-t border-[var(--wra-gold-line)] pt-8 md:mt-auto">
            {stats.map((stat) => (
              <div className="grid gap-1.5" key={stat.label}>
                <dt className="m-0 order-2 text-[11px] font-semibold tracking-[0.18em] text-[var(--wra-ivory-70)] uppercase">
                  {stat.label}
                </dt>
                <dd className="wra-display m-0 order-1 text-2xl font-bold">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
      {image ? (
        <div className="relative mx-2.5 mt-0 mb-2.5 min-h-[68svh] overflow-hidden bg-[var(--wra-panel)] md:m-5">
          <Image
            className="absolute inset-0 h-full w-full object-cover saturate-[0.78] contrast-105"
            data={image}
            alt={image.altText || heading}
            sizes="(min-width: 820px) 58vw, 100vw"
            loading="eager"
          />
          {featuredProduct ? (
            <Link
              className="absolute right-4 bottom-4 grid w-[min(330px,calc(100%-2rem))] gap-2 border border-[var(--wra-gold-line)] bg-[var(--wra-panel)] p-5 text-[var(--wra-ivory)]"
              to={`/products/${featuredProduct.handle}`}
            >
              <span className="text-[11px] font-semibold tracking-[0.18em] text-[var(--wra-gold)] uppercase">
                Featured piece
              </span>
              <strong className="wra-display text-xl leading-tight font-bold uppercase">
                {featuredProduct.title}
              </strong>
              <span className="text-[11px] font-semibold tracking-[0.18em] uppercase">
                View product →
              </span>
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
