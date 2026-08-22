import { useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import PreviousEventDetail from '../../components/PreviousEventDetail';
import UpcomingEventDetail from '../../components/UpcomingEventDetail';
import ButtonArrow from '../../components/ButtonArrow';
import PublicContentLoader from '../../components/PublicContentLoader';
import { usePersonalInfo } from '../../lib/api/personalInfo';
import { usePublicEvent } from '../../lib/api/publicEvents';
import { selectServiceReviews, usePublicTestimonials } from '../../lib/api/publicTestimonials';
import { formatEventDate } from '../../lib/eventDate';
import {
  eventHighlightRows,
  formatEventLocation,
  splitEventDescription,
  storeEventPreloaderName,
} from '../../lib/eventDisplay';
import { EVENTS_PUBLIC_PATH } from '../../lib/eventSlug';
import { firstNameFromFullName } from '../../lib/publicSite';
import styles from '../../styles/eventDetail.module.css';

export default function PublicEventDetailPage() {
  const router = useRouter();
  const slug = Array.isArray(router.query.slug) ? router.query.slug[0] : router.query.slug;
  const { data: event, isLoading, isError } = usePublicEvent(slug);
  const { data: personalInfo } = usePersonalInfo();
  const { data: publicTestimonials = [], isLoading: reviewsLoading } = usePublicTestimonials();

  const firstName = firstNameFromFullName(personalInfo?.name);
  const isPrevious = event?.state === 'Previous';
  const isUpcoming = !isPrevious;

  useEffect(() => {
    if (event?.type) storeEventPreloaderName(event.type);
  }, [event?.type]);

  const benefits = useMemo(
    () =>
      (Array.isArray(event?.benefits)
        ? event.benefits.map((item) => String(item || '').trim()).filter(Boolean)
        : []),
    [event?.benefits]
  );

  const upcomingAboutParagraphs = useMemo(
    () => splitEventDescription(event?.longDescription),
    [event?.longDescription]
  );

  const previousAboutParagraphs = useMemo(
    () => splitEventDescription(event?.longDescription),
    [event?.longDescription]
  );

  const highlightRows = useMemo(() => eventHighlightRows(event?.highlights), [event?.highlights]);

  const reviewIdsKey = useMemo(
    () => (Array.isArray(publicTestimonials) ? publicTestimonials.map((item) => item.id).join('|') : ''),
    [publicTestimonials]
  );

  const shouldLoadReviews =
    Number.isFinite(Number(event?.testimonialsNumber)) && Number(event?.testimonialsNumber) > 0;

  const eventReviews = useMemo(
    () =>
      shouldLoadReviews
        ? selectServiceReviews(publicTestimonials, {
            category: event?.category,
            limit: event?.testimonialsNumber,
          })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reviewIdsKey, event?.category, event?.testimonialsNumber, shouldLoadReviews]
  );

  const imageX = Number.isFinite(Number(event?.imagePosX)) ? Number(event.imagePosX) : 50;
  const imageY = Number.isFinite(Number(event?.imagePosY)) ? Number(event.imagePosY) : 50;
  const eventName = String(event?.name || '').trim();
  const shortDescription = String(event?.shortDescription || '').trim();
  const pageTitle = eventName
    ? firstName
      ? `${eventName} | ${firstName}`
      : eventName
    : 'Events & Workshops';

  if (isLoading || !router.isReady) {
    return (
      <main className={styles.page}>
        <PublicContentLoader label="Loading event" />
      </main>
    );
  }

  if (isError || !event) {
    return (
      <main className={styles.page}>
        <div className={styles.missing}>
          <p className={styles.missingTitle}>This event could not be found.</p>
          <Link href={EVENTS_PUBLIC_PATH} className={styles.viewAll}>
            View all events & workshops
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
        {event.image ? <meta property="og:image" content={event.image} /> : null}
      </Head>

      {isUpcoming ? (
        <UpcomingEventDetail
          event={event}
          firstName={firstName}
          contactPhone={personalInfo?.contact_phone || ''}
          aboutParagraphs={upcomingAboutParagraphs}
          benefits={benefits}
          highlightRows={highlightRows}
          eventReviews={eventReviews}
          reviewsLoading={reviewsLoading}
          imageX={imageX}
          imageY={imageY}
        />
      ) : (
        <PreviousEventDetail
          event={event}
          firstName={firstName}
          aboutParagraphs={previousAboutParagraphs}
          benefits={benefits}
          highlightRows={highlightRows}
          eventReviews={eventReviews}
          reviewsLoading={reviewsLoading}
          imageX={imageX}
          imageY={imageY}
        />
      )}
    </main>
  );
}
