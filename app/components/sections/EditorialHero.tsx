/**
 * EditorialHero — ported from Forward's `editorial-hero` section.
 *
 * Translation notes:
 * - `next/image` → Hydrogen `Image`; Forward's `weaverseImage()` resolver
 *   (which understood Builder/Weaverse image values) is gone — the prop is
 *   a plain Storefront API image shape, or nothing.
 * - Forward took its copy as nested Weaverse children; the port takes
 *   ordinary typed props: `eyebrow`, `heading`, `copy`, optional `cta`.
 * - Missing image is an ordinary state (Forward's own rule): the copy
 *   column carries the section alone rather than breaking the layout.
 *
 * RESKIN v1 (spec §1 — the hero): when `lines` is passed, the section
 * renders the WRA hero — full-viewport VOID BLACK, the headline stacked
 * line over line at 15vw+ in ivory display serif (leading 0.85, letters
 * sharp, NO gradient or glow on the type), a champagne nebula bloom and
 * starfield BEHIND the type (the cosmos glows, the words don't), one
 * 1px gold rule drawing in under the headline, and a text-only CTA
 * whose gold underline draws in on hover. Lines rise into place
 * staggered 120ms; everything collapses to static under reduced
 * motion.
 *
 * The hero is TYPE-ONLY by spec fallback: no Simulation Ascension
 * campaign shot exists, and a catalog thumbnail must never be faked
 * into this slot — so the `lines` path takes no image at all. The
 * older copy/image split below remains for non-hero callers.
 */
import {Link} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {SectionCta, SectionImage} from './section-types';

export interface EditorialHeroProps {
  eyebrow?: string;
  heading: string;
  /**
   * Stacked display lines for the reskin hero (e.g. ['WE', 'RISE',
   * 'ABOVE']). When present, the type-only manifesto hero renders and
   * `image`/`imageSide` are ignored.
   */
  lines?: string[];
  copy?: string;
  cta?: SectionCta;
  /** A Storefront API image, or nothing. */
  image?: SectionImage | null;
  /** Which column the image occupies on desktop. Defaults to `right`. */
  imageSide?: 'left' | 'right';
}

export function EditorialHero({
  eyebrow,
  heading,
  lines,
  copy,
  cta,
  image,
  imageSide = 'right',
}: EditorialHeroProps) {
  if (lines && lines.length > 0) {
    return (
      <section
        data-section="editorial-hero"
        data-hero-variant="manifesto"
        aria-label={heading}
        className="relative overflow-hidden bg-[var(--wra-void)] text-[var(--wra-ivory)]"
      >
        <div className="wra-starfield" aria-hidden="true" />
        <div className="wra-nebula-layer" aria-hidden="true" />
        <div className="relative flex min-h-[94svh] flex-col justify-center px-4 py-10 md:px-6 md:py-14">
          <h1 className="wra-display m-0 font-bold tracking-tight uppercase">
            {lines.map((line, index) => (
              <span
                key={line}
                className="wra-rise block text-[23vw] leading-[0.82] md:text-[22vw]"
                style={{animationDelay: `${index * 120}ms`}}
              >
                {line}
              </span>
            ))}
          </h1>
          <div
            aria-hidden="true"
            className="wra-draw-x mt-6 h-px w-full bg-[var(--wra-gold)] md:mt-8"
          />
          {cta ? (
            <Link
              className="wra-cta mt-6 inline-block self-start text-sm font-semibold tracking-[0.3em] text-[var(--wra-gold)] uppercase"
              to={cta.href}
            >
              {cta.label}
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  const imageFirst = imageSide === 'left';
  return (
    <section
      data-section="editorial-hero"
      className={`mx-2.5 mt-2.5 grid grid-cols-1 bg-[var(--wra-void)] text-[var(--wra-ivory)] md:mx-7 md:mt-5 ${
        image ? 'md:grid-cols-[0.9fr_1.1fr]' : ''
      }`}
    >
      <div
        className={`flex flex-col justify-center px-5 py-14 md:p-16 ${
          imageFirst && image ? 'order-1 md:order-2' : ''
        }`}
      >
        {eyebrow ? (
          <p className="mb-4 text-xs font-semibold tracking-[0.22em] text-[var(--wra-gold)] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="wra-display text-4xl leading-[1.05] font-bold tracking-tight uppercase md:text-6xl">
          {heading}
        </h2>
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
      </div>
      {image ? (
        <div
          className={`relative min-h-[50svh] overflow-hidden bg-[var(--wra-panel)] md:min-h-[70svh] ${
            imageFirst ? 'order-2 md:order-1' : ''
          }`}
        >
          <Image
            className="absolute inset-0 h-full w-full object-cover saturate-[0.72]"
            data={image}
            alt={image.altText || heading}
            sizes="(min-width: 820px) 55vw, 100vw"
            loading="eager"
          />
        </div>
      ) : null}
    </section>
  );
}
