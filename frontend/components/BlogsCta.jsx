import Image from 'next/image';
import Link from 'next/link';
import styles from '../styles/BlogsCta.module.css';

export default function BlogsCta() {
  return (
    <section className={styles.cta} aria-label="Want to connect">
      <div className={styles.ctaInner}>
        <h2 className={styles.ctaTitle}>Want to connect?</h2>
        <p className={styles.ctaLead}>
          Have a question, want to know more about Sherine&apos;s work, or interested in working
          together? Get in touch.
        </p>
        <div className={styles.ctaActions}>
          <Link href="/contact" className={styles.btnPrimary} aria-label="Contact Us">
            <Image src="/phone.svg" alt="" width={18} height={18} />
            Contact Us
          </Link>
          <Link href="/services" className={styles.btnGhost} aria-label="Explore Services">
            <Image src="/services.svg" alt="" width={18} height={18} />
            Explore Services
          </Link>
        </div>
      </div>
    </section>
  );
}
