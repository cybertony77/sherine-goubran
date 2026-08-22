import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { TypeAnimation } from 'react-type-animation';
import CertificatesSection from '../../components/CertificatesSection';
import PublicContentLoader from '../../components/PublicContentLoader';
import { usePersonalInfo } from '../../lib/api/personalInfo';
import { mediaSrcFromKey } from '../../lib/personalInfoMedia';
import { formatPhoneForDB } from '../../lib/phoneUtils';
import styles from '../../styles/about.module.css';

function displayRoleLabel(value) {
  return String(value || '')
    .trim()
    .replace(/\bcaoch\b/gi, 'Coach');
}

function typingSequence(items) {
  const texts = (Array.isArray(items) ? items : [])
    .map((item) => displayRoleLabel(item))
    .filter(Boolean);
  if (!texts.length) return [];
  return texts.flatMap((text) => [text, 2200]);
}

function formatStepNumber(index) {
  return String(index + 1).padStart(2, '0');
}

function filledTitleDescRows(rows) {
  return (Array.isArray(rows) ? rows : []).filter(
    (row) => String(row?.title || row?.name || '').trim() && String(row?.short_desc || '').trim()
  );
}

export default function AboutPage() {
  const { data: personalInfo, isLoading } = usePersonalInfo();

  const fullName = personalInfo?.name?.trim() || '';
  const firstName = fullName.split(/\s+/)[0] || '';
  const storyTitle = firstName ? `${firstName}'s Story` : 'Story';
  const shortDesc = String(personalInfo?.short_desc || '').trim();
  const aboutImage = mediaSrcFromKey(personalInfo?.about_image || '');
  const waDigits = formatPhoneForDB(personalInfo?.contact_phone || '');
  const waHref =
    waDigits.length > 2
      ? `https://wa.me/${waDigits}?text=${encodeURIComponent(
          firstName
            ? `Hi ${firstName}, I'd like to ask a question.`
            : "Hi, I'd like to ask a question."
        )}`
      : '';
  const sequence = useMemo(
    () => typingSequence(personalInfo?.typing_text),
    [personalInfo?.typing_text]
  );

  const journey = filledTitleDescRows(personalInfo?.journey);
  const experience = filledTitleDescRows(personalInfo?.professional_roles);

  const drives = personalInfo?.what_drives_me || {};
  const drivesTitle = String(drives.title || '').trim();
  const drivesDesc = String(drives.short_desc || '').trim();
  const drivesQuote = String(drives.quote || '').trim();
  const hasDrives = Boolean(drivesQuote || (drivesTitle && drivesDesc));

  const showHero = Boolean(firstName || shortDesc || aboutImage || sequence.length);

  if (isLoading) {
    return (
      <main className={styles.page}>
        <PublicContentLoader label="Loading about" />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {showHero ? (
        <section className={styles.hero} aria-label={storyTitle}>
          <div className={styles.heroShell}>
            <header className={styles.heroLabel}>
              <p className={styles.eyebrow}>About</p>
            </header>
            <div className={styles.heroInner}>
              <div className={styles.heroCopy}>
                <h1 className={styles.heroTitle}>{storyTitle}</h1>
                {sequence.length ? (
                  <div className={styles.typingWrap}>
                    <TypeAnimation
                      key={sequence.filter((x) => typeof x === 'string').join('|')}
                      sequence={sequence}
                      wrapper="span"
                      speed={45}
                      deletionSpeed={35}
                      repeat={Infinity}
                      className={styles.typing}
                      style={{ color: '#e9c171' }}
                    />
                  </div>
                ) : null}
                {shortDesc ? <p className={styles.heroLead}>{shortDesc}</p> : null}
                {waHref ? (
                  <div className={styles.heroActions}>
                    <a
                      href={waHref}
                      className={styles.btnGhost}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Ask a Question on WhatsApp"
                    >
                      <Image
                        src="/whatsapp2.svg"
                        alt=""
                        width={18}
                        height={18}
                        className={styles.waIcon}
                      />
                      Ask a Question
                    </a>
                  </div>
                ) : null}
              </div>
              {aboutImage ? (
                <div className={styles.aboutImageWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={aboutImage}
                    alt={fullName || storyTitle}
                    style={{
                      objectPosition: `${Number.isFinite(Number(personalInfo?.about_image_position?.x)) ? personalInfo.about_image_position.x : 50}% ${
                        Number.isFinite(Number(personalInfo?.about_image_position?.y))
                          ? personalInfo.about_image_position.y
                          : 18
                      }%`,
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {journey.length ? (
        <section className={`${styles.section} ${styles.journeySection}`} aria-label="Her journey">
          <div className={styles.journeyInner}>
            <header className={styles.journeyHead}>
              <p className={styles.sectionEyebrow}>Her journey</p>
              <h2 className={styles.journeyTitle}>Her Journey</h2>
              <p className={styles.journeyLead}>What shaped me?</p>
            </header>
            <ol className={styles.timeline}>
              {journey.map((row, i) => (
                <li key={`${row.title || row.name}-${i}`} className={styles.timelineItem}>
                  <span className={styles.stepNum} aria-hidden="true">
                    {formatStepNumber(i)}
                  </span>
                  <div className={styles.timelineBody}>
                    <h3 className={styles.entryTitle}>{row.title || row.name}</h3>
                    <p className={styles.entryDesc}>{row.short_desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {hasDrives ? (
        <section className={`${styles.section} ${styles.drivesSection}`} aria-label="What drives me">
          <div className={styles.drivesInner}>
            <p className={styles.drivesEyebrow}>What drives me</p>
            <div className={styles.drivesContent}>
              {drivesTitle ? <h2 className={styles.drivesTitle}>{drivesTitle}</h2> : null}
              {drivesDesc ? <p className={styles.drivesDesc}>{drivesDesc}</p> : null}
              {drivesQuote ? (
                <figure className={styles.quoteFigure}>
                  <blockquote className={styles.quote}>&ldquo;{drivesQuote}&rdquo;</blockquote>
                  {fullName ? (
                    <figcaption className={styles.quoteAttribution}>&mdash; {fullName}</figcaption>
                  ) : null}
                </figure>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {experience.length ? (
        <section className={`${styles.section} ${styles.experienceSection}`} aria-label="Professional experience">
          <div className={styles.experienceInner}>
            <header className={styles.experienceHead}>
              <p className={styles.sectionEyebrow}>Professional experience</p>
              <h2 className={styles.experienceTitle}>Professional Experience</h2>
              <p className={styles.experienceLead}>What I do professionally</p>
            </header>
            <ol className={styles.experienceList}>
              {experience.map((row, i) => (
                <li key={`${row.title || row.name}-${i}`} className={styles.experienceItem}>
                  <span className={styles.stepNum} aria-hidden="true">
                    {formatStepNumber(i)}
                  </span>
                  <div className={styles.experienceBody}>
                    <h3 className={styles.entryTitle}>{row.title || row.name}</h3>
                    <p className={styles.entryDesc}>{row.short_desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      <div className={styles.certsWrap}>
        <CertificatesSection />
      </div>

      <section className={`${styles.section} ${styles.cta}`} aria-label="Begin your journey">
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>
            Ready to begin your
            <br />
            journey?
          </h2>
          <p className={styles.ctaLead}>
            {firstName
              ? `If this story resonates with you, ${firstName} would be honoured to walk the next step with you.`
              : 'If this story resonates with you, I would be honoured to walk the next step with you.'}
          </p>
          <div className={styles.ctaActions}>
            <Link href="/contact" className={styles.btnPrimary} aria-label={firstName ? `Contact ${firstName}` : 'Get in touch'}>
              <Image src="/phone.svg" alt="" width={18} height={18} />
              {firstName ? `Contact ${firstName}` : 'Get in touch'}
            </Link>
            <Link href="/services" className={styles.btnGhost} aria-label="Explore Services">
              <Image src="/services.svg" alt="" width={18} height={18} />
              Explore Services
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
