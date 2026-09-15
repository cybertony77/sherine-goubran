import { MongoClient } from 'mongodb';
import { getMongoFromEnv } from '../../../lib/marketingPageMongo';
import { formatEgyptDateTime, nowEgyptDate } from '../../../lib/egyptDateTime';
import { checkRateLimit, clientKey } from '../../../lib/rateLimit';

const MAX_NAME_LEN = 200;
const MAX_TEXT_LEN = 2000;

function normalizeRating(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n > 5) return 5;
  return Math.round(n * 2) / 2;
}

export default async function handler(req, res) {
  const { MONGO_URI, DB_NAME } = getMongoFromEnv();
  const slug = String(req.query.slug || '')
    .trim()
    .toLowerCase();

  if (!slug) {
    return res.status(400).json({ error: 'Invalid slug' });
  }

  let client;
  try {
    client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);

    if (req.method === 'GET') {
      const page = await db.collection('public_testimonials').findOne({ slug });
      if (!page || page.visibilityState === 'Deactivated') {
        return res.status(404).json({ error: 'Review page not found' });
      }

      return res.status(200).json({
        page: {
          slug: page.slug,
          category: page.category,
          text: page.text,
          image: page.image,
          imagePosX: Number.isFinite(Number(page.imagePosX)) ? Number(page.imagePosX) : 50,
          imagePosY: Number.isFinite(Number(page.imagePosY)) ? Number(page.imagePosY) : 50,
        },
      });
    }

    if (req.method === 'POST') {
      const rl = checkRateLimit(clientKey(req, 'leave-review'), {
        windowMs: 15 * 60 * 1000,
        max: 5,
      });
      if (!rl.ok) {
        res.setHeader('Retry-After', String(rl.retryAfterSec || 60));
        return res.status(429).json({
          error: 'Too many review submissions. Please try again later.',
          retryAfterSec: rl.retryAfterSec,
        });
      }

      const page = await db.collection('public_testimonials').findOne({ slug });
      if (!page || page.visibilityState === 'Deactivated') {
        return res.status(404).json({ error: 'Review page not found' });
      }

      const name = String(req.body?.name || '').trim().slice(0, MAX_NAME_LEN);
      const text = String(req.body?.text || req.body?.message || '')
        .trim()
        .slice(0, MAX_TEXT_LEN);
      const rating = normalizeRating(req.body?.rating);

      if (!name) {
        return res.status(400).json({ error: '❌ Name is required' });
      }
      if (!text) {
        return res.status(400).json({ error: '❌ Message is required' });
      }
      if (rating <= 0) {
        return res.status(400).json({ error: '❌ Star rating is required' });
      }

      const last = await db.collection('testimonials').findOne({}, { sort: { id: -1 } });
      const nextId = last?.id ? Number(last.id) + 1 : 1;

      const createdAt = nowEgyptDate();
      const testimonial = {
        id: nextId,
        name,
        category: page.category,
        text,
        rating,
        state: 'Pending',
        from_public: true,
        public_slug: page.slug,
        createdAt,
        createdAtEgypt: formatEgyptDateTime(createdAt),
      };

      await db.collection('testimonials').insertOne(testimonial);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('leave-a-review API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
}
