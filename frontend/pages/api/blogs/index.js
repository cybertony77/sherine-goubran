import { MongoClient } from 'mongodb';
import { authMiddleware } from '../../../lib/authMiddleware';
import { getMongoFromEnv } from '../../../lib/marketingPageMongo';
import { formatEgyptDateTime, nowEgyptDate } from '../../../lib/egyptDateTime';
import {
  allocateBlogSlug,
  blogMatchesSlug,
  toPublicBlog,
  toPublicBlogDetail,
  withPublicBlogSlugs,
} from '../../../lib/blogSlug';

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

  let client;
  try {
    client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);

    let dbUser = null;
    try {
      const user = await authMiddleware(req);
      dbUser = await db.collection('users').findOne({ id: user.assistant_id });
    } catch {
      dbUser = null;
    }

    if (req.method === 'GET') {
      const wantPublic = String(req.query.public || '') === '1';
      if (wantPublic) {
        const slug = String(req.query.slug || '').trim();
        if (slug) {
          let found = await db.collection('blogs').findOne({
            visibilityState: 'Activated',
            slug,
          });
          if (!found) {
            const activated = await db
              .collection('blogs')
              .find({ visibilityState: 'Activated' })
              .sort({ createdAt: -1, id: -1 })
              .toArray();
            found = withPublicBlogSlugs(activated).find((item) => blogMatchesSlug(item, slug)) || null;
          }
          if (!found) {
            return res.status(404).json({ error: 'Blog not found' });
          }
          return res.status(200).json({ blog: toPublicBlogDetail(found) });
        }

        const limitRaw = Number(req.query.limit);
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 50) : null;
        let cursor = db
          .collection('blogs')
          .find({ visibilityState: 'Activated' })
          .sort({ createdAt: -1, id: -1 })
          .project({
            _id: 0,
            id: 1,
            slug: 1,
            name: 1,
            shortDescription: 1,
            image: 1,
            imagePosX: 1,
            imagePosY: 1,
            createdAt: 1,
          });
        if (limit) cursor = cursor.limit(limit);
        const blogs = await cursor.toArray();
        return res.status(200).json({
          blogs: withPublicBlogSlugs(blogs).map(toPublicBlog),
        });
      }

      if (!dbUser) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const blogs = await db.collection('blogs').find({}).sort({ id: -1 }).toArray();
      return res.status(200).json({
        blogs,
        canManage: canManage(dbUser.role),
      });
    }

    if (!dbUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'POST') {
      if (!canManage(dbUser.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const validated = validatePayload(req.body);
      if (validated.error) {
        return res.status(400).json({ error: validated.error });
      }

      const last = await db.collection('blogs').findOne({}, { sort: { id: -1 } });
      const nextId = last?.id ? Number(last.id) + 1 : 1;
      const createdAt = nowEgyptDate();
      const slug = await allocateBlogSlug(db, validated.data.name);

      const blog = {
        id: nextId,
        ...validated.data,
        slug,
        createdAt,
        updatedAt: createdAt,
        createdAtEgypt: formatEgyptDateTime(createdAt),
        updatedAtEgypt: formatEgyptDateTime(createdAt),
      };

      await db.collection('blogs').insertOne(blog);
      return res.status(200).json({ success: true, blog });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('blogs API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
}
