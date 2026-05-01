import { PostgrestClient } from '@supabase/postgrest-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const token = import.meta.env.VITE_POSTGREST_TOKEN;

const client = new PostgrestClient(url, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

export const supabase = {
  from: (table) => client.from(table),
};
