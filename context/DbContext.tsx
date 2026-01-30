import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { dbService } from '../services/db';
import { supabase } from '../services/supabaseClient';

// Add this console log to verify it loaded
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

  const logEvent = useCallback((event: Omit<NetworkEvent, 'id'>) => {
    setNetworkLedger(prev => [{
      ...event,
      id: Math.random().toString(36).substring(2, 11)
    }, ...prev].slice(0, 50));
  }, []);

  const refreshTable = useCallback(async (tableName: string) => {
    logEvent({ endpoint: tableName, method: 'GET', source: 'DB', status: 'pending' });
    try {
      const data = await dbService.getAll(tableName);
      setDb(prev => ({ ...prev, [tableName]: data || [] }));
      logEvent({ endpoint: tableName, method: 'GET', source: 'DB', status: 'success' });
    } catch (e) {
      logEvent({ endpoint: tableName, method: 'GET', source: 'DB', status: 'error' });
    }
  }, [logEvent]);

  const refresh = useCallback(async () => {
    try {
      const bundle = await dbService.getStartupBundle();
      if (bundle) setDb(bundle);
    } catch (e) {
      await refreshTable('services');
    }
  }, [refreshTable]);

  /**
   * 🛠️ ENHANCED UPDATE with RETRY LOGIC
   * - Automatically retries on timeout
   * - Stores full image URLs (no extraction)
   */
  const updateEntry = useCallback(async (tableName: string, id: string | number, updates: any) => {
    console.log('📡 [DB] PATCH START', { tableName, id, updatesKeys: Object.keys(updates) });

    const cleanUpdates = { ...updates };
    ['created_at', 'updated_at', 'timestamp', 'item_ids', 'user_id', 'id'].forEach(key => delete (cleanUpdates as any)[key]);

    console.log('📦 [DB] Clean payload:', cleanUpdates);

    logEvent({ endpoint: `${tableName}/${id}`, method: 'PATCH', source: 'DB', status: 'pending' });

    // 🔥 RETRY LOGIC: Attempt up to 3 times on timeout
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🚀 [DB] Attempt ${attempt}/${maxRetries} - Calling Supabase...`);

        const updatePromise = supabase
          .from(tableName)
          .update(cleanUpdates)
          .eq('id', id)
          .select();

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout after 15 seconds')), 15000)
        );

        const { data, error } = await Promise.race([updatePromise, timeoutPromise]) as any;

        console.log('📥 [DB] Supabase response received:', { hasData: !!data, hasError: !!error });

        if (error) {
          console.error('🚨 [DB] Supabase error:', {
            message: error.message,
            code: error.code,
            hint: error.hint,
            details: error.details
          });
          throw error;
        }

        if (!data || data.length === 0) {
          throw new Error(`Update failed: Record "${id}" not found in "${tableName}"`);
        }

        console.log('✅ [DB] Update successful!', data[0]);
        await refreshTable(tableName);
        logEvent({ endpoint: `${tableName}/${id}`, method: 'PATCH', source: 'DB', status: 'success' });
        return data[0];

      } catch (err: any) {
        lastError = err;

        // Retry only on timeout errors
        if (attempt < maxRetries && err.message?.includes('timeout')) {
          console.warn(`⚠️ [DB] Attempt ${attempt} timed out, retrying in 1s...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // Non-timeout error or final attempt - stop retrying
        break;
      }
    }

    // All retries exhausted
    console.error('💥 [DB] CAUGHT ERROR after all retries:', {
      name: lastError?.name,
      message: lastError?.message,
      code: lastError?.code,
      attempts: maxRetries
    });
    logEvent({ endpoint: `${tableName}/${id}`, method: 'PATCH', source: 'DB', status: 'error' });
    throw lastError;
  }, [refreshTable, logEvent]);

  const createEntry = useCallback(async (tableName: string, payload: any) => {
    logEvent({ endpoint: tableName, method: 'POST', source: 'DB', status: 'pending' });
    try {
      const result = await dbService.createEntry(tableName, payload);
      await refreshTable(tableName);
      logEvent({ endpoint: tableName, method: 'POST', source: 'DB', status: 'success' });
      return result;
    } catch (e) {
      logEvent({ endpoint: tableName, method: 'POST', source: 'DB', status: 'error' });
      throw e;
    }
  }, [refreshTable, logEvent]);

  const deleteEntry = useCallback(async (tableName: string, id: string | number) => {
    logEvent({ endpoint: `${tableName}/${id}`, method: 'DELETE', source: 'DB', status: 'pending' });
    try {
      await dbService.deleteEntry(tableName, id);
      await refreshTable(tableName);
      logEvent({ endpoint: `${tableName}/${id}`, method: 'DELETE', source: 'DB', status: 'success' });
    } catch (e) {
      logEvent({ endpoint: `${tableName}/${id}`, method: 'DELETE', source: 'DB', status: 'error' });
      throw e;
    }
  }, [refreshTable, logEvent]);

  const toggleStatus = useCallback(async (tableName: string, id: string | number) => {
    const list = db[tableName] || [];
    const record = list.find((r: any) => r.id === id);
    if (record) {
      const nextStatus = record.status === 'active' ? 'inactive' : 'active';
      await updateEntry(tableName, id, { status: nextStatus });
    }
  }, [db, updateEntry]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <DbContext.Provider value={{ 
      db, refreshTable, updateEntry, createEntry, deleteEntry, toggleStatus, refresh, networkLedger
    }}>
      {children}
    </DbContext.Provider>
  );
};