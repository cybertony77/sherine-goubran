import { NextResponse } from 'next/server';

function getAllowedOrigins() {
  const set = new Set(['http://localhost:3000', 'http://127.0.0.1:3000']);
  const domain = String(process.env.SYSTEM_DOMAIN || process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  if (domain) {
    try {
      const u = new URL(domain.includes('://') ? domain : `https://${domain}`);
      set.add(u.origin);
    } catch {
      /* ignore */
    }
  }
  const extra = String(process.env.CORS_ALLOWED_ORIGINS || '');
  extra
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((o) => set.add(o));
  return set;
}

function corsHeadersFor(request) {
  const origin = request.headers.get('origin');
  const allowed = getAllowedOrigins();
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers':
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (origin && allowed.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

export function middleware(request) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: corsHeadersFor(request),
      });
    }

    const response = NextResponse.next();
    const cors = corsHeadersFor(request);
    Object.entries(cors).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
