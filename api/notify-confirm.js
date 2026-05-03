const WEBHOOK_URL = process.env.WEBHOOK_CONFIRM_URL;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { nombre, telefono, fechaInicio, peluquero } = req.body || {};

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
      body: JSON.stringify({ nombre, telefono, peluquero, fechaFormateada }),
    });
  } catch {
    // fire-and-forget
  }

  res.status(200).json({ ok: true });
}
