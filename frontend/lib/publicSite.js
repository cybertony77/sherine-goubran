export const PUBLIC_SITE_ROUTES = [
  '/',
  '/about',
  '/services',
  '/events_&_workshops',
  '/events-and-workshops',
  '/reviews',
  '/blogs',
  '/contact',
];

export function isPublicSitePage(pathname = '') {
  const path = String(pathname || '').split('?')[0];
  if (!path) return false;
  if (path === '/404' || path === '/_error' || path === '/500') return false;
  return PUBLIC_SITE_ROUTES.some(
    (route) => path === route || (route !== '/' && path.startsWith(`${route}/`))
  );
}

export function firstNameFromFullName(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0];
}
