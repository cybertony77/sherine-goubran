import styles from '../styles/PublicContentLoader.module.css';

/**
 * In-page loading state for public portfolio pages.
 * No visible “Loading” label — spinner only (aria-label for accessibility).
 */
export default function PublicContentLoader({ label = 'Loading content' }) {
  return (
    <div
      className={styles.wrap}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className={styles.box}>
        <div className={styles.spinnerWrap} aria-hidden="true">
          <div className={styles.spinner} />
          <div className={styles.spinnerInner} />
        </div>
      </div>
    </div>
  );
}
