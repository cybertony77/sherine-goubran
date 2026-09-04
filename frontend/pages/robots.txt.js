import { absoluteUrl, getSiteOrigin } from '../lib/seo';

function Robots() {
  return null;
}

export async function getServerSideProps({ res }) {
  const origin = getSiteOrigin();
  const sitemapUrl = absoluteUrl('/sitemap.xml');

  const body = `# ${origin}
User-agent: *
Allow: /
Allow: /api/files/
Allow: /api/videos/

# Private / authenticated areas
Disallow: /dashboard
Disallow: /dashboard/
Disallow: /login
Disallow: /forgot_password
Disallow: /edit_my_profile
Disallow: /manage_assistants
Disallow: /manage_assistants/
Disallow: /subscription_dashboard
Disallow: /subscription_dashboard/
Disallow: /contact_developer
Disallow: /leave-a-review
Disallow: /leave-a-review/
Disallow: /api/

# Re-allow media endpoints used by Open Graph / page content
Allow: /api/files/
Allow: /api/videos/

Sitemap: ${sitemapUrl}
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.write(body);
  res.end();

  return { props: {} };
}

export default Robots;
