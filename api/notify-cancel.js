const WEBHOOK_URL = 'https://barberiacasablanca-n8n.nrmm0x.easypanel.host/webhook/3455a5b6-fe8f-407a-83c1-cd602686c88f';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { nombre, telefono, fechaInicio } = req.body || {};

  let fechaFormateada = null;
  if (fechaInicio) {
    const date = new Date(fechaInicio);
    const tz = 'Europe/Madrid';
    const dia = new Intl.DateTimeFormat('es-ES', { timeZone: tz, day: 'numeric' }).format(date);
    const mes = new Intl.DateTimeFormat('es-ES', { timeZone: tz, month: 'long' }).format(date);
    const hora = new Intl.DateTimeFormat('es-ES', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
    fechaFormateada = `${dia} de ${mes} a las ${hora}h`;
  }

  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, telefono, fechaFormateada }),
    });
  } catch {
    // fire-and-forget: no bloqueamos si n8n falla
  }

  res.status(200).json({ ok: true });
}
