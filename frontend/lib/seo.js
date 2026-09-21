// Client-safe: do not import Node modules (fs) here — pages import this file in the browser.
const FALLBACK_SITE_NAME = 'Sherine Goubran';
const FALLBACK_ORIGIN = 'https://sherinegoubran.com';
const FALLBACK_DESCRIPTION =
  'Life coaching, services, events, workshops, and insights from Sherine Goubran — supporting growth, clarity, and meaningful change.';

export function getSiteName(override) {
  const fromOverride = String(override || '').trim();
  if (fromOverride) return fromOverride;
  return (
    String(
      process.env.NEXT_PUBLIC_SYSTEM_NAME || process.env.SYSTEM_NAME || ''
    ).trim() || FALLBACK_SITE_NAME
  );
}

export function getSiteOrigin(override) {
  const fromOverride = String(override || '').trim();
  if (fromOverride) return normalizeOrigin(fromOverride);
  const raw =
    String(
      process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.SYSTEM_DOMAIN ||
        process.env.NEXT_PUBLIC_SYSTEM_DOMAIN ||
        ''
    ).trim() || FALLBACK_ORIGIN;
  return normalizeOrigin(raw);
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

export function absoluteUrl(pathname = '/', originOverride) {
  const origin = getSiteOrigin(originOverride);
  const path = String(pathname || '/').trim() || '/';
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${normalized === '/' ? '' : normalized}` || `${origin}/`;
}

export function absoluteMediaUrl(src, originOverride) {
  const value = String(src || '').trim();
  if (!value) return absoluteUrl('/logo.png', originOverride);
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return absoluteUrl(value, originOverride);
  const parts = value
    .split('/')
    .map((p) => encodeURIComponent(p))
    .join('/');
  return absoluteUrl(`/api/files/${parts}`, originOverride);
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

export function getDefaultDescription(siteName) {
  const name = getSiteName(siteName);
  if (name && name !== FALLBACK_SITE_NAME) {
    return `Life coaching, services, events, workshops, and insights from ${name} — supporting growth, clarity, and meaningful change.`;
  }
  return FALLBACK_DESCRIPTION;
}

/** Strip query/hash and trailing slash (except root). */
export function normalizeSeoPath(pathname) {
  let path = String(pathname || '/')
    .split('?')[0]
    .split('#')[0]
    .trim();
  if (!path) return '/';
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path;
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

export const INDEXABLE_PATHS = Object.keys(PUBLIC_STATIC_SEO);

export const INDEXABLE_PATH_SET = new Set([
  ...INDEXABLE_PATHS,
  '/events-and-workshops',
]);

const INDEXABLE_PREFIXES = [
  '/services/',
  '/blogs/',
  '/events_&_workshops/',
  '/events-and-workshops/',
];

export function isIndexablePath(pathname) {
  const path = normalizeSeoPath(pathname);
  if (INDEXABLE_PATH_SET.has(path)) return true;
  if (
    path === '/services/[slug]' ||
    path === '/blogs/[slug]' ||
    path === '/events_&_workshops/[slug]' ||
    path === '/events-and-workshops/[slug]'
  ) {
    return true;
  }
  return INDEXABLE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Private / sensitive path prefixes — must never be in sitemap and should be noindex.
 */
export const PRIVATE_SEO_DISALLOW_PREFIXES = [
  '/dashboard',
  '/login',
  '/forgot_password',
  '/edit_my_profile',
  '/manage_assistants',
  '/subscription_dashboard',
  '/contact_developer',
  '/leave-a-review',
  '/api/',
];

function privateDesc(action, siteName) {
  const name = getSiteName(siteName);
  return `${action} in the ${name} website.`;
}

function titleFromSegment(path) {
  const segment = path.split('/').filter(Boolean).pop() || 'Page';
  return segment
    .replace(/\[|\]/g, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Title + description for every app route.
 * Public routes use marketing copy; private routes stay noindex but still
 * get a clear browser title: "Page Name | SYSTEM_NAME".
 */
export function getPageSeo(pathname, siteName) {
  const name = getSiteName(siteName);
  const path = normalizeSeoPath(pathname);
  const aliased =
    path === '/events-and-workshops' || path === '/events-and-workshops/[slug]'
      ? path.replace('/events-and-workshops', '/events_&_workshops')
      : path;

  if (PUBLIC_STATIC_SEO[aliased]) {
    const item = PUBLIC_STATIC_SEO[aliased];
    return {
      title: item.title,
      description: item.description,
      keywords: item.keywords,
    };
  }

  const dynamicPublicMap = {
    '/services/[slug]': {
      title: 'Service',
      description: `Explore a coaching service with ${name}.`,
    },
    '/blogs/[slug]': {
      title: 'Blog',
      description: `Read an article from ${name}.`,
    },
    '/events_&_workshops/[slug]': {
      title: 'Event',
      description: `Learn about an event or workshop with ${name}.`,
    },
  };

  if (dynamicPublicMap[aliased]) return dynamicPublicMap[aliased];

  const privateMap = {
    '/login': {
      title: 'Login',
      description: privateDesc('Sign in to manage the website', name),
    },
    '/forgot_password': {
      title: 'Forgot Password',
      description: privateDesc('Reset your account password', name),
    },
    '/edit_my_profile': {
      title: 'Edit My Profile',
      description: privateDesc('Update your profile details', name),
    },
    '/contact_developer': {
      title: 'Contact Developer',
      description: `Contact Tony Joseph — Business Owner & Software Developer — for ${name} technical support and system help.`,
    },
    '/404': {
      title: 'Page Not Found',
      description: `The page you requested was not found on ${name}.`,
    },
    '/leave-a-review/[slug]': {
      title: 'Leave a Review',
      description: `Share your experience with ${name}.`,
    },

    '/dashboard': {
      title: 'Dashboard',
      description: privateDesc('Open the website dashboard', name),
    },
    '/dashboard/personal_info': {
      title: 'Personal Info',
      description: privateDesc('Manage personal information shown on the site', name),
    },
    '/dashboard/certificates': {
      title: 'Certificates',
      description: privateDesc('Manage certificates', name),
    },
    '/dashboard/services': {
      title: 'Services',
      description: privateDesc('Manage coaching services', name),
    },
    '/dashboard/services/add': {
      title: 'Add Service',
      description: privateDesc('Create a new service', name),
    },
    '/dashboard/services/edit': {
      title: 'Edit Service',
      description: privateDesc('Edit an existing service', name),
    },
    '/dashboard/events_workshops': {
      title: 'Events & Workshops',
      description: privateDesc('Manage events and workshops', name),
    },
    '/dashboard/events_workshops/add': {
      title: 'Add Event',
      description: privateDesc('Create a new event or workshop', name),
    },
    '/dashboard/events_workshops/edit': {
      title: 'Edit Event',
      description: privateDesc('Edit an existing event or workshop', name),
    },
    '/dashboard/categories': {
      title: 'Categories',
      description: privateDesc('Manage content categories', name),
    },
    '/dashboard/reviews': {
      title: 'Reviews',
      description: privateDesc('Manage published reviews', name),
    },
    '/dashboard/public_reviews': {
      title: 'Public Reviews',
      description: privateDesc('Manage public review pages', name),
    },
    '/dashboard/pending_reviews': {
      title: 'Pending Reviews',
      description: privateDesc('Review and approve pending feedback', name),
    },
    '/dashboard/blogs': {
      title: 'Blogs',
      description: privateDesc('Manage blog posts', name),
    },
    '/dashboard/blogs/add': {
      title: 'Add Blog',
      description: privateDesc('Create a new blog post', name),
    },
    '/dashboard/blogs/edit': {
      title: 'Edit Blog',
      description: privateDesc('Edit an existing blog post', name),
    },
    '/dashboard/contact': {
      title: 'Contact Page',
      description: privateDesc('Manage the public contact page', name),
    },
    '/dashboard/messages': {
      title: 'Messages',
      description: privateDesc('Read and reply to contact messages', name),
    },

    '/manage_assistants': {
      title: 'Manage Assistants',
      description: privateDesc('Manage assistant and admin accounts', name),
    },
    '/manage_assistants/all_assistants': {
      title: 'All Assistants',
      description: privateDesc('Browse assistant and admin accounts', name),
    },
    '/manage_assistants/add_assistant': {
      title: 'Add Assistant',
      description: privateDesc('Create an assistant or admin account', name),
    },
    '/manage_assistants/edit_assistant': {
      title: 'Edit Assistant',
      description: privateDesc('Edit an assistant or admin account', name),
    },
    '/manage_assistants/delete_assistant': {
      title: 'Delete Assistant',
      description: privateDesc('Delete an assistant account', name),
    },

    '/subscription_dashboard': {
      title: 'Subscription Dashboard',
      description: privateDesc('View subscription usage', name),
    },
    '/subscription_dashboard/hourly': {
      title: 'Hourly Subscription',
      description: privateDesc('View hourly subscription usage', name),
    },
    '/subscription_dashboard/daily': {
      title: 'Daily Subscription',
      description: privateDesc('View daily subscription usage', name),
    },
    '/subscription_dashboard/monthly': {
      title: 'Monthly Subscription',
      description: privateDesc('View monthly subscription usage', name),
    },
    '/subscription_dashboard/yearly': {
      title: 'Yearly Subscription',
      description: privateDesc('View yearly subscription usage', name),
    },
    '/subscription_dashboard/minutely': {
      title: 'Minutely Subscription',
      description: privateDesc('View minutely subscription usage', name),
    },
    '/subscription_dashboard/cancel': {
      title: 'Cancel Subscription',
      description: privateDesc('Cancel a subscription plan', name),
    },
  };

  if (privateMap[path]) return privateMap[path];

  if (path.startsWith('/leave-a-review/')) {
    return privateMap['/leave-a-review/[slug]'];
  }
  if (path.startsWith('/services/')) {
    return dynamicPublicMap['/services/[slug]'];
  }
  if (path.startsWith('/blogs/')) {
    return dynamicPublicMap['/blogs/[slug]'];
  }
  if (path.startsWith('/events_&_workshops/') || path.startsWith('/events-and-workshops/')) {
    return dynamicPublicMap['/events_&_workshops/[slug]'];
  }

  const title = titleFromSegment(path);
  return {
    title,
    description: privateDesc(`Open ${title}`, name),
  };
}

/** Alias kept for public page imports. */
export function getPublicPageSeo(path, siteName) {
  return getPageSeo(path, siteName);
}

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
