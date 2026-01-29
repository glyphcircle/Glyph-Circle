import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { dbService } from '../services/db';
import { supabase } from '../services/supabaseClient';

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
   * 🛠️ Robust update entry that handles primary keys (id) and unique paths.
   */
  const updateEntry = useCallback(async (tableName: string, id: string | number, updates: any) => {
    console.log('📡 [DB] PATCH START', { tableName, id, updatesKeys: Object.keys(updates) });
    
    // Clean system fields to prevent database constraint violations
    const cleanUpdates = { ...updates };
    ['created_at', 'updated_at', 'timestamp', 'item_ids', 'user_id', 'id'].forEach(key => delete (cleanUpdates as any)[key]);
    
    logEvent({ endpoint: `${tableName}/${id}`, method: 'PATCH', source: 'DB', status: 'pending' });
    
    try {
      // 1. Attempt update using UUID 'id'
      let { data, error } = await supabase
        .from(tableName)
        .update(cleanUpdates)
        .eq('id', id)
        .select();
      
      // 2. Fallback for services that might be identified by 'path' string (e.g. palmistry)
      if (!data || data.length === 0) {
        console.log('🔍 No ID match found, attempting path-based identification...');
        const pathResponse = await supabase
          .from(tableName)
          .update(cleanUpdates)
          .eq('path', id as string)
          .select();
        
        data = pathResponse.data;
        error = pathResponse.error;
      }

      if (error) throw error;
      if (!data || data.length === 0) throw new Error(`Artifact identification failed: ${id} not found in current dimension.`);

      console.log(`✅ [DB] Update Successful for ${id}`);
      await refreshTable(tableName);
      logEvent({ endpoint: `${tableName}/${id}`, method: 'PATCH', source: 'DB', status: 'success' });
      return data[0];
      
    } catch (err: any) {
      console.error('💥 [DB] Sync Failed:', err.message);
      logEvent({ endpoint: `${tableName}/${id}`, method: 'PATCH', source: 'DB', status: 'error' });
      throw err;
    }
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