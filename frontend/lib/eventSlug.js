import { slugifyServiceName } from './serviceSlug';

export const EVENTS_PUBLIC_PATH = '/events_&_workshops';

export function eventPublicSlug(event) {
  const base = slugifyServiceName(event?.name);
  if (base) return base;
  return event?.id ? `event-${event.id}` : 'event';
}

export function withPublicEventSlugs(events) {
  const used = new Set();
  return (Array.isArray(events) ? events : []).map((event) => {
    let slug = eventPublicSlug(event);
    if (used.has(slug)) slug = `${slug}-${event.id}`;
    used.add(slug);
    return { ...event, slug };
  });
}

export function eventMatchesSlug(event, requested) {
  const want = String(requested || '').trim();
  if (!want) return false;
  const publicSlug = String(event?.slug || eventPublicSlug(event));
  return (
    publicSlug === want ||
    `${eventPublicSlug(event)}-${event?.id}` === want ||
    String(event?.id) === want
  );
}

function pos(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50;
}

export function toPublicEvent(event) {
  return {
    id: event.id,
    slug: event.slug || eventPublicSlug(event),
    name: event.name || '',
    shortDescription: event.shortDescription || '',
    image: event.image || '',
    imagePosX: pos(event.imagePosX),
    imagePosY: pos(event.imagePosY),
    date: event.date || '',
    location: event.location || '',
    type: event.type === 'Workshop' ? 'Workshop' : 'Event',
    state: event.state === 'Previous' ? 'Previous' : 'Upcoming',
  };
}

export function toPublicEventDetail(event) {
  const benefits = Array.isArray(event?.benefits)
    ? event.benefits.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const galleryPhotos = Array.isArray(event?.galleryPhotos)
    ? event.galleryPhotos
        .map((item) => (typeof item === 'string' ? item : item?.url))
        .map((url) => String(url || '').trim())
        .filter(Boolean)
    : [];
  const galleryVideos = Array.isArray(event?.galleryVideos)
    ? event.galleryVideos
        .map((item) => ({
          key: String(item?.key || '').trim(),
          fileName: String(item?.fileName || '').trim(),
        }))
        .filter((item) => item.key)
    : [];
  const highlights = event?.highlights && typeof event.highlights === 'object'
    ? {
        participants: event.highlights.participants ?? null,
        hours: event.highlights.hours ?? null,
        activities: event.highlights.activities ?? null,
      }
    : null;

  return {
    ...toPublicEvent(event),
    longDescription: event.longDescription || '',
    benefits,
    highlights,
    galleryPhotos,
    galleryVideos,
    testimonialsNumber: Number.isFinite(Number(event.testimonialsNumber))
      ? Number(event.testimonialsNumber)
      : null,
    category: event.category || '',
  };
}
