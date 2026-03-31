
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://dcsuklyaqivlptrdazkd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjc3VrbHlhcWl2bHB0cmRhemtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MzIxNjgsImV4cCI6MjA5MDAwODE2OH0.HrqxO2wYOxKPjaa8kz8nXE3n2VxvtLxbqTfxyKPZZ9c';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable() {
  const now = new Date().toISOString();
  console.log('Attempting update...');
  const result = await supabase
    .from('Usuarios')
    .update({ ultimaVisita: now })
    .eq('id', 1);
  
  console.log('Status:', result.status);
  console.log('StatusText:', result.statusText);
  console.log('Error:', result.error);

  const { data: cols } = await supabase.from('Usuarios').select('*').limit(1);
  console.log('Columns and values:', cols);
}

checkTable();
