import { useEffect, useMemo, useRef, useState } from 'react';
import { formatTeached, formatYears } from '../lib/marketingPageClientUtils';
import styles from './HomeStats.module.css';

function AnimatedInteger({ value, formatter }) {
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
    if (!started || value === null || value === undefined || Number.isNaN(Number(value))) return undefined;
    const target = Number(value);
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setN(target);
      return undefined;
    }
    const dur = 1400;
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

  const label = formatter ? formatter(n) : String(n);
  return <span ref={ref}>{label}</span>;
}

export default function HomeStats({ data }) {
  const highlights = useMemo(() => {
    const rows = [
      {
        key: 'years',
        value: data?.years_of_experience,
        label: 'Years of experience',
        formatter: formatYears,
      },
      {
        key: 'people',
        value: data?.people_trained,
        label: 'People Inspired',
        formatter: formatTeached,
      },
      {
        key: 'certs',
        value: data?.professional_certificates,
        label: 'Professional certificates',
        formatter: formatTeached,
      },
      {
        key: 'events',
        value: data?.events_and_workshops,
        label: 'Events & workshops',
        formatter: formatTeached,
      },
    ];
    return rows.filter((row) => row.value !== null && row.value !== undefined && Number.isFinite(Number(row.value)));
  }, [data]);

  if (!highlights.length) return null;

  return (
    <section className={styles.highlights} data-stats-section="true" aria-label="Highlights">
      <div className={styles.highlightsGrid}>
        {highlights.map((item) => (
          <article key={item.key} className={styles.statCard}>
            <p className={styles.statValue}>
              <AnimatedInteger value={item.value} formatter={item.formatter} />
            </p>
            <p className={styles.statLabel}>{item.label}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
