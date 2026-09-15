import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { authMiddleware } from '../../../../lib/authMiddleware';

import {requireStaffOrSelfStudent, isForbiddenError, forbiddenJson} from '../../../../lib/requireStaff';
function loadEnvConfig() {
  try {
    const envPath = path.join(process.cwd(), '..', 'env.config');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const index = trimmed.indexOf('=');
        if (index !== -1) {
          const key = trimmed.substring(0, index).trim();
          let value = trimmed.substring(index + 1).trim();
          value = value.replace(/^"|"$/g, '');
          envVars[key] = value;
        }
      }
    });
    
    return envVars;
  } catch (error) {
    console.log('⚠️  Could not read env.config, using process.env as fallback');
    return {};
  }
}

const envConfig = loadEnvConfig();
const MONGO_URI = envConfig.MONGO_URI || process.env.MONGO_URI;
const DB_NAME = envConfig.DB_NAME || process.env.DB_NAME;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client;
  try {
    // Verify authentication — staff any student, or student self
    const user = await authMiddleware(req);
    const { id } = req.query;
    const student_id = parseInt(id);
    await requireStaffOrSelfStudent(user, student_id);

    client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);

    // Get student
    const student = await db.collection('students').findOne({ id: student_id });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const onlineSessions = student.online_sessions || [];

    return res.status(200).json({ 
      success: true,
      online_sessions: onlineSessions
    });
  } catch (error) {
    if (isForbiddenError(error)) {
      return res.status(403).json(forbiddenJson(error));
    }
    console.error('❌ Error in online-sessions API:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
}

