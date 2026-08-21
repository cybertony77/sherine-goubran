export function slugifyCategory(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function ensureUniqueSlug(db, baseSlug, excludeId = null) {
  let slug = baseSlug || 'review';
  let suffix = 0;

  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const query = { slug: candidate };
    if (excludeId != null) query.id = { $ne: excludeId };
    const existing = await db.collection('public_testimonials').findOne(query);
    if (!existing) return candidate;
    suffix += 1;
  }
}
