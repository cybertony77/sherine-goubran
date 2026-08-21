import { MongoClient } from 'mongodb';
import { getMongoFromEnv } from '../../lib/marketingPageMongo';
import { formatEgyptDateTime, nowEgyptDate } from '../../lib/egyptDateTime';
import { formatPhoneForDB, isPhoneFilled } from '../../lib/phoneUtils';
import { checkContactRateLimit, getClientIp } from '../../lib/contactRateLimit';
import { serviceMatchesSlug, servicePublicSlug } from '../../lib/serviceSlug';

const NAME_MAX = 80;
const MESSAGE_MAX = 300;
const SERVICE_MAX = 120;
const GENERAL_SERVICE = { slug: 'general-inquiry', name: 'General inquiry' };

async function resolveService(db, body) {
  const slug = String(body?.serviceSlug || body?.service || '').trim().slice(0, SERVICE_MAX);
  const nameHint = String(body?.serviceName || body?.subject || '').trim().slice(0, SERVICE_MAX);
  if (!slug && !nameHint) return { error: '❌ Service is required' };

  if (slug === GENERAL_SERVICE.slug || nameHint.toLowerCase() === GENERAL_SERVICE.name.toLowerCase()) {
    return { data: { serviceSlug: GENERAL_SERVICE.slug, serviceName: GENERAL_SERVICE.name } };
  }

  const activated = await db
    .collection('services')
    .find({ visibilityState: 'Activated' })
    .project({ _id: 0, id: 1, slug: 1, name: 1 })
    .toArray();

  const found = activated.find(
    (item) =>
      (slug && serviceMatchesSlug(item, slug)) ||
      (nameHint && String(item?.name || '').trim() === nameHint)
  );
  if (!found) return { error: '❌ Please select a valid service' };

  return {
    data: {
      serviceSlug: servicePublicSlug(found),
      serviceName: String(found.name || '').trim(),
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  if (!checkContactRateLimit(ip)) {
    return res.status(429).json({
      error: '❌ Too many messages. Please wait a few minutes and try again.',
    });
  }

  const honeypot = String(req.body?.website || req.body?.company || '').trim();
  if (honeypot) {
    return res.status(200).json({ success: true });
  }

  const name = String(req.body?.name || '').trim().slice(0, NAME_MAX);
  const phoneRaw = String(req.body?.phone || '').trim();
  const phone = formatPhoneForDB(phoneRaw);
  const message = String(req.body?.message || '').trim();

  if (!name) {
    return res.status(400).json({ error: '❌ Name is required' });
  }
  if (!isPhoneFilled(phoneRaw) || !phone) {
    return res.status(400).json({ error: '❌ Phone number is required' });
  }
  if (!message) {
    return res.status(400).json({ error: '❌ Message is required' });
  }
  if (message.length > MESSAGE_MAX) {
    return res.status(400).json({ error: `❌ Message must be ${MESSAGE_MAX} characters or less` });
  }
  const serviceSlug = String(req.body?.serviceSlug || req.body?.service || '').trim();
  const serviceName = String(req.body?.serviceName || req.body?.subject || '').trim();
  if (!serviceSlug && !serviceName) {
    return res.status(400).json({ error: '❌ Service is required' });
  }

  const { MONGO_URI, DB_NAME } = getMongoFromEnv();
  let client;
  try {
    client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);

    const serviceResult = await resolveService(db, req.body);
    if (serviceResult.error) {
      return res.status(400).json({ error: serviceResult.error });
    }

    const last = await db.collection('messages').findOne({}, { sort: { id: -1 } });
    const nextId = last?.id ? Number(last.id) + 1 : 1;
    const createdAt = nowEgyptDate();

    const doc = {
      id: nextId,
      name,
      phone,
      message,
      subject: serviceResult.data.serviceName,
      serviceName: serviceResult.data.serviceName,
      serviceSlug: serviceResult.data.serviceSlug,
      state: 'New',
      createdAt,
      updatedAt: createdAt,
      createdAtEgypt: formatEgyptDateTime(createdAt),
      updatedAtEgypt: formatEgyptDateTime(createdAt),
    };

    await db.collection('messages').insertOne(doc);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('contact API error:', error);
    return res.status(500).json({ error: '❌ Failed to send message' });
  } finally {
    if (client) await client.close();
  }
}
