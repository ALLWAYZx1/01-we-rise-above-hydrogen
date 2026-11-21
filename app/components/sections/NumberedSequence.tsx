/**
 * NumberedSequence — ported from Forward's `numbered-sequence` section.
 *
 * Translation notes:
 * - Forward parsed `number | title | copy` rows out of a textarea string
 *   and took its heading as nested Weaverse children. The port receives
 *   `steps: SequenceStep[]` plus an ordinary `heading`/`eyebrow` prop.
 * - Empty steps render the heading alone with no empty list element.
 *
 * RESKIN v1 (spec §3 — the universe steps): one step per full-width
 * row, alignment alternating down a black void (01 left, 02 right,
 * 03 left). Each row carries an outsized ghosted GOLD numeral (8vw,
 * 25% opacity, behind the copy) over a CSS nebula wash at 10% — the
 * spec's celestial texture plates do not exist, so the wash stands in
 * (noted in the build report). Step titles are ivory display serif at
 * 4–5vw; body copy whispers at ivory 70%. ONE continuous 1px gold
 * hairline — the thread — runs down the page connecting all three
 * rows; its gold fill draws downward with scroll, and each numeral
 * ignites (25% → 60%) as its row reaches center viewport. Reduced
 * motion: thread stands complete, numerals rest, nothing moves.
 */
import {useEffect, useRef, useState} from 'react';

export interface SequenceStep {
  number: string;
  title: string;
  copy: string;
}

export interface NumberedSequenceProps {
  eyebrow?: string;
  heading: string;
  steps: SequenceStep[];
}

export function NumberedSequence({
  eyebrow,
  heading,
  steps,
}: NumberedSequenceProps) {
  if (!heading && steps.length === 0) return null;
  return (
    <section
      data-section="numbered-sequence"
      className="relative overflow-hidden bg-[var(--wra-void)] px-5 py-10 text-[var(--wra-ivory)] md:px-10 md:py-12"
    >
      <div className="relative mx-auto max-w-[1400px]">
        {eyebrow || heading ? (
          <header className="mb-8 md:mb-10">
            {eyebrow ? (
              <p className="mb-4 text-xs font-semibold tracking-[0.22em] text-[var(--wra-gold)] uppercase">
                {eyebrow}
              </p>
            ) : null}
            {heading ? (
              <h2 className="wra-display text-3xl leading-tight font-bold tracking-tight uppercase md:text-5xl">
                {heading}
              </h2>
            ) : null}
          </header>
        ) : null}
        {steps.length > 0 ? (
          <ol className="relative m-0 list-none p-0">
            <SequenceThread />
            {steps.map((step, index) => (
              <SequenceRow key={step.number} step={step} index={index} />
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
}

function SequenceRow({step, index}: {step: SequenceStep; index: number}) {
  const ref = useRef<HTMLLIElement>(null);
  const [lit, setLit] = useState(false);
  const right = index % 2 === 1;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setLit(true);
          io.disconnect();
        }
      },
      // "Center viewport" per spec: only the middle band of the screen
      // counts as intersecting.
      {rootMargin: '-45% 0px -45% 0px'},
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <li
      ref={ref}
      className="relative py-8 md:py-10"
      data-sequence-step={step.number}
    >
      {/* Ghost numeral + nebula wash, behind the copy. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 flex items-center ${
          right ? 'right-0' : 'left-0'
        }`}
      >
        <div className="relative">
          <div className="wra-nebula-soft" />
          <span
            className={`wra-seq-num wra-display relative block text-[19vw] leading-none font-bold text-[var(--wra-gold)] select-none md:text-[7vw] ${
              lit ? 'is-lit' : ''
            }`}
          >
            {step.number}
          </span>
        </div>
      </div>
      <div
        className={`relative max-w-xl ${
          right ? 'ml-auto text-right' : 'mr-auto text-left'
        }`}
      >
        <h3 className="wra-display m-0 text-[9vw] leading-[1.02] font-bold tracking-tight uppercase md:text-[4.5vw]">
          {step.title}
        </h3>
        <p className="mt-4 mb-0 text-base leading-relaxed text-[var(--wra-ivory-70)]">
          {step.copy}
        </p>
      </div>
    </li>
  );
}

/**
 * The continuous gold thread. A faint full-length hairline always
 * renders; the gold fill's scaleY tracks how far the sequence has
 * scrolled through the viewport (written straight to the node on
 * scroll — no re-render). Reduced motion gets the complete thread
 * from the stylesheet instead.
 */
function SequenceThread() {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const list = fill.closest('ol');
    if (!list) return;
    let raf = 0;
    const update = () => {
      const rect = list.getBoundingClientRect();
      const progress = Math.min(
        1,
        Math.max(0, (window.innerHeight * 0.75 - rect.top) / rect.height),
      );
      fill.style.transform = `scaleY(${progress})`;
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="wra-thread left-2 md:left-1/2 md:-translate-x-1/2"
    >
      <div ref={fillRef} className="wra-thread-fill" />
    </div>
  );
}
