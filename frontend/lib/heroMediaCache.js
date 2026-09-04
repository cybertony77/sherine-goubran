import { isVideoMediaKey } from './personalInfoMedia';

const memoryUrls = new Map();
const inflight = new Map();

function proxyPathFromKey(key) {
  const parts = String(key)
    .split('/')
    .map((p) => encodeURIComponent(p))
    .join('/');
  return isVideoMediaKey(key) ? `/api/videos/${parts}` : `/api/files/${parts}`;
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

/**
 * Resolve a playable/display URL for hero media without downloading the full file.
 * Prefer a server-provided R2 presigned URL so the browser can stream directly.
 */
export async function loadHeroMediaOnce(key, providedUrl = '') {
  const mediaKey = String(key || '').trim();
  if (!mediaKey) {
    memoryUrls.clear();
    inflight.clear();
    return '';
  }

  if (memoryUrls.has(mediaKey)) return memoryUrls.get(mediaKey);
  if (inflight.has(mediaKey)) return inflight.get(mediaKey);

  const pending = Promise.resolve()
    .then(() => {
      if (isHttpUrl(mediaKey) || mediaKey.startsWith('/')) {
        return mediaKey;
      }
      if (isHttpUrl(providedUrl)) {
        return String(providedUrl).trim();
      }
      return proxyPathFromKey(mediaKey);
    })
    .then((url) => {
      memoryUrls.set(mediaKey, url);
      return url;
    })
    .finally(() => {
      inflight.delete(mediaKey);
    });

  inflight.set(mediaKey, pending);
  return pending;
}

/** Clear in-memory hero URL cache (e.g. after admin replaces media). */
export async function resetHeroMediaCache() {
  memoryUrls.clear();
  inflight.clear();
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem('public-hero-media-key');
  } catch {
    /* ignore */
  }
  if ('caches' in window) {
    try {
      await caches.delete('public-hero-media-v2');
    } catch {
      /* ignore */
    }
  }
}
