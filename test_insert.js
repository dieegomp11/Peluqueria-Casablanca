import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const VITE_SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1];
const VITE_SUPABASE_ANON_KEY = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1];

const headers = {
  apikey: VITE_SUPABASE_ANON_KEY,
  Authorization: `Bearer ${VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function testApi() {
  const payload = {
    idPeluquero: 1,
    fechaInicio: '2026-03-29',
    fechaFin: '2026-03-29'
  };
  const res = await fetch(`${VITE_SUPABASE_URL}/rest/v1/Ausencia`, { 
    method: 'POST', 
    headers, 
    body: JSON.stringify(payload) 
  });
  const text = await res.text();
  console.log('Status:', res.status);
  fs.writeFileSync('err.txt', text);
}
testApi();
