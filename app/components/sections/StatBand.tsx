/**
 * StatBand — ported from Forward's `stat-band` section.
 *
 * Translation notes:
 * - Forward parsed a `value | label` textarea string with `parseRows` and
 *   spread Weaverse element attributes over the section. Both are gone:
 *   the section receives structured `Stat[]` props and renders plainly.
 * - Empty input renders nothing — an honest empty state, never a
 *   placeholder band.
 *
 * RESKIN v1 (spec §2): full-width VOID BLACK band; giant GOLD display
 * numerals over tiny ivory-70% labels; cells separated by 1px gold
 * hairlines (a `gap-px` grid over a gold-line ground, so every seam is
 * exactly one hairline). No icons — numbers are the decoration.
 * Numerals count up ONCE on scroll-into-view (900ms, spec motion law)
 * and hold; under prefers-reduced-motion — or without JS — the final
 * value simply stands (it is also what SSR renders).
 */
import {useEffect, useRef} from 'react';

export interface Stat {
  value: string;
  label: string;
}

export interface StatBandProps {
  stats: Stat[];
}

export function StatBand({stats}: StatBandProps) {
  if (stats.length === 0) return null;
  return (
    <section
      data-section="stat-band"
      className="border-y border-[var(--wra-gold-line)] bg-[var(--wra-gold-line)] text-[var(--wra-ivory)]"
    >
      <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-px md:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="grid gap-2 bg-[var(--wra-void)] px-5 py-10 md:px-10 md:py-14"
          >
            <strong className="wra-display text-[13vw] leading-none font-bold text-[var(--wra-gold)] sm:text-6xl md:text-[5.5vw]">
              <CountUpValue value={stat.value} />
            </strong>
            <span className="text-xs tracking-[0.22em] text-[var(--wra-ivory-70)] uppercase">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Renders the final value (SSR + no-JS + reduced-motion all stop
 * there). With JS and motion allowed, the first scroll into view
 * replays the numeral counting up from zero over 900ms, once, writing
 * text directly to the node so React never re-renders.
 */
function CountUpValue({value}: {value: string}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const match = /^(\D*?)(\d[\d,]*)(\D*)$/.exec(value.trim());
    if (!match) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const digits = match[2].replace(/,/g, '');
    const target = parseInt(digits, 10);
    if (!Number.isFinite(target) || target <= 0) return;

    let raf = 0;
    let started = false;
    const render = (n: number) => {
      el.textContent = `${match[1]}${String(Math.round(n)).padStart(digits.length, '0')}${match[3]}`;
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (started) return;
        if (!entries.some((entry) => entry.isIntersecting)) return;
        started = true;
        io.disconnect();
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / 900);
          render(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      {threshold: 0.4},
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return <span ref={ref}>{value}</span>;
}
