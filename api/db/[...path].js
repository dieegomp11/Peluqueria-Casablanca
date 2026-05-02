import crypto from 'node:crypto';

function verifyToken(token) {
  if (!token) return { error: 'no_token' };
  if (!process.env.SESSION_SECRET) return { error: 'no_secret' };
  const dot = token.lastIndexOf('.');
  if (dot === -1) return { error: 'no_dot' };
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto
    .createHmac('sha256', process.env.SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  try {
    const sigBuf = Buffer.from(sig, 'base64url');
    const expBuf = Buffer.from(expected, 'base64url');
    if (sigBuf.length !== expBuf.length) return { error: 'length_mismatch', sigLen: sigBuf.length, expLen: expBuf.length };
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return { error: 'sig_mismatch' };
  } catch (e) {
    return { error: 'exception', detail: e.message };
  }
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (data.exp < Date.now()) return { error: 'expired' };
  return { ok: true, data };
}

export default async function handler(req, res) {
  const token = req.headers['x-session-token'];
  const result = verifyToken(token);
  if (!result.ok) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'No autorizado', debug: result });
  }

  // Use req.query.path for the table name. Strip the injected ...path param from
  // the raw query string before forwarding to PostgREST.
  const { path: pathParts } = req.query;
  const tablePath = (Array.isArray(pathParts) ? pathParts : [pathParts])
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
  const rawQs = (req.url || '').split('?')[1] || '';
  const qs = rawQs
    .split('&')
    .filter(p => p && !p.startsWith('...path') && !p.startsWith('%2E%2E%2Epath'))
    .join('&');
  const suffix = '/' + tablePath + (qs ? '?' + qs : '');
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
