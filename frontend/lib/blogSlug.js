import { slugifyServiceName } from './serviceSlug';

function pos(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 50;
}

export function blogPublicSlug(blog) {
  const stored = String(blog?.slug || '').trim();
  if (stored) return stored;
  const base = slugifyServiceName(blog?.name);
  if (base) return base;
  return blog?.id ? `blog-${blog.id}` : 'blog';
}

export function withPublicBlogSlugs(blogs) {
  const used = new Set();
  return (Array.isArray(blogs) ? blogs : []).map((blog) => {
    let slug = blogPublicSlug(blog);
    if (used.has(slug)) slug = `${slug}-${blog.id}`;
    used.add(slug);
    return { ...blog, slug };
  });
}

export function blogMatchesSlug(blog, requested) {
  const want = String(requested || '').trim();
  if (!want) return false;
  const publicSlug = blogPublicSlug(blog);
  const stored = String(blog?.slug || '').trim();
  return (
    publicSlug === want ||
    stored === want ||
    `${slugifyServiceName(blog?.name) || 'blog'}-${blog?.id}` === want ||
    String(blog?.id) === want
  );
}

export async function allocateBlogSlug(db, name, excludeId) {
  const base = slugifyServiceName(name) || 'blog';
  const coll = db.collection('blogs');
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

export function toPublicBlog(blog) {
  return {
    id: blog.id,
    slug: blogPublicSlug(blog),
    name: blog.name || '',
    shortDescription: blog.shortDescription || '',
    image: blog.image || '',
    imagePosX: pos(blog.imagePosX),
    imagePosY: pos(blog.imagePosY),
    createdAt: blog.createdAt || null,
  };
}

export function toPublicBlogDetail(blog) {
  return {
    ...toPublicBlog(blog),
    longDescription: blog.longDescription || '',
  };
}
