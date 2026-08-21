import { MongoClient } from 'mongodb';
import { authMiddleware } from '../../../lib/authMiddleware';
import { getMongoFromEnv } from '../../../lib/marketingPageMongo';

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
      const categories = await db
        .collection('categories')
        .find({})
        .sort({ id: 1 })
        .toArray();
      return res.status(200).json({
        categories,
        canManage: canManage(dbUser.role),
      });
    }

    if (req.method === 'POST') {
      if (!canManage(dbUser.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const name = String(req.body?.name || '').trim();
      if (!name) {
        return res.status(400).json({ error: '❌ Category name is required' });
      }

      const existing = await db.collection('categories').findOne({
        name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      });
      if (existing) {
        return res.status(400).json({ error: '❌ Category already exists' });
      }

      const last = await db.collection('categories').findOne({}, { sort: { id: -1 } });
      const nextId = last?.id ? Number(last.id) + 1 : 1;

      const category = {
        id: nextId,
        name,
        createdAt: new Date(),
      };

      await db.collection('categories').insertOne(category);
      return res.status(200).json({ success: true, category });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('categories API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
}
