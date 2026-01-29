import { createClient } from '@supabase/supabase-js';

/**
 * 🛡️ ROBUST ENVIRONMENT RESOLUTION
 * Checks multiple possible locations for environment variables to ensure
 * the Supabase client is correctly instantiated.
 */
const resolveEnv = (key: string, fallback: string): string => {
  // 1. Check import.meta.env (Vite standard)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }

  // 2. Check process.env (Node/AI Studio standard)
  if (typeof process !== 'undefined' && process.env && (process.env as any)[key]) {
    return (process.env as any)[key];
  }

  return fallback;
};

const SUPABASE_URL = resolveEnv('VITE_SUPABASE_URL', 'https://huvblygddkflciwfnbcf.supabase.co');
const SUPABASE_ANON_KEY = resolveEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1dmJseWdkZGtmbGNpd2ZuYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzI5NjgsImV4cCI6MjA4NDE0ODk2OH0.gtNftIJUHNuWUriF7AJvat0SLUQLcsdpWVl-yGkv5m8');

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
        detectSessionInUrl: true,
        flowType: 'implicit' as const, 
        storage: window.localStorage,
    }
};

console.log(`🔌 [Supabase] Initializing client... URL detected: ${SUPABASE_URL.substring(0, 20)}...`);
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, options);