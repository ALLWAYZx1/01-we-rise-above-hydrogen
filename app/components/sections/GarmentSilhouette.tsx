/**
 * GarmentSilhouette — the gold-silhouette placeholder for the reskin's
 * AWAITING ART hold frames (spec §4 fallback: no campaign shots exist,
 * and catalog thumbnails are banned from tiles).
 *
 * A hoodie drawn as a single gold line form over a faint gold fill —
 * deliberately a silhouette, never a fake product photo. Pure inline
 * SVG: no image asset, no external URL.
 */
export function GarmentSilhouette({className = ''}: {className?: string}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className={className}
      fill="none"
    >
      {/* hood */}
      <path
        d="M60 10c-10.5 0-18 7.4-18 17 0 4.4 1.6 8.2 4.2 11.1L32 47.6c-4.4 2.5-7 7-7 12L27.4 84c.5 4.4 4.2 7.5 8.6 7.5h5.5V104c0 3.3 2.7 6 6 6h25c3.3 0 6-2.7 6-6V91.5H84c4.4 0 8.1-3.1 8.6-7.5L95 59.6c0-5-2.6-9.5-7-12L73.8 38.1C76.4 35.2 78 31.4 78 27c0-9.6-7.5-17-18-17Z"
        fill="rgba(212,175,55,0.07)"
        stroke="#D4AF37"
        strokeOpacity="0.6"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* hood opening */}
      <path
        d="M48 30c2.4 5.4 6.8 8.4 12 8.4S69.6 35.4 72 30"
        stroke="#D4AF37"
        strokeOpacity="0.6"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* drawstrings */}
      <path
        d="M55 40v10M65 40v10"
        stroke="#D4AF37"
        strokeOpacity="0.6"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* kangaroo pocket */}
      <path
        d="M45 84l4.5-12h21L75 84"
        stroke="#D4AF37"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* hem */}
      <path
        d="M41.5 100h37"
        stroke="#D4AF37"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
