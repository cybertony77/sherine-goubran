import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { Burger, Drawer } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { useProfile, useProfilePicture } from '../lib/api/auth';
import { useSubscription } from '../lib/api/subscription';
import { useSystemConfig } from '../lib/api/system';
import { usePersonalInfo } from '../lib/api/personalInfo';
import { firstNameFromFullName, isPublicSitePage } from '../lib/publicSite';
import { formatPhoneForDB } from '../lib/phoneUtils';
import { isWhatsAppLinkName, resolveLinkHref, socialIconSrc } from '../lib/linksClientUtils';
import AppVideosModal from './AppVideosModal';
import apiClient from '../lib/axios';
import Image from 'next/image';
import styles from '../styles/UserMenu.module.css';

export default function UserMenu() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const [showAppVideos, setShowAppVideos] = useState(false);
  const router = useRouter();
  const isPublicSite = isPublicSitePage(router.pathname);
  const isMobile = useMediaQuery('(max-width: 480px)');
  const isTablet = useMediaQuery('(max-width: 768px)');

  const { data: user } = useProfile({ enabled: !isPublicSite });
  const { data: subscription } = useSubscription({ enabled: !isPublicSite });
  const { data: profilePictureUrl } = useProfilePicture({ enabled: !isPublicSite });
  const { data: systemConfig } = useSystemConfig();
  const { data: personalInfo } = usePersonalInfo({ enabled: isPublicSite });
  const isSubscriptionEnabled =
    systemConfig?.subscription === true || systemConfig?.subscription === 'true';

  const userData = user || { name: '', id: '', phone: '', role: '' };
  const isAdminOrDeveloper = userData.role === 'admin' || userData.role === 'developer';
  const isAssistant = userData.role === 'assistant';
  const isStaff = isAdminOrDeveloper || isAssistant;

  const { data: publicTestimonialsData } = useQuery({
    queryKey: ['public_testimonials'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/public_testimonials');
      return data;
    },
    enabled: isStaff && !isPublicSite,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: opened ? 5000 : false,
  });
  const pendingCount = publicTestimonialsData?.pendingCount || 0;

  const [timeRemaining, setTimeRemaining] = useState(null);
  const hasLoggedOutRef = useRef(false);

  useEffect(() => {
    if (isPublicSite) {
      setTimeRemaining(null);
      hasLoggedOutRef.current = false;
      return;
    }

    const isDeveloper = userData.role === 'developer';

    if (!isSubscriptionEnabled) {
      setTimeRemaining(null);
      hasLoggedOutRef.current = false;
      return;
    }

    if (!subscription || (subscription.active === false && !subscription.date_of_expiration)) {
      setTimeRemaining(null);
      hasLoggedOutRef.current = false;
      return;
    }

    if (!subscription.date_of_expiration) {
      setTimeRemaining(null);
      hasLoggedOutRef.current = false;
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const expiration = new Date(subscription.date_of_expiration);
      const diff = expiration - now;

      let days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
      let hours = Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
      let minutes = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
      let seconds = Math.max(0, Math.floor((diff % (1000 * 60)) / 1000));

      if (hours === 0 && days > 0) {
        days -= 1;
        hours = 24;
      }
      if (minutes === 0 && hours > 0) {
        hours -= 1;
        minutes = 60;
      }
      if (seconds === 0 && minutes > 0) {
        minutes -= 1;
        seconds = 60;
      }

      setTimeRemaining({ days, hours, minutes, seconds });

      if (
        !isDeveloper &&
        (diff <= 0 || (days === 0 && hours === 0 && minutes === 0 && seconds === 0))
      ) {
        if (!hasLoggedOutRef.current) {
          hasLoggedOutRef.current = true;
          (async () => {
            try {
              await apiClient
                .post(
                  '/api/auth/logout',
                  {},
                  {
                    validateStatus: (status) => status < 500,
                  }
                )
                .catch(() => {});
            } catch (err) {
              if (err.response?.status !== 400 && err.response?.status !== 401) {
                console.error('Error logging out (continuing anyway):', err);
              }
            }
            router.push('/login');
          })();
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => {
      clearInterval(interval);
      hasLoggedOutRef.current = false;
    };
  }, [subscription, userData.role, router, isSubscriptionEnabled, isPublicSite]);

  useEffect(() => {
    const onRoute = () => close();
    router.events.on('routeChangeStart', onRoute);
    return () => router.events.off('routeChangeStart', onRoute);
  }, [router.events, close]);

  const navigate = (path) => {
    close();
    router.push(path);
  };

  const handleLogout = async () => {
    close();
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      router.push('/login');
    }
  };

  const avatarLetter = (() => {
    if (userData.name && userData.name.length > 0) return userData.name[0].toUpperCase();
    if (userData.id && userData.id.toString().length > 0) {
      return userData.id.toString()[0].toUpperCase();
    }
    return 'U';
  })();

  const currentPath = router.pathname || '';
  const isActive = (path) => {
    if (!path) return false;
    if (path === '/') return currentPath === '/';
    if (path === '/dashboard/public_reviews') {
      return (
        currentPath === path ||
        currentPath.startsWith(`${path}/`) ||
        currentPath === '/dashboard/pending_reviews'
      );
    }
    return currentPath === path || currentPath.startsWith(`${path}/`);
  };

  const menuBtnClass = (path) =>
    `${styles.menuBtn}${isActive(path) ? ` ${styles.menuBtnActive}` : ''}`;

  const storyFirstName = firstNameFromFullName(personalInfo?.name);
  const storyLabel = storyFirstName ? `${storyFirstName}'s story` : 'Story';
  const waDigits = formatPhoneForDB(personalInfo?.contact_phone || '');
  const waHref = waDigits.length > 2 ? `https://wa.me/${waDigits}` : '';
  const socialLinks = useMemo(
    () =>
      (Array.isArray(personalInfo?.links) ? personalInfo.links : [])
        .filter((row) => {
          const name = String(row?.name || '').trim();
          const href = resolveLinkHref(row);
          return name && href && !isWhatsAppLinkName(name);
        })
        .map((row) => ({
          name: String(row.name).trim(),
          href: resolveLinkHref(row),
          icon: socialIconSrc(row.name),
        })),
    [personalInfo?.links]
  );
  const publicNavItems = [
    { href: '/', label: 'Home', icon: '/home.svg' },
    { href: '/about', label: storyLabel, icon: '/user2.svg' },
    { href: '/services', label: 'Services', icon: '/services.svg' },
    { href: '/events_&_workshops', label: 'Events & Workshops', icon: '/events.svg' },
    { href: '/reviews', label: 'Reviews', icon: '/testimonials2.svg' },
    { href: '/blogs', label: 'Blogs', icon: '/blogs.svg' },
    { href: '/contact', label: 'Contact Us', icon: '/phone.svg' },
  ];

  const drawerSize = isMobile ? '72%' : isTablet ? '62%' : '400px';

  return (
    <div className={styles.root}>
      <div className={`${styles.burgerWrap} ${opened ? styles.burgerWrapOpen : ''}`}>
        <Burger
          opened={opened}
          onClick={toggle}
          aria-label="Toggle navigation"
          color="var(--system-primary)"
          size={isMobile ? 'sm' : 'md'}
        />
      </div>

      <Drawer
        opened={opened}
        onClose={close}
        position="right"
        size={drawerSize}
        padding="md"
        zIndex={10000}
        overlayProps={{
          backgroundOpacity: 0.2,
          blur: 2,
          color: '#0F0F10',
        }}
        transitionProps={{ transition: 'slide-left', duration: 200 }}
        title={
          <span
            style={{
              fontWeight: 800,
              color: '#0F0F10',
              fontSize: '1.1rem',
              letterSpacing: '0.02em',
            }}
          >
            Menu
          </span>
        }
        styles={{
          content: {
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '100vw',
            background: '#C9A96A',
            borderLeft: '1px solid rgba(15, 15, 16, 0.12)',
            boxShadow: '-8px 0 32px rgba(15, 15, 16, 0.22)',
          },
          body: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            paddingTop: 10,
            background: '#C9A96A',
            color: '#0F0F10',
          },
          header: {
            borderBottom: '1px solid rgba(15, 15, 16, 0.14)',
            minHeight: 58,
            background: '#C9A96A',
            paddingInline: 16,
          },
          title: {
            color: '#0F0F10',
          },
          close: {
            color: '#dc3545',
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.55)',
            border: '1.5px solid rgba(220, 53, 69, 0.35)',
            transition: 'background 0.15s ease, color 0.15s ease, transform 0.15s ease',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.85)',
              color: '#b02a37',
              transform: 'scale(1.04)',
            },
          },
        }}
      >
        <div className={styles.drawerBody}>
          {isPublicSite ? (
            <>
            <div className={styles.menuList}>
              {publicNavItems.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  className={menuBtnClass(item.href)}
                  onClick={() => navigate(item.href)}
                >
                  <Image src={item.icon} alt="" width={20} height={20} />
                  <span className={styles.menuBtnLabel}>{item.label}</span>
                  {isActive(item.href) ? (
                    <span className={styles.menuActiveDot} aria-hidden="true" />
                  ) : null}
                </button>
              ))}
            </div>
            {socialLinks.length || waHref ? (
              <div className={styles.menuFooter}>
                {socialLinks.length ? (
                  <div className={styles.socialSection}>
                    <p className={styles.socialLabel}>Follow me</p>
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
                          <Image src={item.icon} alt="" width={20} height={20} />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
                {waHref ? (
                  <div className={styles.waSection}>
                    <a
                      className={styles.waBtn}
                      href={waHref}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={
                        storyFirstName
                          ? `Chat with ${storyFirstName} on WhatsApp`
                          : 'Chat on WhatsApp'
                      }
                    >
                      <Image
                        src="/whatsapp2.svg"
                        alt=""
                        width={22}
                        height={22}
                        className={styles.waIcon}
                        aria-hidden="true"
                      />
                      <span className={styles.waLabel}>Chat on WhatsApp</span>
                    </a>
                  </div>
                ) : null}
              </div>
            ) : null}
            </>
          ) : (
            <>
          <div className={styles.profileCard}>
            <div className={styles.avatar}>
              {profilePictureUrl ? (
                <Image
                  src={profilePictureUrl}
                  alt="Profile"
                  fill
                  style={{ objectFit: 'cover', borderRadius: '50%' }}
                  unoptimized
                />
              ) : (
                <span className={styles.avatarLetter}>{avatarLetter}</span>
              )}
            </div>
            <div className={styles.profileMeta}>
              <p className={styles.profileName}>{userData.name || userData.id || 'User'}</p>
              <p className={styles.profileUser}>
                <Image src="/user-circle3.svg" alt="" width={16} height={16} />
                {userData.id ? `Username: ${userData.id}` : 'No Username'}
              </p>
            </div>
          </div>

          {isSubscriptionEnabled && subscription && isStaff ? (
            <div className={styles.subscriptionBox}>
              {subscription.active === false && !subscription.date_of_expiration ? (
                <div className={styles.subscriptionExpired}>
                  <Image src="/alert-triangle2.svg" alt="" width={18} height={18} />
                  Subscription Expired
                </div>
              ) : subscription.date_of_expiration && timeRemaining !== null ? (
                <div>
                  <div className={styles.subscriptionLabel}>
                    <Image src="/clock.svg" alt="" width={16} height={16} />
                    Subscription time remaining:
                  </div>
                  <div className={styles.subscriptionTimer}>
                    <span className={styles.timerNum}>
                      {String(timeRemaining.days || 0).padStart(2, '0')}
                    </span>
                    <span className={styles.timerUnit}> days : </span>
                    <span className={styles.timerNum}>
                      {String(timeRemaining.hours || 0).padStart(2, '0')}
                    </span>
                    <span className={styles.timerUnit}> hours : </span>
                    <span className={styles.timerNum}>
                      {String(timeRemaining.minutes || 0).padStart(2, '0')}
                    </span>
                    <span className={styles.timerUnit}> min : </span>
                    <span className={styles.timerNum}>
                      {String(timeRemaining.seconds || 0).padStart(2, '0')}
                    </span>
                    <span className={styles.timerUnit}> sec</span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className={styles.menuList}>
            <button
              type="button"
              className={`${styles.menuBtn} ${styles.logoutBtn}`}
              onClick={handleLogout}
            >
              <Image
                src="/logout.svg"
                alt=""
                width={20}
                height={20}
                style={{
                  filter:
                    'brightness(0) saturate(100%) invert(27%) sepia(95%) saturate(6871%) hue-rotate(349deg) brightness(93%) contrast(86%)',
                }}
              />
              <span className={styles.menuBtnLabel}>Logout</span>
            </button>

            {isStaff ? (
              <>
                <button
                  type="button"
                  className={menuBtnClass('/edit_my_profile')}
                  onClick={() => navigate('/edit_my_profile')}
                >
                  <Image src="/user-edit2.svg" alt="" width={20} height={20} />
                  <span className={styles.menuBtnLabel}>Edit My Profile</span>
                  {isActive('/edit_my_profile') ? <span className={styles.menuActiveDot} aria-hidden="true" /> : null}
                </button>

                <button
                  type="button"
                  className={menuBtnClass('/dashboard/public_reviews')}
                  onClick={() => navigate('/dashboard/public_reviews')}
                >
                  <Image src="/testimonials2.svg" alt="" width={20} height={20} />
                  <span className={styles.menuBtnLabel}>Public Reviews</span>
                  {pendingCount > 0 ? (
                    <span
                      className={styles.pendingBadge}
                      aria-label={`${pendingCount} pending reviews`}
                    >
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  ) : null}
                  {isActive('/dashboard/public_reviews') ? (
                    <span className={styles.menuActiveDot} aria-hidden="true" />
                  ) : null}
                </button>

                {isAdminOrDeveloper ? (
                  <button
                    type="button"
                    className={menuBtnClass('/manage_assistants')}
                    onClick={() => navigate('/manage_assistants')}
                  >
                    <Image src="/settings.svg" alt="" width={18} height={18} />
                    <span className={styles.menuBtnLabel}>Manage Assistants</span>
                    {isActive('/manage_assistants') ? (
                      <span className={styles.menuActiveDot} aria-hidden="true" />
                    ) : null}
                  </button>
                ) : null}

                {isSubscriptionEnabled && userData.role === 'developer' ? (
                  <button
                    type="button"
                    className={menuBtnClass('/subscription_dashboard')}
                    onClick={() => navigate('/subscription_dashboard')}
                  >
                    <Image src="/dollar.svg" alt="" width={20} height={20} />
                    <span className={styles.menuBtnLabel}>Subscription Dashboard</span>
                    {isActive('/subscription_dashboard') ? (
                      <span className={styles.menuActiveDot} aria-hidden="true" />
                    ) : null}
                  </button>
                ) : null}

                <button
                  type="button"
                  className={styles.menuBtn}
                  onClick={() => {
                    close();
                    setShowAppVideos(true);
                  }}
                >
                  <Image src="/video.svg" alt="" width={20} height={20} />
                  <span className={styles.menuBtnLabel}>Website Videos</span>
                </button>

                <button
                  type="button"
                  className={menuBtnClass('/contact_developer')}
                  onClick={() => navigate('/contact_developer')}
                >
                  <Image src="/message2.svg" alt="" width={20} height={20} />
                  <span className={styles.menuBtnLabel}>Contact Developer</span>
                  {isActive('/contact_developer') ? (
                    <span className={styles.menuActiveDot} aria-hidden="true" />
                  ) : null}
                </button>
              </>
            ) : null}
          </div>

          <div className={styles.menuFooter}>
            <div className={styles.waSection}>
              <button
                type="button"
                className={styles.waBtn}
                onClick={() => navigate('/')}
                aria-label="Open website home"
              >
                <Image
                  src="/online2.svg"
                  alt=""
                  width={22}
                  height={22}
                  className={`${styles.waIcon} ${styles.websiteIcon}`}
                  aria-hidden="true"
                />
                <span className={styles.waLabel}>Website</span>
              </button>
            </div>
          </div>
            </>
          )}
        </div>
      </Drawer>

      <AppVideosModal
        isOpen={showAppVideos}
        onClose={() => setShowAppVideos(false)}
        role={userData.role}
      />
    </div>
  );
}
