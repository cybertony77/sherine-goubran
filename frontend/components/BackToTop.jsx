import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import styles from './BackToTop.module.css';

const SHOW_AFTER_PX = 450;

export default function BackToTop() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  const updateVisibility = useCallback(() => {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    setVisible(y > SHOW_AFTER_PX);
  }, []);

  useEffect(() => {
    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateVisibility);
  }, [updateVisibility]);

  useEffect(() => {
    const onRoute = () => updateVisibility();
    router.events.on('routeChangeComplete', onRoute);
    return () => router.events.off('routeChangeComplete', onRoute);
  }, [router.events, updateVisibility]);

  const handleClick = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <button
      type="button"
      className={`${styles.btn} ${visible ? styles.visible : ''}`}
      onClick={handleClick}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
    >
      <svg
        className={styles.icon}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    </button>
  );
}
