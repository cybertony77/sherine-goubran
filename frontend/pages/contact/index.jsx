import { useState } from 'react';
import Image from 'next/image';
import ContactForm from '../../components/ContactForm';
import PublicContentLoader from '../../components/PublicContentLoader';
import { usePersonalInfo } from '../../lib/api/personalInfo';
import { mediaSrcFromKey } from '../../lib/personalInfoMedia';
import { firstNameFromFullName } from '../../lib/publicSite';
import { formatPhoneForDB } from '../../lib/phoneUtils';
import styles from '../../styles/contact.module.css';

function displayPhone(value) {
  const digits = formatPhoneForDB(value);
  if (!digits) return '';
  if (digits.startsWith('20') && digits.length > 2) return `+20 ${digits.slice(2)}`;
  return `+${digits}`;
}

function locationHrefFrom(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch {
    return '';
  }
  return '';
}

function MapPinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
      <path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z" />
    </svg>
  );
}

export default function ContactPage() {
  const { data, isLoading } = usePersonalInfo();
  const [sent, setSent] = useState(false);
  const name = String(data?.name || '').trim();
  const firstName = firstNameFromFullName(name);
  const phone = String(data?.contact_phone || '').trim();
  const email = String(data?.contact_email || '').trim();
  const locationName = String(data?.contact_location_name || '').trim();
  const locationHref = locationHrefFrom(data?.contact_location_link);
  const contactText = String(data?.contact_text || '').trim();
  const heroSrc = mediaSrcFromKey(data?.contact_hero_image || '');
  const heroPos = data?.contact_hero_position || {};
  const heroX = Number.isFinite(Number(heroPos.x)) ? Number(heroPos.x) : 50;
  const heroY = Number.isFinite(Number(heroPos.y)) ? Number(heroPos.y) : 50;
  const phoneHref = phone ? `tel:+${formatPhoneForDB(phone)}` : '';
  const waHref = phone ? `https://wa.me/${formatPhoneForDB(phone)}` : '';
  const fallbackText = firstName
    ? `If you'd like to connect, ask a question, or explore working together, ${firstName} would be glad to hear from you.`
    : "If you'd like to connect, ask a question, or explore working together, I'd be glad to hear from you.";
  const responseText =
    String(data?.contact_response_text || '').trim() ||
    (firstName
      ? `${firstName} will contact you as soon as possible.`
      : 'You will be contacted as soon as possible.');

  if (isLoading) {
    return (
      <main className={styles.page}>
        <PublicContentLoader label="Loading contact" />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={heroSrc ? styles.heroBanner : styles.hero}>
        {heroSrc ? (
          <div className={styles.heroMedia} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroSrc} alt="" style={{ objectPosition: `${heroX}% ${heroY}%` }} />
            <div className={styles.heroScrim} />
          </div>
        ) : null}
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Contact</p>
          <h1 className={styles.title}>Let's Connect</h1>
          <p className={styles.lead}>
            Have a question, booking inquiry or collaboration in mind? Get in touch and we&apos;ll
            get back to you as soon as possible.
          </p>
        </div>
      </header>

      <div className={`${styles.layout} ${sent ? styles.layoutSent : ''}`}>
        <section className={styles.formCol} aria-label="Contact form">
          <div className={`${styles.formCard} ${sent ? styles.formCardSent : ''}`}>
            <ContactForm
              variant="full"
              firstName={firstName}
              whatsAppHref={waHref}
              onSubmittedChange={setSent}
            />
          </div>
        </section>

        {sent ? null : (
          <aside className={styles.infoCol} aria-label="Direct contact">
            <div className={styles.infoPanel}>
              <h2 className={styles.infoTitle}>Get in Touch</h2>
              <p className={styles.contactText}>{contactText || fallbackText}</p>

              {waHref ? (
                <a
                  className={styles.waBtn}
                  href={waHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Chat on WhatsApp"
                >
                  <Image src="/whatsapp2.svg" alt="" width={18} height={18} />
                  Chat on WhatsApp
                </a>
              ) : null}

              <div className={styles.methods}>
                {email ? (
                  <a className={styles.method} href={`mailto:${email}`}>
                    <span className={styles.methodIcon} aria-hidden="true">
                      <Image src="/mail.svg" alt="" width={18} height={18} />
                    </span>
                    <span>
                      <span className={styles.methodLabel}>Email</span>
                      <span className={styles.methodValue}>{email}</span>
                    </span>
                  </a>
                ) : null}
                {phoneHref ? (
                  <a className={styles.method} href={phoneHref}>
                    <span className={styles.methodIcon} aria-hidden="true">
                      <Image src="/phone.svg" alt="" width={18} height={18} />
                    </span>
                    <span>
                      <span className={styles.methodLabel}>Phone</span>
                      <span className={styles.methodValue}>{displayPhone(phone)}</span>
                    </span>
                  </a>
                ) : null}
                {locationName ? (
                  locationHref ? (
                    <a
                      className={styles.method}
                      href={locationHref}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className={styles.methodIcon} aria-hidden="true">
                        <MapPinIcon />
                      </span>
                      <span>
                        <span className={styles.methodLabel}>Location</span>
                        <span className={styles.methodValue}>{locationName}</span>
                      </span>
                    </a>
                  ) : (
                    <div className={`${styles.method} ${styles.methodStatic}`}>
                      <span className={styles.methodIcon} aria-hidden="true">
                        <MapPinIcon />
                      </span>
                      <span>
                        <span className={styles.methodLabel}>Location</span>
                        <span className={styles.methodValue}>{locationName}</span>
                      </span>
                    </div>
                  )
                ) : null}
              </div>

              <div className={styles.response}>
                <p className={styles.responseLabel}>Response Time</p>
                <p className={styles.responseText}>{responseText}</p>
              </div>
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}
