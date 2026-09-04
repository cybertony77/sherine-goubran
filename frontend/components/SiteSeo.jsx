import Head from 'next/head';
import {
  absoluteMediaUrl,
  absoluteUrl,
  buildPageTitle,
  getDefaultDescription,
  getSiteName,
  truncateMeta,
} from '../lib/seo';

function asJsonLd(data) {
  if (!data) return [];
  return Array.isArray(data) ? data.filter(Boolean) : [data];
}

/**
 * Pages Router SEO head for public pages.
 * Title template: "Page Title | Website Name"
 */
export default function SiteSeo({
  title,
  description,
  path = '/',
  image,
  type = 'website',
  keywords,
  noindex = false,
  jsonLd,
}) {
  const siteName = getSiteName();
  const fullTitle = buildPageTitle(title, siteName);
  const metaDescription = truncateMeta(description || getDefaultDescription());
  const canonical = absoluteUrl(path);
  const ogImage = absoluteMediaUrl(image || '/logo.png');
  const robots = noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large';
  const keywordContent = Array.isArray(keywords)
    ? keywords.filter(Boolean).join(', ')
    : String(keywords || '').trim();
  const schemas = asJsonLd(jsonLd);

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      {keywordContent ? <meta name="keywords" content={keywordContent} /> : null}
      <meta name="robots" content={robots} />
      <meta name="googlebot" content={robots} />
      <link rel="canonical" href={canonical} />

      <meta property="og:site_name" content={siteName} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={String(title || siteName)} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImage} />

      {schemas.map((schema, index) => (
        <script
          // eslint-disable-next-line react/no-danger
          key={`jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </Head>
  );
}
