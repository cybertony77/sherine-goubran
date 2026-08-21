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

export default function MyDocument({
  systemBackground,
  brandCssVars,
  themeColor,
  systemName,
}) {
  const bg = systemBackground || DEFAULT_SYSTEM_BACKGROUND;
  const vars = brandCssVars || buildSystemColorCssVars({ background: bg });
  const theme = themeColor || BRAND_PALETTE.primary;
  const name = systemName || "Sherine Goubran";

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

        {/* Theme & App Settings */}
        <meta name="theme-color" content={theme} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={name} />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta property="og:title" content={name} />
        <meta property="og:description" content={name} />
        <meta property="og:image" content="/icons/apple-icon-180.png" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_US" />

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
  return {
    ...initialProps,
    systemBackground: brand.background,
    brandCssVars: buildSystemColorCssVars(brand),
    themeColor: brand.primary,
    systemName: loadSystemNameFromEnv(),
  };
};
