import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { usePersonalInfo } from '../lib/api/personalInfo';
import { useSystemConfig } from '../lib/api/system';
import { isPublicSitePage, firstNameFromFullName } from '../lib/publicSite';
import { formatPhoneForDB } from '../lib/phoneUtils';
import { isWhatsAppLinkName, resolveLinkHref, socialIconSrc } from '../lib/linksClientUtils';
import { EVENTS_PUBLIC_PATH } from '../lib/eventSlug';
import styles from '../styles/Footer.module.css';

const QUICK_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: EVENTS_PUBLIC_PATH, label: 'Events & Workshops' },
  { href: '/blogs', label: 'Blogs' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/contact', label: 'Contact' },
];

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

function DashboardFooter({ systemName, year }) {
  return (
    <footer
      className="footer"
      style={{
        width: '100%',
        background: 'transparent',
        padding: '20px 0',
        textAlign: 'center',
        color: 'var(--system-surface)',
        fontWeight: 600,
        fontSize: 16,
        letterSpacing: 0.5,
        borderTop: '2px solid #e9ecef',
        marginTop: 'auto',
        flexShrink: 0,
      }}
    >
      Copyright &copy; {year} - {systemName}
      <style jsx>{`
        @media (max-width: 768px) {
          .footer {
            font-size: 14px !important;
            padding: 15px 0 !important;
            margin-top: 20px !important;
          }
        }
        @media (max-width: 480px) {
          .footer {
            font-size: 12px !important;
            padding: 10px 0 !important;
          }
        }
      `}</style>
    </footer>
  );
}

export default function Footer() {
  const router = useRouter();
  const isPublicSite = isPublicSitePage(router.pathname);
  const year = new Date().getFullYear();
  const { data: systemConfig } = useSystemConfig();
  const systemName =
    String(systemConfig?.name || process.env.NEXT_PUBLIC_SYSTEM_NAME || '').trim() ||
    'Sherine Goubran';
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const { data: personalInfo } = usePersonalInfo({ enabled: isPublicSite });
  // Keep SSR + first client paint identical; fill personal-info fields only after mount.
  const info = hasMounted ? personalInfo : null;
  const firstName =
    firstNameFromFullName(info?.name) || firstNameFromFullName(systemName) || 'Sherine';
  const brandDescription = String(info?.short_desc || '').trim();

  const phoneRaw = String(info?.contact_phone || '').trim();
  const email = String(info?.contact_email || '').trim();
  const locationName = String(info?.contact_location_name || '').trim();
  const locationHref = locationHrefFrom(info?.contact_location_link);
  const phoneDisplay = displayPhone(phoneRaw);
  const phoneHref = phoneRaw ? `tel:+${formatPhoneForDB(phoneRaw)}` : '';
  const hasContact = Boolean(phoneDisplay || email || locationName);

  const socialLinks = (Array.isArray(info?.links) ? info.links : [])
    .filter((row) => {
      const name = String(row?.name || '').trim();
      const href = resolveLinkHref(row);
      return name && href && !isWhatsAppLinkName(name);
    })
    .map((row) => ({
      name: String(row.name).trim(),
      href: resolveLinkHref(row),
      icon: socialIconSrc(row.name),
    }));

  const waDigits = formatPhoneForDB(phoneRaw);
  const waMessage = encodeURIComponent(
    `Hi ${firstName}, I'd like to get in touch and learn more about your coaching services.`
  );
  const waHref = waDigits.length > 2 ? `https://wa.me/${waDigits}?text=${waMessage}` : '';

  if (!isPublicSite) {
    return <DashboardFooter systemName={systemName} year={year} />;
  }

  return (
    <footer className={styles.publicFooter}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div className={`${styles.col} ${styles.brand}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt={`${systemName} logo`} className={styles.logo} />
            <p className={styles.brandName}>{systemName}</p>
            {brandDescription ? <p className={styles.brandDesc}>{brandDescription}</p> : null}
          </div>

          <div className={styles.col}>
            <h2 className={styles.colTitle}>Quick Links</h2>
            <ul className={styles.quickLinks}>
              {QUICK_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.col}>
            <h2 className={styles.colTitle}>Contact</h2>
            {hasContact ? (
              <ul className={styles.contactList}>
                {phoneDisplay && phoneHref ? (
                  <li>
                    <a href={phoneHref} className={styles.contactLink}>
                      {phoneDisplay}
                    </a>
                  </li>
                ) : null}
                {email ? (
                  <li>
                    <a href={`mailto:${email}`} className={styles.contactLink}>
                      {email}
                    </a>
                  </li>
                ) : null}
                {locationName ? (
                  <li>
                    {locationHref ? (
                      <a
                        href={locationHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.contactLink}
                      >
                        {locationName}
                      </a>
                    ) : (
                      <span className={styles.contactText}>{locationName}</span>
                    )}
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className={styles.contactEmpty}>Contact details coming soon.</p>
            )}
          </div>

          <div className={`${styles.col} ${styles.follow}`}>
            <h2 className={styles.colTitle}>Follow</h2>
            {socialLinks.length ? (
              <div className={styles.socialRow} aria-label="Social media links">
                {socialLinks.map((item) => (
                  <a
                    key={`${item.name}-${item.href}`}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialLink}
                    aria-label={item.name}
                    title={item.name}
                  >
                    <Image src={item.icon} alt="" width={28} height={28} />
                  </a>
                ))}
              </div>
            ) : (
              <p className={styles.contactEmpty}>Social links coming soon.</p>
            )}
          </div>
        </div>

        {waHref ? (
          <div className={styles.ctaSection}>
            <h3 className={styles.waTitle}>Ready to take the next step?</h3>
            <p className={styles.waLead}>Let&apos;s start the conversation.</p>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.waBtn}
              aria-label={`Talk to ${firstName} on WhatsApp`}
            >
              <Image src="/whatsapp2.svg" alt="" width={18} height={18} />
              Talk to {firstName}
            </a>
          </div>
        ) : null}

        <hr className={styles.divider} />

        <div className={styles.bottom}>
          <p className={styles.copyright}>
            &copy; {year} {systemName}
          </p>
          <p className={styles.madeBy}>
            Made by{' '}
            <Link href="/contact_developer">Tony Joseph</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
