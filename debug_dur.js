import fs from 'fs';
const headers = {
  apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjc3VrbHlhcWl2bHB0cmRhemtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MzIxNjgsImV4cCI6MjA5MDAwODE2OH0.HrqxO2wYOxKPjaa8kz8nXE3n2VxvtLxbqTfxyKPZZ9c',
  Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjc3VrbHlhcWl2bHB0cmRhemtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MzIxNjgsImV4cCI6MjA5MDAwODE2OH0.HrqxO2wYOxKPjaa8kz8nXE3n2VxvtLxbqTfxyKPZZ9c'
};
Promise.all([
  fetch('https://dcsuklyaqivlptrdazkd.supabase.co/rest/v1/Citas?select=*,Cliente(*)&order=idCita', {headers}).then(r=>r.json()),
  fetch('https://dcsuklyaqivlptrdazkd.supabase.co/rest/v1/Tipo Corte?select=*', {headers}).then(r=>r.json()),
]).then(d => {
  // For each appointment show duration calculation
  const results = d[0].map(apt => {
    const diffMs = apt.fechaFin && apt.fechaInicio ? new Date(apt.fechaFin) - new Date(apt.fechaInicio) : 0;
    const diffMins = diffMs / 60000;
    const slots = Math.max(1, Math.ceil(diffMins / 30));
    return {
      idCita: apt.idCita,
      corte: apt.corte,
      fechaInicio: apt.fechaInicio,
      fechaFin: apt.fechaFin,
      diffMins,
      slots,
      cliente: apt.Cliente?.nombreCliente
    };
  });
  fs.writeFileSync('debug_durations.json', JSON.stringify({ citas: results, tipoCorte: d[1] }, null, 2));
}).catch(console.error);
