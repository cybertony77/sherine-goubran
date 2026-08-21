import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './CertificatesMarquee.module.css';

const SPEED_PX_S = 22;
const DRAG_THRESHOLD = 8;

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function hasHoverPointer() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function copyCount(length) {
  if (length <= 1) return 8;
  if (length < 4) return 4;
  return 3;
}

export default function CertificatesMarquee({ items = [] }) {
  const list = useMemo(
    () => (Array.isArray(items) ? items.filter((item) => item?.url) : []),
    [items]
  );
  const copies = copyCount(list.length);
  const slides = useMemo(
    () => Array.from({ length: copies }, (_, copy) => list.map((item, i) => ({ ...item, key: `${copy}-${item.id || i}` }))).flat(),
    [copies, list]
  );

  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const offsetRef = useRef(0);
  const pausedRef = useRef(false);
  const hoveringRef = useRef(false);
  const lightboxOpenRef = useRef(false);
  const lastTsRef = useRef(0);
  const rafRef = useRef(0);
  const dragRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startOffset: 0,
    moved: false,
  });

  const [lightbox, setLightbox] = useState(null);

  const loopWidth = useCallback(() => {
    const track = trackRef.current;
    if (!track || copies < 2) return 0;
    return track.scrollWidth / copies;
  }, [copies]);

  const applyOffset = useCallback(() => {
    const width = loopWidth();
    if (width > 0) {
      offsetRef.current = ((offsetRef.current % width) + width) % width;
    }
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
    }
  }, [loopWidth]);

  const pause = useCallback(() => {
    pausedRef.current = true;
  }, []);

  const resumeNow = useCallback(() => {
    if (lightboxOpenRef.current || dragRef.current.active) return;
    hoveringRef.current = false;
    pausedRef.current = false;
    lastTsRef.current = 0;
  }, []);

  const openLightbox = useCallback(
    (item) => {
      if (!item?.url) return;
      pause();
      lightboxOpenRef.current = true;
      hoveringRef.current = false;
      dragRef.current.active = false;
      setLightbox(item);
    },
    [pause]
  );

  const closeLightbox = useCallback(() => {
    lightboxOpenRef.current = false;
    hoveringRef.current = false;
    dragRef.current.active = false;
    setLightbox(null);
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    resumeNow();
  }, [resumeNow]);

  useEffect(() => {
    if (!list.length || prefersReducedMotion()) return undefined;

    const tick = (ts) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = Math.min(48, ts - lastTsRef.current);
      lastTsRef.current = ts;
      if (!pausedRef.current) {
        offsetRef.current += (SPEED_PX_S * dt) / 1000;
        applyOffset();
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafRef.current);
    };
  }, [applyOffset, list.length]);

  useEffect(() => {
    if (!lightbox?.url) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [lightbox, closeLightbox]);

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pause();
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startOffset: offsetRef.current,
      moved: false,
    };
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    const dx = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) <= DRAG_THRESHOLD) return;
    if (!drag.moved) {
      drag.moved = true;
      viewportRef.current?.setPointerCapture?.(event.pointerId);
    }
    offsetRef.current = drag.startOffset - dx;
    applyOffset();
  };

  const onPointerUp = (event) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    const moved = drag.moved;
    drag.active = false;
    drag.pointerId = null;
    if (moved) {
      viewportRef.current?.releasePointerCapture?.(event.pointerId);
    }
    if (lightboxOpenRef.current) return;
    if (moved) {
      resumeNow();
      return;
    }
    const el = typeof document !== 'undefined'
      ? document.elementFromPoint(event.clientX, event.clientY)
      : event.target;
    const card = el?.closest?.('[data-cert-url]');
    const url = card?.getAttribute?.('data-cert-url');
    if (url) {
      openLightbox({
        url,
        src: card.getAttribute('data-cert-src') || '',
      });
      return;
    }
    resumeNow();
  };

  if (!list.length) return null;

  return (
    <div
      className={styles.root}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'mouse' || !hasHoverPointer()) return;
        hoveringRef.current = true;
        pause();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'mouse') return;
        hoveringRef.current = false;
        if (!dragRef.current.active && !lightboxOpenRef.current) resumeNow();
      }}
    >
      <div
        ref={viewportRef}
        className={styles.viewport}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div ref={trackRef} className={styles.track}>
          {slides.map((item, index) => (
            <button
              key={item.key}
              type="button"
              className={styles.card}
              data-cert-url={item.url}
              data-cert-src={item.src}
              aria-label={`View certificate ${((index % list.length) + 1)}`}
              onClick={(event) => {
                event.preventDefault();
                if (dragRef.current.moved || lightboxOpenRef.current) return;
                openLightbox(item);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="" draggable={false} />
            </button>
          ))}
        </div>
      </div>

      {lightbox?.url && typeof document !== 'undefined'
        ? createPortal(
            <div
              className={styles.lightbox}
              role="dialog"
              aria-modal="true"
              aria-label="Certificate preview"
              onClick={closeLightbox}
            >
              <button type="button" className={styles.lightboxClose} onClick={closeLightbox} aria-label="Close">
                ×
              </button>
              <div className={styles.lightboxFrame} onClick={(event) => event.stopPropagation()}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lightbox.url} alt="Certificate" />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
