import Image from 'next/image';
import Link from 'next/link';
import PublicContentLoader from '../../components/PublicContentLoader';
import ReviewsMarquee from '../../components/ReviewsMarquee';
import { usePersonalInfo } from '../../lib/api/personalInfo';
import { usePublicTestimonials } from '../../lib/api/publicTestimonials';
import { firstNameFromFullName } from '../../lib/publicSite';
import styles from './reviews.module.css';

export default function PublicReviewsPage() {
  const { data: testimonials = [], isLoading, isError } = usePublicTestimonials();
  const { data: personalInfo } = usePersonalInfo();

  const list = (Array.isArray(testimonials) ? testimonials : []).filter(
    (item) => String(item?.name || '').trim() && String(item?.text || '').trim()
  );
  const firstName = firstNameFromFullName(personalInfo?.name);
  const contactLabel = firstName ? `Contact ${firstName}` : 'Get in touch';
  const empty = !isLoading && (isError || !list.length);

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Reviews</p>
        <h1 className={styles.title}>What People Say</h1>
        {empty ? (
          <p className={styles.lead}>No reviews yet.</p>
        ) : (
          <p className={styles.lead}>
            {firstName
              ? `Real experiences from people who have worked with ${firstName}.`
              : 'Real experiences from people who have taken meaningful steps toward growth and positive change.'}
          </p>
        )}
      </header>

      {isLoading ? (
        <PublicContentLoader label="Loading reviews" />
      ) : list.length ? (
        <section className={styles.marquee} aria-label="Client reviews">
          <ReviewsMarquee testimonials={list} />
        </section>
      ) : null}

      <section className={styles.cta} aria-label="Take the next step">
        <div className={styles.ctaInner}>
          <p className={styles.ctaEyebrow}>Ready?</p>
          <h2 className={styles.ctaTitle}>Ready to take the next step?</h2>
          <p className={styles.ctaLead}>
            If you&apos;re ready to create meaningful change, let&apos;s talk about what you&apos;re looking for.
          </p>
          <div className={styles.ctaActions}>
            <Link href="/contact" className={styles.btnPrimary} aria-label={contactLabel}>
              <Image src="/phone.svg" alt="" width={18} height={18} />
              {contactLabel}
            </Link>
            <Link href="/services" className={styles.btnGhost} aria-label="Explore Services">
              <Image src="/services.svg" alt="" width={18} height={18} />
              Explore Services
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
