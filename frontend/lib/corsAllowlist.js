import fs from 'fs';
import path from 'path';

function loadEnvConfig() {
  try {
    const candidates = [
      path.join(process.cwd(), '..', 'env.config'),
      path.join(process.cwd(), 'env.config'),
    ];
    let envContent = null;
    for (const envPath of candidates) {
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
        break;
      }
    }
    if (!envContent) return {};
    const envVars = {};
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const index = trimmed.indexOf('=');
        if (index !== -1) {
          const key = trimmed.substring(0, index).trim();
          let value = trimmed.substring(index + 1).trim();
          value = value.replace(/^"|"$/g, '');
          envVars[key] = value;
        }
      }
    });
    return envVars;
  } catch {
    return {};
  }
}

const envConfig = loadEnvConfig();

/**
 * Allowed browser Origins for credentialed CORS (uploads).
 * Includes SYSTEM_DOMAIN and common local-dev origins.
 */
export function getAllowedCorsOrigins() {
  const set = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]);
  const domain = String(envConfig.SYSTEM_DOMAIN || process.env.SYSTEM_DOMAIN || '').trim();
  if (domain) {
    try {
      const u = new URL(domain.includes('://') ? domain : `https://${domain}`);
      set.add(u.origin);
    } catch {
      /* ignore */
    }
  }
  const extra = String(envConfig.CORS_ALLOWED_ORIGINS || process.env.CORS_ALLOWED_ORIGINS || '');
  extra
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((o) => set.add(o));
  return set;
}

/** Apply CORS headers if Origin is allow-listed. Returns true if allowed (or no Origin). */
export function applyCorsHeaders(req, res, { methods = 'POST, OPTIONS' } = {}) {
  const origin = req.headers.origin;
  const allowed = getAllowedCorsOrigins();
  if (!origin) {
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return true;
  }
  let ok = allowed.has(origin);
  // Local/dev LAN origins (same-network testing) when not production
  if (!ok && process.env.NODE_ENV !== 'production') {
    try {
      const u = new URL(origin);
      const host = u.hostname;
      if (
        u.protocol === 'http:' &&
        (host === 'localhost' ||
          host === '127.0.0.1' ||
          /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
          /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
          /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host))
      ) {
        ok = true;
      }
    } catch {
      /* ignore */
    }
  }
  if (!ok) {
    return false;
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');
  return true;
}
