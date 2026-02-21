// services/serviceRegistry.ts
// ✅ Loads ALL services from DB once at startup
// ✅ Resolves any slug/name → full service config dynamically
// ✅ No hardcoded UUIDs — new services work automatically
// ✅ In-memory cache with 10-minute TTL + manual refresh

import { supabase } from './supabaseClient';

interface ServiceRecord {
    id: string;           // UUID
    name: string;         // "Moon Journal Analytics"
    price: number;
    status: string;
    [key: string]: any;
}

interface Registry {
    byId: Map<string, ServiceRecord>;  // UUID → record
    bySlug: Map<string, ServiceRecord>;  // "moon-journal-analytics" → record
    byName: Map<string, ServiceRecord>;  // "Moon Journal Analytics" → record (lowercase)
}

let registry: Registry | null = null;
let lastLoaded: number = 0;
let loadPromise: Promise<Registry> | null = null;

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ── Slug generator — "Moon Journal Analytics" → "moon-journal-analytics" ─────
const toSlug = (name: string): string =>
    name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

// ── Build registry from raw DB rows ──────────────────────────────────────────
const buildRegistry = (rows: ServiceRecord[]): Registry => {
    const byId = new Map<string, ServiceRecord>();
    const bySlug = new Map<string, ServiceRecord>();
    const byName = new Map<string, ServiceRecord>();

    for (const row of rows) {
        byId.set(row.id, row);
        bySlug.set(toSlug(row.name), row);
        byName.set(row.name.toLowerCase(), row);
    }

    return { byId, bySlug, byName };
};

// ── Load from Supabase (debounced — only one fetch at a time) ─────────────────
const loadRegistry = async (): Promise<Registry> => {
    // Return in-memory cache if still fresh
    if (registry && Date.now() - lastLoaded < CACHE_TTL_MS) {
        return registry;
    }

    // Deduplicate concurrent calls — only one fetch in flight
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
        try {
            const { data, error } = await supabase
                .from('services')
                .select('*')
                .eq('status', 'active');

            if (error) throw error;

            registry = buildRegistry(data || []);
            lastLoaded = Date.now();
            console.log(`✅ [ServiceRegistry] Loaded ${data?.length ?? 0} services`);
            return registry;
        } catch (err) {
            console.warn('[ServiceRegistry] Load failed, returning empty registry:', err);
            // Return empty but valid registry — won't crash the app
            return buildRegistry([]);
        } finally {
            loadPromise = null;
        }
    })();

    return loadPromise;
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves any identifier (UUID, slug, or display name) to a ServiceRecord.
 * 
 * Examples:
 *   resolve('moon-journal-analytics')         → { id: '726ae...', name: 'Moon Journal', price: 0 }
 *   resolve('Moon Journal Analytics')          → same
 *   resolve('726ae004-b61f-426b-...')          → same
 *   resolve('tarot')                           → { id: 'dd0c8...', name: 'Imperial Tarot', price: 49 }
 */
export const resolveService = async (
    identifier: string
): Promise<ServiceRecord | null> => {
    const reg = await loadRegistry();

    // 1. Try exact UUID match
    if (reg.byId.has(identifier)) return reg.byId.get(identifier)!;

    // 2. Try slug match  ("moon-journal-analytics")
    if (reg.bySlug.has(identifier)) return reg.bySlug.get(identifier)!;

    // 3. Try lowercase name match ("moon journal analytics")
    if (reg.byName.has(identifier.toLowerCase())) {
        return reg.byName.get(identifier.toLowerCase())!;
    }

    // 4. Fuzzy slug — try partial word match
    //    "tarot" matches "Imperial Tarot" slug "imperial-tarot"
    for (const [slug, record] of reg.bySlug.entries()) {
        if (slug.includes(identifier) || identifier.includes(slug)) {
            return record;
        }
    }

    console.warn(`[ServiceRegistry] Could not resolve service: "${identifier}"`);
    return null;
};

/**
 * Force-refresh the registry (call after adding a new service in DB).
 */
export const refreshServiceRegistry = async (): Promise<void> => {
    registry = null;
    lastLoaded = 0;
    await loadRegistry();
};

/**
 * Preload registry at app startup so first service call is instant.
 * Call this in App.tsx or main.tsx.
 */
export const preloadServiceRegistry = (): void => {
    loadRegistry().catch(() => { }); // fire and forget
};
