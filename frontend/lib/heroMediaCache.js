import { isVideoMediaKey } from './personalInfoMedia';

const HERO_CACHE_NAME = 'public-hero-media-v2';
const HERO_KEY_STORAGE = 'public-hero-media-key';
const memoryUrls = new Map();
const inflight = new Map();

function cachePath(key) {
  return `/__hero-media__/${encodeURIComponent(key)}`;
}

function proxyPathFromKey(key) {
  const parts = String(key)
    .split('/')
    .map((p) => encodeURIComponent(p))
    .join('/');
  return isVideoMediaKey(key) ? `/api/videos/${parts}` : `/api/files/${parts}`;
}

function revokeUrl(url) {
  if (url && String(url).startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
}

export async function resetHeroMediaCache() {
  memoryUrls.forEach((url) => revokeUrl(url));
  memoryUrls.clear();
  inflight.clear();
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(HERO_KEY_STORAGE);
  } catch {
    /* ignore */
  }
  if (!('caches' in window)) return;
  try {
    await caches.delete(HERO_CACHE_NAME);
  } catch {
    /* ignore */
  }
}

async function rememberCurrentKey(key) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HERO_KEY_STORAGE, key || '');
  } catch {
    /* ignore */
  }
}

function readStoredKey() {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(HERO_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

async function readCachedBlob(key) {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await caches.open(HERO_CACHE_NAME);
    const match = await cache.match(cachePath(key));
    if (!match) return null;
    return await match.blob();
  } catch {
    return null;
  }
}

async function writeCachedBlob(key, blob) {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await caches.open(HERO_CACHE_NAME);
    await cache.put(
      cachePath(key),
      new Response(blob, {
        headers: {
          'Content-Type': blob.type || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    );
  } catch {
    /* quota/private mode */
  }
}

function remember(key, url) {
  memoryUrls.set(key, url);
  return url;
}

async function resolveMediaUrl(key, providedUrl) {
  if (/^https?:\/\//i.test(key) || String(key).startsWith('/')) return String(key);
  if (providedUrl && /^https?:\/\//i.test(providedUrl)) return providedUrl;
  return proxyPathFromKey(key);
}

async function loadOnce(key, providedUrl) {
  const cachedMem = memoryUrls.get(key);
  if (cachedMem) return cachedMem;

  const cachedBlob = await readCachedBlob(key);
  if (cachedBlob && cachedBlob.size > 0) {
    return remember(key, URL.createObjectURL(cachedBlob));
  }

  const remoteUrl = await resolveMediaUrl(key, providedUrl);
  const res = await fetch(remoteUrl);
  if (!res.ok) throw new Error('Failed to download media');
  const blob = await res.blob();
  if (blob && blob.size > 0) {
    await writeCachedBlob(key, blob);
    return remember(key, URL.createObjectURL(blob));
  }
  return remember(key, remoteUrl);
}

export async function loadHeroMediaOnce(key, providedUrl = '') {
  if (!key) {
    await resetHeroMediaCache();
    return '';
  }

  const storedKey = readStoredKey();
  if (storedKey && storedKey !== key) {
    await resetHeroMediaCache();
  }
  await rememberCurrentKey(key);

  if (memoryUrls.has(key)) return memoryUrls.get(key);
  if (inflight.has(key)) return inflight.get(key);

  const pending = loadOnce(key, providedUrl).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, pending);
  return pending;
}
