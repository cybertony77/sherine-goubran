import Image from 'next/image';
import Link from 'next/link';
import ServiceCard from '../../components/ServiceCard';
import PublicContentLoader from '../../components/PublicContentLoader';
import { usePersonalInfo } from '../../lib/api/personalInfo';
import { usePublicServices } from '../../lib/api/publicServices';
import { formatPhoneForDB } from '../../lib/phoneUtils';
import { firstNameFromFullName } from '../../lib/publicSite';
import styles from './publicServices.module.css';

export default function PublicServicesPage() {
  const { data: services = [], isLoading } = usePublicServices();
  const { data: personalInfo } = usePersonalInfo();
  const firstName = firstNameFromFullName(personalInfo?.name);
  const contactLabel = firstName ? `Contact ${firstName}` : 'Get in touch';
  const waDigits = formatPhoneForDB(personalInfo?.contact_phone || '');
  const waHref = waDigits.length > 2
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent('I am asking about the services')}`
    : '';

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>What I offer</p>
          <h1 className={styles.title}>Services</h1>
          {!isLoading && services.length ? (
            <p className={styles.lead}>
              Helping You Grow, Transform, and Move Forward
            </p>
          ) : null}
        </header>
        {isLoading ? (
          <PublicContentLoader label="Loading services" />
        ) : services.length ? (
          <div className={styles.grid}>
            {services.map((service) => (
              <ServiceCard key={service.id || service.slug} service={service} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyLine} aria-hidden="true" />
            <p className={styles.emptyTitle}>Coming soon</p>
            <p className={styles.emptyText}>
              New offerings are being prepared.
            </p>
          </div>
        )}
      </div>

      <section className={styles.cta} aria-label="Take the next step">
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Ready to take the next step?</h2>
          <p className={styles.ctaLead}>
            Find the right support for where you are
            <br />
            and where you want to go.
          </p>
          <div className={styles.ctaActions}>
            <Link href="/contact" className={styles.btnPrimary} aria-label={contactLabel}>
              <Image src="/phone.svg" alt="" width={18} height={18} />
              {contactLabel}
            </Link>
            {waHref ? (
              <a
                href={waHref}
                className={styles.btnGhost}
                target="_blank"
                rel="noreferrer"
                aria-label="Ask a Question on WhatsApp"
              >
                <Image src="/whatsapp2.svg" alt="" width={18} height={18} className={styles.waIcon} />
                Ask a Question
              </a>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
