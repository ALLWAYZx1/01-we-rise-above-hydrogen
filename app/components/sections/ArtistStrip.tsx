/**
 * ArtistStrip — the homepage artist strip, restored on the salvage
 * branch (2026-11-18) from the pre-PR#144 homepage's `PressStrip`
 * (old `app/routes/_index.tsx`, recovered at PR #141's branch tip
 * 9e61abf). The old strip's copy and links are carried over verbatim:
 * TAXI TV, Next Music Star, and the "Streaming everywhere" row.
 *
 * The point of the restore: in the old tree the Apple Music label was
 * plain text until PR #141 made it a live gold anchor — and PR #144
 * then replaced the whole homepage before that link ever deployed.
 * Here every streaming name is a real link again, Apple Music
 * included: https://music.apple.com/us/artist/allwayz/1894744939
 * (artist ID 1894744939), matching the Spotify link pattern beside it
 * (target _blank, rel noreferrer, gold).
 *
 * Styled on the reskin tokens (void black, gold hairlines, ivory)
 * instead of the old inline styles, so the strip sits inside the
 * Forward/reskin homepage rather than looking pasted on.
 */

const STREAMING_LINKS = [
  {
    label: 'Spotify',
    href: 'https://open.spotify.com/artist/7lu8CK1gQztFv3rlB0hqsb',
  },
  {
    label: 'Apple Music',
    href: 'https://music.apple.com/us/artist/allwayz/1894744939',
  },
  {
    label: 'Anghami',
    href: 'https://play.anghami.com/album/1090332643',
  },
] as const;

export function ArtistStrip() {
  return (
    <section
      data-section="artist-strip"
      aria-label="As seen and heard"
      className="border-y border-[var(--wra-gold-line)] bg-[var(--wra-void)] px-5 py-7 text-center text-[var(--wra-ivory)] md:py-8"
    >
      <p className="mb-4 text-xs font-semibold tracking-[0.3em] text-[var(--wra-gold)] uppercase">
        The artist behind the armor
      </p>
      <div className="mx-auto flex max-w-[1000px] flex-wrap justify-center gap-x-10 gap-y-6">
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <span className="text-sm font-bold tracking-[0.04em] uppercase">
            Heard on TAXI TV
          </span>
          <span className="text-sm text-[var(--wra-ivory-70)]">
            &ldquo;Make It Through (Clean)&rdquo; aired Nov 2, 2026
          </span>
        </div>
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <span className="text-sm font-bold tracking-[0.04em] uppercase">
            Next Music Star — Round 2
          </span>
          <span className="text-sm text-[var(--wra-ivory-70)]">
            Advanced out of Round 1 — top 5 move on.{' '}
            <a
              className="font-bold text-[var(--wra-gold)] no-underline"
              href="https://thenextmusicstar.com/2026/allwayz"
              target="_blank"
              rel="noreferrer"
            >
              Vote for ALLWAYZ →
            </a>
          </span>
        </div>
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <span className="text-sm font-bold tracking-[0.04em] uppercase">
            Streaming everywhere
          </span>
          <span className="text-sm text-[var(--wra-ivory-70)]">
            {STREAMING_LINKS.map((link, index) => (
              <span key={link.label}>
                {index > 0 ? <> &middot; </> : null}
                <a
                  className="font-bold text-[var(--wra-gold)] no-underline"
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {link.label}
                </a>
              </span>
            ))}
          </span>
        </div>
      </div>
    </section>
  );
}
