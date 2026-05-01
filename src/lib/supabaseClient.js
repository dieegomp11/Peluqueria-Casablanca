import { PostgrestClient } from '@supabase/postgrest-js';

const BASE_URL = `${window.location.origin}/api/db`;

const getClient = () =>
  new PostgrestClient(BASE_URL, {
    headers: {
      'X-Session-Token': localStorage.getItem('casablanca_token') || '',
    },
  });

export const supabase = {
  from: (table) => getClient().from(table),
};
