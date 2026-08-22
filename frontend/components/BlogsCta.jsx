import Image from 'next/image';
import Link from 'next/link';
import { usePersonalInfo } from '../lib/api/personalInfo';
import { firstNameFromFullName } from '../lib/publicSite';
import styles from '../styles/BlogsCta.module.css';

export default function BlogsCta({ variant = 'listing' }) {
  const { data: personalInfo } = usePersonalInfo();
  const firstName = firstNameFromFullName(personalInfo?.name);
  const contactLabel = firstName ? `Contact ${firstName}` : 'Get in touch';

  const title =
    variant === 'detail' ? 'Ready to take the next step?' : 'Inspired to take the next step?';

  const lead =
    variant === 'detail'
      ? firstName
        ? `Whether you're looking for support, clarity, or a path forward, ${firstName} is here to help.`
        : "Whether you're looking for support, clarity, or a path forward, I'm here to help."
      : firstName
        ? `Whether you're looking for clarity, personal growth, or support in your next chapter, ${firstName} is here to help.`
        : "Whether you're looking for clarity, personal growth, or support in your next chapter, I'm here to help.";

  return (
    <section className={styles.cta} aria-label="Take the next step">
      <div className={styles.ctaInner}>
        <h2 className={styles.ctaTitle}>{title}</h2>
        <p className={styles.ctaLead}>{lead}</p>
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
  );
}
