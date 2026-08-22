import Link from 'next/link';
import { adjacentBlogs, formatBlogDisplayName } from '../lib/blogDisplay';
import styles from '../styles/BlogArticleNav.module.css';

function blogHref(slug) {
  const value = String(slug || '').trim();
  return value ? `/blogs/${encodeURIComponent(value)}` : '/blogs';
}

export default function BlogArticleNav({ blogs = [], currentSlug = '' }) {
  const { previous, next } = adjacentBlogs(blogs, currentSlug);

  return (
    <nav className={styles.nav} aria-label="Article navigation">
      <div className={styles.inner}>
        <div className={styles.side}>
          {previous ? (
            <Link
              href={blogHref(previous.slug)}
              className={`${styles.link} ${styles.linkPrev}`}
              aria-label={`Previous blog: ${formatBlogDisplayName(previous.name)}`}
            >
              <span className={styles.arrow} aria-hidden="true">
                ←
              </span>
              <span className={styles.label}>Previous Blog</span>
            </Link>
          ) : (
            <span className={styles.placeholder} aria-hidden="true" />
          )}
        </div>

        <Link href="/blogs" className={styles.center} aria-label="View all blogs">
          All Blogs
        </Link>

        <div className={`${styles.side} ${styles.sideRight}`}>
          {next ? (
            <Link
              href={blogHref(next.slug)}
              className={`${styles.link} ${styles.linkNext}`}
              aria-label={`Next blog: ${formatBlogDisplayName(next.name)}`}
            >
              <span className={styles.label}>Next Blog</span>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
            </Link>
          ) : (
            <span className={styles.placeholder} aria-hidden="true" />
          )}
        </div>
      </div>
    </nav>
  );
}
