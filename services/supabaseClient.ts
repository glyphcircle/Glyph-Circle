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

/**
 * Global Safe Storage Implementation
 * Totally avoids 'SecurityError' by probing environment before any access.
 */
export class SafeStorage {
    private memoryStore: Record<string, string> = {};
    public isRestricted = true; // Assume restricted until proven otherwise

    constructor() {
        this.probeStorage();
    }

    private probeStorage() {
        try {
            if (typeof window === 'undefined') return;
            
            // Attempting to even check for 'localStorage' in 'window' can throw SecurityError in some sandboxes
            if (!('localStorage' in window)) return;
            
            const test = window.localStorage;
            if (!test) return;

            const testKey = '__probe_test__';
            test.setItem(testKey, testKey);
            test.removeItem(testKey);
            
            // If we got here, it's safe to use
            this.isRestricted = false;
            console.log('✅ [SafeStorage] Native localStorage available');
        } catch (e) {
            console.warn('🔐 [SafeStorage] Native storage blocked by security policy. Using Memory Fallback.');
            this.isRestricted = true;
        }
    }

    getItem(key: string): string | null {
        if (this.isRestricted) return this.memoryStore[key] || null;
        try {
            return window.localStorage.getItem(key);
        } catch (e) {
            this.isRestricted = true;
            return this.memoryStore[key] || null;
        }
    }

    setItem(key: string, value: string): void {
        if (this.isRestricted) {
            this.memoryStore[key] = value;
            return;
        }
        try {
            window.localStorage.setItem(key, value);
        } catch (e) {
            this.isRestricted = true;
            this.memoryStore[key] = value;
        }
    }

    removeItem(key: string): void {
        if (this.isRestricted) {
            delete this.memoryStore[key];
            return;
        }
        try {
            window.localStorage.removeItem(key);
        } catch (e) {
            this.isRestricted = true;
            delete this.memoryStore[key];
        }
    }

    clear(): void {
        this.memoryStore = {};
        if (this.isRestricted) return;
        try {
            window.localStorage.clear();
        } catch (e) {
            this.isRestricted = true;
        }
    }
}

export const safeStorageInstance = new SafeStorage();

export const isSupabaseConfigured = () => {
    try {
        const url = new URL(SUPABASE_URL);
        return url.protocol === 'https:' && SUPABASE_ANON_KEY.length > 20;
    } catch {
        return false;
    }
};

const customFetch: typeof fetch = async (input, init) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
        const response = await fetch(input, {
            ...init,
            signal: controller.signal,
            mode: 'cors',  // ✅ Explicitly enable CORS
            credentials: 'omit',  // ✅ Don't send cookies in iframe
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
};

// ✅ Create client with custom fetch and safe storage
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
        fetch: customFetch,
        headers: {
            'X-Client-Info': 'supabase-js-web',
        },
    },
    auth: {
        autoRefreshToken: !safeStorageInstance.isRestricted,
        persistSession: !safeStorageInstance.isRestricted,
        detectSessionInUrl: false,  // ✅ FIXED: Don't detect sessions from URL in iframe
        flowType: 'pkce' as const,  // ✅ FIXED: Use PKCE for better security
        storage: safeStorageInstance as any,
        lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
            return await fn();
        },
    },
    db: {
        schema: 'public',
    },
});

// ✅ Expose to window for debugging (AI Studio Preview compatible)
if (typeof window !== 'undefined') {
    (window as any).supabase = supabase;
    console.log('🔧 [DEBUG] Supabase exposed to window.supabase');
}

console.log('✅ Supabase client loaded successfully');
console.log('📊 Storage mode:', safeStorageInstance.isRestricted ? 'Memory Fallback' : 'LocalStorage');

export default supabase;
