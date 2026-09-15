import { authMiddleware, isAuthError } from '../../../lib/authMiddleware';
import { applyCorsHeaders, getAllowedCorsOrigins } from '../../../lib/corsAllowlist';
import {
  assertR2Config,
  assertSafeObjectKey,
  ensureR2CorsForBrowserUploads,
  getR2Config,
  signR2GetUrl,
} from '../../../lib/r2Server';

/** 6h expiry with client-side smart refresh before expiration. */
const PRESIGN_GET_EXPIRES_SEC = 6 * 60 * 60;

function getKeyFromRequest(req) {
  if (req.method === 'GET') {
    const raw = req.query.key;
    if (Array.isArray(raw)) return raw[0];
    return raw;
  }
  return req.body?.key;
}

export default async function handler(req, res) {
  if (!applyCorsHeaders(req, res, { methods: 'GET, POST, OPTIONS' })) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Any authenticated role may resolve a key they already know
    await authMiddleware(req);

    const cfg = getR2Config();
    assertR2Config(cfg);

    const requestOrigin = req.headers.origin || '';
    const corsOrigin =
      requestOrigin && getAllowedCorsOrigins().has(requestOrigin) ? requestOrigin : '';
    await ensureR2CorsForBrowserUploads(cfg, corsOrigin);

    let key;
    try {
      key = getKeyFromRequest(req);
      assertSafeObjectKey(key);
    } catch {
      return res.status(400).json({ error: 'Invalid key' });
    }

    const signedUrl = await signR2GetUrl(key, PRESIGN_GET_EXPIRES_SEC);

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    res.json({
      signedUrl,
      expiresIn: PRESIGN_GET_EXPIRES_SEC,
    });
  } catch (error) {
    if (isAuthError(error)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('R2 video URL error:', error);
    const status = error.statusCode || 500;
    res.status(status).json({
      error: 'Failed to generate video URL',
    });
  }
}
