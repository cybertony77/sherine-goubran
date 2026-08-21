import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Avatar, Rating } from '@mantine/core';
import styles from './ReviewsMarquee.module.css';

const MIN_ROW_CARDS = 6;
const READ_MORE_CHARS = 220;
const DRAG_THRESHOLD = 8;
const SPEED_LEFT_PX_S = 48;
const SPEED_RIGHT_PX_S = 52;

function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function hasHoverPointer() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function splitRows(list) {
  if (!list.length) return [[], []];
  if (list.length === 1) return [list, list];
  const mid = Math.ceil(list.length / 2);
  return [list.slice(0, mid), list.slice(mid)];
}

function padRow(items) {
  if (!items.length) return [];
  const out = [...items];
  let i = 0;
  while (out.length < MIN_ROW_CARDS) {
    out.push(items[i % items.length]);
    i += 1;
  }
  return out;
}

function ReviewMarqueeCard({ item, onReadMore }) {
  const textRef = useRef(null);
  const [overflows, setOverflows] = useState(false);
  const initial = String(item.name || '').trim().charAt(0) || 'R';
  const text = String(item.text || '').trim();
  const long = text.length > READ_MORE_CHARS;
  const imageSrc = String(item.image || item.avatar || '').trim();

  useEffect(() => {
    const el = textRef.current;
    if (!el) return undefined;
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 2);
    check();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [text]);

  const showMore = long || overflows;

  return (
    <article className={styles.card}>
      <header className={styles.cardHead}>
        {imageSrc ? (
          <Avatar src={imageSrc} alt="" radius={999} className={styles.avatar} />
        ) : (
          <Avatar radius={999} className={styles.avatar} alt="">
            {initial}
          </Avatar>
        )}
        <div className={styles.meta}>
          <p className={styles.name}>{item.name}</p>
        </div>
      </header>
      {item.rating != null ? (
        <div className={styles.ratingRow}>
          <Rating
            value={Number(item.rating) || 0}
            readOnly
            fractions={1}
            size="sm"
            color="yellow"
            aria-label={`${Number(item.rating) || 0} out of 5 stars`}
          />
        </div>
      ) : null}
      <p ref={textRef} className={styles.body} dir="auto">
        {text}
      </p>
      {showMore ? (
        <button type="button" className={styles.readMore} onClick={() => onReadMore?.(item)}>
          Read more
        </button>
      ) : null}
    </article>
  );
}

export function TestimonialMarqueeRow({ testimonials = [], direction = 'left' }) {
  const padded = useMemo(() => padRow(testimonials), [testimonials]);
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const groupRef = useRef(null);
  const offsetRef = useRef(0);
  const pausedRef = useRef(false);
  const hoveringRef = useRef(false);
  const modalOpenRef = useRef(false);
  const reducedRef = useRef(false);
  const lastTsRef = useRef(0);
  const rafRef = useRef(0);
  const loopWidthRef = useRef(0);
  const wheelTimerRef = useRef(0);
  const dragRef = useRef({
    active: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startOffset: 0,
  });

  const [openReview, setOpenReview] = useState(null);
  const [dragging, setDragging] = useState(false);

  const measure = useCallback(() => {
    const group = groupRef.current;
    if (!group) return 0;
    const width = group.getBoundingClientRect().width;
    loopWidthRef.current = width;
    return width;
  }, []);

  const applyOffset = useCallback(() => {
    const width = loopWidthRef.current || measure();
    if (width > 0) {
      offsetRef.current = ((offsetRef.current % width) + width) % width;
    }
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
    }
  }, [measure]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    lastTsRef.current = 0;
  }, []);

  const resume = useCallback(() => {
    if (modalOpenRef.current || dragRef.current.active || hoveringRef.current) return;
    pausedRef.current = false;
    lastTsRef.current = 0;
  }, []);

  const openModal = useCallback(
    (item) => {
      if (!item || dragRef.current.moved) return;
      pause();
      modalOpenRef.current = true;
      setOpenReview(item);
    },
    [pause]
  );

  const closeModal = useCallback(() => {
    modalOpenRef.current = false;
    setOpenReview(null);
    resume();
  }, [resume]);

  useEffect(() => {
    reducedRef.current = prefersReducedMotion();
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      reducedRef.current = mq.matches;
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useLayoutEffect(() => {
    measure();
    applyOffset();
    const el = viewportRef.current;
    const group = groupRef.current;
    if (!el && !group) return undefined;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
      measure();
      applyOffset();
    }) : null;
    if (el) ro?.observe(el);
    if (group) ro?.observe(group);
    return () => ro?.disconnect();
  }, [applyOffset, measure, padded.length]);

  useEffect(() => {
    if (!padded.length) return undefined;

    const tick = (ts) => {
      if (!pausedRef.current && !reducedRef.current) {
        if (!lastTsRef.current) lastTsRef.current = ts;
        const dt = Math.min(32, ts - lastTsRef.current);
        lastTsRef.current = ts;
        const speed = direction === 'right' ? SPEED_RIGHT_PX_S : SPEED_LEFT_PX_S;
        offsetRef.current += direction === 'left' ? speed * (dt / 1000) : -speed * (dt / 1000);
        applyOffset();
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafRef.current);
  }, [applyOffset, direction, padded.length]);

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pause();
    dragRef.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffset: offsetRef.current,
    };
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved) {
      if (Math.abs(dx) <= DRAG_THRESHOLD) return;
      if (Math.abs(dx) < Math.abs(dy)) {
        drag.active = false;
        resume();
        return;
      }
      drag.moved = true;
      setDragging(true);
      viewportRef.current?.setPointerCapture?.(event.pointerId);
    }
    event.preventDefault();
    offsetRef.current = drag.startOffset - dx;
    applyOffset();
  };

  const endPointer = (event) => {
    const drag = dragRef.current;
    const moved = drag.moved;
    if (drag.active && moved) {
      viewportRef.current?.releasePointerCapture?.(event.pointerId);
    }
    drag.active = false;
    drag.pointerId = null;
    if (moved) setDragging(false);

    const el = viewportRef.current;
    const under = typeof document !== 'undefined'
      ? document.elementFromPoint(event.clientX, event.clientY)
      : null;
    hoveringRef.current = Boolean(el && under && el.contains(under) && hasHoverPointer());

    window.setTimeout(() => {
      drag.moved = false;
      if (!hoveringRef.current && !dragRef.current.active && !modalOpenRef.current) resume();
    }, 0);
  };

  const onWheel = (event) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    event.preventDefault();
    pause();
    offsetRef.current += event.deltaX;
    applyOffset();
    if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = window.setTimeout(() => {
      wheelTimerRef.current = 0;
      resume();
    }, 280);
  };

  if (!padded.length) return null;

  return (
    <div
      className={`${styles.row} ${dragging ? styles.rowDragging : ''}`}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'mouse' || !hasHoverPointer()) return;
        hoveringRef.current = true;
        pause();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'mouse') return;
        hoveringRef.current = false;
        if (!dragRef.current.active && !modalOpenRef.current) resume();
      }}
      onFocusCapture={() => pause()}
      onBlurCapture={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        if (!hoveringRef.current && !dragRef.current.active && !modalOpenRef.current) resume();
      }}
    >
      <div
        ref={viewportRef}
        className={styles.viewport}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onWheel={onWheel}
      >
        <div ref={trackRef} className={styles.track}>
          {[0, 1].map((copy) => (
            <div
              className={styles.group}
              key={`copy-${copy}`}
              ref={copy === 0 ? groupRef : undefined}
              aria-hidden={copy === 1 || undefined}
            >
              {padded.map((item, index) => (
                <ReviewMarqueeCard
                  key={`${copy}-${item.id ?? item.name}-${index}`}
                  item={item}
                  onReadMore={openModal}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <ReviewReadMoreModal item={openReview} onClose={closeModal} />
    </div>
  );
}

export default function ReviewsMarquee({ testimonials = [] }) {
  const list = useMemo(
    () =>
      (Array.isArray(testimonials) ? testimonials : []).filter(
        (item) => String(item?.name || '').trim() && String(item?.text || '').trim()
      ),
    [testimonials]
  );
  const [row1, row2] = useMemo(() => splitRows(list), [list]);

  if (!list.length) return null;

  return (
    <div className={styles.board}>
      <TestimonialMarqueeRow testimonials={row1} direction="right" />
      <TestimonialMarqueeRow testimonials={row2.length ? row2 : row1} direction="left" />
    </div>
  );
}

export function ReviewReadMoreModal({ item, onClose }) {
  useEffect(() => {
    if (!item) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [item, onClose]);

  if (!item || typeof document === 'undefined') return null;

  const initial = String(item.name || '').trim().charAt(0) || 'R';
  const imageSrc = String(item.image || item.avatar || '').trim();

  return createPortal(
    <div
      className={styles.lightbox}
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      onClick={onClose}
    >
      <div className={styles.lightboxCard} onClick={(event) => event.stopPropagation()}>
        <button type="button" className={styles.lightboxClose} onClick={onClose} aria-label="Close review">
          ×
        </button>
        <header className={styles.cardHead}>
          {imageSrc ? (
            <Avatar src={imageSrc} alt="" radius={999} className={styles.avatar} />
          ) : (
            <Avatar radius={999} className={styles.avatar} alt="">
              {initial}
            </Avatar>
          )}
          <div className={styles.meta}>
            <p id="review-modal-title" className={styles.name}>
              {item.name}
            </p>
            {item.category ? <p className={styles.category}>{item.category}</p> : null}
          </div>
        </header>
        {item.rating != null ? (
          <div className={styles.ratingRow}>
            <Rating
              value={Number(item.rating) || 0}
              readOnly
              fractions={1}
              size="sm"
              color="yellow"
              aria-label={`${Number(item.rating) || 0} out of 5 stars`}
            />
          </div>
        ) : null}
        <p className={styles.lightboxBody} dir="auto">
          {item.text}
        </p>
      </div>
    </div>,
    document.body
  );
}
