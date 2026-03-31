
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('Citas').select('*, Cliente(*)').limit(5);
  if (error) {
    console.error('Error fetching:', error);
    return;
  }
  console.log('Sample data:', JSON.stringify(data, null, 2));
}

test();
