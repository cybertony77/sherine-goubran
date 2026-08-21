import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Group, Rating, Text } from '@mantine/core';
import { Carousel } from '@mantine/carousel';
import styles from './ReviewsCarousel.module.css';

const AUTO_MS = 5000;
const RESUME_MS = 3000;

function cardSizeClass(text) {
  const len = String(text || '').trim().length;
  if (len < 80) return styles.cardSm;
  if (len < 220) return styles.cardMd;
  return styles.cardLg;
}

export function ReviewCard({ testimonial: t }) {
  const initial = String(t.name || '').trim().charAt(0) || 'R';

  return (
    <article className={`${styles.card} ${cardSizeClass(t.text)}`}>
      <span className={styles.quote} aria-hidden="true">
        “
      </span>
      <Group gap="sm" mb={0} wrap="nowrap" align="center" className={styles.header}>
        <Avatar radius="xl" className={styles.avatar}>
          {initial}
        </Avatar>
        <div className={styles.meta}>
          <Text fw={700} className={styles.name}>
            {t.name}
          </Text>
          {t.category ? <Text className={styles.category}>{t.category}</Text> : null}
        </div>
      </Group>
      <Text className={styles.body}>{t.text}</Text>
      {t.rating != null ? (
        <div className={styles.ratingRow}>
          <Rating
            value={Number(t.rating) || 0}
            readOnly
            fractions={1}
            size="sm"
            color="yellow"
            className={styles.rating}
          />
        </div>
      ) : null}
    </article>
  );
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function ReviewsCarousel({ testimonials }) {
  const slides = useMemo(
    () => (Array.isArray(testimonials) ? testimonials.filter((t) => t?.name && t?.text) : []),
    [testimonials]
  );
  const [embla, setEmbla] = useState(null);
  const autoTimerRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const pausedRef = useRef(false);
  const programmaticRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const pauseAutoplay = useCallback(() => {
    pausedRef.current = true;
    clearTimers();
  }, [clearTimers]);

  const startAutoplay = useCallback(() => {
    if (!embla || pausedRef.current || prefersReducedMotion() || slides.length < 2) return;
    clearTimers();
    autoTimerRef.current = setInterval(() => {
      if (pausedRef.current) return;
      programmaticRef.current = true;
      if (embla.canScrollNext()) embla.scrollNext();
      else embla.scrollTo(0);
    }, AUTO_MS);
  }, [embla, clearTimers, slides.length]);

  const scheduleResume = useCallback(() => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
      startAutoplay();
    }, RESUME_MS);
  }, [startAutoplay]);

  const syncHeight = useCallback(() => {
    if (!embla) return;
    const slide = embla.slideNodes()[embla.selectedScrollSnap()];
    const viewport = embla.containerNode()?.parentElement;
    if (!slide || !viewport) return;
    viewport.style.height = `${slide.offsetHeight}px`;
  }, [embla]);

  useEffect(() => {
    if (!embla || slides.length === 0) {
      clearTimers();
      return undefined;
    }

    const onSelect = () => {
      syncHeight();
      if (programmaticRef.current) {
        programmaticRef.current = false;
        return;
      }
      pauseAutoplay();
      scheduleResume();
    };

    const root = embla.rootNode();
    const onPointerDown = () => pauseAutoplay();
    const onPointerUp = () => scheduleResume();

    embla.on('select', onSelect);
    embla.on('reInit', syncHeight);
    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('pointerup', onPointerUp);
    root.addEventListener('touchstart', onPointerDown, { passive: true });
    root.addEventListener('touchend', onPointerUp, { passive: true });
    root.addEventListener('mouseenter', onPointerDown);
    root.addEventListener('mouseleave', onPointerUp);
    root.addEventListener('focusin', onPointerDown);
    root.addEventListener('focusout', onPointerUp);

    const raf = requestAnimationFrame(() => syncHeight());
    startAutoplay();

    return () => {
      cancelAnimationFrame(raf);
      embla.off('select', onSelect);
      embla.off('reInit', syncHeight);
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('touchstart', onPointerDown);
      root.removeEventListener('touchend', onPointerUp);
      root.removeEventListener('mouseenter', onPointerDown);
      root.removeEventListener('mouseleave', onPointerUp);
      root.removeEventListener('focusin', onPointerDown);
      root.removeEventListener('focusout', onPointerUp);
      clearTimers();
    };
  }, [embla, slides.length, clearTimers, pauseAutoplay, scheduleResume, startAutoplay, syncHeight]);

  if (!slides.length) return null;

  return (
    <Carousel
      className={styles.carousel}
      slideSize="100%"
      height="auto"
      emblaOptions={{ loop: true, align: 'start' }}
      getEmblaApi={setEmbla}
      withIndicators={slides.length > 1}
      withControls={false}
      styles={{
        root: {
          background: 'transparent',
          display: 'flex',
          flexDirection: 'column',
        },
        viewport: {
          overflow: 'hidden',
          background: 'transparent',
          transition: 'height 280ms ease',
          flex: 'none',
        },
        container: {
          alignItems: 'flex-start',
          background: 'transparent',
        },
        slide: {
          height: 'auto',
          padding: 0,
          background: 'transparent',
        },
        indicators: {
          position: 'relative',
          inset: 'auto',
          bottom: 'auto',
          justifyContent: 'center',
          alignItems: 'center',
        },
        indicator: {
          background: 'color-mix(in srgb, #c9a96a 40%, transparent)',
          opacity: 1,
          width: 8,
          height: 4,
          borderRadius: 999,
          transition: 'background-color 0.2s ease, width 0.2s ease',
          '&[data-active]': {
            width: 18,
            background: '#c9a96a',
          },
        },
      }}
    >
      {slides.map((t, idx) => (
        <Carousel.Slide key={`${t.id ?? t.name}-${idx}`}>
          <ReviewCard testimonial={t} />
        </Carousel.Slide>
      ))}
    </Carousel>
  );
}
