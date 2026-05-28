import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { password } = req.body as { password?: string };
  const token = process.env.ACCESS_TOKEN;

  if (!token) return res.status(500).json({ error: 'Server misconfigured' });
  if (!password || password !== token) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  res.json({ ok: true, token });
}
