import fs from 'fs';
const headers = {
  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjc3VrbHlhcWl2bHB0cmRhemtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MzIxNjgsImV4cCI6MjA5MDAwODE2OH0.HrqxO2wYOxKPjaa8kz8nXE3n2VxvtLxbqTfxyKPZZ9c',
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjc3VrbHlhcWl2bHB0cmRhemtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MzIxNjgsImV4cCI6MjA5MDAwODE2OH0.HrqxO2wYOxKPjaa8kz8nXE3n2VxvtLxbqTfxyKPZZ9c'
};
Promise.all([
  fetch('https://dcsuklyaqivlptrdazkd.supabase.co/rest/v1/Peluquero?limit=1', {headers}).then(r=>r.ok ? r.json() : null),
  fetch('https://dcsuklyaqivlptrdazkd.supabase.co/rest/v1/Cortes?limit=1', {headers}).then(r=>r.ok ? r.json() : null),
]).then(d => {
  fs.writeFileSync('schema_dump2.json', JSON.stringify({ Peluquero: d[0], Cortes: d[1] }, null, 2));
}).catch(console.error);
