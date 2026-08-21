import { MongoClient } from 'mongodb';
import { authMiddleware } from '../../../lib/authMiddleware';
import { getMongoFromEnv } from '../../../lib/marketingPageMongo';
import { formatEgyptDateTime, nowEgyptDate } from '../../../lib/egyptDateTime';

function canManage(role) {
  return role === 'admin' || role === 'developer' || role === 'assistant';
}

function normalizeRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n > 5) return 5;
  return Math.round(n * 2) / 2;
}

export default async function handler(req, res) {
  const { MONGO_URI, DB_NAME } = getMongoFromEnv();
  const id = Number(req.query.id);

  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid testimonial id' });
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

    if (req.method === 'PUT') {
      const name = String(req.body?.name || '').trim();
      const category = String(req.body?.category || '').trim();
      const text = String(req.body?.text || '').trim();
      const rating = normalizeRating(req.body?.rating);
      const stateRaw = String(req.body?.state || '').trim();
      const state =
        stateRaw === 'Activated' || stateRaw === 'Deactivated' ? stateRaw : '';

      if (!name) {
        return res.status(400).json({ error: '❌ Name is required' });
      }
      if (!category) {
        return res.status(400).json({ error: '❌ Category is required' });
      }
      if (!text) {
        return res.status(400).json({ error: '❌ Testimonial text is required' });
      }
      if (rating <= 0) {
        return res.status(400).json({ error: '❌ Star rating is required' });
      }
      if (!state) {
        return res.status(400).json({ error: '❌ State is required' });
      }

      const existing = await db.collection('testimonials').findOne({ id });
      if (!existing) {
        return res.status(404).json({ error: '❌ Testimonial not found' });
      }

      const updatedAt = nowEgyptDate();
      const testimonial = {
        ...existing,
        name,
        category,
        text,
        rating,
        state,
        updatedAt,
        updatedAtEgypt: formatEgyptDateTime(updatedAt),
      };
      delete testimonial._id;

      await db.collection('testimonials').updateOne(
        { id },
        {
          $set: {
            name,
            category,
            text,
            rating,
            state,
            updatedAt,
            updatedAtEgypt: testimonial.updatedAtEgypt,
          },
        }
      );

      return res.status(200).json({ success: true, testimonial });
    }

    if (req.method === 'DELETE') {
      const result = await db.collection('testimonials').deleteOne({ id });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: '❌ Testimonial not found' });
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('testimonials [id] API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
}
