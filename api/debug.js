import crypto from 'node:crypto';

export default function handler(req, res) {
  const secret = process.env.SESSION_SECRET;
  const postgrestUrl = process.env.POSTGREST_URL;
  const token = req.query.token || req.headers['x-session-token'] || '';

  const info = {
    hasSecret: !!secret,
    secretPreview: secret ? secret.slice(0, 6) + '...' : null,
    hasPostgrestUrl: !!postgrestUrl,
    postgrestUrlPreview: postgrestUrl ? postgrestUrl.slice(0, 30) + '...' : null,
    hasToken: !!token,
    tokenLength: token.length,
    receivedHeaders: Object.keys(req.headers),
  };

  if (token && secret) {
    try {
      const dot = token.lastIndexOf('.');
      const payload = token.slice(0, dot);
      const sig = token.slice(dot + 1);
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
      const sigBuf = Buffer.from(sig, 'base64url');
      const expBuf = Buffer.from(expected, 'base64url');
      const lengthOk = sigBuf.length === expBuf.length;
      const sigOk = lengthOk && crypto.timingSafeEqual(sigBuf, expBuf);
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
      info.verification = {
        lengthOk,
        sigOk,
        expired: data.exp < Date.now(),
        email: data.email,
        expiresAt: new Date(data.exp).toISOString(),
      };
    } catch (e) {
      info.verificationError = e.message;
    }
  }

  res.status(200).json(info);
}
