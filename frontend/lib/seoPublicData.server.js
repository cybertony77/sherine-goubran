import { MongoClient } from 'mongodb';
import { getMongoFromEnv } from './marketingPageMongo';
import { toPublicService, toPublicServiceDetail, serviceMatchesSlug } from './serviceSlug';
import { withPublicEventSlugs, toPublicEventDetail, eventMatchesSlug } from './eventSlug';
import { mediaSrcFromKey } from './personalInfoMedia';

async function withDb(fn) {
  const { MONGO_URI, DB_NAME } = getMongoFromEnv();
  const client = await MongoClient.connect(MONGO_URI);
  try {
    return await fn(client.db(DB_NAME));
  } finally {
    await client.close();
  }
}

function toPublicBlog(doc) {
  return {
    id: doc.id,
    slug: String(doc.slug || '').trim(),
    name: doc.name || '',
    shortDescription: doc.shortDescription || '',
    longDescription: doc.longDescription || '',
    image: doc.image || '',
    imagePosX: Number.isFinite(Number(doc.imagePosX)) ? Number(doc.imagePosX) : 50,
    imagePosY: Number.isFinite(Number(doc.imagePosY)) ? Number(doc.imagePosY) : 50,
    createdAt: doc.createdAt || null,
  };
}

export async function fetchActivatedServiceSlugs() {
  return withDb(async (db) => {
    const services = await db
      .collection('services')
      .find({ visibilityState: 'Activated' })
      .project({ _id: 0, id: 1, slug: 1, name: 1 })
      .toArray();
    return services.map(toPublicService).filter((s) => s.slug);
  });
}

export async function fetchActivatedBlogSlugs() {
  return withDb(async (db) => {
    const blogs = await db
      .collection('blogs')
      .find({ visibilityState: 'Activated' })
      .project({ _id: 0, id: 1, slug: 1, name: 1, createdAt: 1 })
      .toArray();
    return blogs
      .map((b) => ({
        id: b.id,
        slug: String(b.slug || '').trim(),
        name: b.name || '',
        createdAt: b.createdAt || null,
      }))
      .filter((b) => b.slug);
  });
}

export async function fetchActivatedEventSlugs() {
  return withDb(async (db) => {
    const events = await db
      .collection('events_and_workshops')
      .find({ visibilityState: 'Activated' })
      .project({ _id: 0, id: 1, name: 1, slug: 1 })
      .toArray();
    return withPublicEventSlugs(events).filter((e) => e.slug);
  });
}

export async function fetchPublicServiceBySlug(slug) {
  const want = String(slug || '').trim();
  if (!want) return null;
  return withDb(async (db) => {
    let found = await db.collection('services').findOne({
      visibilityState: 'Activated',
      slug: want,
    });
    if (!found) {
      const activated = await db
        .collection('services')
        .find({ visibilityState: 'Activated' })
        .toArray();
      found = activated.find((item) => serviceMatchesSlug(item, want)) || null;
    }
    return found ? toPublicServiceDetail(found) : null;
  });
}

export async function fetchPublicBlogBySlug(slug) {
  const want = String(slug || '').trim();
  if (!want) return null;
  return withDb(async (db) => {
    let found = await db.collection('blogs').findOne({
      visibilityState: 'Activated',
      slug: want,
    });
    if (!found) {
      const activated = await db
        .collection('blogs')
        .find({ visibilityState: 'Activated' })
        .toArray();
      found =
        activated.find((item) => String(item?.slug || '').trim() === want) || null;
    }
    return found ? toPublicBlog(found) : null;
  });
}

export async function fetchPublicEventBySlug(slug) {
  const want = String(slug || '').trim();
  if (!want) return null;
  return withDb(async (db) => {
    const activated = await db
      .collection('events_and_workshops')
      .find({ visibilityState: 'Activated' })
      .toArray();
    const withSlugs = withPublicEventSlugs(activated);
    const found = withSlugs.find((item) => eventMatchesSlug(item, want)) || null;
    return found ? toPublicEventDetail(found) : null;
  });
}

export async function fetchPersonalInfoLite() {
  return withDb(async (db) => {
    const doc = await db.collection('personal_info').findOne({});
    if (!doc) return null;
    return {
      name: String(doc.name || '').trim(),
      short_desc: String(doc.short_desc || '').trim(),
      about_image: mediaSrcFromKey(doc.about_image || ''),
    };
  });
}
