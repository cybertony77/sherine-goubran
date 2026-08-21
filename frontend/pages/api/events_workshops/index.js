import { MongoClient } from 'mongodb';
import { authMiddleware } from '../../../lib/authMiddleware';
import { getMongoFromEnv } from '../../../lib/marketingPageMongo';
import { formatEgyptDateTime, nowEgyptDate } from '../../../lib/egyptDateTime';
import {
  eventMatchesSlug,
  toPublicEvent,
  toPublicEventDetail,
  withPublicEventSlugs,
} from '../../../lib/eventSlug';

const COLLECTION = 'events_and_workshops';

function canManage(role) {
  return role === 'admin' || role === 'developer' || role === 'assistant';
}

function normalizeBenefits(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  return [];
}

function normalizeCategory(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v || '').trim()).filter(Boolean).join(', ');
  }
  return String(value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .join(', ');
}

function normalizePhotos(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') {
        const url = item.trim();
        return url ? { url } : null;
      }
      const url = String(item?.url || '').trim();
      return url ? { url } : null;
    })
    .filter(Boolean);
}

function normalizeVideos(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const key = String(item?.key || '').trim();
      if (!key) return null;
      return {
        key,
        fileName: String(item?.fileName || '').trim() || key.split('/').pop() || 'video',
      };
    })
    .filter(Boolean);
}

function toNullableNumber(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function validatePayload(body) {
  const name = String(body?.name || '').trim();
  const shortDescription = String(body?.shortDescription || '').trim();
  const longDescription = String(body?.longDescription || '').trim();
  const date = String(body?.date || '').trim();
  const location = String(body?.location || '').trim();
  const type = String(body?.type || '').trim();
  const state = String(body?.state || '').trim();
  const image = String(body?.image || '').trim();
  let imagePosX = Number(body?.imagePosX);
  let imagePosY = Number(body?.imagePosY);
  if (!Number.isFinite(imagePosX)) imagePosX = 50;
  if (!Number.isFinite(imagePosY)) imagePosY = 50;
  imagePosX = Math.min(100, Math.max(0, imagePosX));
  imagePosY = Math.min(100, Math.max(0, imagePosY));

  if (!image) return { error: '❌ Hero image is required' };
  if (!name) return { error: '❌ Title is required' };
  if (!shortDescription) return { error: '❌ Short description is required' };
  if (!longDescription) return { error: '❌ Long description is required' };
  if (!date) return { error: '❌ Date is required' };
  if (!location) return { error: '❌ Location is required' };
  if (type !== 'Event' && type !== 'Workshop') {
    return { error: '❌ Type must be Event or Workshop' };
  }
  if (state !== 'Upcoming' && state !== 'Previous') {
    return { error: '❌ State must be Upcoming or Previous' };
  }

  const visibilityState = String(body?.visibilityState || '').trim();
  if (visibilityState !== 'Activated' && visibilityState !== 'Deactivated') {
    return { error: '❌ Visibility state is required' };
  }

  const base = {
    image,
    imagePosX,
    imagePosY,
    name,
    shortDescription,
    longDescription,
    date,
    location,
    type,
    state,
    visibilityState,
  };

  if (state === 'Upcoming') {
    const benefits = normalizeBenefits(body?.benefits);
    if (!benefits.length) return { error: '❌ Add at least one benefit' };
    return {
      data: {
        ...base,
        benefits,
        highlights: null,
        galleryPhotos: [],
        galleryVideos: [],
        testimonialsNumber: null,
        category: '',
      },
    };
  }

  const participants = toNullableNumber(body?.highlights?.participants ?? body?.participants);
  const hours = toNullableNumber(body?.highlights?.hours ?? body?.hours);
  const activities = toNullableNumber(body?.highlights?.activities ?? body?.activities);

  if (participants == null || participants < 0) {
    return { error: '❌ Participants is required' };
  }
  if (hours == null || hours < 0) return { error: '❌ Hours is required' };
  if (activities == null || activities < 0) return { error: '❌ Activities is required' };

  const testimonialsNumber = Number(body?.testimonialsNumber);
  if (!Number.isFinite(testimonialsNumber) || testimonialsNumber < 1) {
    return { error: '❌ Testimonials number is required (min 1)' };
  }
  const category = normalizeCategory(body?.category);
  if (!category) return { error: '❌ Category is required' };

  return {
    data: {
      ...base,
      benefits: [],
      highlights: {
        participants,
        hours,
        activities,
      },
      galleryPhotos: normalizePhotos(body?.galleryPhotos),
      galleryVideos: normalizeVideos(body?.galleryVideos),
      testimonialsNumber: Math.floor(testimonialsNumber),
      category,
    },
  };
}

export default async function handler(req, res) {
  const { MONGO_URI, DB_NAME } = getMongoFromEnv();

  let client;
  try {
    client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);

    let dbUser = null;
    try {
      const user = await authMiddleware(req);
      dbUser = await db.collection('users').findOne({ id: user.assistant_id });
    } catch {
      dbUser = null;
    }

    if (req.method === 'GET') {
      const wantPublic = String(req.query.public || '') === '1';
      if (wantPublic) {
        const slug = String(req.query.slug || '').trim();
        const activated = await db
          .collection(COLLECTION)
          .find({ visibilityState: 'Activated' })
          .toArray();
        const withSlugs = withPublicEventSlugs(activated);

        if (slug) {
          const found = withSlugs.find((item) => eventMatchesSlug(item, slug));
          if (!found) {
            return res.status(404).json({ error: 'Event not found' });
          }
          return res.status(200).json({ event: toPublicEventDetail(found) });
        }

        return res.status(200).json({
          events: withSlugs.map(toPublicEvent),
        });
      }

      if (!dbUser) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const items = await db.collection(COLLECTION).find({}).sort({ id: -1 }).toArray();
      return res.status(200).json({
        events: items,
        canManage: canManage(dbUser.role),
      });
    }

    if (!dbUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'POST') {
      if (!canManage(dbUser.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const validated = validatePayload(req.body);
      if (validated.error) {
        return res.status(400).json({ error: validated.error });
      }

      const last = await db.collection(COLLECTION).findOne({}, { sort: { id: -1 } });
      const nextId = last?.id ? Number(last.id) + 1 : 1;
      const createdAt = nowEgyptDate();

      const event = {
        id: nextId,
        ...validated.data,
        createdAt,
        updatedAt: createdAt,
        createdAtEgypt: formatEgyptDateTime(createdAt),
        updatedAtEgypt: formatEgyptDateTime(createdAt),
      };

      await db.collection(COLLECTION).insertOne(event);
      return res.status(200).json({ success: true, event });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('events_workshops API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
}
