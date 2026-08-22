import { useRouter } from 'next/router';
import UserMenu from './UserMenu';
import { useProfile } from '../lib/api/auth';
import { useSystemConfig } from '../lib/api/system';
import { isPublicSitePage } from '../lib/publicSite';
import styles from '../styles/Header.module.css';

const FALLBACK_SYSTEM_NAME =
  String(process.env.NEXT_PUBLIC_SYSTEM_NAME || '').trim() || 'Sherine Goubran';

export default function Header() {
  const router = useRouter();
  const isPublicSite = isPublicSitePage(router.pathname);
  const { data: user } = useProfile({ enabled: !isPublicSite });
  const { data: systemConfig } = useSystemConfig();
  const userRole = user?.role || '';
  const systemName = String(systemConfig?.name || '').trim() || FALLBACK_SYSTEM_NAME;

  const handleLogoClick = () => {
    if (isPublicSite) {
      router.push('/');
      return;
    }
    if (userRole === 'student') {
      router.push('/student_dashboard');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <header className={isPublicSite ? styles.publicHeader : styles.privateHeader}>
      <button
        type="button"
        className={styles.brandBtn}
        onClick={handleLogoClick}
        aria-label={isPublicSite ? `${systemName} home` : `${systemName} dashboard`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt={`${systemName} Logo`}
          className={styles.logoImg}
        />
        <span className={styles.brandDivider} aria-hidden="true" />
        <span className={styles.brandName}>{systemName}</span>
      </button>
      <UserMenu />
    </header>
  );
}
