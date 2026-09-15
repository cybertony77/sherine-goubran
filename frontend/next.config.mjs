import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvConfig() {
  try {
    const candidates = [
      path.join(__dirname, '..', 'env.config'),
      path.join(__dirname, 'env.config'),
    ];
    const envPath = candidates.find((p) => fs.existsSync(p));
    if (!envPath) return {};

    const envVars = {};
    fs.readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const index = trimmed.indexOf('=');
        if (index === -1) return;
        const key = trimmed.substring(0, index).trim();
        let value = trimmed.substring(index + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        envVars[key] = value;
      });
    return envVars;
  } catch {
    return {};
  }
}

const fileEnv = loadEnvConfig();
const systemName =
  String(fileEnv.SYSTEM_NAME || process.env.SYSTEM_NAME || '').trim() || 'Sherine Goubran';
const systemDomainRaw =
  String(fileEnv.SYSTEM_DOMAIN || process.env.SYSTEM_DOMAIN || process.env.NEXT_PUBLIC_SITE_URL || '')
    .trim() || 'https://sherinegoubran.com';
let systemSiteUrl = 'https://sherinegoubran.com';
try {
  const withProtocol = /^https?:\/\//i.test(systemDomainRaw)
    ? systemDomainRaw
    : `https://${systemDomainRaw}`;
  const parsed = new URL(withProtocol);
  systemSiteUrl = `${parsed.protocol}//${parsed.host}`;
} catch {
  systemSiteUrl = 'https://sherinegoubran.com';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  devIndicators: false,
  env: {
    NEXT_PUBLIC_SYSTEM_NAME: systemName,
    NEXT_PUBLIC_SITE_URL: systemSiteUrl,
  },
  // Keep next/image unoptimized for now (we serve Cloudinary URLs that already
  // expose their own CDN-level optimizations). `remotePatterns` is still
  // declared so we can flip `unoptimized` off later without code changes.
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
    domains: ['localhost', '192.168.1.8'],
  },
  // Workaround for Windows + Turbopack file watching latency under WSL/OneDrive.
  // Increase the dev-server keep-alive so very slow Cloudinary uploads (large
  // PDFs over a poor connection) aren't killed by the Next.js HTTP server
  // before they complete.
  experimental: {
    proxyTimeout: 30 * 60 * 1000, // 30 minutes for large Cloudinary uploads
  },
  async redirects() {
    return [
      { source: '/dashboard/testimonials', destination: '/dashboard/reviews', permanent: true },
      { source: '/dashboard/public_testimonials', destination: '/dashboard/public_reviews', permanent: true },
      { source: '/events-and-workshops', destination: '/events_&_workshops', permanent: true },
      { source: '/events-and-workshops/:slug', destination: '/events_&_workshops/:slug', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Permissions-Policy', value: 'camera=(self)' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
      {
        source: '/logo.png',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000',
          },
        ],
      },
      {
        source: '/:path*.svg',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
