import { MongoClient } from 'mongodb';
import { authMiddleware } from '../../../lib/authMiddleware';
import { getMongoFromEnv } from '../../../lib/marketingPageMongo';
import { formatEgyptDateTime, nowEgyptDate } from '../../../lib/egyptDateTime';
import { allocateServiceSlug, serviceMatchesSlug, toPublicService, toPublicServiceDetail } from '../../../lib/serviceSlug';

function canManage(role) {
  return role === 'admin' || role === 'developer' || role === 'assistant';
}

function normalizeTestimonialsNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

function normalizeBenefits(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|•/)
      .map((item) => item.trim())
      .filter(Boolean);
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

function validatePayload(body) {
  const name = String(body?.name || '').trim();
  const shortDescription = String(body?.shortDescription || '').trim();
  const longDescription = String(body?.longDescription || '').trim();
  const benefits = normalizeBenefits(body?.benefits);
  const category = normalizeCategory(body?.category);
  const image = String(body?.image || '').trim();
  let imagePosX = Number(body?.imagePosX);
  let imagePosY = Number(body?.imagePosY);
  if (!Number.isFinite(imagePosX)) imagePosX = 50;
  if (!Number.isFinite(imagePosY)) imagePosY = 50;
  imagePosX = Math.min(100, Math.max(0, imagePosX));
  imagePosY = Math.min(100, Math.max(0, imagePosY));
  const testimonialsNumber = normalizeTestimonialsNumber(body?.testimonialsNumber);

  if (!image) return { error: '❌ Hero image is required' };
  if (!name) return { error: '❌ Service name is required' };
  if (!shortDescription) return { error: '❌ Short description is required' };
  if (!longDescription) return { error: '❌ Long description is required' };
  if (!benefits.length) return { error: '❌ Add at least one benefit' };
  if (testimonialsNumber == null) {
    return { error: '❌ Testimonials number is required (min 1)' };
  }
  if (!category) return { error: '❌ Category is required' };

  const visibilityState = String(body?.visibilityState || '').trim();
  if (visibilityState !== 'Activated' && visibilityState !== 'Deactivated') {
    return { error: '❌ Visibility state is required' };
  }

  return {
    data: {
      image,
      imagePosX,
      imagePosY,
      name,
      shortDescription,
      longDescription,
      benefits,
      testimonialsNumber,
      category,
      visibilityState,
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
        if (slug) {
          let found = await db.collection('services').findOne({
            visibilityState: 'Activated',
            slug,
          });
          if (!found) {
            const activated = await db
              .collection('services')
              .find({ visibilityState: 'Activated' })
              .toArray();
            found = activated.find((item) => serviceMatchesSlug(item, slug)) || null;
          }
          if (!found) {
            return res.status(404).json({ error: 'Service not found' });
          }
          return res.status(200).json({ service: toPublicServiceDetail(found) });
        }

        const limitRaw = Number(req.query.limit);
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 50) : null;
        let cursor = db
          .collection('services')
          .find({ visibilityState: 'Activated' })
          .sort({ id: 1 })
          .project({
            _id: 0,
            id: 1,
            slug: 1,
            name: 1,
            shortDescription: 1,
            image: 1,
            imagePosX: 1,
            imagePosY: 1,
          });
        if (limit) cursor = cursor.limit(limit);
        const services = await cursor.toArray();
        return res.status(200).json({
          services: services.map(toPublicService),
        });
      }

      if (!dbUser) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const services = await db.collection('services').find({}).sort({ id: -1 }).toArray();
      return res.status(200).json({
        services,
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

      const last = await db.collection('services').findOne({}, { sort: { id: -1 } });
      const nextId = last?.id ? Number(last.id) + 1 : 1;
      const createdAt = nowEgyptDate();
      const slug = await allocateServiceSlug(db, validated.data.name);

      const service = {
        id: nextId,
        ...validated.data,
        slug,
        createdAt,
        updatedAt: createdAt,
        createdAtEgypt: formatEgyptDateTime(createdAt),
        updatedAtEgypt: formatEgyptDateTime(createdAt),
      };

      await db.collection('services').insertOne(service);
      return res.status(200).json({ success: true, service });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('services API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
}
