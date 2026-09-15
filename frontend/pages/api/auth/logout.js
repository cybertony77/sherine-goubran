import { clearAuthCookieHeader } from '../../../lib/authSecrets';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Set-Cookie', clearAuthCookieHeader());

  res.json({ success: true, message: 'Logged out successfully' });
}
