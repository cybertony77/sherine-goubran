export function slugifyServiceName(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function stripTrailingId(slug, id) {
  const value = String(slug || '').trim();
  if (!value || id == null || id === '') return value;
  const suffix = `-${id}`;
  if (!value.endsWith(suffix)) return value;
  const stripped = value.slice(0, -suffix.length);
  return stripped || value;
}

export function servicePublicSlug(service) {
  const stored = stripTrailingId(service?.slug, service?.id);
  if (stored) return stored;
  const base = slugifyServiceName(service?.name);
  return base || 'service';
}

export function contactHrefForService(slug) {
  const value = String(slug || '').trim();
  if (!value) return '/contact';
  return `/contact?service=${encodeURIComponent(value)}`;
}

export function serviceMatchesSlug(service, requested) {
  const want = String(requested || '').trim();
  if (!want) return false;
  const publicSlug = servicePublicSlug(service);
  const stored = String(service?.slug || '').trim();
  return publicSlug === want || stored === want || `${publicSlug}-${service?.id}` === want;
}

export async function allocateServiceSlug(db, name, excludeId) {
  const base = slugifyServiceName(name) || 'service';
  const coll = db.collection('services');
  const isTaken = async (slug) => {
    const query = { slug };
    if (excludeId != null) query.id = { $ne: excludeId };
    return Boolean(await coll.findOne(query, { projection: { _id: 1 } }));
  };
  if (!(await isTaken(base))) return base;
  let n = 2;
  while (await isTaken(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function toPublicService(service) {
  return {
    id: service.id,
    slug: servicePublicSlug(service),
    name: service.name || '',
    shortDescription: service.shortDescription || '',
    image: service.image || '',
    imagePosX: Number.isFinite(Number(service.imagePosX)) ? Number(service.imagePosX) : 50,
    imagePosY: Number.isFinite(Number(service.imagePosY)) ? Number(service.imagePosY) : 50,
  };
}

export function toPublicServiceDetail(service) {
  const benefits = Array.isArray(service?.benefits)
    ? service.benefits.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  return {
    ...toPublicService(service),
    longDescription: service.longDescription || '',
    benefits,
    category: service.category || '',
    testimonialsNumber: Number.isFinite(Number(service.testimonialsNumber))
      ? Number(service.testimonialsNumber)
      : null,
  };
}
