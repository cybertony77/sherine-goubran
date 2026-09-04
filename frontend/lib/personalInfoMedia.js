export function isVideoMediaKey(key = '') {
  return /\.(mp4|webm|ogg|ogv|mov|avi|mkv|m4v)$/i.test(String(key));
}

export function isImageMediaKey(key = '') {
  return /\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i.test(String(key));
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

/**
 * Resolve separate hero image/video keys with backward compatibility for
 * legacy `hero_section_media` (single field that was either image or video).
 */
export function resolveHeroMediaFields(doc = {}) {
  let imageKey = String(doc?.hero_section_media_image || '').trim();
  let videoKey = String(doc?.hero_section_media_video || '').trim();
  const legacy = String(doc?.hero_section_media || '').trim();

  if (!imageKey && !videoKey && legacy) {
    if (isVideoMediaKey(legacy)) videoKey = legacy;
    else imageKey = legacy;
  }

  // Prefer dedicated signed URLs; fall back to legacy single signed URL when needed.
  let imageUrl = String(doc?.hero_section_media_image_url || '').trim();
  let videoUrl = String(doc?.hero_section_media_video_url || '').trim();
  const legacyUrl = String(doc?.hero_section_media_url || '').trim();

  if (!imageUrl && imageKey && legacy && imageKey === legacy && legacyUrl) {
    imageUrl = legacyUrl;
  }
  if (!videoUrl && videoKey && legacy && videoKey === legacy && legacyUrl) {
    videoUrl = legacyUrl;
  }

  return { imageKey, videoKey, imageUrl, videoUrl };
}
