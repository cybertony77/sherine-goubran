import Link from 'next/link';
import ButtonArrow from './ButtonArrow';
import { formatBlogDate, formatBlogDisplayName, blogDateIso } from '../lib/blogDisplay';
import styles from './BlogCard.module.css';

function cardDescription(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export default function BlogCard({ blog, revealDelay = 0 }) {
  const slug = String(blog?.slug || '').trim();
  const href = slug ? `/blogs/${encodeURIComponent(slug)}` : '/blogs';
  const x = Number.isFinite(Number(blog?.imagePosX)) ? Number(blog.imagePosX) : 50;
  const y = Number.isFinite(Number(blog?.imagePosY)) ? Number(blog.imagePosY) : 50;
  const name = formatBlogDisplayName(blog?.name);
  const description = cardDescription(blog?.shortDescription);
  const dateLabel = formatBlogDate(blog?.createdAt);
  const dateIso = blogDateIso(blog?.createdAt);

  return (
    <article
      className={styles.card}
      style={{ '--reveal-delay': `${revealDelay}ms` }}
    >
      <Link href={href} className={styles.cardLink} aria-label={`Read more about ${name}`}>
        <div className={styles.imageWrap}>
          {blog?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={blog.image}
              alt={name}
              loading="lazy"
              style={{ objectPosition: `${x}% ${y}%` }}
            />
          ) : (
            <div className={styles.imageFallback} aria-hidden="true" />
          )}
        </div>
        <div className={styles.body}>
          <h3 className={styles.name}>{name}</h3>
          {dateLabel ? (
            <p className={styles.date}>
              <time dateTime={dateIso}>{dateLabel}</time>
            </p>
          ) : null}
          <div className={styles.descWrap}>
            <p className={styles.desc}>{description}</p>
            <div className={styles.fade} aria-hidden="true" />
          </div>
          <span className={styles.cta}>
            Read More
            <ButtonArrow className={styles.ctaArrow} />
          </span>
        </div>
      </Link>
    </article>
  );
}
