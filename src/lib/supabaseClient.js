import { PostgrestClient } from '@supabase/postgrest-js';

const url = import.meta.env.VITE_SUPABASE_URL;

const client = new PostgrestClient(url);

export const supabase = {
  from: (table) => client.from(table),
};
