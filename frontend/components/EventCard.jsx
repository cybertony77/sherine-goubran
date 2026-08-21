import Link from 'next/link';
import ButtonArrow from './ButtonArrow';
import { formatEventDate } from '../lib/eventDate';
import { storeEventPreloaderName } from '../lib/eventDisplay';
import { EVENTS_PUBLIC_PATH } from '../lib/eventSlug';
import styles from './EventCard.module.css';

export default function EventCard({ event, revealDelay = 0 }) {
  const slug = String(event?.slug || '').trim();
  const href = slug ? `${EVENTS_PUBLIC_PATH}/${encodeURIComponent(slug)}` : EVENTS_PUBLIC_PATH;
  const x = Number.isFinite(Number(event?.imagePosX)) ? Number(event.imagePosX) : 50;
  const y = Number.isFinite(Number(event?.imagePosY)) ? Number(event.imagePosY) : 50;
  const name = String(event?.name || 'Event').trim() || 'Event';
  const typeLabel = event?.type === 'Workshop' ? 'Workshop' : 'Event';
  const stateLabel = event?.state === 'Previous' ? 'Previous' : 'Upcoming';
  const dateLabel = formatEventDate(event?.date);
  const location = String(event?.location || '').trim();

  return (
    <article className={styles.card} style={{ '--reveal-delay': `${revealDelay}ms` }}>
      <Link
        href={href}
        className={styles.cardLink}
        aria-label={`View details for ${name}`}
        onClick={() => storeEventPreloaderName(event?.type)}
      >
        <div className={styles.imageWrap}>
          {event?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.image}
              alt={name}
              style={{ objectPosition: `${x}% ${y}%` }}
            />
          ) : (
            <div className={styles.imageFallback} />
          )}
        </div>
        <div className={styles.body}>
          <div className={styles.badges}>
            <span className={styles.badgeType}>{typeLabel}</span>
            <span className={styles.badgeState}>{stateLabel}</span>
          </div>
          <h3 className={styles.name}>{name}</h3>
          <p className={styles.meta}>
            {dateLabel ? <time dateTime={String(event?.date || '')}>{dateLabel}</time> : null}
            {dateLabel && location ? <span aria-hidden="true"> · </span> : null}
            {location ? <span>{location}</span> : null}
          </p>
          <div className={styles.descWrap}>
            <p className={styles.desc}>{event?.shortDescription || ''}</p>
            <div className={styles.fade} aria-hidden="true" />
          </div>
          <span className={styles.cta}>
            View Details
            <ButtonArrow className={styles.ctaArrow} />
          </span>
        </div>
      </Link>
    </article>
  );
}
