/**
 * MarqueeBand — ENERGY PASS (2026-11-19). A Karmaloop/BBC-style
 * scrolling ticker directly under the hero: the store's real service
 * facts and the one real active code (RISE10) on a loop, gold on
 * panel black, hairline gold rules above and below. Pure CSS
 * animation (`.wra-marquee-track` in wra-reskin.css); the sequence
 * renders twice so the -50% translate loop is seamless. Reduced
 * motion rests the track static.
 */

const ITEMS = [
  'Pressure builds. We rise. No final form.',
  'NO FINAL FORM',
  'PRINTED TO ORDER',
  'RISE10 — 10% OFF YOUR FIRST ORDER',
  'SHIPS FROM THE USA',
  'SECURE SHOPIFY CHECKOUT',
] as const;

function MarqueeRun({ariaHidden = false}: {ariaHidden?: boolean}) {
  return (
    <div
      aria-hidden={ariaHidden}
      className="flex shrink-0 items-center gap-8 pr-8 whitespace-nowrap"
    >
      {ITEMS.map((item) => (
        <span
          key={item}
          className="flex items-center gap-8 text-sm font-bold tracking-[0.28em] text-[var(--wra-gold)] uppercase md:text-base"
        >
          {item}
          <span className="text-[var(--wra-champagne)]">✦</span>
        </span>
      ))}
    </div>
  );
}

export function MarqueeBand() {
  return (
    <section
      data-section="marquee-band"
      aria-label="Store highlights"
      className="overflow-hidden border-y border-[var(--wra-gold-line)] bg-[var(--wra-panel)] py-3"
    >
      <div className="wra-marquee-track flex w-max">
        <MarqueeRun />
        <MarqueeRun ariaHidden />
      </div>
    </section>
  );
}
