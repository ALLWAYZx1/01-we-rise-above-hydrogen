/**
 * StandardStatement — ported from Forward's `standard-statement` section.
 *
 * Translation notes:
 * - Forward took nested Weaverse children for the statement and parsed a
 *   one-column-per-line string with `parseLines`. The port takes ordinary
 *   typed props instead: `eyebrow`, `heading`, `columns: string[]`.
 * - With no columns the statement still renders on its own; with no
 *   heading and no columns it renders nothing.
 *
 * RESKIN v1 (spec §5 — the statement band): ONE dominant moment. A
 * 60px gold hairline sits above the line (display serif, ivory,
 * nothing else competing on screen); an optional canon second line
 * rides below in gold tracked caps via the `subline` prop. Behind
 * the type, a single nebula bloom breathes on a 6s loop (8% → 14%);
 * reduced motion rests it at 10%. The `columns` path survives for
 * callers that still pass supporting copy — the band's own render
 * passes none.
 *
 * ENERGY PASS (2026-11-19): the band no longer burns a full
 * viewport of dead space — the min-h-svh is gone, padding is tight,
 * and the homepage passes the canon line itself as the heading at
 * oversized type ("Pressure builds. We rise. No final form."). Per
 * SOUNDWAVE's density spec, the campaign line "RISE LIKE YOU MEANT
 * IT ALL ALONG." rides as the `subline` — elevated to a secondary
 * display statement in champagne serif under the canon, never
 * replacing it.
 */

export interface StandardStatementProps {
  eyebrow?: string;
  heading: string;
  /** Canon line under the manifesto — gold, tracked caps, verbatim. */
  subline?: string;
  columns: string[];
}

export function StandardStatement({
  eyebrow,
  heading,
  subline,
  columns,
}: StandardStatementProps) {
  if (!heading && columns.length === 0) return null;
  return (
    <section
      data-section="standard-statement"
      className="relative overflow-hidden bg-[var(--wra-void)] text-[var(--wra-ivory)]"
    >
      <div className="wra-bloom" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-[1400px] flex-col items-start justify-center px-5 py-14 md:px-10 md:py-16">
        <div
          aria-hidden="true"
          className="h-px w-[60px] bg-[var(--wra-gold)]"
        />
        {eyebrow ? (
          <p className="mt-6 mb-0 text-xs font-semibold tracking-[0.22em] text-[var(--wra-gold)] uppercase">
            {eyebrow}
          </p>
        ) : null}
        {heading ? (
          <h2 className="wra-display mt-6 mb-0 max-w-none text-[10vw] leading-[0.95] font-bold tracking-tight uppercase md:text-[9vw]">
            {heading}
          </h2>
        ) : null}
        {subline ? (
          <p className="wra-display mt-8 mb-0 text-[5.5vw] leading-[1.05] font-bold tracking-tight text-[var(--wra-champagne)] uppercase md:text-[2.8vw]">
            {subline}
          </p>
        ) : null}
        {columns.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-6 text-base leading-relaxed text-[var(--wra-ivory-80)] md:grid-cols-3 md:gap-10">
            {columns.map((column) => (
              <p key={column}>{column}</p>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
