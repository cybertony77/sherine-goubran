export function isVideoMediaKey(key = '') {
  return /\.(mp4|webm|ogg|ogv|mov|avi|mkv|m4v)$/i.test(String(key));
}

export function mediaSrcFromKey(key) {
  if (!key) return '';
  if (/^https?:\/\//i.test(key) || String(key).startsWith('/')) return key;
  const parts = String(key)
    .split('/')
    .map((p) => encodeURIComponent(p))
    .join('/');
  return isVideoMediaKey(key) ? `/api/videos/${parts}` : `/api/files/${parts}`;
}
