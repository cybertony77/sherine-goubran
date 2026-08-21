import { MongoClient } from 'mongodb';
import { authMiddleware } from '../../../lib/authMiddleware';
import { getMongoFromEnv } from '../../../lib/marketingPageMongo';
import { formatEgyptDateTime, nowEgyptDate } from '../../../lib/egyptDateTime';
import { allocateServiceSlug } from '../../../lib/serviceSlug';

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
  const id = Number(req.query.id);

  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid service id' });
  }

  let client;
  try {
    client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);

    let user;
    try {
      user = await authMiddleware(req);
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const dbUser = await db.collection('users').findOne({ id: user.assistant_id });
    if (!dbUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!canManage(dbUser.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.method === 'GET') {
      const service = await db.collection('services').findOne({ id });
      if (!service) {
        return res.status(404).json({ error: '❌ Service not found' });
      }
      return res.status(200).json({ service, canManage: true });
    }

    if (req.method === 'PUT') {
      const validated = validatePayload(req.body);
      if (validated.error) {
        return res.status(400).json({ error: validated.error });
      }

      const existing = await db.collection('services').findOne({ id });
      if (!existing) {
        return res.status(404).json({ error: '❌ Service not found' });
      }

      const updatedAt = nowEgyptDate();
      const slug = await allocateServiceSlug(db, validated.data.name, id);
      const service = {
        ...existing,
        ...validated.data,
        slug,
        updatedAt,
        updatedAtEgypt: formatEgyptDateTime(updatedAt),
      };

      await db.collection('services').updateOne({ id }, { $set: service });
      return res.status(200).json({ success: true, service });
    }

    if (req.method === 'DELETE') {
      const existing = await db.collection('services').findOne({ id });
      if (!existing) {
        return res.status(404).json({ error: '❌ Service not found' });
      }

      await db.collection('services').deleteOne({ id });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('services [id] API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
}
