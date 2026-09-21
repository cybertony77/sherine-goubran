import Document, { Html, Head, Main, NextScript } from "next/document";
import {
  DEFAULT_SYSTEM_BACKGROUND,
  buildSystemColorCssVars,
  BRAND_PALETTE,
} from "../lib/systemColors";
import {
  loadSystemBrandColorsFromEnv,
  loadSystemNameFromEnv,
} from "../lib/systemColors.server";
import {
  absoluteMediaUrl,
  buildPageTitle,
  getPageSeo,
  getSiteOrigin,
  normalizeSeoPath,
} from "../lib/seo";

function resolveRequestPath(ctx) {
  const raw = String(ctx?.asPath || ctx?.pathname || ctx?.req?.url || "/");
  return normalizeSeoPath(raw);
}

export default function MyDocument({
  systemBackground,
  brandCssVars,
  themeColor,
  systemName,
  siteOrigin,
  pageSeo,
}) {
  const bg = systemBackground || DEFAULT_SYSTEM_BACKGROUND;
  const vars = brandCssVars || buildSystemColorCssVars({ background: bg });
  const theme = themeColor || BRAND_PALETTE.primary;
  const name = systemName || "Sherine Goubran";
  const seo = pageSeo || getPageSeo("/", name);
  const fullTitle = buildPageTitle(seo.title, name);
  const ogImage = absoluteMediaUrl("/logo.png", siteOrigin);

  return (
    <Html lang="en">
      <Head>
        {/* Render-blocking: first paint uses env SYSTEM_COLORS (no wrong-color flash) */}
        <link rel="stylesheet" href="/api/system/colors.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{${vars};}html,body{background:var(--system-page-bg);background-attachment:fixed;}`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var b=${JSON.stringify(bg)};document.documentElement.style.setProperty('--system-page-bg',b);sessionStorage.setItem('system-page-bg',b);}catch(e){}})();`,
          }}
        />

        {/* Font Awesome */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"
        />

        {/* Theme & App Settings — page-level SiteSeo overrides titles/descriptions */}
        <meta name="theme-color" content={theme} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={name} />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="application-name" content={name} />

        {/*
          Path-specific SSR defaults for crawlers.
          Stable keys let SiteSeo replace these on hydrate / navigation.
        */}
        <meta key="description" name="description" content={seo.description} />
        <meta key="og:site_name" property="og:site_name" content={name} />
        <meta key="og:type" property="og:type" content="website" />
        <meta key="og:locale" property="og:locale" content="en_US" />
        <meta key="og:title" property="og:title" content={fullTitle} />
        <meta key="og:description" property="og:description" content={seo.description} />
        <meta key="og:image" property="og:image" content={ogImage} />

        {/* Camera Permission Policy */}
        <meta httpEquiv="Permissions-Policy" content="camera=(self)" />

        {/* Icons for iOS */}
        <link rel="apple-touch-icon" href="/icons/apple-icon-180.png" />
      </Head>
      <body>
        <noscript>
          <style>{`[data-page-preloader="true"]{display:none!important;}`}</style>
        </noscript>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

MyDocument.getInitialProps = async (ctx) => {
  const initialProps = await Document.getInitialProps(ctx);
  const requestPath = resolveRequestPath(ctx);
  let brand = {
    primary: BRAND_PALETTE.primary,
    secondary: BRAND_PALETTE.secondary,
    background: DEFAULT_SYSTEM_BACKGROUND,
  };
  try {
    brand = loadSystemBrandColorsFromEnv();
  } catch {
    /* keep default */
  }
  const systemName = loadSystemNameFromEnv();
  const siteOrigin = getSiteOrigin();
  const pageSeo = getPageSeo(requestPath, systemName);
  return {
    ...initialProps,
    systemBackground: brand.background,
    brandCssVars: buildSystemColorCssVars(brand),
    themeColor: brand.primary,
    systemName,
    siteOrigin,
    pageSeo,
  };
};
