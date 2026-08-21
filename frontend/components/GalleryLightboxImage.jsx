import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './EventGallery.module.css';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SCALE = 2.5;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function touchDistance(touches) {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function touchCenter(touches) {
  if (touches.length === 1) {
    return { x: touches[0].clientX, y: touches[0].clientY };
  }
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

function clampPan({ x, y, scale, viewportEl, imageEl }) {
  if (!viewportEl || !imageEl || scale <= MIN_SCALE) {
    return { x: 0, y: 0 };
  }

  const viewportRect = viewportEl.getBoundingClientRect();
  const imageRect = imageEl.getBoundingClientRect();
  const scaledWidth = imageRect.width;
  const scaledHeight = imageRect.height;
  const maxX = Math.max(0, (scaledWidth - viewportRect.width) / 2);
  const maxY = Math.max(0, (scaledHeight - viewportRect.height) / 2);

  return {
    x: clamp(x, -maxX, maxX),
    y: clamp(y, -maxY, maxY),
  };
}

export default function GalleryLightboxImage({ src, alt }) {
  const viewportRef = useRef(null);
  const imageRef = useRef(null);
  const gestureRef = useRef({
    mode: 'idle',
    startScale: MIN_SCALE,
    startX: 0,
    startY: 0,
    startDistance: 0,
    panOriginX: 0,
    panOriginY: 0,
    lastTapAt: 0,
  });

  const [transform, setTransform] = useState({ scale: MIN_SCALE, x: 0, y: 0 });

  const applyTransform = useCallback((next) => {
    const scale = clamp(next.scale, MIN_SCALE, MAX_SCALE);
    const viewportEl = viewportRef.current;
    const imageEl = imageRef.current;
    const pan = clampPan({
      x: next.x,
      y: next.y,
      scale,
      viewportEl,
      imageEl,
    });

    setTransform({ scale, x: pan.x, y: pan.y });
  }, []);

  useEffect(() => {
    setTransform({ scale: MIN_SCALE, x: 0, y: 0 });
    gestureRef.current.mode = 'idle';
  }, [src]);

  const handleTouchStart = useCallback(
    (event) => {
      const touches = event.touches;
      const gesture = gestureRef.current;

      if (touches.length === 2) {
        gesture.mode = 'pinch';
        gesture.startScale = transform.scale;
        gesture.startX = transform.x;
        gesture.startY = transform.y;
        gesture.startDistance = touchDistance(touches);
        gesture.panOriginX = touchCenter(touches).x;
        gesture.panOriginY = touchCenter(touches).y;
        return;
      }

      if (touches.length === 1) {
        const now = Date.now();
        const center = touchCenter(touches);

        if (now - gesture.lastTapAt <= DOUBLE_TAP_MS) {
          event.preventDefault();
          if (transform.scale > MIN_SCALE) {
            applyTransform({ scale: MIN_SCALE, x: 0, y: 0 });
          } else {
            applyTransform({ scale: DOUBLE_TAP_SCALE, x: 0, y: 0 });
          }
          gesture.lastTapAt = 0;
          gesture.mode = 'idle';
          return;
        }

        gesture.lastTapAt = now;

        if (transform.scale > MIN_SCALE) {
          gesture.mode = 'pan';
          gesture.panOriginX = center.x;
          gesture.panOriginY = center.y;
          gesture.startX = transform.x;
          gesture.startY = transform.y;
        } else {
          gesture.mode = 'idle';
        }
      }
    },
    [applyTransform, transform.scale, transform.x, transform.y]
  );

  const handleTouchMove = useCallback(
    (event) => {
      const touches = event.touches;
      const gesture = gestureRef.current;

      if (gesture.mode === 'pinch' && touches.length === 2) {
        event.preventDefault();
        const distance = touchDistance(touches);
        if (!gesture.startDistance) return;

        const center = touchCenter(touches);
        const nextScale = clamp(
          gesture.startScale * (distance / gesture.startDistance),
          MIN_SCALE,
          MAX_SCALE
        );
        const scaleDelta = nextScale / gesture.startScale;
        const dx = center.x - gesture.panOriginX;
        const dy = center.y - gesture.panOriginY;

        applyTransform({
          scale: nextScale,
          x: gesture.startX * scaleDelta + dx,
          y: gesture.startY * scaleDelta + dy,
        });
        return;
      }

      if (gesture.mode === 'pan' && touches.length === 1 && transform.scale > MIN_SCALE) {
        event.preventDefault();
        const touch = touches[0];
        applyTransform({
          scale: transform.scale,
          x: gesture.startX + (touch.clientX - gesture.panOriginX),
          y: gesture.startY + (touch.clientY - gesture.panOriginY),
        });
      }
    },
    [applyTransform, transform.scale]
  );

  const handleTouchEnd = useCallback(() => {
    gestureRef.current.mode = 'idle';
    if (transform.scale <= MIN_SCALE + 0.02) {
      applyTransform({ scale: MIN_SCALE, x: 0, y: 0 });
    }
  }, [applyTransform, transform.scale]);

  const handleWheel = useCallback(
    (event) => {
      if (!event.ctrlKey && Math.abs(event.deltaY) < 1) return;
      event.preventDefault();
      const delta = event.deltaY < 0 ? 0.12 : -0.12;
      applyTransform({
        scale: transform.scale + delta,
        x: transform.x,
        y: transform.y,
      });
    },
    [applyTransform, transform.scale, transform.x, transform.y]
  );

  return (
    <div
      ref={viewportRef}
      className={styles.lightboxZoomViewport}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className={styles.lightboxZoomImage}
        draggable={false}
        style={{
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
        }}
      />
    </div>
  );
}
