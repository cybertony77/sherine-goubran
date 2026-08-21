import BlogCard from '../../components/BlogCard';
import BlogsCta from '../../components/BlogsCta';
import PublicContentLoader from '../../components/PublicContentLoader';
import { sortPublicBlogsOldestFirst } from '../../lib/blogDisplay';
import { usePublicBlogs } from '../../lib/api/publicBlogs';
import styles from './publicBlogs.module.css';

export default function PublicBlogsPage() {
  const { data: blogs = [], isLoading } = usePublicBlogs();
  const orderedBlogs = sortPublicBlogsOldestFirst(blogs);

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>Insights & Stories</p>
          <h1 className={styles.title}>Blogs</h1>
          <p className={styles.lead}>
            Explore insights, practical guidance, and inspiring ideas to support your personal
            growth and everyday life.
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
            <p className={styles.emptyTitle}>Coming soon</p>
            <p className={styles.emptyText}>New stories are being prepared.</p>
          </div>
        )}
      </div>

      <BlogsCta variant="listing" />
    </main>
  );
}
