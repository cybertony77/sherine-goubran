import path from 'path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { authMiddleware, isAuthError } from '../../../lib/authMiddleware';
import { applyCorsHeaders, getAllowedCorsOrigins } from '../../../lib/corsAllowlist';
import {
  assertR2Config,
  createR2S3ClientForPutPresign,
  ensureR2CorsForBrowserUploads,
  getR2Config,
} from '../../../lib/r2Server';

/** 6h TTL so slow / multi-GB uploads do not expire mid-transfer */
const PRESIGN_PUT_EXPIRES_SEC = 6 * 60 * 60; // 6 hours

const ALLOWED_PREFIXES = new Set([
  'videos',
  'personal-info',
  'pdfs/material',
  'pdfs/HW-PDFs',
  'pdfs/Quizs-PDFs',
  'pdfs/MockExams-PDFs',
]);

export default async function handler(req, res) {
  if (!applyCorsHeaders(req, res)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await authMiddleware(req);
    if (!['admin', 'developer', 'assistant'].includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const cfg = getR2Config();
    assertR2Config(cfg);

    // Only pass allowlisted Origin (or empty) — never expand R2 CORS with arbitrary Origin
    const requestOrigin = req.headers.origin || '';
    const corsOrigin =
      requestOrigin && getAllowedCorsOrigins().has(requestOrigin) ? requestOrigin : '';
    const corsSetup = await ensureR2CorsForBrowserUploads(cfg, corsOrigin);

    const { fileName, contentType, prefix: prefixRaw } = req.body || {};

    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    const prefix =
      typeof prefixRaw === 'string' && ALLOWED_PREFIXES.has(prefixRaw.trim())
        ? prefixRaw.trim()
        : 'videos';

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const baseName = path.basename(String(fileName).replace(/\\/g, '/'));
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'upload.bin';
    const key = `${prefix}/${timestamp}_${randomStr}_${sanitizedName}`;

    const contentTypeHeader =
      typeof contentType === 'string' && contentType.trim() !== ''
        ? contentType.trim()
        : 'application/octet-stream';

    const s3Client = createR2S3ClientForPutPresign(cfg);

    const command = new PutObjectCommand({
      Bucket: cfg.bucketName,
      Key: key,
      ContentType: contentTypeHeader,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGN_PUT_EXPIRES_SEC,
    });

    res.json({
      signedUrl,
      key,
      contentType: contentTypeHeader,
      expiresIn: PRESIGN_PUT_EXPIRES_SEC,
      corsSetup,
    });
  } catch (error) {
    if (isAuthError(error)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.error('R2 signed URL error:', error);
    const status = error.statusCode || 500;
    res.status(status).json({
      error: status === 400 ? 'Invalid request' : 'Failed to generate signed URL',
    });
  }
}
