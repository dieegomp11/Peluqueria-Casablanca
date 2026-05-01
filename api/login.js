import crypto from 'node:crypto';

function createToken(email) {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + 86400000 })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', process.env.SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const users = JSON.parse(process.env.APP_USERS || '[]');
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });

  res.status(200).json({ token: createToken(email), email });
}
