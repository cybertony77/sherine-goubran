import { MongoClient } from 'mongodb';
import { authMiddleware } from '../../../lib/authMiddleware';
import { getMongoFromEnv } from '../../../lib/marketingPageMongo';
import { formatEgyptDateTime, nowEgyptDate } from '../../../lib/egyptDateTime';
import { isMessageState } from '../../../lib/messageStates';

function canManage(role) {
  return role === 'admin' || role === 'developer' || role === 'assistant';
}

function toPublicMessage(doc) {
  if (!doc) return null;
  return {
    id: doc.id,
    name: doc.name || '',
    phone: doc.phone || '',
    message: doc.message || '',
    subject: doc.subject || doc.serviceName || '',
    serviceName: doc.serviceName || doc.subject || '',
    serviceSlug: doc.serviceSlug || '',
    state: doc.state || 'New',
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
    createdAtEgypt: doc.createdAtEgypt || '',
    updatedAtEgypt: doc.updatedAtEgypt || '',
  };
}

export default async function handler(req, res) {
  const id = Number(req.query.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid message id' });
  }

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
      const found = await db.collection('messages').findOne({ id }, { projection: { _id: 0 } });
      if (!found) {
        return res.status(404).json({ error: '❌ Message not found' });
      }
      return res.status(200).json({ message: toPublicMessage(found), canManage: true });
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      const state = String(req.body?.state || '').trim();
      if (!isMessageState(state)) {
        return res.status(400).json({ error: '❌ Invalid message state' });
      }

      const existing = await db.collection('messages').findOne({ id });
      if (!existing) {
        return res.status(404).json({ error: '❌ Message not found' });
      }

      const updatedAt = nowEgyptDate();
      await db.collection('messages').updateOne(
        { id },
        {
          $set: {
            state,
            updatedAt,
            updatedAtEgypt: formatEgyptDateTime(updatedAt),
          },
        }
      );
      const updated = await db.collection('messages').findOne({ id }, { projection: { _id: 0 } });
      return res.status(200).json({ success: true, message: toPublicMessage(updated) });
    }

    if (req.method === 'DELETE') {
      const existing = await db.collection('messages').findOne({ id });
      if (!existing) {
        return res.status(404).json({ error: '❌ Message not found' });
      }
      await db.collection('messages').deleteOne({ id });
      return res.status(200).json({ success: true, id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('messages [id] API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
}
