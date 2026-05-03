import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import fs from 'node:fs'

function createToken(email, secret) {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + 86400000 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token, secret) {
  if (!token || !secret) return null;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'dev-api',
        configureServer(server) {
          server.middlewares.use('/api/login', (req, res) => {
            if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
              try {
                const { email, password } = JSON.parse(body);
                const users = JSON.parse(fs.readFileSync(new URL('./users.local.json', import.meta.url), 'utf8'));
                const user = users.find(u => u.email === email);
                res.setHeader('Content-Type', 'application/json');
                if (user && await bcrypt.compare(password, user.passwordHash)) {
                  res.end(JSON.stringify({ token: createToken(email, env.SESSION_SECRET), email }));
                } else {
                  res.statusCode = 401;
                  res.end(JSON.stringify({ error: 'Credenciales incorrectas' }));
                }
              } catch {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Bad request' }));
              }
            });
          });

          server.middlewares.use('/api/notify-cancel', (req, res) => {
            if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
              try {
                const { nombre, telefono, fechaInicio, peluquero } = JSON.parse(body);
                let fechaFormateada = null;
                if (fechaInicio) {
                  const date = new Date(fechaInicio);
                  const tz = 'Europe/Madrid';
                  const dia = new Intl.DateTimeFormat('es-ES', { timeZone: tz, day: 'numeric' }).format(date);
                  const mes = new Intl.DateTimeFormat('es-ES', { timeZone: tz, month: 'long' }).format(date);
                  const hora = new Intl.DateTimeFormat('es-ES', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
                  fechaFormateada = `${dia} de ${mes} a las ${hora}h`;
                }
                await fetch('https://barberiacasablanca-n8n.nrmm0x.easypanel.host/webhook/3455a5b6-fe8f-407a-83c1-cd602686c88f', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ nombre, telefono, peluquero, fechaFormateada }),
                });
              } catch { /* fire-and-forget */ }
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            });
          });

          server.middlewares.use('/api/db', (req, res, next) => {
            if (!verifyToken(req.headers['x-session-token'], env.SESSION_SECRET)) {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ code: 'UNAUTHORIZED', message: 'No autorizado' }));
              return;
            }
            next();
          });
        },
      },
    ],
    base: './',
    server: {
      proxy: {
        '/api/db': {
          target: env.POSTGREST_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/db/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Bearer ${env.POSTGREST_TOKEN}`);
              proxyReq.removeHeader('x-session-token');
            });
          },
        },
      },
    },
  }
})
