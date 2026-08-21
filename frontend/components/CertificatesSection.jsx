import CertificatesMarquee from './CertificatesMarquee';
import { usePublicCertificates } from '../lib/api/publicCertificates';
import styles from './CertificatesSection.module.css';

export default function CertificatesSection({
  eyebrow = 'Credentials',
  title = 'Certificates',
}) {
  const { data: publicCertificates = [], isLoading } = usePublicCertificates();

  if (!isLoading && !publicCertificates.length) return null;

  return (
    <section className={styles.certs} data-certs-section="true" aria-label={title}>
      <div className={styles.certsInner}>
        <header className={styles.certsHead}>
          <p className={styles.certsEyebrow}>{eyebrow}</p>
          <h2 className={styles.certsTitle}>{title}</h2>
        </header>
        {isLoading ? (
          <div className={styles.certsSkeleton} aria-hidden="true" />
        ) : (
          <CertificatesMarquee items={publicCertificates} />
        )}
      </div>
    </section>
  );
}
