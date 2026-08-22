import { useRouter } from 'next/router';
import BlogArticleNav from '../../components/BlogArticleNav';
import BlogsCta from '../../components/BlogsCta';
import PublicContentLoader from '../../components/PublicContentLoader';
import {
  blogDateIso,
  formatBlogDate,
  formatBlogDisplayName,
  splitBlogParagraphs,
} from '../../lib/blogDisplay';
import { usePublicBlog, usePublicBlogs } from '../../lib/api/publicBlogs';
import styles from '../../styles/publicBlogs.module.css';

export default function PublicBlogDetailPage() {
  const router = useRouter();
  const slug = Array.isArray(router.query.slug) ? router.query.slug[0] : router.query.slug;
  const { data: blog, isLoading, isError } = usePublicBlog(slug);
  const { data: blogs = [] } = usePublicBlogs();

  if (isLoading || !router.isReady) {
    return (
      <main className={styles.page}>
        <PublicContentLoader label="Loading blog" />
      </main>
    );
  }

  if (isError || !blog) {
    return (
      <main className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.empty}>
            <span className={styles.emptyLine} aria-hidden="true" />
            <p className={styles.emptyTitle}>Not found</p>
            <p className={styles.emptyText}>This blog could not be found.</p>
          </div>
          <BlogArticleNav blogs={blogs} currentSlug="" />
        </div>
      </main>
    );
  }

  const x = Number.isFinite(Number(blog.imagePosX)) ? Number(blog.imagePosX) : 50;
  const y = Number.isFinite(Number(blog.imagePosY)) ? Number(blog.imagePosY) : 50;
  const title = formatBlogDisplayName(blog.name);
  const dateLabel = formatBlogDate(blog.createdAt);
  const dateIso = blogDateIso(blog.createdAt);
  const paragraphs = splitBlogParagraphs(blog.longDescription || blog.shortDescription);

  return (
    <main className={styles.page}>
      <article className={styles.detail}>
        <header className={styles.detailHead}>
          <p className={styles.eyebrow}>Insights & Stories</p>
          <h1 className={styles.detailTitle}>{title}</h1>
          {dateLabel ? (
            <p className={styles.detailDate}>
              <time dateTime={dateIso}>{dateLabel}</time>
            </p>
          ) : null}
        </header>

        {blog.image ? (
          <div className={styles.hero}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={blog.image}
              alt={title}
              style={{ objectPosition: `${x}% ${y}%` }}
            />
          </div>
        ) : null}

        {paragraphs.length ? (
          <div className={styles.article}>
            {paragraphs.map((paragraph, index) => (
              <p key={`${index}-${paragraph.slice(0, 24)}`} className={styles.paragraph}>
                {paragraph}
              </p>
            ))}
          </div>
        ) : null}
      </article>

      <BlogArticleNav blogs={blogs} currentSlug={blog.slug} />

      <BlogsCta variant="detail" />
    </main>
  );
}
