import { useRouter } from 'next/router';
import BlogArticleNav from '../../components/BlogArticleNav';
import BlogsCta from '../../components/BlogsCta';
import PublicContentLoader from '../../components/PublicContentLoader';
import SiteSeo from '../../components/SiteSeo';
import {
  blogDateIso,
  formatBlogDate,
  formatBlogDisplayName,
  splitBlogParagraphs,
} from '../../lib/blogDisplay';
import { usePublicBlog, usePublicBlogs } from '../../lib/api/publicBlogs';
import {
  absoluteMediaUrl,
  absoluteUrl,
  blogPostingJsonLd,
  breadcrumbJsonLd,
  getSiteName,
  truncateMeta,
} from '../../lib/seo';
import { fetchPublicBlogBySlug } from '../../lib/seoPublicData.server';
import styles from '../../styles/publicBlogs.module.css';

export default function PublicBlogDetailPage({ initialBlog = null }) {
  const router = useRouter();
  const slug = Array.isArray(router.query.slug) ? router.query.slug[0] : router.query.slug;
  const { data: blog, isLoading, isError } = usePublicBlog(slug, {
    initialData: initialBlog || undefined,
  });
  const { data: blogs = [] } = usePublicBlogs();
  const siteName = getSiteName();

  if ((isLoading && !initialBlog) || !router.isReady) {
    return (
      <main className={styles.page}>
        <SiteSeo title="Blogs" path="/blogs" />
        <PublicContentLoader label="Loading blog" />
      </main>
    );
  }

  if ((isError && !blog) || !blog) {
    return (
      <main className={styles.page}>
        <SiteSeo title="Blog not found" path={`/blogs/${encodeURIComponent(String(slug || ''))}`} noindex />
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
  const blogPath = `/blogs/${encodeURIComponent(String(blog.slug || slug || '').trim())}`;
  const seoDescription = truncateMeta(
    blog.shortDescription || paragraphs[0] || blog.longDescription || ''
  );

  return (
    <main className={styles.page}>
      <SiteSeo
        title={title}
        description={seoDescription}
        path={blogPath}
        image={blog.image}
        type="article"
        keywords={[title, 'blog', siteName]}
        jsonLd={[
          blogPostingJsonLd({
            title,
            description: seoDescription,
            url: absoluteUrl(blogPath),
            image: absoluteMediaUrl(blog.image),
            datePublished: dateIso || undefined,
            authorName: siteName,
          }),
          breadcrumbJsonLd([
            { name: 'Blogs', url: absoluteUrl('/blogs') },
            { name: title, url: absoluteUrl(blogPath) },
          ]),
        ]}
      />

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

export async function getServerSideProps(context) {
  const slug = Array.isArray(context.params?.slug)
    ? context.params.slug[0]
    : context.params?.slug;
  try {
    const initialBlog = await fetchPublicBlogBySlug(slug);
    if (!initialBlog) return { notFound: true };
    return { props: { initialBlog } };
  } catch (err) {
    console.error('[seo] blog slug fetch failed:', err?.message || err);
    return { props: { initialBlog: null } };
  }
}
