const WEBHOOK_URL = 'https://barberiacasablanca-n8n.nrmm0x.easypanel.host/webhook/3455a5b6-fe8f-407a-83c1-cd602686c88f';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { nombre, telefono, fechaInicio } = req.body || {};

  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, telefono, fechaInicio }),
    });
  } catch {
    // fire-and-forget: no bloqueamos si n8n falla
  }

  res.status(200).json({ ok: true });
}
