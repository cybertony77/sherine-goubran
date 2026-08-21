import Image from 'next/image';
import Link from 'next/link';
import { EVENTS_PUBLIC_PATH } from '../lib/eventSlug';
import styles from './PreviousEventCta.module.css';

export default function PreviousEventCta({ firstName = '' }) {
  const contactLabel = firstName ? `Contact ${firstName}` : 'Get in touch';

  return (
    <section className={styles.cta} aria-label="Explore future events">
      <div className={styles.ctaInner}>
        <h2 className={styles.ctaTitle}>Ready for what&apos;s next?</h2>
        <p className={styles.ctaLead}>
          Explore upcoming events and workshops, or get in touch if you&apos;d like to work together.
        </p>
        <div className={styles.ctaActions}>
          <Link href="/contact" className={styles.btnPrimary} aria-label={contactLabel}>
            <Image src="/phone.svg" alt="" width={18} height={18} />
            {contactLabel}
          </Link>
          <Link
            href={`${EVENTS_PUBLIC_PATH}?status=upcoming`}
            className={styles.btnGhost}
            aria-label="Explore upcoming events"
          >
            <Image src="/events.svg" alt="" width={18} height={18} />
            Explore Upcoming Events
          </Link>
        </div>
      </div>
    </section>
  );
}
