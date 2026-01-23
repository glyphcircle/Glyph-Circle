
import { createClient } from '@supabase/supabase-js';

const resolveEnv = (keys: string[], fallback: string): string => {
  const meta = (import.meta as any).env || {};
  const proc = typeof process !== 'undefined' ? process.env : {};
  
  for (const key of keys) {
    let val = meta[key] || (proc as any)[key];
    if (val && typeof val === 'string') {
      val = val.replace(/['"]/g, '').trim().replace(/\/+$/, '');
      if (val.length > 10) return val;
    }
  }
  return fallback.trim().replace(/\/+$/, '');
};

const SUPABASE_URL = resolveEnv(
  ['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'], 
  'https://huvblygddkflciwfnbcf.supabase.co'
);

const SUPABASE_ANON_KEY = resolveEnv(
  ['VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'], 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1dmJseWdkZGtmbGNpd2ZuYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzI5NjgsImV4cCI6MjA4NDE0ODk2OH0.gtNftIJUHNuWUriF7AJvat0SLUQLcsdpWVl-yGkv5m8'
);

export const isSupabaseConfigured = () => {
    try {
        const url = new URL(SUPABASE_URL);
        return url.protocol === 'https:' && SUPABASE_ANON_KEY.length > 20;
    } catch {
        return false;
    }
};

const options = {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true, // Crucial for reading confirmation tokens
        flowType: 'implicit' as const, 
        storage: window.localStorage,
    }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, options);
