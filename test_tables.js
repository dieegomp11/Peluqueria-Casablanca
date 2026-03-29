import fs from 'fs';
const headers = {
  apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjc3VrbHlhcWl2bHB0cmRhemtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MzIxNjgsImV4cCI6MjA5MDAwODE2OH0.HrqxO2wYOxKPjaa8kz8nXE3n2VxvtLxbqTfxyKPZZ9c',
  Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjc3VrbHlhcWl2bHB0cmRhemtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MzIxNjgsImV4cCI6MjA5MDAwODE2OH0.HrqxO2wYOxKPjaa8kz8nXE3n2VxvtLxbqTfxyKPZZ9c'
};
const endpoints = ['Corte', 'Cortes', 'Peluquero', 'Peluqueros', 'TipoCorte', 'Servicios', 'Servicio'];
Promise.all(endpoints.map(e => 
  fetch(`https://dcsuklyaqivlptrdazkd.supabase.co/rest/v1/${e}?limit=1`, {headers})
    .then(r => r.ok ? r.json() : null)
)).then(data => {
  const results = {};
  endpoints.forEach((e, i) => results[e] = data[i]);
  fs.writeFileSync('tables_dump.json', JSON.stringify(results, null, 2));
}).catch(console.error);
