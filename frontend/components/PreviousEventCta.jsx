import Image from 'next/image';
import Link from 'next/link';
import { EVENTS_PUBLIC_PATH } from '../lib/eventSlug';
import styles from '../styles/PreviousEventCta.module.css';

export default function PreviousEventCta() {
  return (
    <section className={styles.cta} aria-label="Discover what's coming next">
      <div className={styles.ctaInner}>
        <h2 className={styles.ctaTitle}>Discover what&apos;s coming next</h2>
        <p className={styles.ctaLead}>
          Explore upcoming events and workshops, or contact us to learn more about joining or
          collaborating.
        </p>
        <div className={styles.ctaActions}>
          <Link href="/contact" className={styles.btnPrimary} aria-label="Contact Us">
            <Image src="/phone.svg" alt="" width={18} height={18} />
            Contact Us
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
