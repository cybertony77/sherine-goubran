import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { TypeAnimation } from 'react-type-animation';
import BlogCard from '../components/BlogCard';
import CertificatesSection from '../components/CertificatesSection';
import EventCard from '../components/EventCard';
import HomeStats from '../components/HomeStats';
import ReviewsCarousel from '../components/ReviewsCarousel';
import ServiceCard from '../components/ServiceCard';
import ButtonArrow from '../components/ButtonArrow';
import { usePublicBlogs } from '../lib/api/publicBlogs';
import { usePublicEvents } from '../lib/api/publicEvents';
import { usePersonalInfo } from '../lib/api/personalInfo';
import { usePublicServices } from '../lib/api/publicServices';
import { shuffleList, usePublicTestimonials } from '../lib/api/publicTestimonials';
import { selectHomepageEvents } from '../lib/eventDate';
import { EVENTS_PUBLIC_PATH } from '../lib/eventSlug';
import { loadHeroMediaOnce } from '../lib/heroMediaCache';
import { mediaSrcFromKey, resolveHeroMediaFields } from '../lib/personalInfoMedia';
import { firstNameFromFullName } from '../lib/publicSite';
import styles from '../styles/index.module.css';

function typingSequence(items) {
  const texts = (Array.isArray(items) ? items : [])
    .map((t) => String(t || '').trim())
    .filter(Boolean);
  if (!texts.length) return [];
  return texts.flatMap((text) => [text, 2200]);
}

function SectionEmpty({ text }) {
  return (
    <div className={styles.servicesEmpty}>
      <span className={styles.servicesEmptyLine} aria-hidden="true" />
      <p className={styles.servicesEmptyTitle}>Coming soon</p>
      <p className={styles.servicesEmptyText}>{text}</p>
    </div>
  );
}

export default function HomePage() {
  const { data } = usePersonalInfo();
  const { data: publicServices = [], isLoading: servicesLoading } = usePublicServices({ limit: 3 });
  const { data: publicEvents = [], isError: eventsError, isLoading: eventsLoading } =
    usePublicEvents();
  const previewServices = useMemo(
    () => (Array.isArray(publicServices) ? publicServices.slice(0, 3) : []),
    [publicServices]
  );
  const previewEvents = useMemo(
    () => selectHomepageEvents(publicEvents, 3),
    [publicEvents]
  );
  const { data: publicTestimonials = [], isError: reviewsError, isLoading: reviewsLoading } =
    usePublicTestimonials();
  const reviewIdsKey = useMemo(
    () => (Array.isArray(publicTestimonials) ? publicTestimonials.map((t) => t.id).join('|') : ''),
    [publicTestimonials]
  );
  const shuffledReviews = useMemo(
    () =>
      shuffleList(publicTestimonials).filter(
        (item) => String(item?.name || '').trim() && String(item?.text || '').trim()
      ),
    // Shuffle only when the activated set changes, not on every render/refetch of the same ids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reviewIdsKey]
  );
  const { data: publicBlogs = [], isError: blogsError, isLoading: blogsLoading } = usePublicBlogs({
    limit: 3,
  });
  const previewBlogs = useMemo(
    () => (Array.isArray(publicBlogs) ? publicBlogs.slice(0, 3) : []),
    [publicBlogs]
  );
  const videoRef = useRef(null);
  const loadedImageKeyRef = useRef('');
  const loadedVideoKeyRef = useRef('');
  const [imageSrc, setImageSrc] = useState('');
  const [videoSrc, setVideoSrc] = useState('');
  const [videoReady, setVideoReady] = useState(false);

  const name = String(data?.name || '').trim();
  const firstName = firstNameFromFullName(name);
  const shortDesc = String(data?.short_desc || '').trim();
  const { imageKey, videoKey, imageUrl, videoUrl } = useMemo(
    () => resolveHeroMediaFields(data || {}),
    [data]
  );
  const sequence = useMemo(() => typingSequence(data?.typing_text), [data?.typing_text]);
  const aboutText = String(data?.about_text || '').trim();
  const aboutImage = mediaSrcFromKey(data?.about_image || '');
  const storyTitle = (() => {
    const first = firstNameFromFullName(name);
    return first ? `${first}'s story` : 'Story';
  })();
  const mobileX = Number(data?.hero_mobile_position?.x);
  const mobileY = Number(data?.hero_mobile_position?.y);
  const mediaPosStyle = {
    '--hero-mobile-x': `${Number.isFinite(mobileX) ? mobileX : 50}%`,
    '--hero-mobile-y': `${Number.isFinite(mobileY) ? mobileY : 50}%`,
  };

  useEffect(() => {
    if (!imageKey) {
      loadedImageKeyRef.current = '';
      setImageSrc('');
      return undefined;
    }
    if (loadedImageKeyRef.current === imageKey) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const url = await loadHeroMediaOnce(imageKey, imageUrl || '');
        if (cancelled || !url) return;
        loadedImageKeyRef.current = imageKey;
        setImageSrc(url);
      } catch {
        if (!cancelled) {
          loadedImageKeyRef.current = '';
          setImageSrc('');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [imageKey, imageUrl]);

  useEffect(() => {
    setVideoReady(false);
    if (!videoKey) {
      loadedVideoKeyRef.current = '';
      setVideoSrc('');
      return undefined;
    }
    if (loadedVideoKeyRef.current === videoKey) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const url = await loadHeroMediaOnce(videoKey, videoUrl || '');
        if (cancelled || !url) return;
        loadedVideoKeyRef.current = videoKey;
        setVideoSrc(url);
      } catch {
        if (!cancelled) {
          loadedVideoKeyRef.current = '';
          setVideoSrc('');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [videoKey, videoUrl]);

  const ensureMutedLoop = (el) => {
    if (!el) return;
    el.muted = true;
    el.defaultMuted = true;
    el.loop = true;
    el.volume = 0;
    const play = el.play();
    if (play && typeof play.catch === 'function') play.catch(() => {});
  };

  const restartLoop = (el) => {
    if (!el) return;
    el.currentTime = 0;
    ensureMutedLoop(el);
  };

  const handleVideoReady = (el) => {
    ensureMutedLoop(el);
    // Paint the video at opacity 0 first, then fade so the CSS transition runs.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setVideoReady(true);
      });
    });
  };

  const showImage = Boolean(imageSrc);
  const showVideo = Boolean(videoSrc);
  const showFallback = !showImage && !showVideo;

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-label="Hero">
        <div className={styles.media}>
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={`${styles.mediaEl} ${styles.mediaPoster} ${
                showVideo && videoReady ? styles.mediaPosterHidden : ''
              }`}
              style={mediaPosStyle}
              src={imageSrc}
              alt=""
            />
          ) : null}
          {showVideo ? (
            <video
              ref={videoRef}
              className={`${styles.mediaEl} ${styles.mediaVideo} ${
                videoReady ? styles.mediaVideoReady : ''
              } ${!showImage ? styles.mediaVideoSolo : ''}`}
              style={mediaPosStyle}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              disablePictureInPicture
              controls={false}
              onLoadedData={(e) => handleVideoReady(e.currentTarget)}
              onCanPlay={(e) => handleVideoReady(e.currentTarget)}
              onEnded={(e) => restartLoop(e.currentTarget)}
            >
              {/* Declare as video/mp4 first — covers .mov (QuickTime H.264) which
                  Chrome/Firefox refuse when served as video/quicktime */}
              <source src={videoSrc} type="video/mp4" />
              <source src={videoSrc} />
            </video>
          ) : null}
          {showFallback ? <div className={styles.mediaFallback} /> : null}
          <div className={styles.scrim} />
          <div className={styles.vignette} />
        </div>

        <div className={styles.content}>
          <p className={styles.kicker}>Welcome</p>
          <h1 className={styles.name}>{name || 'Home'}</h1>
          {sequence.length ? (
            <div className={styles.typingWrap}>
              <TypeAnimation
                key={sequence.filter((x) => typeof x === 'string').join('|')}
                sequence={sequence}
                wrapper="span"
                speed={45}
                deletionSpeed={35}
                repeat={Infinity}
                className={styles.typing}
                style={{ color: '#e9c171' }}
              />
            </div>
          ) : null}
          {shortDesc ? <p className={styles.desc}>{shortDesc}</p> : null}

          <div className={styles.actions}>
            <Link href="/contact" className={styles.btnPrimary} aria-label="Contact Us">
              <Image src="/phone.svg" alt="" width={18} height={18} />
              Contact Us
            </Link>
            <Link href="/services" className={styles.btnGhost}>
              <Image src="/services.svg" alt="" width={18} height={18} />
              Explore Services
            </Link>
          </div>
        </div>

        <div className={styles.scrollHint} aria-hidden="true">
          <span className={styles.scrollText}>SCROLL</span>
          <span className={styles.scrollArrow}>↓</span>
        </div>
      </section>

      <HomeStats data={data} />

      {aboutText || aboutImage ? (
        <section className={styles.about} aria-label="About">
          <div className={`${styles.aboutInner} ${aboutImage ? '' : styles.aboutInnerTextOnly}`}>
            <div className={styles.aboutCopy}>
              <p className={styles.aboutKicker}>{storyTitle}</p>
              <div className={styles.aboutTextWrap}>
                <p className={styles.aboutText}>{aboutText}</p>
                <div className={styles.aboutFade} aria-hidden="true" />
              </div>
              <Link href="/about" className={styles.readMore}>
                Read more
              </Link>
            </div>
            {aboutImage ? (
              <div className={styles.aboutImageWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={aboutImage}
                  alt={name ? `${name}` : 'About'}
                  style={{
                    objectPosition: `${Number.isFinite(Number(data?.about_image_position?.x)) ? data.about_image_position.x : 50}% ${
                      Number.isFinite(Number(data?.about_image_position?.y)) ? data.about_image_position.y : 50
                    }%`,
                  }}
                />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <CertificatesSection />

      <section className={styles.services} aria-label="Services">
        <div className={styles.servicesInner}>
          <header className={styles.servicesHead}>
            <h2 className={styles.servicesTitle}>Services</h2>
            {previewServices.length ? (
              <p className={styles.servicesLead}>
                For different stages, needs and goals.
              </p>
            ) : null}
          </header>
          {servicesLoading ? (
            <div className={styles.serviceGrid}>
              {[0, 1, 2].map((key) => (
                <div key={key} className={styles.serviceSkeleton} aria-hidden="true" />
              ))}
            </div>
          ) : previewServices.length ? (
            <>
              <div className={styles.serviceGrid}>
                {previewServices.map((service) => (
                  <ServiceCard key={service.id || service.slug} service={service} />
                ))}
              </div>
              <Link href="/services" className={styles.viewAll}>
                View All Services
                <ButtonArrow className={styles.viewAllArrow} />
              </Link>
            </>
          ) : (
            <div className={styles.servicesEmpty}>
              <span className={styles.servicesEmptyLine} aria-hidden="true" />
              <p className={styles.servicesEmptyTitle}>Coming soon</p>
              <p className={styles.servicesEmptyText}>
                New offerings are being prepared.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className={styles.events} aria-label="Events and workshops">
        <div className={styles.eventsInner}>
          <header className={styles.eventsHead}>
            <p className={styles.eventsEyebrow}>What's happening</p>
            <h2 className={styles.eventsTitle}>Events & Workshops</h2>
            {previewEvents.length ? (
              <p className={styles.eventsLead}>
                Learn, grow, and connect through meaningful experiences, engaging workshops, and
                transformative events.
              </p>
            ) : null}
          </header>

          {eventsLoading ? (
            <div className={styles.eventsGrid}>
              {[0, 1, 2].map((key) => (
                <div key={key} className={styles.eventSkeleton} aria-hidden="true" />
              ))}
            </div>
          ) : !eventsError && previewEvents.length ? (
            <>
              <div className={styles.eventsGrid}>
                {previewEvents.map((event) => (
                  <EventCard key={event.id || event.slug} event={event} />
                ))}
              </div>
              <Link href={EVENTS_PUBLIC_PATH} className={styles.viewAll}>
                View All Events & Workshops
                <ButtonArrow className={styles.viewAllArrow} />
              </Link>
            </>
          ) : (
            <SectionEmpty text="New events and workshops are being prepared." />
          )}
        </div>
      </section>

      <section className={styles.blogs} aria-label="Blogs">
        <div className={styles.blogsInner}>
          <header className={styles.blogsHead}>
            <p className={styles.blogsEyebrow}>Insights & Stories</p>
            <h2 className={styles.blogsTitle}>Blogs</h2>
            {previewBlogs.length ? (
              <p className={styles.blogsLead}>
                Explore insights, practical guidance, and inspiring ideas to support your personal
                growth and everyday life.
              </p>
            ) : null}
          </header>
          {blogsLoading ? (
            <div className={styles.blogGrid}>
              {[0, 1, 2].map((key) => (
                <div key={key} className={styles.blogSkeleton} aria-hidden="true" />
              ))}
            </div>
          ) : !blogsError && previewBlogs.length ? (
            <>
              <div className={styles.blogGrid}>
                {previewBlogs.map((blog) => (
                  <BlogCard key={blog.id || blog.slug} blog={blog} />
                ))}
              </div>
              <Link href="/blogs" className={styles.viewAll}>
                View All Blogs
                <ButtonArrow className={styles.viewAllArrow} />
              </Link>
            </>
          ) : (
            <SectionEmpty text="New stories are being prepared." />
          )}
        </div>
      </section>

      <section className={styles.reviews} aria-label="Reviews">
        <div className={styles.reviewsInner}>
          <header className={styles.reviewsHead}>
            <p className={styles.reviewsEyebrow}>What clients say</p>
            <h2 className={styles.reviewsTitle}>Reviews</h2>
            {shuffledReviews.length ? (
              <p className={styles.reviewsLead}>
                {firstName
                  ? `Real experiences from people who have worked with ${firstName} and taken meaningful steps toward growth and positive change.`
                  : 'Real experiences from people who have taken meaningful steps toward growth and positive change.'}
              </p>
            ) : null}
          </header>
          {reviewsLoading ? (
            <div className={styles.reviewSkeleton} aria-hidden="true" />
          ) : !reviewsError && shuffledReviews.length ? (
            <>
              <div className={styles.reviewsCarouselWrap}>
                <ReviewsCarousel testimonials={shuffledReviews} />
              </div>
              <Link href="/reviews" className={styles.viewAll}>
                View All Reviews
                <ButtonArrow className={styles.viewAllArrow} />
              </Link>
            </>
          ) : (
            <SectionEmpty text="Client reviews will appear here soon." />
          )}
        </div>
      </section>

      <section className={styles.contact} aria-label="Contact">
        <div className={styles.contactInner}>
          <header className={styles.contactHead}>
            <p className={styles.contactEyebrow}>Contact</p>
            <h2 className={styles.contactTitle}>Ready to take the next step?</h2>
            <p className={styles.contactLead}>
              {firstName
                ? `Whether you have a question or you're ready to begin, ${firstName} would love to hear from you.`
                : "Whether you have a question or you're ready to begin, I'd love to hear from you."}
            </p>
          </header>
          <div className={styles.contactActions}>
            <Link href="/contact" className={styles.btnPrimary} aria-label="Contact Us">
            <Image src="/phone.svg" alt="" width={18} height={18} />
              Contact Us
            </Link>
            <Link href="/services" className={styles.btnGhost}>
              <Image src="/services.svg" alt="" width={18} height={18} />
              Explore Services
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
