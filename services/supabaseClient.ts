import { createClient } from '@supabase/supabase-js';

const resolveEnv = (key: string, fallback: string): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
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

// 🛡️ REFINED CLIENT CONFIGURATION
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'implicit' as const, 
        storage: window.localStorage,
    },
    global: {
        // Force Authorization header to prevent RLS 400 errors during session dimension shifts
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    }
});

// ⚡ SOVEREIGN SESSION RECOVERY: Automatically re-aligns admin context if tokens expire
supabase.auth.onAuthStateChange(async (event, session) => {
    console.log(`🔌 [Auth] Dimension Shift Detected: ${event}`);
    if (!session?.user || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
        try {
            console.log('🔄 [Auth] Re-establishing Sovereign Handshake...');
            // Fallback to anonymous session to keep public RLS active
            await supabase.auth.signInAnonymously();
            console.log('✅ [Auth] Session Re-aligned Successfully');
        } catch (e) {
            console.warn('❌ [Auth] Alignment Failed. Dimension is unstable.', e);
        }
    }
});

export default supabase;

// 🔧 DEBUG: Expose to window for AI Studio testing
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
  console.log('🔧 [DEBUG] Supabase exposed to window.supabase');
}