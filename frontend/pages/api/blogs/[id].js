import { MongoClient } from 'mongodb';
import { authMiddleware } from '../../../lib/authMiddleware';
import { getMongoFromEnv } from '../../../lib/marketingPageMongo';
import { formatEgyptDateTime, nowEgyptDate } from '../../../lib/egyptDateTime';
import { allocateBlogSlug } from '../../../lib/blogSlug';

function canManage(role) {
  return role === 'admin' || role === 'developer' || role === 'assistant';
}

function validatePayload(body) {
  const name = String(body?.name || '').trim();
  const shortDescription = String(body?.shortDescription || '').trim();
  const longDescription = String(body?.longDescription || '').trim();
  const image = String(body?.image || '').trim();
  let imagePosX = Number(body?.imagePosX);
  let imagePosY = Number(body?.imagePosY);
  if (!Number.isFinite(imagePosX)) imagePosX = 50;
  if (!Number.isFinite(imagePosY)) imagePosY = 50;
  imagePosX = Math.min(100, Math.max(0, imagePosX));
  imagePosY = Math.min(100, Math.max(0, imagePosY));

  if (!image) return { error: '❌ Hero image is required' };
  if (!name) return { error: '❌ Blog name is required' };
  if (!shortDescription) return { error: '❌ Short description is required' };
  if (!longDescription) return { error: '❌ Long description is required' };

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
      visibilityState,
    },
  };
}

export default async function handler(req, res) {
  const { MONGO_URI, DB_NAME } = getMongoFromEnv();
  const id = Number(req.query.id);

  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid blog id' });
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
      const blog = await db.collection('blogs').findOne({ id });
      if (!blog) {
        return res.status(404).json({ error: '❌ Blog not found' });
      }
      return res.status(200).json({ blog, canManage: true });
    }

    if (req.method === 'PUT') {
      const validated = validatePayload(req.body);
      if (validated.error) {
        return res.status(400).json({ error: validated.error });
      }

      const existing = await db.collection('blogs').findOne({ id });
      if (!existing) {
        return res.status(404).json({ error: '❌ Blog not found' });
      }

      const updatedAt = nowEgyptDate();
      const slug = await allocateBlogSlug(db, validated.data.name, id);
      const blog = {
        ...existing,
        ...validated.data,
        slug,
        updatedAt,
        updatedAtEgypt: formatEgyptDateTime(updatedAt),
      };

      await db.collection('blogs').updateOne({ id }, { $set: blog });
      return res.status(200).json({ success: true, blog });
    }

    if (req.method === 'DELETE') {
      const existing = await db.collection('blogs').findOne({ id });
      if (!existing) {
        return res.status(404).json({ error: '❌ Blog not found' });
      }

      await db.collection('blogs').deleteOne({ id });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('blogs [id] API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
}
