import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import axios from 'axios';
import { Group, Rating, Text } from '@mantine/core';
import FullPageActionLoader from '../../components/FullPageActionLoader';
import styles from '../../styles/leaveAReview.module.css';

const RATING_COLOR = 'rgba(242, 207, 5, 1)';

export default function LeaveAReviewPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!slug || typeof slug !== 'string') return undefined;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const { data } = await axios.get(`/api/leave-a-review/${encodeURIComponent(slug)}`);
        if (!cancelled) setPage(data.page);
      } catch (err) {
        if (!cancelled) {
          if (err?.response?.status === 404) {
            const path = `/leave-a-review/${slug}`;
            router.replace(`/404?path=${encodeURIComponent(path)}`);
            return;
          }
          setLoadError(
            err?.response?.data?.error || 'This review page could not be found.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [slug, router]);

  useEffect(() => {
    if (!error) return undefined;
    const t = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('❌ Name is required');
      return;
    }
    if (!message.trim()) {
      setError('❌ Message is required');
      return;
    }
    if (!rating || rating <= 0) {
      setError('❌ Star rating is required');
      return;
    }

    setSubmitting(true);
    setError('');
    const started = Date.now();
    try {
      await axios.post(`/api/leave-a-review/${encodeURIComponent(slug)}`, {
        name: name.trim(),
        text: message.trim(),
        rating,
      });
      const elapsed = Date.now() - started;
      const wait = Math.max(0, 1200 - elapsed);
      await new Promise((r) => setTimeout(r, wait));
      setSubmitted(true);
    } catch (err) {
      setError(err?.response?.data?.error || '❌ Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const posX = Number.isFinite(Number(page?.imagePosX)) ? Number(page.imagePosX) : 50;
  const posY = Number.isFinite(Number(page?.imagePosY)) ? Number(page.imagePosY) : 50;

  return (
    <div className={styles.page}>
      <FullPageActionLoader
        active={loading || submitting}
        label={submitting ? 'Submitting' : 'Loading'}
        sub={
          submitting
            ? 'Sending your review. Please wait a moment.'
            : 'Loading review page. Please wait a moment.'
        }
      />

      {loadError || (!loading && !page) ? (
        <div className={styles.errorCard}>
          <h1>Page not found</h1>
          <p>{loadError || 'This review link is invalid or has been removed.'}</p>
        </div>
      ) : null}

      {page ? (
        <>
          <section className={styles.hero}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.image}
              alt=""
              className={styles.heroImage}
              style={{ objectPosition: `${posX}% ${posY}%` }}
            />
            <div className={styles.heroOverlay} />
            <div className={styles.heroShine} aria-hidden="true" />
            <div className={styles.heroContent}>
              {page.category ? (
                <p className={styles.heroCategory}>{page.category}</p>
              ) : null}
              <p className={styles.heroText}>{page.text}</p>
            </div>
          </section>

          <div className={styles.content}>
            {submitted ? (
              <div className={styles.thanksWrap} role="status">
                <div className={styles.thanksBurst} aria-hidden="true" />
                <div className={styles.thanksCard}>
                  <div className={styles.thanksCheck}>
                    <Image src="/success-mark3.svg" alt="" width={40} height={40} />
                  </div>
                  <h2 className={styles.thanksTitle}>Thank you for your review!</h2>
                  <p className={styles.thanksCopy}>
                    Your feedback means a lot. We appreciate you taking the time to share it.
                  </p>
                  <div className={styles.ctaRow}>
                    <Link href="/" className={`${styles.ctaPrimary} ${styles.ctaAnim1}`}>
                      <Image src="/globe.svg" alt="" width={18} height={18} />
                      Visit Website
                    </Link>
                    <Link href="/services" className={`${styles.ctaSecondary} ${styles.ctaAnim2}`}>
                      <Image src="/services.svg" alt="" width={18} height={18} />
                      Explore More Services
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <form className={styles.formCard} onSubmit={handleSubmit}>
                <h2>Leave a Review</h2>
                <p className={styles.formSub}>Share your experience with us</p>

                <label className={styles.label}>
                  Name <span className={styles.required}>*</span>
                </label>
                <input
                  className={styles.input}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  disabled={submitting}
                />

                <label className={styles.label}>
                  Message <span className={styles.required}>*</span>
                </label>
                <textarea
                  className={styles.textarea}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your review"
                  rows={5}
                  disabled={submitting}
                />

                <label className={styles.label}>
                  Rating <span className={styles.required}>*</span>
                </label>
                <div className={styles.ratingBlock}>
                  <Rating
                    value={rating}
                    onChange={setRating}
                    fractions={2}
                    allowClear
                    color={RATING_COLOR}
                    size={35}
                    readOnly={submitting}
                  />
                  <Group gap="xs">
                    <Text size="sm" c="dimmed">
                      Current rating:
                    </Text>
                    <Text size="sm" fw={600}>
                      {rating === 0 ? 'Not rated' : rating}
                    </Text>
                  </Group>
                </div>

                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Review'}
                </button>

                {error ? (
                  <div className={styles.errorMsg} role="alert">
                    {error}
                  </div>
                ) : null}
              </form>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
