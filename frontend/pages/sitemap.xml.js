import {
  absoluteUrl,
  getSiteOrigin,
} from '../lib/seo';
import {
  fetchActivatedBlogSlugs,
  fetchActivatedEventSlugs,
  fetchActivatedServiceSlugs,
} from '../lib/seoPublicData.server';
import { EVENTS_PUBLIC_PATH } from '../lib/eventSlug';

const STATIC_PATHS = [
  '/',
  '/about',
  '/services',
  EVENTS_PUBLIC_PATH,
  '/reviews',
  '/blogs',
  '/contact',
];

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc, changefreq = 'weekly', priority = '0.7') {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function SiteMap() {
  return null;
}

export async function getServerSideProps({ res }) {
  const origin = getSiteOrigin();
  let serviceSlugs = [];
  let blogSlugs = [];
  let eventSlugs = [];

  try {
    [serviceSlugs, blogSlugs, eventSlugs] = await Promise.all([
      fetchActivatedServiceSlugs(),
      fetchActivatedBlogSlugs(),
      fetchActivatedEventSlugs(),
    ]);
  } catch (err) {
    console.error('[sitemap] Failed to load dynamic slugs:', err?.message || err);
  }

  const urls = [
    ...STATIC_PATHS.map((path) =>
      urlEntry(absoluteUrl(path), path === '/' ? 'daily' : 'weekly', path === '/' ? '1.0' : '0.8')
    ),
    ...serviceSlugs.map((item) =>
      urlEntry(absoluteUrl(`/services/${encodeURIComponent(item.slug)}`), 'weekly', '0.7')
    ),
    ...eventSlugs.map((item) =>
      urlEntry(
        absoluteUrl(`${EVENTS_PUBLIC_PATH}/${encodeURIComponent(item.slug)}`),
        'weekly',
        '0.7'
      )
    ),
    ...blogSlugs.map((item) =>
      urlEntry(absoluteUrl(`/blogs/${encodeURIComponent(item.slug)}`), 'weekly', '0.7')
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(xml);
  res.end();

  return { props: { origin } };
}

export default SiteMap;
