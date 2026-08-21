import Image from 'next/image';
import Link from 'next/link';
import EventGallery from './EventGallery';
import EventHighlights from './EventHighlights';
import ReviewsCarousel from './ReviewsCarousel';
import ButtonArrow from './ButtonArrow';
import { formatEventDate } from '../lib/eventDate';
import {
  buildWhatsAppHref,
  eventHighlightRows,
  eventQuestionWhatsAppMessage,
  eventReserveWhatsAppMessage,
  eventStateLabel,
  eventTypeLabel,
  formatEventLocation,
  splitEventDescription,
} from '../lib/eventDisplay';
import { EVENTS_PUBLIC_PATH } from '../lib/eventSlug';
import styles from './UpcomingEventDetail.module.css';

function benefitNumber(index) {
  return String(index + 1).padStart(2, '0');
}

function AskQuestionButton({ questionHref, className = '' }) {
  if (!questionHref) return null;

  return (
    <div className={`${styles.heroActions} ${className}`.trim()}>
      <a
        href={questionHref}
        className={styles.btnGhost}
        target="_blank"
        rel="noreferrer"
        aria-label="Ask a question on WhatsApp"
      >
        <Image src="/whatsapp2.svg" alt="" width={18} height={18} className={styles.waIconGhost} />
        Ask a Question
      </a>
    </div>
  );
}

function FinalCtaActions({ contactLabel, reserveHref, className = '' }) {
  return (
    <div className={`${styles.finalCtaActions} ${className}`.trim()}>
      <Link href="/contact" className={styles.btnPrimary} aria-label={contactLabel}>
        <Image src="/phone.svg" alt="" width={18} height={18} />
        {contactLabel}
      </Link>
      {reserveHref ? (
        <a
          href={reserveHref}
          className={styles.btnGhost}
          target="_blank"
          rel="noreferrer"
          aria-label="Reserve your spot on WhatsApp"
        >
          <Image src="/whatsapp2.svg" alt="" width={18} height={18} className={styles.waIconGhost} />
          Reserve Your Spot
        </a>
      ) : null}
    </div>
  );
}

export default function UpcomingEventDetail({
  event,
  firstName = '',
  contactPhone = '',
  aboutParagraphs = [],
  benefits = [],
  highlightRows = [],
  eventReviews = [],
  reviewsLoading = false,
  imageX = 50,
  imageY = 50,
}) {
  const eventName = String(event?.name || '').trim();
  const shortDescription = String(event?.shortDescription || '').trim();
  const dateLabel = formatEventDate(event?.date);
  const locationLabel = formatEventLocation(event?.location);
  const typeLabel = eventTypeLabel(event?.type);
  const stateLabel = eventStateLabel(event?.state);

  const contactLabel = firstName ? `Contact ${firstName}` : 'Get in touch';

  const reserveMessage = eventReserveWhatsAppMessage({
    firstName,
    eventName,
    eventType: event?.type,
    formattedDate: dateLabel,
  });
  const questionMessage = eventQuestionWhatsAppMessage({
    firstName,
    eventName,
    eventType: event?.type,
  });
  const reserveHref = buildWhatsAppHref(contactPhone, reserveMessage);
  const questionHref = buildWhatsAppHref(contactPhone, questionMessage);

  const detailItems = [
    dateLabel ? { key: 'date', label: 'Date', value: dateLabel, dateTime: String(event?.date || '') } : null,
    locationLabel ? { key: 'location', label: 'Location', value: locationLabel } : null,
    typeLabel ? { key: 'type', label: 'Type', value: typeLabel } : null,
    stateLabel ? { key: 'state', label: 'Status', value: stateLabel } : null,
  ].filter(Boolean);

  const galleryPhotos = Array.isArray(event?.galleryPhotos) ? event.galleryPhotos : [];
  const galleryVideos = Array.isArray(event?.galleryVideos) ? event.galleryVideos : [];
  const hasGallery =
    galleryPhotos.some((item) => String(item || '').trim()) ||
    galleryVideos.some((item) => String(item?.key || '').trim());

  const showTestimonials =
    Number.isFinite(Number(event?.testimonialsNumber)) &&
    Number(event.testimonialsNumber) > 0 &&
    (reviewsLoading || eventReviews.length > 0);

  return (
    <>
      <section className={styles.hero} aria-label={eventName || 'Event'}>
        <div className={styles.heroShell}>
          <div className={`${styles.heroInner} ${event?.image ? '' : styles.heroInnerSolo}`}>
            <div className={styles.heroCopy}>
              <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                <ol>
                  <li>
                    <Link href={EVENTS_PUBLIC_PATH}>Events & Workshops</Link>
                  </li>
                  <li aria-current="page">{eventName}</li>
                </ol>
              </nav>

              <div className={styles.badges}>
                <span className={styles.badgeType}>{typeLabel}</span>
                {stateLabel ? <span className={styles.badgeState}>{stateLabel}</span> : null}
              </div>

              <h1 className={styles.heroTitle}>{eventName}</h1>

              {shortDescription ? <p className={styles.heroLead}>{shortDescription}</p> : null}

              <AskQuestionButton questionHref={questionHref} />
            </div>

            {event?.image ? (
              <div className={styles.heroImageWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.image}
                  alt={eventName || 'Event'}
                  style={{ objectPosition: `${imageX}% ${imageY}%` }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {detailItems.length ? (
        <section className={styles.section} aria-labelledby="event-details-title">
          <div className={styles.sectionShell}>
            <header className={styles.sectionHeadLeft}>
              <p className={styles.eyebrow}>Event details</p>
              <h2 id="event-details-title" className={styles.sectionTitleLeft}>
                Event Details
              </h2>
            </header>
            <dl className={styles.detailsGrid}>
              {detailItems.map((item) => (
                <div key={item.key} className={styles.detailBlock}>
                  <dt className={styles.detailLabel}>{item.label}</dt>
                  <dd className={styles.detailValue}>
                    {item.key === 'date' && item.dateTime ? (
                      <time dateTime={item.dateTime}>{item.value}</time>
                    ) : (
                      item.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      ) : null}

      {aboutParagraphs.length ? (
        <section className={styles.section} aria-labelledby="event-about-title">
          <div className={styles.sectionShell}>
            <header className={styles.sectionHeadLeft}>
              <p className={styles.eyebrow}>About</p>
              <h2 id="event-about-title" className={styles.sectionTitleLeft}>
                About This {typeLabel}
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
        <section className={styles.section} aria-labelledby="event-benefits-title">
          <div className={styles.sectionShell}>
            <header className={styles.sectionHeadLeft}>
              <p className={styles.eyebrow}>Experience</p>
              <h2 id="event-benefits-title" className={styles.sectionTitleLeft}>
                What You&apos;ll Experience
              </h2>
              <p className={styles.sectionLead}>
                Practical outcomes designed to support your growth, confidence, and progress.
              </p>
            </header>
            <ol className={styles.benefitsGrid}>
              {benefits.map((benefit, index) => (
                <li
                  key={`${benefit}-${index}`}
                  className={styles.benefitCard}
                  style={{ '--reveal-delay': `${Math.min(index, 8) * 50}ms` }}
                >
                  <span className={styles.benefitNumber} aria-hidden="true">
                    {benefitNumber(index)}
                  </span>
                  <p className={styles.benefitText}>{benefit}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {highlightRows.length ? (
        <section className={styles.section} aria-labelledby="highlights-title">
          <div className={styles.sectionShell}>
            <header className={styles.sectionHeadLeft}>
              <p className={styles.eyebrow}>Highlights</p>
              <h2 id="highlights-title" className={styles.sectionTitleLeft}>
                Highlights
              </h2>
            </header>
            <EventHighlights rows={highlightRows} />
          </div>
        </section>
      ) : null}

      {hasGallery ? (
        <section className={styles.section}>
          <div className={styles.sectionShell}>
            <EventGallery photos={galleryPhotos} videos={galleryVideos} eventName={eventName} />
          </div>
        </section>
      ) : null}

      {showTestimonials ? (
        reviewsLoading ? (
          <section className={styles.section} aria-hidden="true">
            <div className={styles.sectionShell}>
              <div className={styles.reviewSkeleton} />
            </div>
          </section>
        ) : eventReviews.length ? (
          <section className={styles.section} aria-labelledby="event-reviews-title">
            <div className={styles.sectionShell}>
              <header className={styles.sectionHeadLeft}>
                <p className={styles.eyebrow}>Social proof</p>
                <h2 id="event-reviews-title" className={styles.sectionTitleLeft}>
                  What Others Say
                </h2>
              </header>
              <div className={styles.reviewsWrap}>
                <ReviewsCarousel testimonials={eventReviews} />
              </div>
              <Link href="/reviews" className={styles.viewAll}>
                View All Reviews
                <ButtonArrow className={styles.viewAllArrow} />
              </Link>
            </div>
          </section>
        ) : null
      ) : null}

      <section className={styles.finalCta} aria-label="Join this event">
        <div className={styles.finalCtaInner}>
          <h2 className={styles.finalCtaTitle}>Ready to join?</h2>
          {eventName ? (
            <p className={styles.finalCtaLead}>Interested in joining {eventName}?</p>
          ) : null}
          <p className={styles.finalCtaSub}>
            Send us a message on WhatsApp to reserve your spot or ask any questions.
          </p>
          <FinalCtaActions contactLabel={contactLabel} reserveHref={reserveHref} />
        </div>
      </section>
    </>
  );
}
