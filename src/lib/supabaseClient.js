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
    
    // Properly handle Headers object or plain object to prevent dropping headers like Content-Type
    const headersObj = {};
    if (init.headers) {
      const tempHeaders = new Headers(init.headers);
      tempHeaders.forEach((value, key) => {
        headersObj[key] = value;
      });
    }
    headersObj['x-session-token'] = token;
    
    init = { ...init, headers: headersObj };
  }
  return _origFetch(input, init);
};

const getClient = () => new PostgrestClient(BASE_URL);

export const supabase = {
  from: (table) => getClient().from(table),
};
