import styles from '../styles/PagePreloader.module.css';

function PageName({ name }) {
  if (name === 'EVENTS & WORKSHOPS') {
    return (
      <>
        EVENTS &
        <br className={styles.mobileBreak} />
        {' '}
        WORKSHOPS
      </>
    );
  }

  if (name === 'LEAVE A REVIEW') {
    return (
      <>
        LEAVE A
        <br className={styles.mobileBreak} />
        {' '}
        REVIEW
      </>
    );
  }

  return name;
}

export default function PagePreloader({
  active = false,
  exiting = false,
  name = '',
  navKey = 0,
  onExitComplete,
}) {
  if (!active || !name) return null;

  const overlayClass = [
    styles.overlay,
    styles.overlayEnter,
    exiting ? styles.overlayExit : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleTransitionEnd = (event) => {
    if (event.target !== event.currentTarget) return;
    if (!exiting) return;
    if (event.propertyName !== 'transform' && event.propertyName !== 'opacity') return;
    onExitComplete?.();
  };

  return (
    <div
      key={navKey}
      className={overlayClass}
      data-page-preloader="true"
      role="status"
      aria-live="polite"
      aria-busy={!exiting}
      aria-label={`Loading ${name}`}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className={styles.content}>
        <p className={styles.pageName}>
          <PageName name={name} />
        </p>
        <span className={styles.line} aria-hidden="true" />
      </div>
    </div>
  );
}
