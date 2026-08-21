import { MongoClient } from 'mongodb';
import { authMiddleware } from '../../../lib/authMiddleware';
import { getMongoFromEnv } from '../../../lib/marketingPageMongo';
import { formatEgyptDateTime, nowEgyptDate } from '../../../lib/egyptDateTime';

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
    if (!dbUser || !canManage(dbUser.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.method === 'GET') {
      const reviews = await db
        .collection('testimonials')
        .find({ from_public: true, state: 'Pending' })
        .sort({ createdAt: -1 })
        .toArray();
      return res.status(200).json({ reviews });
    }

    if (req.method === 'POST') {
      const id = Number(req.body?.id);
      const action = String(req.body?.action || '').trim().toLowerCase();

      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: '❌ Invalid review id' });
      }
      if (action !== 'approve' && action !== 'reject') {
        return res.status(400).json({ error: '❌ Action must be approve or reject' });
      }

      const existing = await db.collection('testimonials').findOne({
        id,
        from_public: true,
        state: 'Pending',
      });
      if (!existing) {
        return res.status(404).json({ error: '❌ Pending review not found' });
      }

      const state = action === 'approve' ? 'Activated' : 'Deactivated';
      const updatedAt = nowEgyptDate();
      const updatedAtEgypt = formatEgyptDateTime(updatedAt);
      await db.collection('testimonials').updateOne(
        { id },
        { $set: { state, updatedAt, updatedAtEgypt } }
      );

      return res.status(200).json({
        success: true,
        review: { ...existing, state, updatedAt, updatedAtEgypt },
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('pending reviews API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
}
