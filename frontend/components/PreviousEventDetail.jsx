import Link from 'next/link';
import EventGallery from './EventGallery';
import EventHighlights from './EventHighlights';
import PreviousEventCta from './PreviousEventCta';
import ReviewsCarousel from './ReviewsCarousel';
import { formatEventDate } from '../lib/eventDate';
import { eventStateLabel, eventTypeLabel, formatEventLocation } from '../lib/eventDisplay';
import { EVENTS_PUBLIC_PATH } from '../lib/eventSlug';
import styles from './PreviousEventDetail.module.css';

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

export default function PreviousEventDetail({
  event,
  firstName = '',
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
    Number(event?.testimonialsNumber) > 0 &&
    (reviewsLoading || eventReviews.length > 0);

  return (
    <>
      <section className={styles.hero} aria-label={eventName || 'Event recap'}>
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
        <section className={styles.section} aria-labelledby="past-event-details-title">
          <div className={styles.sectionShell}>
            <header className={styles.sectionHeadLeft}>
              <p className={styles.eyebrow}>Event details</p>
              <h2 id="past-event-details-title" className={styles.sectionTitleLeft}>
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
        <section className={styles.section} aria-labelledby="past-event-about-title">
          <div className={styles.sectionShell}>
            <header className={styles.sectionHeadLeft}>
              <p className={styles.eyebrow}>About</p>
              <h2 id="past-event-about-title" className={styles.sectionTitleLeft}>
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

      {highlightRows.length ? (
        <section className={styles.section} aria-labelledby="past-highlights-title">
          <div className={styles.sectionShell}>
            <header className={styles.sectionHeadCenter}>
              <p className={styles.eyebrow}>Highlights</p>
              <h2 id="past-highlights-title" className={styles.sectionTitleCenter}>
                Event Highlights
              </h2>
              <p className={styles.sectionLeadCenter}>A look at the impact of the experience.</p>
            </header>
            <div className={styles.centeredBlockWide}>
              <EventHighlights rows={highlightRows} />
            </div>
          </div>
        </section>
      ) : null}

      {benefits.length ? (
        <section className={styles.section} aria-labelledby="past-benefits-title">
          <div className={styles.sectionShell}>
            <header className={styles.sectionHeadLeft}>
              <p className={styles.eyebrow}>Experience</p>
              <h2 id="past-benefits-title" className={styles.sectionTitleLeft}>
                What Participants Experienced
              </h2>
              <p className={styles.sectionLead}>Key takeaways from the experience.</p>
            </header>
            <ul className={styles.benefitsList}>
              {benefits.map((benefit, index) => (
                <li key={`${benefit}-${index}`} className={styles.benefitItem}>
                  <CheckIcon />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {hasGallery ? (
        <section className={styles.section} aria-labelledby="past-event-gallery-title">
          <div className={styles.sectionShell}>
            <header className={`${styles.sectionHeadCenter} ${styles.galleryHead}`}>
              <p className={styles.eyebrow}>Gallery</p>
              <h2 id="past-event-gallery-title" className={styles.sectionTitleCenter}>
                Event Gallery
              </h2>
              <p className={styles.sectionLeadCenter}>Moments from the experience.</p>
            </header>
            <EventGallery
              photos={galleryPhotos}
              videos={galleryVideos}
              eventName={eventName}
              hideHeader
              centerContent
            />
          </div>
        </section>
      ) : null}

      {showTestimonials ? (
        reviewsLoading ? (
          <section className={styles.section} aria-hidden="true">
            <div className={styles.sectionShell}>
              <div className={styles.reviewSkeletonWrap}>
                <div className={styles.reviewSkeleton} />
              </div>
            </div>
          </section>
        ) : eventReviews.length ? (
          <section className={styles.section} aria-labelledby="past-reviews-title">
            <div className={styles.sectionShell}>
              <header className={styles.sectionHeadCenter}>
                <p className={styles.eyebrow}>Social proof</p>
                <h2 id="past-reviews-title" className={styles.sectionTitleCenter}>
                  What Participants Say
                </h2>
              </header>
              <div className={styles.reviewsWrap}>
                <ReviewsCarousel testimonials={eventReviews} />
              </div>
            </div>
          </section>
        ) : null
      ) : null}

      <PreviousEventCta firstName={firstName} />
    </>
  );
}
