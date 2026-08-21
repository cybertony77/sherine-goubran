import { MongoClient } from 'mongodb';
import { authMiddleware } from '../../../lib/authMiddleware';
import { getMongoFromEnv } from '../../../lib/marketingPageMongo';
import { slugifyCategory, ensureUniqueSlug } from '../../../lib/publicTestimonialSlug';

function canManage(role) {
  return role === 'admin' || role === 'developer' || role === 'assistant';
}

export default async function handler(req, res) {
  const { MONGO_URI, DB_NAME } = getMongoFromEnv();

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

    if (req.method === 'GET') {
      const pages = await db
        .collection('public_testimonials')
        .find({})
        .sort({ id: -1 })
        .toArray();

      const pendingCount = await db.collection('testimonials').countDocuments({
        from_public: true,
        state: 'Pending',
      });

      return res.status(200).json({
        pages,
        pendingCount,
        canManage: canManage(dbUser.role),
      });
    }

    if (req.method === 'POST') {
      if (!canManage(dbUser.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const category = String(req.body?.category || '').trim();
      const text = String(req.body?.text || '').trim();
      const image = String(req.body?.image || '').trim();
      const visibilityState = String(req.body?.visibilityState || '').trim();
      let imagePosX = Number(req.body?.imagePosX);
      let imagePosY = Number(req.body?.imagePosY);
      if (!Number.isFinite(imagePosX)) imagePosX = 50;
      if (!Number.isFinite(imagePosY)) imagePosY = 50;
      imagePosX = Math.min(100, Math.max(0, imagePosX));
      imagePosY = Math.min(100, Math.max(0, imagePosY));

      if (!category) {
        return res.status(400).json({ error: '❌ Category is required' });
      }
      if (!text) {
        return res.status(400).json({ error: '❌ Text is required' });
      }
      if (!image) {
        return res.status(400).json({ error: '❌ Image is required' });
      }
      if (visibilityState !== 'Activated' && visibilityState !== 'Deactivated') {
        return res.status(400).json({ error: '❌ Visibility state is required' });
      }

      const baseSlug = slugifyCategory(category);
      if (!baseSlug) {
        return res.status(400).json({ error: '❌ Invalid category for slug' });
      }

      const slug = await ensureUniqueSlug(db, baseSlug);
      const last = await db.collection('public_testimonials').findOne({}, { sort: { id: -1 } });
      const nextId = last?.id ? Number(last.id) + 1 : 1;

      const page = {
        id: nextId,
        slug,
        category,
        text,
        image,
        imagePosX,
        imagePosY,
        visibilityState,
        createdAt: new Date(),
      };

      await db.collection('public_testimonials').insertOne(page);
      return res.status(200).json({ success: true, page });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('public_testimonials API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
}
