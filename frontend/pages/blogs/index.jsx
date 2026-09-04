import BlogCard from '../../components/BlogCard';
import BlogsCta from '../../components/BlogsCta';
import PublicContentLoader from '../../components/PublicContentLoader';
import { sortPublicBlogsOldestFirst } from '../../lib/blogDisplay';
import { usePublicBlogs } from '../../lib/api/publicBlogs';
import styles from '../../styles/publicBlogs.module.css';
import SiteSeo from '../../components/SiteSeo';
import { PUBLIC_STATIC_SEO } from '../../lib/seo';

export default function PublicBlogsPage() {
  const { data: blogs = [], isLoading } = usePublicBlogs();
  const orderedBlogs = sortPublicBlogsOldestFirst(blogs);

  return (
    <main className={styles.page}>
      <SiteSeo
        title={PUBLIC_STATIC_SEO['/blogs'].title}
        description={PUBLIC_STATIC_SEO['/blogs'].description}
        path="/blogs"
        keywords={PUBLIC_STATIC_SEO['/blogs'].keywords}
      />
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>Insights & Stories</p>
          <h1 className={styles.title}>Blogs</h1>
          <p className={styles.lead}>
            Thoughts, experiences and practical ideas from Sherine on life, mindset, relationships,
            wellbeing and everything in between.
          </p>
        </header>

        {isLoading ? (
          <PublicContentLoader label="Loading blogs" />
        ) : orderedBlogs.length ? (
          <div className={styles.grid}>
            {orderedBlogs.map((blog, index) => (
              <BlogCard
                key={blog.id || blog.slug}
                blog={blog}
                revealDelay={Math.min(index, 8) * 70}
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyLine} aria-hidden="true" />
            <p className={styles.emptyTitle}>Coming Soon</p>
            <p className={styles.emptyText}>New articles are on the way.</p>
          </div>
        )}
      </div>

      <BlogsCta variant="listing" />
    </main>
  );
}
