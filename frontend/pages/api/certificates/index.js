import { MongoClient } from 'mongodb';
import { authMiddleware } from '../../../lib/authMiddleware';
import { getSignedImageUrlServer } from '../../../lib/cloudinary';
import { getMongoFromEnv } from '../../../lib/marketingPageMongo';

export const CERTIFICATES_DOC_ID = 'certificates_singleton';

function defaultCertificatesDoc() {
  return {
    _id: CERTIFICATES_DOC_ID,
    certificates: [],
    updatedAt: new Date(),
  };
}

function canManage(role) {
  return role === 'admin' || role === 'developer' || role === 'assistant';
}

function normalizeCertificates(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (typeof item === 'string') {
        const src = item.trim();
        return src ? { src } : null;
      }
      if (item && typeof item === 'object') {
        const src = String(item.src || '').trim();
        return src ? { src } : null;
      }
      return null;
    })
    .filter(Boolean);
}

async function getOrCreateDoc(db) {
  let doc = await db.collection('certificates').findOne({ _id: CERTIFICATES_DOC_ID });
  if (!doc) {
    const base = defaultCertificatesDoc();
    await db.collection('certificates').insertOne(base);
    doc = base;
  }
  return doc;
}

function publicDoc(doc) {
  return {
    certificates: normalizeCertificates(doc.certificates),
    updatedAt: doc.updatedAt || null,
  };
}

export default async function handler(req, res) {
  const { MONGO_URI, DB_NAME } = getMongoFromEnv();

  let client;
  try {
    client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);

    if (req.method === 'GET') {
      const wantPublic = String(req.query.public || '') === '1';
      if (wantPublic) {
        const doc = await db.collection('certificates').findOne({ _id: CERTIFICATES_DOC_ID });
        const list = normalizeCertificates(doc?.certificates);
        const certificates = (
          await Promise.all(
            list.map(async (item, index) => {
              const src = String(item.src || '').trim();
              if (!src) return null;
              const url = /^https?:\/\//i.test(src) ? src : await getSignedImageUrlServer(src);
              if (!url) return null;
              return { id: src || String(index), src, url };
            })
          )
        ).filter(Boolean);
        return res.status(200).json({ certificates });
      }

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

      const doc = await getOrCreateDoc(db);
      return res.status(200).json({
        ...publicDoc(doc),
        canManage: canManage(dbUser.role),
      });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
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

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const certificates = normalizeCertificates(body.certificates ?? body.images);

      if (!certificates.length) {
        return res.status(400).json({
          error: '❌ Please upload at least one certificate image',
        });
      }

      const update = {
        certificates,
        updatedAt: new Date(),
      };

      await db.collection('certificates').updateOne(
        { _id: CERTIFICATES_DOC_ID },
        { $set: update, $setOnInsert: { _id: CERTIFICATES_DOC_ID } },
        { upsert: true }
      );

      const doc = await getOrCreateDoc(db);
      return res.status(200).json({
        success: true,
        ...publicDoc(doc),
        canManage: true,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('certificates API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
}
