export function formatBlogDisplayName(name) {
  const raw = String(name || '').trim();
  if (!raw) return 'Blog';
  return raw
    .split(/\s+/)
    .map((word) => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function formatBlogDate(value) {
  const raw = value;
  if (!raw) return '';
  const date = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function blogDateIso(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

export function splitBlogParagraphs(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  const blocks = raw.split(/\n\s*\n+/).map((block) => block.trim()).filter(Boolean);
  if (blocks.length > 1) return blocks;
  return [raw];
}

export function sortPublicBlogsOldestFirst(blogs) {
  const list = Array.isArray(blogs) ? [...blogs] : [];
  return list.sort((a, b) => {
    const ta = new Date(a?.createdAt || 0).getTime();
    const tb = new Date(b?.createdAt || 0).getTime();
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return ta - tb;
  });
}

export function adjacentBlogs(blogs, currentSlug) {
  const list = sortPublicBlogsOldestFirst(blogs).filter((item) => String(item?.slug || '').trim());
  const want = String(currentSlug || '').trim();
  const index = list.findIndex((item) => String(item.slug).trim() === want);
  if (index === -1) return { previous: null, next: null };

  // List is oldest-first; previous = older, next = newer.
  return {
    previous: index > 0 ? list[index - 1] : null,
    next: index < list.length - 1 ? list[index + 1] : null,
  };
}
