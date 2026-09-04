import { useMemo } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ReviewsCarousel from '../../components/ReviewsCarousel';
import PublicContentLoader from '../../components/PublicContentLoader';
import { usePersonalInfo } from '../../lib/api/personalInfo';
import { usePublicService } from '../../lib/api/publicServices';
import { selectServiceReviews, usePublicTestimonials } from '../../lib/api/publicTestimonials';
import { formatPhoneForDB } from '../../lib/phoneUtils';
import { contactHrefForService } from '../../lib/serviceSlug';
import ButtonArrow from '../../components/ButtonArrow';
import styles from '../../styles/serviceDetail.module.css';

function splitLongDescription(text) {
  const raw = String(text || '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!raw) return [];

  const blocks = raw
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
  const paragraphs = [];

  blocks.forEach((block) => {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length <= 1) {
      paragraphs.push((lines[0] || block).replace(/\s+/g, ' '));
      return;
    }

    let buffer = '';
    lines.forEach((line) => {
      buffer = buffer ? `${buffer} ${line}` : line;
      if (/[.!?]"?$/.test(buffer)) {
        paragraphs.push(buffer);
        buffer = '';
      }
    });
    if (buffer) paragraphs.push(buffer.replace(/\s+/g, ' '));
  });

  return paragraphs.length ? paragraphs : [raw.replace(/\s+/g, ' ')];
}

function CheckIcon() {
  return (
    <svg
      className={styles.checkIcon}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 12.5l2.4 2.4L16.2 9.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PublicServiceDetailPage() {
  const router = useRouter();
  const slug = Array.isArray(router.query.slug) ? router.query.slug[0] : router.query.slug;
  const { data: service, isLoading, isError } = usePublicService(slug);
  const { data: personalInfo } = usePersonalInfo();
  const { data: publicTestimonials = [], isLoading: reviewsLoading } = usePublicTestimonials();

  const fullName = String(personalInfo?.name || '').trim();
  const contactHref = contactHrefForService(service?.slug);
  const waDigits = formatPhoneForDB(personalInfo?.contact_phone || '');
  const waHref = waDigits.length > 2
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(
        `I am asking about ${String(service?.name || '').trim() || 'this service'}`
      )}`
    : '';

  const benefits = useMemo(
    () =>
      (Array.isArray(service?.benefits)
        ? service.benefits.map((item) => String(item || '').trim()).filter(Boolean)
        : []),
    [service?.benefits]
  );
  const aboutParagraphs = useMemo(
    () => splitLongDescription(service?.longDescription),
    [service?.longDescription]
  );

  const reviewIdsKey = useMemo(
    () => (Array.isArray(publicTestimonials) ? publicTestimonials.map((item) => item.id).join('|') : ''),
    [publicTestimonials]
  );
  const serviceReviews = useMemo(
    () =>
      selectServiceReviews(publicTestimonials, {
        category: service?.category,
        limit: service?.testimonialsNumber,
      }),
    // Shuffle only when the activated set or this service's review settings change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reviewIdsKey, service?.category, service?.testimonialsNumber]
  );

  const imageX = Number.isFinite(Number(service?.imagePosX)) ? Number(service.imagePosX) : 50;
  const imageY = Number.isFinite(Number(service?.imagePosY)) ? Number(service.imagePosY) : 50;
  const serviceName = String(service?.name || '').trim();
  const shortDescription = String(service?.shortDescription || '').trim();
  const pageTitle = serviceName
    ? fullName
      ? `${serviceName} | ${fullName}`
      : serviceName
    : 'Services';

  if (isLoading || !router.isReady) {
    return (
      <main className={styles.page}>
        <PublicContentLoader label="Loading service" />
      </main>
    );
  }

  if (isError || !service) {
    return (
      <main className={styles.page}>
        <div className={styles.missing}>
          <p className={styles.missingTitle}>This service could not be found.</p>
          <Link href="/services" className={styles.viewAll}>
            View all services
            <ButtonArrow className={styles.viewAllArrow} />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <Head>
        <title>{pageTitle}</title>
        {shortDescription ? <meta name="description" content={shortDescription} /> : null}
        <meta property="og:title" content={pageTitle} />
        {shortDescription ? <meta property="og:description" content={shortDescription} /> : null}
        {service.image ? <meta property="og:image" content={service.image} /> : null}
      </Head>

      <section className={styles.hero} aria-label={serviceName || 'Service'}>
        <div className={styles.heroShell}>
          <div className={`${styles.heroInner} ${service.image ? '' : styles.heroInnerSolo}`}>
            <div className={styles.heroCopy}>
              <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                <ol>
                  <li>
                    <Link href="/services">Services</Link>
                  </li>
                  <li aria-current="page">{serviceName}</li>
                </ol>
              </nav>
              <p className={styles.eyebrow}>Service</p>
              <h1 className={styles.heroTitle}>{serviceName}</h1>
              {shortDescription ? <p className={styles.heroLead}>{shortDescription}</p> : null}
              {waHref ? (
                <div className={styles.heroActions}>
                  <a
                    href={waHref}
                    className={styles.btnGhost}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Ask a question about ${serviceName} on WhatsApp`}
                  >
                    <Image src="/whatsapp2.svg" alt="" width={18} height={18} className={styles.waIcon} />
                    Ask a Question
                  </a>
                </div>
              ) : null}
            </div>
            {service.image ? (
              <div className={styles.heroImageWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={service.image}
                  alt={serviceName || 'Service'}
                  style={{ objectPosition: `${imageX}% ${imageY}%` }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {aboutParagraphs.length ? (
        <section className={`${styles.section} ${styles.about}`} aria-labelledby="about-service-title">
          <div className={styles.aboutInner}>
            <header className={styles.sectionHead}>
              <h2 id="about-service-title" className={styles.sectionTitle}>
                About this service
              </h2>
            </header>
            <div className={styles.aboutCopy}>
              {aboutParagraphs.map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {benefits.length ? (
        <section className={`${styles.section} ${styles.benefits}`} aria-labelledby="benefits-title">
          <div className={styles.benefitsInner}>
            <header className={styles.sectionHead}>
              <h2 id="benefits-title" className={styles.sectionTitle}>
                What you&apos;ll gain
              </h2>
              <p className={styles.sectionLead}>
                Practical outcomes designed to support your growth, confidence, and progress.
              </p>
            </header>
            <ul className={styles.benefitsGrid}>
              {benefits.map((benefit, index) => (
                <li
                  key={`${benefit}-${index}`}
                  className={styles.benefitCard}
                  style={{ '--reveal-delay': `${Math.min(index, 8) * 60}ms` }}
                >
                  <CheckIcon />
                  <p className={styles.benefitText}>{benefit}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {reviewsLoading ? (
        <section className={`${styles.section} ${styles.reviews}`} aria-hidden="true">
          <div className={styles.reviewsInner}>
            <div className={styles.reviewSkeleton} />
          </div>
        </section>
      ) : serviceReviews.length ? (
        <section className={`${styles.section} ${styles.reviews}`} aria-labelledby="reviews-title">
          <div className={styles.reviewsInner}>
            <header className={styles.sectionHead}>
              <h2 id="reviews-title" className={styles.sectionTitle}>
                What clients say
              </h2>
            </header>
            <div className={styles.reviewsCarouselWrap}>
              <ReviewsCarousel testimonials={serviceReviews} />
            </div>
          </div>
        </section>
      ) : null}

      <section className={`${styles.section} ${styles.cta}`} aria-label="Take the next step">
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Interested in this service?</h2>
          <p className={styles.ctaLead}>
            Get in touch to learn more, ask a question or see if this service is right for you.
          </p>
          <div className={styles.ctaActions}>
            <Link href={contactHref} className={`${styles.btnPrimary} ${styles.btnCta}`} aria-label="Contact Us">
              <Image src="/phone.svg" alt="" width={18} height={18} />
              Contact Us
            </Link>
            <Link href="/services" className={`${styles.btnGhost} ${styles.btnCta}`} aria-label="Explore more services">
              <Image src="/services.svg" alt="" width={18} height={18} />
              Explore more services
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
