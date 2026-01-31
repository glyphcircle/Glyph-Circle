import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { dbService } from '../services/db';
import { supabase, safeStorageInstance } from '../services/supabaseClient';

if (!supabase) {
  throw new Error('Supabase client is undefined. Check import path.');
}

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

  const getEnv = (key: string, fallback: string): string => {
    try {
      const meta = import.meta as any;
      if (typeof meta !== 'undefined' && meta.env) {
        return meta.env[key] || fallback;
      }
    } catch (e) {}
    return fallback;
  };

  const SUPABASE_URL = getEnv('VITE_SUPABASE_URL', 'https://huvblygddkflciwfnbcf.supabase.co');
  const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1dmJseWdkZGtmbGNpd2ZuYmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzI5NjgsImV4cCI6MjA4NDE0ODk2OH0.gtNftIJUHNuWUriF7AJvat0SLUQLcsdpWVl-yGkv5m8');

  const projectId = (() => {
    try {
      const url = new URL(SUPABASE_URL);
      return url.hostname.split('.')[0];
    } catch {
      return 'huvblygddkflciwfnbcf';
    }
  })();

  const AUTH_STORAGE_KEY = `sb-${projectId}-auth-token`;

  const logEvent = useCallback((event: Omit<NetworkEvent, 'id'>) => {
    setNetworkLedger(prev => [{
      ...event,
      id: Math.random().toString(36).substring(2, 11)
    }, ...prev].slice(0, 50));
  }, []);

  const getAuthToken = (): string => {
    // FIX: Use safeStorageInstance instead of direct localStorage to avoid SecurityError
    const authDataStr = safeStorageInstance.getItem(AUTH_STORAGE_KEY);

    if (!authDataStr) {
      throw new Error('No authentication token found. Please log in.');
    }

    try {
      const authData = JSON.parse(authDataStr);
      const token = authData?.access_token;
      if (!token) throw new Error('Invalid token structure');
      return token;
    } catch (err) {
      throw new Error('Failed to parse authentication token.');
    }
  };

  const directUpdate = async (tableName: string, id: string, updates: any) => {
    const token = getAuthToken();
    const url = `${SUPABASE_URL}/rest/v1/${tableName}?id=eq.${id}`;
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

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data[0] : data;
  };

  const directCreate = async (tableName: string, payload: any) => {
    const token = getAuthToken();
    const url = `${SUPABASE_URL}/rest/v1/${tableName}`;
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

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data[0] : data;
  };

  const directDelete = async (tableName: string, id: string) => {
    const token = getAuthToken();
    const url = `${SUPABASE_URL}/rest/v1/${tableName}?id=eq.${id}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
  };

  const directGet = async (tableName: string) => {
    let token = '';
    try {
        token = getAuthToken();
    } catch (e) {
        // If not logged in, fetch anonymously
    }

    const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=*`;
    const headers: Record<string, string> = {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    return await response.json();
  };

  const refreshTable = useCallback(async (tableName: string) => {
    logEvent({ endpoint: tableName, method: 'GET', source: 'DB', status: 'pending' });
    try {
      const data = await directGet(tableName);
      setDb(prev => ({ ...prev, [tableName]: data || [] }));
      logEvent({ endpoint: tableName, method: 'GET', source: 'DB', status: 'success' });
    } catch (e) {
      logEvent({ endpoint: tableName, method: 'GET', source: 'DB', status: 'error' });
    }
  }, [logEvent]);

  const refresh = useCallback(async () => {
    try {
      const bundle = await dbService.getStartupBundle();
      if (bundle) {
        setDb(bundle);
      } else {
        await refreshTable('services');
      }
    } catch (e) {
      await refreshTable('services');
    }
  }, [refreshTable]);

  const updateEntry = useCallback(async (tableName: string, id: string | number, updates: any) => {
    const cleanUpdates = { ...updates };
    ['created_at', 'updated_at', 'timestamp', 'item_ids', 'user_id', 'id'].forEach(key => delete (cleanUpdates as any)[key]);
    logEvent({ endpoint: `${tableName}/${id}`, method: 'PATCH', source: 'DB', status: 'pending' });
    try {
      const data = await directUpdate(tableName, id as string, cleanUpdates);
      logEvent({ endpoint: `${tableName}/${id}`, method: 'PATCH', source: 'DB', status: 'success' });
      return data;
    } catch (err: any) {
      logEvent({ endpoint: `${tableName}/${id}`, method: 'PATCH', source: 'DB', status: 'error' });
      throw err;
    }
  }, [logEvent]);

  const createEntry = useCallback(async (tableName: string, payload: any) => {
    logEvent({ endpoint: tableName, method: 'POST', source: 'DB', status: 'pending' });
    try {
      const result = await directCreate(tableName, payload);
      await refreshTable(tableName);
      logEvent({ endpoint: tableName, method: 'POST', source: 'DB', status: 'success' });
      return result;
    } catch (err: any) {
      logEvent({ endpoint: tableName, method: 'POST', source: 'DB', status: 'error' });
      throw err;
    }
  }, [refreshTable, logEvent]);

  const deleteEntry = useCallback(async (tableName: string, id: string | number) => {
    logEvent({ endpoint: `${tableName}/${id}`, method: 'DELETE', source: 'DB', status: 'pending' });
    try {
      await directDelete(tableName, id as string);
      await refreshTable(tableName);
      logEvent({ endpoint: `${tableName}/${id}`, method: 'DELETE', source: 'DB', status: 'success' });
    } catch (err: any) {
      logEvent({ endpoint: `${tableName}/${id}`, method: 'DELETE', source: 'DB', status: 'error' });
      throw err;
    }
  }, [refreshTable, logEvent]);

  const toggleStatus = useCallback(async (tableName: string, id: string | number) => {
    const list = db[tableName] || [];
    const record = list.find((r: any) => r.id === id);
    if (record) {
      const nextStatus = record.status === 'active' ? 'inactive' : 'active';
      await updateEntry(tableName, id, { status: nextStatus });
      await refreshTable(tableName);
    }
  }, [db, updateEntry, refreshTable]);

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