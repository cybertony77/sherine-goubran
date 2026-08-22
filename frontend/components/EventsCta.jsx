import Image from 'next/image';
import Link from 'next/link';
import { usePersonalInfo } from '../lib/api/personalInfo';
import { formatPhoneForDB } from '../lib/phoneUtils';
import { firstNameFromFullName } from '../lib/publicSite';
import styles from '../styles/EventsCta.module.css';

function askQuestionMessage(variant, eventName, eventType) {
  const name = String(eventName || '').trim();
  const typeLabel = String(eventType || '').trim() === 'Workshop' ? 'workshop' : 'event';
  if (name) return `I am asking about ${name} ${typeLabel}`;
  if (variant === 'listing') return 'I am asking about events and workshops';
  return 'I am asking about events and workshops';
}

export default function EventsCta({ variant = 'listing', eventName = '', eventType = '' }) {
  const { data: personalInfo } = usePersonalInfo();
  const firstName = firstNameFromFullName(personalInfo?.name);
  const contactLabel = firstName ? `Contact ${firstName}` : 'Get in touch';

  const isListing = variant === 'listing';
  const isUpcoming = variant === 'upcoming';
  const isPrevious = variant === 'previous';

  const waDigits = formatPhoneForDB(personalInfo?.contact_phone || '');
  const waHref =
    waDigits.length > 2
      ? `https://wa.me/${waDigits}?text=${encodeURIComponent(askQuestionMessage(variant, eventName, eventType))}`
      : '';

  const title = 'Ready to take the next step?';

  const lead = isListing
    ? firstName
      ? `Whether you're looking to join a workshop, explore an event, or simply have a question, ${firstName} is here to help.`
      : "Whether you're looking to join a workshop, explore an event, or simply have a question, I'm here to help."
    : isUpcoming
      ? firstName
        ? `Whether you're ready to join or simply have a question, ${firstName} is here to help.`
        : "Whether you're ready to join or simply have a question, I'm here to help."
      : firstName
        ? `Interested in a future event or workshop? ${firstName} would love to hear from you.`
        : "Interested in a future event or workshop? I'd love to hear from you.";

  return (
    <section className={styles.cta} aria-label="Take the next step">
      <div className={styles.ctaInner}>
        <h2 className={styles.ctaTitle}>{title}</h2>
        <p className={styles.ctaLead}>{lead}</p>
        <div className={styles.ctaActions}>
          <Link href="/contact" className={styles.btnPrimary} aria-label={contactLabel}>
            <Image src="/phone.svg" alt="" width={18} height={18} />
            {contactLabel}
          </Link>
          {isPrevious ? (
            <Link href="/services" className={styles.btnGhost} aria-label="Explore Services">
              <Image src="/services.svg" alt="" width={18} height={18} />
              Explore Services
            </Link>
          ) : waHref ? (
            <a
              href={waHref}
              className={styles.btnGhost}
              target="_blank"
              rel="noreferrer"
              aria-label="Ask a Question on WhatsApp"
            >
              <Image src="/whatsapp2.svg" alt="" width={18} height={18} className={styles.waIcon} />
              Ask a Question
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
