import { MongoClient } from 'mongodb';
import { authMiddleware } from '../../../lib/authMiddleware';
import { getMongoFromEnv } from '../../../lib/marketingPageMongo';
import { isMessageState } from '../../../lib/messageStates';

function canManage(role) {
  return role === 'admin' || role === 'developer' || role === 'assistant';
}

function toPublicMessage(doc) {
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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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

    const newCount = await db.collection('messages').countDocuments({ state: 'New' });

    if (String(req.query.summary || '') === '1') {
      return res.status(200).json({ newCount, canManage: true });
    }

    const state = String(req.query.state || '').trim();
    const query = isMessageState(state) ? { state } : {};
    const messages = await db
      .collection('messages')
      .find(query)
      .project({ _id: 0 })
      .sort({ createdAt: -1, id: -1 })
      .toArray();

    return res.status(200).json({
      messages: messages.map(toPublicMessage),
      newCount,
      canManage: true,
    });
  } catch (error) {
    console.error('messages API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
}
