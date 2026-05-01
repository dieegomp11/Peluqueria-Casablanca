import { PostgrestClient } from '@supabase/postgrest-js';

const getClient = () =>
  new PostgrestClient('/api/db', {
    headers: {
      'X-Session-Token': localStorage.getItem('casablanca_token') || '',
    },
  });

export const supabase = {
  from: (table) => getClient().from(table),
};
