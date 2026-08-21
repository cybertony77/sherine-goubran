import { MongoClient } from 'mongodb';
import { authMiddleware } from '../../../lib/authMiddleware';
import { getMongoFromEnv } from '../../../lib/marketingPageMongo';

function canManage(role) {
  return role === 'admin' || role === 'developer' || role === 'assistant';
}

export default async function handler(req, res) {
  const { MONGO_URI, DB_NAME } = getMongoFromEnv();
  const categoryId = parseInt(req.query.id, 10);

  let client;
  try {
    if (Number.isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);

    let user;
    try {
      user = await authMiddleware(req);
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const dbUser = await db.collection('users').findOne({ id: user.assistant_id });
    if (!dbUser || !canManage(dbUser.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.method === 'PUT') {
      const name = String(req.body?.name || '').trim();
      if (!name) {
        return res.status(400).json({ error: '❌ Category name is required' });
      }

      const category = await db.collection('categories').findOne({ id: categoryId });
      if (!category) {
        return res.status(404).json({ error: '❌ Category not found' });
      }

      const existing = await db.collection('categories').findOne({
        name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        id: { $ne: categoryId },
      });
      if (existing) {
        return res.status(400).json({ error: '❌ Category name already exists' });
      }

      await db.collection('categories').updateOne(
        { id: categoryId },
        { $set: { name, updatedAt: new Date() } }
      );

      return res.status(200).json({
        success: true,
        category: { ...category, name, updatedAt: new Date() },
      });
    }

    if (req.method === 'DELETE') {
      const category = await db.collection('categories').findOne({ id: categoryId });
      if (!category) {
        return res.status(404).json({ error: '❌ Category not found' });
      }

      await db.collection('categories').deleteOne({ id: categoryId });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('category [id] API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
}
