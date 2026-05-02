import { PostgrestClient } from '@supabase/postgrest-js';

const BASE_URL = `${window.location.origin}/api/db`;

const getClient = () => {
  const token = localStorage.getItem('casablanca_token') || '';
  return new PostgrestClient(BASE_URL, {
    fetch: (url, options = {}) =>
      fetch(url, {
        ...options,
        headers: { ...(options.headers || {}), 'x-session-token': token },
      }),
  });
};

export const supabase = {
  from: (table) => getClient().from(table),
};
