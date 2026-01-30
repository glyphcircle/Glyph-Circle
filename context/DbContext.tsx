import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { dbService } from '../services/db';
import { supabase } from '../services/supabaseClient';

// Verify Supabase client loaded
if (!supabase) {
  console.error('💥 FATAL: Supabase client failed to import!');
  throw new Error('Supabase client is undefined. Check import path.');
}
console.log('✅ Supabase client loaded successfully');

export interface NetworkEvent {
  id: string;
  endpoint: string;
  method: string;
  source: string;
  status: 'success' | 'pending' | 'error';
}

interface DbContextType {
  db: Record<string, any[]>;
  refreshTable: (tableName: string) => Promise<void>;
  updateEntry: (tableName: string, id: string | number, updates: any) => Promise<any>;
  createEntry: (tableName: string, payload: any) => Promise<any>;
  deleteEntry: (tableName: string, id: string | number) => Promise<void>;
  toggleStatus: (tableName: string, id: string | number) => Promise<void>;
  refresh: () => Promise<void>;
  networkLedger: NetworkEvent[];
}

export const DbContext = createContext<DbContextType | undefined>(undefined);

export const DbProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<Record<string, any[]>>({ services: [] });
  const [networkLedger, setNetworkLedger] = useState<NetworkEvent[]>([]);

  // 🛡️ Safe Environment Variable Access
  const getEnv = (key: string, fallback: string): string => {
    try {
      const meta = import.meta as any;
      if (typeof meta !== 'undefined' && meta.env) {
        return meta.env[key] || fallback;
      }
    } catch (e) {
      console.warn(`Environment access for ${key} failed:`, e);
    }
    return fallback;
  };

  const SUPABASE_URL = getEnv('VITE_SUPABASE_URL', 'https://huvblygddkflciwfnbcf.supabase.co');
  const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1dmJseWdkZGtmbGNpd2ZuYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzI5NjgsImV4cCI6MjA4NDE0ODk2OH0.gtNftIJUHNuWUriF7AJvat0SLUQLcsdpWVl-yGkv5m8');

  // 🎯 Dynamically derive project ID for the auth token key
  const projectId = (() => {
    try {
      const url = new URL(SUPABASE_URL);
      return url.hostname.split('.')[0];
    } catch {
      return 'huvblygddkflciwfnbcf';
    }
  })();

  const AUTH_STORAGE_KEY = `sb-${projectId}-auth-token`;

  // Network event logger
  const logEvent = useCallback((event: Omit<NetworkEvent, 'id'>) => {
    setNetworkLedger(prev => [{
      ...event,
      id: Math.random().toString(36).substring(2, 11)
    }, ...prev].slice(0, 50));
  }, []);

  // 🔐 Secure token retrieval from localStorage
  const getAuthToken = (): string => {
    const authDataStr = localStorage.getItem(AUTH_STORAGE_KEY);

    if (!authDataStr) {
      throw new Error('No authentication token found. Please log in.');
    }

    try {
      const authData = JSON.parse(authDataStr);
      const token = authData?.access_token;

      if (!token) {
        throw new Error('Invalid authentication data. Please log in again.');
      }

      return token;
    } catch (err) {
      throw new Error('Failed to parse authentication token. Please log in again.');
    }
  };

  // 🔧 Direct HTTP UPDATE (PATCH) - bypasses Supabase client deadlock
  const directUpdate = async (tableName: string, id: string, updates: any) => {
    console.log('🔧 [DIRECT] Starting HTTP PATCH...');

    const token = getAuthToken();
    console.log('🔑 [DIRECT] Token retrieved from localStorage');

    const url = `${SUPABASE_URL}/rest/v1/${tableName}?id=eq.${id}`;
    console.log('🌐 [DIRECT] URL:', url);
    console.log('📦 [DIRECT] Payload:', updates);

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updates)
    });

    console.log('📥 [DIRECT] Response:', response.status, response.statusText);

    if (!response.ok) {
      const text = await response.text();
      console.error('🚨 [DIRECT] Error response:', text);
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();
    console.log('✅ [DIRECT] Update success:', data);

    return Array.isArray(data) ? data[0] : data;
  };

  // 🆕 Direct HTTP CREATE (POST) - bypasses Supabase client deadlock
  const directCreate = async (tableName: string, payload: any) => {
    console.log('🔧 [DIRECT] Starting HTTP POST...');

    const token = getAuthToken();
    console.log('🔑 [DIRECT] Token retrieved from localStorage');

    const url = `${SUPABASE_URL}/rest/v1/${tableName}`;
    console.log('🌐 [DIRECT] URL:', url);
    console.log('📦 [DIRECT] Payload:', payload);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    console.log('📥 [DIRECT] Response:', response.status, response.statusText);

    if (!response.ok) {
      const text = await response.text();
      console.error('🚨 [DIRECT] Error response:', text);
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();
    console.log('✅ [DIRECT] Create success:', data);

    return Array.isArray(data) ? data[0] : data;
  };

  // 🗑️ Direct HTTP DELETE - bypasses Supabase client deadlock
  const directDelete = async (tableName: string, id: string) => {
    console.log('🔧 [DIRECT] Starting HTTP DELETE...');

    const token = getAuthToken();
    console.log('🔑 [DIRECT] Token retrieved from localStorage');

    const url = `${SUPABASE_URL}/rest/v1/${tableName}?id=eq.${id}`;
    console.log('🌐 [DIRECT] URL:', url);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 [DIRECT] Response:', response.status, response.statusText);

    if (!response.ok) {
      const text = await response.text();
      console.error('🚨 [DIRECT] Error response:', text);
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    console.log('✅ [DIRECT] Delete success');
  };

  // 🔍 Direct HTTP GET - bypasses Supabase client deadlock
  const directGet = async (tableName: string) => {
    console.log('🔧 [DIRECT] Starting HTTP GET...');

    const token = getAuthToken();
    console.log('🔑 [DIRECT] Token retrieved from localStorage');

    const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=*`;
    console.log('🌐 [DIRECT] URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 [DIRECT] Response:', response.status, response.statusText);

    if (!response.ok) {
      const text = await response.text();
      console.error('🚨 [DIRECT] Error response:', text);
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const data = await response.json();
    console.log('✅ [DIRECT] GET success:', Array.isArray(data) ? `${data.length} records` : 'No data');

    return data;
  };

  // Refresh table data
  const refreshTable = useCallback(async (tableName: string) => {
    console.log('🔄 [DB] Refresh START:', tableName);
    logEvent({ endpoint: tableName, method: 'GET', source: 'DB', status: 'pending' });

    try {
      const data = await directGet(tableName);
      console.log('📦 [DB] Received data:', Array.isArray(data) ? `${data.length} records` : 'No data');

      setDb(prev => ({ ...prev, [tableName]: data || [] }));
      console.log('✅ [DB] Refresh complete:', tableName);

      logEvent({ endpoint: tableName, method: 'GET', source: 'DB', status: 'success' });
    } catch (e) {
      console.error('❌ [DB] Refresh failed:', e);
      logEvent({ endpoint: tableName, method: 'GET', source: 'DB', status: 'error' });
    }
  }, [logEvent]);  // ✅ ONLY logEvent

  // Refresh all data
  const refresh = useCallback(async () => {
    try {
      const bundle = await dbService.getStartupBundle();
      if (bundle) setDb(bundle);
    } catch (e) {
      console.warn('⚠️ [DB] Startup bundle failed, falling back to services table');
      await refreshTable('services');
    }
  }, [refreshTable]);

  // Public API: UPDATE entry
  const updateEntry = useCallback(async (tableName: string, id: string | number, updates: any) => {
    console.log('📡 [DB] PATCH START', { tableName, id, updatesKeys: Object.keys(updates) });

    // Clean payload - remove server-managed fields
    const cleanUpdates = { ...updates };
    ['created_at', 'updated_at', 'timestamp', 'item_ids', 'user_id', 'id'].forEach(key => delete (cleanUpdates as any)[key]);

    console.log('📦 [DB] Clean payload:', cleanUpdates);

    logEvent({ endpoint: `${tableName}/${id}`, method: 'PATCH', source: 'DB', status: 'pending' });

    try {
      const data = await directUpdate(tableName, id as string, cleanUpdates);
      console.log('✅ [DB] Update successful!', data);
      logEvent({ endpoint: `${tableName}/${id}`, method: 'PATCH', source: 'DB', status: 'success' });
      return data;
    } catch (err: any) {
      console.error('💥 [DB] Update failed:', err);
      logEvent({ endpoint: `${tableName}/${id}`, method: 'PATCH', source: 'DB', status: 'error' });
      throw err;
    }
  }, [logEvent]);  // ✅ ONLY logEvent

  // Public API: CREATE entry
  const createEntry = useCallback(async (tableName: string, payload: any) => {
    console.log('📡 [DB] POST START', { tableName, payloadKeys: Object.keys(payload) });

    logEvent({ endpoint: tableName, method: 'POST', source: 'DB', status: 'pending' });

    try {
      const result = await directCreate(tableName, payload);
      console.log('✅ [DB] Create successful!', result);
      await refreshTable(tableName);
      logEvent({ endpoint: tableName, method: 'POST', source: 'DB', status: 'success' });
      return result;
    } catch (err: any) {
      console.error('💥 [DB] Create failed:', err);
      logEvent({ endpoint: tableName, method: 'POST', source: 'DB', status: 'error' });
      throw err;
    }
  }, [refreshTable, logEvent]);  // ✅ ONLY refreshTable and logEvent

  // Public API: DELETE entry
  const deleteEntry = useCallback(async (tableName: string, id: string | number) => {
    console.log('📡 [DB] DELETE START', { tableName, id });

    logEvent({ endpoint: `${tableName}/${id}`, method: 'DELETE', source: 'DB', status: 'pending' });

    try {
      await directDelete(tableName, id as string);
      console.log('✅ [DB] Delete successful!');
      await refreshTable(tableName);
      logEvent({ endpoint: `${tableName}/${id}`, method: 'DELETE', source: 'DB', status: 'success' });
    } catch (err: any) {
      console.error('💥 [DB] Delete failed:', err);
      logEvent({ endpoint: `${tableName}/${id}`, method: 'DELETE', source: 'DB', status: 'error' });
      throw err;
    }
  }, [refreshTable, logEvent]);  // ✅ ONLY refreshTable and logEvent

  // Public API: Toggle status
  const toggleStatus = useCallback(async (tableName: string, id: string | number) => {
    const list = db[tableName] || [];
    const record = list.find((r: any) => r.id === id);
    if (record) {
      const nextStatus = record.status === 'active' ? 'inactive' : 'active';
      await updateEntry(tableName, id, { status: nextStatus });
    }
  }, [db, updateEntry]);

  // Initialize data on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <DbContext.Provider value={{
      db,
      refreshTable,
      updateEntry,
      createEntry,
      deleteEntry,
      toggleStatus,
      refresh,
      networkLedger
    }}>
      {children}
    </DbContext.Provider>
  );
};
