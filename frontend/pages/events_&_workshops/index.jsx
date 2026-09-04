import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import EventCard from '../../components/EventCard';
import EventsCta from '../../components/EventsCta';
import PublicContentLoader from '../../components/PublicContentLoader';
import PublicSelect from '../../components/PublicSelect';
import { usePublicEvents } from '../../lib/api/publicEvents';
import { filterPublicEvents, sortFilteredEvents } from '../../lib/eventDisplay';
import styles from '../../styles/publicEvents.module.css';

const TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'event', label: 'Events' },
  { value: 'workshop', label: 'Workshops' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'previous', label: 'Previous' },
];

export default function PublicEventsPage() {
  const router = useRouter();
  const { data: events = [], isLoading } = usePublicEvents();
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!router.isReady) return;
    const status = String(router.query.status || '').trim().toLowerCase();
    if (status === 'upcoming' || status === 'previous' || status === 'all') {
      setStatusFilter(status);
    }
  }, [router.isReady, router.query.status]);

  const filteredEvents = useMemo(() => {
    const filtered = filterPublicEvents(events, { type: typeFilter, status: statusFilter });
    return sortFilteredEvents(filtered);
  }, [events, typeFilter, statusFilter]);

  const hasAnyEvents = events.length > 0;
  const hasFilteredResults = filteredEvents.length > 0;
  const filtersActive = typeFilter !== 'all' || statusFilter !== 'all';
  const showFilters =
    events.length > 1 && (filteredEvents.length !== 1 || filtersActive);
  const filtersClass =
    filteredEvents.length === 2 ? styles.filtersTwo : styles.filtersThree;

  let emptyFilterTitle = 'No events or workshops found.';
  if (typeFilter === 'event' && statusFilter === 'all') {
    emptyFilterTitle = 'No events found.';
  } else if (typeFilter === 'workshop' && statusFilter === 'all') {
    emptyFilterTitle = 'No workshops found.';
  } else if (typeFilter === 'event' && statusFilter === 'upcoming') {
    emptyFilterTitle = 'No upcoming events found.';
  } else if (typeFilter === 'event' && statusFilter === 'previous') {
    emptyFilterTitle = 'No previous events found.';
  } else if (typeFilter === 'workshop' && statusFilter === 'upcoming') {
    emptyFilterTitle = 'No upcoming workshops found.';
  } else if (typeFilter === 'workshop' && statusFilter === 'previous') {
    emptyFilterTitle = 'No previous workshops found.';
  } else if (typeFilter === 'all' && statusFilter === 'upcoming') {
    emptyFilterTitle = 'No upcoming events or workshops found.';
  } else if (typeFilter === 'all' && statusFilter === 'previous') {
    emptyFilterTitle = 'No previous events or workshops found.';
  }

  const emptyFilterText = 'Try adjusting your filters.';

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>Events & Workshops</p>
          <h1 className={styles.title}>Learn, Grow & Connect</h1>
          <p className={styles.lead}>
            Discover upcoming opportunities to learn and grow, and explore moments from previous
            events and workshops.
          </p>
        </header>

        {isLoading ? (
          <PublicContentLoader label="Loading events and workshops" />
        ) : hasAnyEvents ? (
          <div className={`${styles.listingBlock} ${styles.listingFull}`}>
            {showFilters ? (
              <div className={`${styles.filters} ${filtersClass}`}>
                <PublicSelect
                  id="events-type-filter"
                  label="Type"
                  value={typeFilter}
                  options={TYPE_OPTIONS}
                  onChange={setTypeFilter}
                />
                <PublicSelect
                  id="events-status-filter"
                  label="Status"
                  value={statusFilter}
                  options={STATUS_OPTIONS}
                  onChange={setStatusFilter}
                />
              </div>
            ) : null}

            {hasFilteredResults ? (
              <div key={`${typeFilter}-${statusFilter}`} className={styles.grid}>
                {filteredEvents.map((event, index) => (
                  <EventCard
                    key={event.id || event.slug}
                    event={event}
                    revealDelay={Math.min(index, 8) * 70}
                  />
                ))}
              </div>
            ) : (
              <div className={`${styles.empty} ${styles.emptyCentered}`}>
                <span className={styles.emptyLine} aria-hidden="true" />
                <p className={styles.emptyTitle}>{emptyFilterTitle}</p>
                <p className={styles.emptyText}>{emptyFilterText}</p>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyLine} aria-hidden="true" />
            <p className={styles.emptyTitle}>Coming soon</p>
            <p className={styles.emptyText}>New events and workshops are being prepared.</p>
          </div>
        )}
      </div>

      <EventsCta variant="listing" />
    </main>
  );
}
