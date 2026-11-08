import { createClient } from '@supabase/supabase-js';

let pending;

export function getSupabase() {
  if (!pending) pending = openClient();
  return pending;
}

async function openClient() {
  const response = await fetch('/api/supabase-config');
  const data = await response.json().catch(() => ({ configured: false }));
  if (!data.configured || !data.url || !data.anonKey) return null;
  return createClient(data.url, data.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
