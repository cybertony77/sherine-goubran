import { loadEnvConfig } from './marketingPageMongo';

const FALLBACK_SITE_NAME = 'Sherine Goubran';
const FALLBACK_ORIGIN = 'https://sherinegoubran.com';
const FALLBACK_DESCRIPTION =
  'Life coaching, services, events, workshops, and insights from Sherine Goubran — supporting growth, clarity, and meaningful change.';

export function getSiteName() {
  try {
    const env = loadEnvConfig();
    return (
      String(env.SYSTEM_NAME || process.env.SYSTEM_NAME || process.env.NEXT_PUBLIC_SYSTEM_NAME || '')
        .trim() || FALLBACK_SITE_NAME
    );
  } catch {
    return (
      String(process.env.SYSTEM_NAME || process.env.NEXT_PUBLIC_SYSTEM_NAME || '').trim() ||
      FALLBACK_SITE_NAME
    );
  }
}

export function getSiteOrigin() {
  try {
    const env = loadEnvConfig();
    const raw =
      String(env.SYSTEM_DOMAIN || process.env.SYSTEM_DOMAIN || process.env.NEXT_PUBLIC_SITE_URL || '')
        .trim() || FALLBACK_ORIGIN;
    return normalizeOrigin(raw);
  } catch {
    const raw =
      String(process.env.SYSTEM_DOMAIN || process.env.NEXT_PUBLIC_SITE_URL || '').trim() ||
      FALLBACK_ORIGIN;
    return normalizeOrigin(raw);
  }
}

export function normalizeOrigin(value) {
  let raw = String(value || '').trim();
  if (!raw) return FALLBACK_ORIGIN;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}`;
  } catch {
    return FALLBACK_ORIGIN;
  }
}

export function absoluteUrl(pathname = '/') {
  const origin = getSiteOrigin();
  const path = String(pathname || '/').trim() || '/';
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${normalized === '/' ? '' : normalized}` || `${origin}/`;
}

export function absoluteMediaUrl(src) {
  const value = String(src || '').trim();
  if (!value) return absoluteUrl('/logo.png');
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return absoluteUrl(value);
  const parts = value
    .split('/')
    .map((p) => encodeURIComponent(p))
    .join('/');
  return absoluteUrl(`/api/files/${parts}`);
}

export function buildPageTitle(pageTitle, siteName = getSiteName()) {
  const page = String(pageTitle || '').trim();
  const site = String(siteName || '').trim() || FALLBACK_SITE_NAME;
  if (!page) return site;
  if (page.toLowerCase() === site.toLowerCase()) return site;
  if (page.toLowerCase().endsWith(`| ${site.toLowerCase()}`)) return page;
  return `${page} | ${site}`;
}

export function truncateMeta(text, max = 160) {
  const clean = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return '';
  if (clean.length <= max) return clean;
  const sliced = clean.slice(0, max - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

export function getDefaultDescription() {
  return FALLBACK_DESCRIPTION;
}

/** Static public routes used by sitemap + default metadata. */
export const PUBLIC_STATIC_SEO = {
  '/': {
    title: 'Home',
    description: FALLBACK_DESCRIPTION,
    keywords: ['Sherine Goubran', 'life coach', 'coaching', 'personal growth'],
  },
  '/about': {
    title: "Sherine's Story",
    description:
      "Learn Sherine Goubran's story — her journey, experience, and the values behind her coaching work.",
    keywords: ['Sherine Goubran', 'about', 'story', 'life coach'],
  },
  '/services': {
    title: 'Services',
    description: 'Explore coaching services for different stages, needs, and goals with Sherine Goubran.',
    keywords: ['coaching services', 'life coaching', 'Sherine Goubran'],
  },
  '/events_&_workshops': {
    title: 'Events & Workshops',
    description:
      'Upcoming and previous events and workshops with Sherine Goubran — growth experiences you can join or revisit.',
    keywords: ['events', 'workshops', 'Sherine Goubran'],
  },
  '/reviews': {
    title: 'Reviews',
    description: 'What people say about working with Sherine Goubran — real experiences and feedback.',
    keywords: ['reviews', 'testimonials', 'Sherine Goubran'],
  },
  '/blogs': {
    title: 'Blogs',
    description:
      'Thoughts, experiences, and practical ideas from Sherine Goubran on life, mindset, relationships, and wellbeing.',
    keywords: ['blog', 'insights', 'Sherine Goubran'],
  },
  '/contact': {
    title: 'Contact Us',
    description:
      'Get in touch with Sherine Goubran — ask a question, book a session, or start a conversation about working together.',
    keywords: ['contact', 'Contact Us', 'Sherine Goubran'],
  },
};

export function organizationJsonLd({ siteName, origin, logoUrl }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: siteName,
    url: origin,
    image: logoUrl,
    jobTitle: 'Life Coach',
  };
}

export function websiteJsonLd({ siteName, origin }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: origin,
  };
}

export function breadcrumbJsonLd(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function serviceJsonLd({ name, description, url, image, providerName }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    url,
    provider: {
      '@type': 'Person',
      name: providerName,
    },
  };
  if (image) data.image = image;
  return data;
}

export function blogPostingJsonLd({
  title,
  description,
  url,
  image,
  datePublished,
  authorName,
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    url,
    mainEntityOfPage: url,
    author: {
      '@type': 'Person',
      name: authorName,
    },
  };
  if (image) data.image = image;
  if (datePublished) data.datePublished = datePublished;
  return data;
}

export function eventJsonLd({
  name,
  description,
  url,
  image,
  startDate,
  locationName,
  eventStatus,
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name,
    description,
    url,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: eventStatus || 'https://schema.org/EventScheduled',
  };
  if (image) data.image = image;
  if (startDate) data.startDate = startDate;
  if (locationName) {
    data.location = {
      '@type': 'Place',
      name: locationName,
    };
  }
  return data;
}
