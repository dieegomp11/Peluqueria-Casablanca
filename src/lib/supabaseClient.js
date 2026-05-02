import { PostgrestClient } from '@supabase/postgrest-js';

const BASE_URL = `${window.location.origin}/api/db`;

// Intercept all fetch calls to /api/db/* to inject the session token.
// This is more reliable than passing a custom fetch to PostgrestClient,
// which may not propagate through all internal builder constructors.
const _origFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = (input, init = {}) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url && url.includes('/api/db/')) {
    const token = localStorage.getItem('casablanca_token') || '';
    init = { ...init, headers: { ...(init.headers || {}), 'x-session-token': token } };
  }
  return _origFetch(input, init);
};

const getClient = () => new PostgrestClient(BASE_URL);

export const supabase = {
  from: (table) => getClient().from(table),
};
