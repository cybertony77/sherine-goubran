import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import GalleryLightboxImage from './GalleryLightboxImage';
import R2VideoPlayer from './R2VideoPlayer';
import R2VideoPoster from './R2VideoPoster';
import styles from '../styles/EventGallery.module.css';

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8.5 6.8v10.4c0 .7.8 1.1 1.4.7l8.2-5.2c.5-.3.5-1.1 0-1.4L9.9 6.1c-.6-.4-1.4 0-1.4.7z" />
    </svg>
  );
}

export default function EventGallery({
  photos = [],
  videos = [],
  eventName = '',
  title = 'Gallery',
  subtitle = '',
  hideHeader = false,
  centerContent = false,
}) {
  const [tab, setTab] = useState('photos');
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [videoLightboxIndex, setVideoLightboxIndex] = useState(null);
  const swipeStartX = useRef(null);

  const photoList = useMemo(
    () => (Array.isArray(photos) ? photos.map((url) => String(url || '').trim()).filter(Boolean) : []),
    [photos]
  );
  const videoList = useMemo(
    () =>
      (Array.isArray(videos) ? videos : [])
        .map((item) => ({
          key: String(item?.key || '').trim(),
        }))
        .filter((item) => item.key),
    [videos]
  );

  const hasPhotos = photoList.length > 0;
  const hasVideos = videoList.length > 0;
  const showTabs = hasPhotos && hasVideos;
  const lightboxOpen = lightboxIndex != null || videoLightboxIndex != null;

  useEffect(() => {
    if (hasPhotos) setTab('photos');
    else if (hasVideos) setTab('videos');
  }, [hasPhotos, hasVideos]);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    setVideoLightboxIndex(null);
  }, []);

  const goLightbox = useCallback(
    (direction) => {
      if (lightboxIndex == null || !photoList.length) return;
      const next =
        direction === 'next'
          ? (lightboxIndex + 1) % photoList.length
          : (lightboxIndex - 1 + photoList.length) % photoList.length;
      setLightboxIndex(next);
    },
    [lightboxIndex, photoList.length]
  );

  const goVideoLightbox = useCallback(
    (direction) => {
      if (videoLightboxIndex == null || !videoList.length) return;
      const next =
        direction === 'next'
          ? (videoLightboxIndex + 1) % videoList.length
          : (videoLightboxIndex - 1 + videoList.length) % videoList.length;
      setVideoLightboxIndex(next);
    },
    [videoLightboxIndex, videoList.length]
  );

  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxOpen]);

  useEffect(() => {
    if (lightboxIndex == null) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowRight') goLightbox('next');
      if (event.key === 'ArrowLeft') goLightbox('prev');
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [lightboxIndex, closeLightbox, goLightbox]);

  useEffect(() => {
    if (videoLightboxIndex == null) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowRight') goVideoLightbox('next');
      if (event.key === 'ArrowLeft') goVideoLightbox('prev');
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [videoLightboxIndex, closeLightbox, goVideoLightbox]);

  if (!hasPhotos && !hasVideos) return null;

  const altBase = String(eventName || 'Event').trim() || 'Event';
  const lightboxUrl = lightboxIndex != null ? photoList[lightboxIndex] : null;
  const activeVideo = videoLightboxIndex != null ? videoList[videoLightboxIndex] : null;

  const handleSwipeStart = (event) => {
    if (event.touches?.length !== 1) return;
    swipeStartX.current = event.touches[0].clientX;
  };

  const handleSwipeEnd = (event, kind = 'photo') => {
    if (swipeStartX.current == null || !event.changedTouches?.length) return;
    const delta = event.changedTouches[0].clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(delta) < 56) return;
    const direction = delta < 0 ? 'next' : 'prev';
    if (kind === 'video') goVideoLightbox(direction);
    else goLightbox(direction);
  };

  return (
    <section
      className={`${styles.gallery} ${centerContent ? styles.galleryCentered : ''}`.trim()}
      aria-labelledby={hideHeader ? undefined : 'event-gallery-title'}
    >
      {hideHeader ? null : (
        <header className={styles.head}>
          <h2 id="event-gallery-title" className={styles.title}>
            {title}
          </h2>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </header>
      )}

      {showTabs ? (
        <div className={styles.tabs} role="tablist" aria-label="Gallery media type">
          <button
            type="button"
            role="tab"
            id="gallery-tab-photos"
            aria-selected={tab === 'photos'}
            aria-controls="gallery-panel-photos"
            className={`${styles.tab} ${tab === 'photos' ? styles.tabActive : ''}`}
            onClick={() => setTab('photos')}
          >
            Photos
          </button>
          <button
            type="button"
            role="tab"
            id="gallery-tab-videos"
            aria-selected={tab === 'videos'}
            aria-controls="gallery-panel-videos"
            className={`${styles.tab} ${tab === 'videos' ? styles.tabActive : ''}`}
            onClick={() => setTab('videos')}
          >
            Videos
          </button>
        </div>
      ) : null}

      <div
        key={tab}
        className={styles.panel}
        role="tabpanel"
        id={tab === 'photos' ? 'gallery-panel-photos' : 'gallery-panel-videos'}
        aria-labelledby={showTabs ? (tab === 'photos' ? 'gallery-tab-photos' : 'gallery-tab-videos') : undefined}
      >
        {(tab === 'photos' || !showTabs) && hasPhotos ? (
          <div className={styles.photoGrid}>
            {photoList.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                className={styles.photoButton}
                onClick={() => setLightboxIndex(index)}
                aria-label={`View photo ${index + 1} of ${photoList.length}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`${altBase} gallery ${index + 1}`} loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        ) : null}

        {(tab === 'videos' || (!showTabs && !hasPhotos)) && hasVideos ? (
          <div className={styles.videoGrid}>
            {videoList.map((video, index) => (
              <button
                key={video.key}
                type="button"
                className={styles.videoButton}
                onClick={() => setVideoLightboxIndex(index)}
                aria-label={`Play gallery video ${index + 1}`}
              >
                <R2VideoPoster r2Key={video.key} className={styles.videoPoster} />
                <span className={styles.playButton} aria-hidden="true">
                  <PlayIcon />
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {lightboxUrl && typeof document !== 'undefined'
        ? createPortal(
            <div
              className={styles.lightbox}
              role="dialog"
              aria-modal="true"
              aria-label="Gallery photo preview"
              onClick={closeLightbox}
            >
              <button type="button" className={styles.lightboxClose} onClick={closeLightbox} aria-label="Close">
                <span className={styles.lightboxCloseIcon} aria-hidden="true">
                  ×
                </span>
              </button>
              <div
                className={styles.lightboxFrame}
                onClick={(event) => event.stopPropagation()}
                onTouchStart={photoList.length > 1 ? handleSwipeStart : undefined}
                onTouchEnd={photoList.length > 1 ? (event) => handleSwipeEnd(event, 'photo') : undefined}
              >
                <GalleryLightboxImage src={lightboxUrl} alt={`${altBase} gallery photo`} />
                {photoList.length > 1 ? (
                  <div className={styles.lightboxToolbar}>
                    <button
                      type="button"
                      className={styles.lightboxNav}
                      onClick={(event) => {
                        event.stopPropagation();
                        goLightbox('prev');
                      }}
                      aria-label="Previous photo"
                    >
                      ‹
                    </button>
                    <p className={styles.lightboxCount}>
                      {lightboxIndex + 1} / {photoList.length}
                    </p>
                    <button
                      type="button"
                      className={styles.lightboxNav}
                      onClick={(event) => {
                        event.stopPropagation();
                        goLightbox('next');
                      }}
                      aria-label="Next photo"
                    >
                      ›
                    </button>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}

      {activeVideo && typeof document !== 'undefined'
        ? createPortal(
            <div
              className={styles.lightbox}
              role="dialog"
              aria-modal="true"
              aria-label="Gallery video player"
              onClick={closeLightbox}
            >
              <button type="button" className={styles.lightboxClose} onClick={closeLightbox} aria-label="Close">
                <span className={styles.lightboxCloseIcon} aria-hidden="true">
                  ×
                </span>
              </button>
              <div
                className={styles.videoLightboxFrame}
                onClick={(event) => event.stopPropagation()}
                onTouchStart={videoList.length > 1 ? handleSwipeStart : undefined}
                onTouchEnd={videoList.length > 1 ? (event) => handleSwipeEnd(event, 'video') : undefined}
              >
                <div className={styles.videoLightboxPlayer} key={activeVideo.key}>
                  <R2VideoPlayer r2Key={activeVideo.key} hideWatermark fillParent />
                </div>
                {videoList.length > 1 ? (
                  <div className={styles.lightboxToolbar}>
                    <button
                      type="button"
                      className={styles.lightboxNav}
                      onClick={(event) => {
                        event.stopPropagation();
                        goVideoLightbox('prev');
                      }}
                      aria-label="Previous video"
                    >
                      ‹
                    </button>
                    <p className={styles.lightboxCount}>
                      {videoLightboxIndex + 1} / {videoList.length}
                    </p>
                    <button
                      type="button"
                      className={styles.lightboxNav}
                      onClick={(event) => {
                        event.stopPropagation();
                        goVideoLightbox('next');
                      }}
                      aria-label="Next video"
                    >
                      ›
                    </button>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </section>
  );
}
