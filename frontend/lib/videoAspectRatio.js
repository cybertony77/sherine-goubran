export const DEFAULT_VIDEO_ASPECT_RATIO = '16 / 9';

export function aspectRatioFromDimensions(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return DEFAULT_VIDEO_ASPECT_RATIO;
  }
  return `${Math.round(w)} / ${Math.round(h)}`;
}

export function aspectRatioFromVideo(video) {
  return aspectRatioFromDimensions(video?.videoWidth, video?.videoHeight);
}

export function orientationFromAspectRatio(aspectRatio) {
  const parts = String(aspectRatio || '')
    .split('/')
    .map((part) => Number(part.trim()));
  const width = parts[0];
  const height = parts[1];
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 'landscape';
  }
  if (height > width) return 'portrait';
  if (width > height) return 'landscape';
  return 'square';
}
