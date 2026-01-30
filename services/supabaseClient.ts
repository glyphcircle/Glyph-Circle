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

// ✅ CUSTOM FETCH that logs and times out properly
const customFetch: typeof fetch = async (input, init) => {
    console.log('🌐 [FETCH] Request:', typeof input === 'string' ? input : input.url, init?.method || 'GET');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.error('⏱️ [FETCH] TIMEOUT after 8 seconds!');
        controller.abort();
    }, 8000);

    try {
        const response = await fetch(input, {
            ...init,
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('📥 [FETCH] Response:', response.status, response.statusText);
        return response;

    } catch (error) {
        clearTimeout(timeoutId);
        console.error('💥 [FETCH] Error:', error);
        throw error;
    }
};

// Create client with custom fetch and no lock
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
        fetch: customFetch
    },
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'implicit' as const,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
            console.log('🔓 [LOCK] Bypassed');
            return await fn();
        }
    }
});

// Auth state logger
supabase.auth.onAuthStateChange((event, _session) => {
    console.log(`🔌 [Auth] Dimension Shift Detected: ${event}`);
});

export default supabase;

// Debug exposure
if (typeof window !== 'undefined') {
    (window as any).supabase = supabase;
    console.log('🔧 [DEBUG] Supabase exposed to window.supabase');
}
