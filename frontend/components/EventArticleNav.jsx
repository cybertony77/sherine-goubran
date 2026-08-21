import Link from 'next/link';
import { eventTypeLabel } from '../lib/eventDisplay';
import { EVENTS_PUBLIC_PATH } from '../lib/eventSlug';
import styles from './EventArticleNav.module.css';

function eventHref(slug) {
  const value = String(slug || '').trim();
  return value ? `${EVENTS_PUBLIC_PATH}/${encodeURIComponent(value)}` : EVENTS_PUBLIC_PATH;
}

function navTypeLabel(type) {
  return eventTypeLabel(type);
}

export default function EventArticleNav({ previous = null, next = null }) {
  return (
    <nav className={styles.nav} aria-label="Event navigation">
      <div className={styles.inner}>
        <div className={styles.side}>
          {previous ? (
            <Link
              href={eventHref(previous.slug)}
              className={`${styles.link} ${styles.linkPrev}`}
              aria-label={`Previous ${navTypeLabel(previous.type).toLowerCase()}: ${previous.name}`}
            >
              <span className={styles.arrow} aria-hidden="true">
                ←
              </span>
              <span className={styles.label}>Previous {navTypeLabel(previous.type)}</span>
            </Link>
          ) : (
            <span className={styles.placeholder} aria-hidden="true" />
          )}
        </div>

        <Link href={EVENTS_PUBLIC_PATH} className={styles.center} aria-label="View all events and workshops">
          All Events & Workshops
        </Link>

        <div className={`${styles.side} ${styles.sideRight}`}>
          {next ? (
            <Link
              href={eventHref(next.slug)}
              className={`${styles.link} ${styles.linkNext}`}
              aria-label={`Next ${navTypeLabel(next.type).toLowerCase()}: ${next.name}`}
            >
              <span className={styles.label}>Next {navTypeLabel(next.type)}</span>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
            </Link>
          ) : (
            <span className={styles.placeholder} aria-hidden="true" />
          )}
        </div>
      </div>
    </nav>
  );
}
