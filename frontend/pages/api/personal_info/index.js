import { MongoClient } from 'mongodb';
import { authMiddleware } from '../../../lib/authMiddleware';
import { getMongoFromEnv } from '../../../lib/marketingPageMongo';
import { buildStoredLinksPayload } from '../../../lib/linksClientUtils';
import {
  signR2GetUrl,
} from '../../../lib/r2Server';

export const PERSONAL_INFO_DOC_ID = 'personal_info_singleton';

function defaultPersonalInfoDoc() {
  return {
    _id: PERSONAL_INFO_DOC_ID,
    name: '',
    hero_section_media: '',
    hero_section_media_image: '',
    hero_section_media_video: '',
    hero_mobile_position: { x: 50, y: 50 },
    typing_text: [],
    short_desc: '',
    years_of_experience: null,
    people_trained: null,
    professional_certificates: null,
    events_and_workshops: null,
    about_image: '',
    about_image_position: { x: 50, y: 50 },
    about_text: '',
    journey: [],
    what_drives_me: { title: '', short_desc: '', quote: '' },
    professional_roles: [],
    links: [],
    contact_phone: '',
    contact_email: '',
    contact_text: '',
    contact_hero_image: '',
    contact_hero_position: { x: 50, y: 50 },
    contact_response_text: '',
    contact_location_name: '',
    contact_location_link: '',
    updatedAt: new Date(),
  };
}

function canManage(role) {
  return role === 'admin' || role === 'developer' || role === 'assistant';
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampHeroPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 50;
  return Math.min(100, Math.max(0, n));
}

function heroMobilePositionFrom(value) {
  if (!value || typeof value !== 'object') return { x: 50, y: 50 };
  return { x: clampHeroPct(value.x), y: clampHeroPct(value.y) };
}

function normalizeTitleDescItems(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const title = String(item.title || item.name || item.role || '').trim().slice(0, 80);
      const short_desc = String(item.short_desc || item.desc || '').trim().slice(0, 200);
      if (!title && !short_desc) return null;
      return { title, short_desc };
    })
    .filter((row) => row && row.title && row.short_desc);
}

function normalizeProfessionalRoles(value) {
  return normalizeTitleDescItems(value);
}

function normalizeWhatDrivesMe(value) {
  if (!value || typeof value !== 'object') {
    return { title: '', short_desc: '', quote: '' };
  }
  return {
    title: String(value.title || '').trim().slice(0, 80),
    short_desc: String(value.short_desc || '').trim().slice(0, 200),
    quote: String(value.quote || '').trim().slice(0, 300),
  };
}

function normalizeTypingText(value) {
  if (Array.isArray(value)) {
    return value.map((s) => String(s || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

async function getOrCreateDoc(db) {
  let doc = await db.collection('personal_info').findOne({ _id: PERSONAL_INFO_DOC_ID });
  if (!doc) {
    const base = defaultPersonalInfoDoc();
    await db.collection('personal_info').insertOne(base);
    doc = base;
  }
  return doc;
}

function isVideoMediaKey(key = '') {
  return /\.(mp4|webm|ogg|ogv|mov|avi|mkv|m4v)$/i.test(String(key));
}

function resolveStoredHeroKeys(doc) {
  let imageKey = String(doc?.hero_section_media_image || '').trim();
  let videoKey = String(doc?.hero_section_media_video || '').trim();
  const legacy = String(doc?.hero_section_media || '').trim();
  if (!imageKey && !videoKey && legacy) {
    if (isVideoMediaKey(legacy)) videoKey = legacy;
    else imageKey = legacy;
  }
  return {
    imageKey,
    videoKey,
    legacyKey: videoKey || imageKey || legacy || '',
  };
}

function publicDoc(doc) {
  const { imageKey, videoKey, legacyKey } = resolveStoredHeroKeys(doc);
  return {
    name: doc.name || '',
    hero_section_media: legacyKey,
    hero_section_media_image: imageKey,
    hero_section_media_video: videoKey,
    hero_mobile_position: heroMobilePositionFrom(doc.hero_mobile_position),
    typing_text: Array.isArray(doc.typing_text) ? doc.typing_text : [],
    short_desc: doc.short_desc || '',
    years_of_experience:
      doc.years_of_experience === undefined || doc.years_of_experience === null
        ? null
        : Number(doc.years_of_experience),
    people_trained:
      doc.people_trained === undefined || doc.people_trained === null
        ? null
        : Number(doc.people_trained),
    professional_certificates:
      doc.professional_certificates === undefined || doc.professional_certificates === null
        ? null
        : Number(doc.professional_certificates),
    events_and_workshops:
      doc.events_and_workshops === undefined || doc.events_and_workshops === null
        ? null
        : Number(doc.events_and_workshops),
    about_image: doc.about_image || '',
    about_image_position: heroMobilePositionFrom(doc.about_image_position),
    about_text: doc.about_text || '',
    journey: normalizeTitleDescItems(doc.journey),
    what_drives_me: normalizeWhatDrivesMe(doc.what_drives_me),
    professional_roles: normalizeProfessionalRoles(doc.professional_roles),
    links: Array.isArray(doc.links) ? doc.links : [],
    contact_phone: doc.contact_phone || '',
    contact_email: doc.contact_email || '',
    contact_text: doc.contact_text || '',
    contact_hero_image: doc.contact_hero_image || '',
    contact_hero_position: heroMobilePositionFrom(doc.contact_hero_position),
    contact_response_text: doc.contact_response_text || '',
    contact_location_name: doc.contact_location_name || '',
    contact_location_link: doc.contact_location_link || '',
    updatedAt: doc.updatedAt || null,
  };
}

async function signOptionalKey(key) {
  const objectKey = String(key || '').trim();
  if (!objectKey) return '';
  try {
    return await signR2GetUrl(objectKey);
  } catch (err) {
    console.warn('personal_info signed hero URL:', err?.message || err);
    return '';
  }
}

async function withSignedHeroUrl(doc) {
  const payload = publicDoc(doc);
  const [imageUrl, videoUrl] = await Promise.all([
    signOptionalKey(payload.hero_section_media_image),
    signOptionalKey(payload.hero_section_media_video),
  ]);

  // Legacy single URL: prefer video when both exist (old clients treated media as one asset).
  const legacyUrl = videoUrl || imageUrl || '';

  return {
    ...payload,
    hero_section_media_image_url: imageUrl,
    hero_section_media_video_url: videoUrl,
    hero_section_media_url: legacyUrl,
  };
}

export default async function handler(req, res) {
  const { MONGO_URI, DB_NAME } = getMongoFromEnv();

  let client;
  try {
    client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);

    if (req.method === 'GET') {
      const doc = await getOrCreateDoc(db);
      let manage = false;
      try {
        const user = await authMiddleware(req);
        const dbUser = await db.collection('users').findOne({ id: user.assistant_id });
        if (dbUser) manage = canManage(dbUser.role);
      } catch {
        manage = false;
      }

      return res.status(200).json({
        ...(await withSignedHeroUrl(doc)),
        canManage: manage,
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
      const update = { updatedAt: new Date() };

      if (typeof body.name === 'string') update.name = body.name.trim();

      const hasImageField = typeof body.hero_section_media_image === 'string';
      const hasVideoField = typeof body.hero_section_media_video === 'string';
      const hasLegacyField = typeof body.hero_section_media === 'string';

      if (hasImageField || hasVideoField) {
        const current = await db.collection('personal_info').findOne({ _id: PERSONAL_INFO_DOC_ID });
        const resolvedImage = hasImageField
          ? body.hero_section_media_image.trim()
          : String(current?.hero_section_media_image || '').trim();
        const resolvedVideo = hasVideoField
          ? body.hero_section_media_video.trim()
          : String(current?.hero_section_media_video || '').trim();
        if (hasImageField) update.hero_section_media_image = resolvedImage;
        if (hasVideoField) update.hero_section_media_video = resolvedVideo;
        update.hero_section_media = resolvedVideo || resolvedImage || '';
      } else if (hasLegacyField) {
        const legacy = body.hero_section_media.trim();
        update.hero_section_media = legacy;
        if (legacy && isVideoMediaKey(legacy)) {
          update.hero_section_media_video = legacy;
          update.hero_section_media_image = '';
        } else if (legacy) {
          update.hero_section_media_image = legacy;
          update.hero_section_media_video = '';
        } else {
          update.hero_section_media_image = '';
          update.hero_section_media_video = '';
        }
      }
      if (body.hero_mobile_position !== undefined) {
        update.hero_mobile_position = heroMobilePositionFrom(body.hero_mobile_position);
      }
      if (body.typing_text !== undefined || body.typing_text_raw !== undefined) {
        update.typing_text = normalizeTypingText(body.typing_text ?? body.typing_text_raw);
      }
      if (typeof body.short_desc === 'string') {
        update.short_desc = body.short_desc.trim();
      }
      if ('years_of_experience' in body) {
        update.years_of_experience = toNullableNumber(body.years_of_experience);
      }
      if ('people_trained' in body) {
        update.people_trained = toNullableNumber(body.people_trained);
      }
      if ('professional_certificates' in body) {
        update.professional_certificates = toNullableNumber(body.professional_certificates);
      }
      if ('events_and_workshops' in body) {
        update.events_and_workshops = toNullableNumber(body.events_and_workshops);
      }
      if (typeof body.about_image === 'string') update.about_image = body.about_image.trim();
      if (body.about_image_position !== undefined) {
        update.about_image_position = heroMobilePositionFrom(body.about_image_position);
      }
      if (typeof body.about_text === 'string') {
        update.about_text = body.about_text.trim();
      }
      if (body.journey !== undefined) {
        update.journey = normalizeTitleDescItems(body.journey);
      }
      if (body.what_drives_me !== undefined) {
        update.what_drives_me = normalizeWhatDrivesMe(body.what_drives_me);
      }
      if (body.professional_roles !== undefined) {
        update.professional_roles = normalizeProfessionalRoles(body.professional_roles);
      }
      if (Array.isArray(body.links)) {
        update.links = buildStoredLinksPayload(body.links);
      }
      if (typeof body.contact_phone === 'string') {
        update.contact_phone = body.contact_phone.trim();
      }
      if (typeof body.contact_email === 'string') {
        update.contact_email = body.contact_email.trim();
      }
      if (typeof body.contact_text === 'string') {
        update.contact_text = body.contact_text.trim();
      }
      if (typeof body.contact_hero_image === 'string') {
        update.contact_hero_image = body.contact_hero_image.trim();
      }
      if (body.contact_hero_position !== undefined) {
        update.contact_hero_position = heroMobilePositionFrom(body.contact_hero_position);
      }
      if (typeof body.contact_response_text === 'string') {
        update.contact_response_text = body.contact_response_text.trim();
      }
      if (typeof body.contact_location_name === 'string') {
        update.contact_location_name = body.contact_location_name.trim();
      }
      if (typeof body.contact_location_link === 'string') {
        update.contact_location_link = body.contact_location_link.trim();
      }

      await db.collection('personal_info').updateOne(
        { _id: PERSONAL_INFO_DOC_ID },
        { $set: update, $setOnInsert: { _id: PERSONAL_INFO_DOC_ID } },
        { upsert: true }
      );

      const doc = await getOrCreateDoc(db);
      return res.status(200).json({
        success: true,
        ...(await withSignedHeroUrl(doc)),
        canManage: true,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('personal_info API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
}
