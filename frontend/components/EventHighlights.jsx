import { useEffect, useRef, useState } from 'react';
import styles from '../styles/EventHighlights.module.css';

function AnimatedValue({ value }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setStarted(true);
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const target = Number(value);
    if (!started || !Number.isFinite(target)) return undefined;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setN(target);
      return undefined;
    }
    const dur = 1200;
    const t0 = performance.now();
    let raf;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - (1 - p) ** 3;
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [started, value]);

  return <span ref={ref}>{Number.isFinite(Number(value)) ? n : value}</span>;
}

export default function EventHighlights({ rows = [] }) {
  if (!rows.length) return null;

  const countClass =
    rows.length === 1 ? styles.gridOne : rows.length === 2 ? styles.gridTwo : styles.gridThree;

  return (
    <section className={styles.highlights} aria-label="Event highlights">
      <div className={`${styles.grid} ${countClass}`}>
        {rows.map((row) => (
          <article key={row.key} className={styles.card}>
            <p className={styles.value}>
              <AnimatedValue value={row.value} />
            </p>
            <p className={styles.label}>{row.label}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
