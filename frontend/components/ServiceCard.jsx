import Link from 'next/link';
import ButtonArrow from './ButtonArrow';
import styles from './ServiceCard.module.css';

export default function ServiceCard({ service }) {
  const slug = String(service?.slug || '').trim();
  const href = slug ? `/services/${encodeURIComponent(slug)}` : '/services';
  const x = Number.isFinite(Number(service?.imagePosX)) ? Number(service.imagePosX) : 50;
  const y = Number.isFinite(Number(service?.imagePosY)) ? Number(service.imagePosY) : 50;
  const name = String(service?.name || 'Service').trim() || 'Service';

  return (
    <article className={styles.card}>
      <Link href={href} className={styles.cardLink} aria-label={`Learn more about ${name}`}>
        <div className={styles.imageWrap}>
          {service?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={service.image}
              alt={name}
              style={{ objectPosition: `${x}% ${y}%` }}
            />
          ) : (
            <div className={styles.imageFallback} />
          )}
        </div>
        <div className={styles.body}>
          <h3 className={styles.name}>{name}</h3>
          <div className={styles.descWrap}>
            <p className={styles.desc}>{service?.shortDescription || ''}</p>
            <div className={styles.fade} aria-hidden="true" />
          </div>
          <span className={styles.learnMore}>
            Learn more
            <ButtonArrow className={styles.learnMoreArrow} />
          </span>
        </div>
      </Link>
    </article>
  );
}
