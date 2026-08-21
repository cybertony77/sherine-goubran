import { isPublicSitePage } from './publicSite';

export function normalizeClientPath(url = '') {
  const raw = String(url || '')
    .split('#')[0]
    .split('?')[0]
    .trim();
  if (!raw) return '/';
  if (raw !== '/' && raw.endsWith('/')) return raw.replace(/\/+$/, '');
  return raw;
}

export function isPublicPortfolioPath(url = '') {
  const path = normalizeClientPath(url);
  if (isPublicSitePage(path)) return true;
  return path === '/leave-a-review' || path.startsWith('/leave-a-review/');
}

const PREFIX_NAMES = [
  ['/events_&_workshops', 'EVENTS & WORKSHOPS'],
  ['/events-and-workshops', 'EVENTS & WORKSHOPS'],
  ['/leave-a-review', 'LEAVE A REVIEW'],
  ['/services', 'SERVICES'],
  ['/reviews', 'REVIEWS'],
  ['/contact', 'CONTACT'],
  ['/about', 'ABOUT'],
  ['/blogs', 'BLOGS'],
];

export function getPublicPageName(url = '') {
  const path = normalizeClientPath(url);
  if (path === '/') return 'HOME';

  const eventDetailMatch =
    (path.startsWith('/events_&_workshops/') && path !== '/events_&_workshops') ||
    (path.startsWith('/events-and-workshops/') && path !== '/events-and-workshops');
  if (eventDetailMatch) {
    if (typeof window !== 'undefined') {
      const stored = window.sessionStorage.getItem('eventPreloaderName');
      if (stored === 'WORKSHOP' || stored === 'EVENT') return stored;
    }
    return 'EVENT';
  }

  for (const [prefix, name] of PREFIX_NAMES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return name;
    }
  }

  const segment = path.split('/').filter(Boolean)[0] || '';
  if (!segment) return 'HOME';
  return segment.replace(/[_-]+/g, ' ').toUpperCase();
}
