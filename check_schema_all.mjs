
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://dcsuklyaqivlptrdazkd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjc3VrbHlhcWl2bHB0cmRhemtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MzIxNjgsImV4cCI6MjA5MDAwODE2OH0.HrqxO2wYOxKPjaa8kz8nXE3n2VxvtLxbqTfxyKPZZ9c';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable() {
  const { data, error } = await supabase
    .from('Usuarios')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Columns:', Object.keys(data[0]));
    console.log('Sample Data:', data[0]);
  }
}

checkTable();
