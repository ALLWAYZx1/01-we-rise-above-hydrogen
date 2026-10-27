import {useEffect, useRef, type ReactNode} from 'react';

/**
 * Scroll-reveal wrapper. Content renders fully visible by default
 * (SSR / no-JS safe). When JS runs, the wrapper arms itself — hidden
 * and offset — then reveals the first time it enters the viewport.
 * Motion is disabled under prefers-reduced-motion (see app.css).
 */
export function Reveal({children}: {children: ReactNode}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    el.classList.add('wra-reveal-armed');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add('is-inview');
            io.disconnect();
          }
        });
      },
      {threshold: 0.1, rootMargin: '0px 0px -40px 0px'},
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="wra-reveal">
      {children}
    </div>
  );
}
