import crypto from 'node:crypto';

function verifyToken(token) {
  if (!token || !process.env.SESSION_SECRET) return null;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto
    .createHmac('sha256', process.env.SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  try {
    const sigBuf = Buffer.from(sig, 'base64url');
    const expBuf = Buffer.from(expected, 'base64url');
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  } catch {
    return null;
  }
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (data.exp < Date.now()) return null;
  return data;
}

export default async function handler(req, res) {
  const token = req.headers['x-session-token'];
  if (!verifyToken(token)) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'No autorizado' });
  }

  // Use req.url directly to avoid Vercel injecting [...path] route params into the query.
  // req.url is the raw incoming URL, e.g. '/api/db/Citas?select=*,Cliente(*)'
  // Strip the '/api/db' prefix to get the PostgREST path + query string.
  const suffix = (req.url || '/').replace(/^\/api\/db/, '') || '/';
  const url = `${process.env.POSTGREST_URL}${suffix}`;

  const headers = {
    Authorization: `Bearer ${process.env.POSTGREST_TOKEN}`,
    'Content-Type': 'application/json',
  };
  if (req.headers['prefer']) headers['Prefer'] = req.headers['prefer'];
  if (req.headers['accept']) headers['Accept'] = req.headers['accept'];

  const body = ['GET', 'HEAD'].includes(req.method)
    ? undefined
    : JSON.stringify(req.body);

  try {
    const response = await fetch(url, { method: req.method, headers, body });
    const text = await response.text();

    res.status(response.status);
    const ct = response.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);
    const cr = response.headers.get('content-range');
    if (cr) res.setHeader('Content-Range', cr);
    res.send(text);
  } catch {
    res.status(502).json({ error: 'Base de datos no disponible' });
  }
}
