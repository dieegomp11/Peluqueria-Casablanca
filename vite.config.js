import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'dev-login-api',
        configureServer(server) {
          server.middlewares.use('/api/login', (req, res) => {
            if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
              try {
                const { email, password } = JSON.parse(body);
                const users = JSON.parse(env.APP_USERS || '[]');
                const user = users.find(u => u.email === email && u.password === password);
                res.setHeader('Content-Type', 'application/json');
                if (user) {
                  const token = 'dev-' + Buffer.from(email).toString('base64url');
                  res.end(JSON.stringify({ token, email }));
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
