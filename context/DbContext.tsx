
import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { dbService } from '../services/db';
import { supabase } from '../services/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

interface DbContextType {
  db: any;
  toggleStatus: (tableName: string, recordId: number | string) => void;
  activateTheme: (themeId: string) => void;
  createEntry: (tableName: string, newRecordData: Record<string, any>) => void;
  updateEntry: (tableName: string, id: number | string, updatedData: Record<string, any>) => void;
  refresh: () => Promise<boolean>;
  refreshTable: (tableName: string) => Promise<void>;
  connectionStatus: 'connecting' | 'connected' | 'error';
  errorMessage: string | null;
}

export const DbContext = createContext<DbContextType | undefined>(undefined);

const CACHE_KEY = 'glyph_eternal_cache_v41';

export const DbProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dbState, setDbState] = useState<any>(() => {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
  });
  const [connStatus, setConnStatus] = useState<'connecting' | 'connected' | 'error'>('connected');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const CORE_TABLES = [
    'config', 'services', 'store_items', 'featured_content', 'cloud_providers', 
    'payment_providers', 'payment_config', 'payment_methods', 'image_assets',
    'ui_themes', 'report_formats', 'gemstones'
  ];

  const refreshTable = useCallback(async (tableName: string) => {
      try {
          const tableData = await dbService.getAll(tableName);
          if (Array.isArray(tableData)) {
              setDbState((prev: any) => {
                  const newState = { ...prev, [tableName]: tableData };
                  localStorage.setItem(CACHE_KEY, JSON.stringify(newState));
                  return newState;
              });
          }
      } catch (e) {
          console.error(`Background refresh failed for ${tableName}`);
      }
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    setConnStatus('connecting');
    let successCount = 0;
    const workingState = { ...dbState };

    const syncPromises = CORE_TABLES.map(async (table) => {
        try {
            const data = await dbService.getAll(table);
            if (data && Array.isArray(data)) {
                workingState[table] = data;
                successCount++;
            }
        } catch (e) {
            console.warn(`Sync failed for table: ${table}`, e);
        }
    });

    await Promise.allSettled(syncPromises);
    
    setDbState(workingState);
    localStorage.setItem(CACHE_KEY, JSON.stringify(workingState));
    setConnStatus(successCount > 0 ? 'connected' : 'error');
    return successCount > 0;
  }, [dbState]);

  useEffect(() => { 
      refresh(); 
  }, []);

  const toggleStatus = useCallback(async (tableName: string, recordId: number | string) => {
    const list = dbState[tableName] || [];
    const record = list.find((r: any) => r.id == recordId);
    if (!record) return;

    const newStatus = record.status === 'active' ? 'inactive' : 'active';
    const updatedList = list.map((r: any) => r.id == recordId ? { ...r, status: newStatus } : r);
    
    setDbState((prev: any) => {
        const newState = { ...prev, [tableName]: updatedList };
        localStorage.setItem(CACHE_KEY, JSON.stringify(newState));
        return newState;
    });

    try {
        await dbService.updateEntry(tableName, recordId, { status: newStatus });
    } catch { 
        refreshTable(tableName); 
    }
  }, [dbState, refreshTable]);

  const updateEntry = useCallback(async (tableName: string, id: number | string, data: Record<string, any>) => {
      const updatedList = (dbState[tableName] || []).map((r: any) => r.id == id ? { ...r, ...data } : r);
      setDbState((prev: any) => {
          const newState = { ...prev, [tableName]: updatedList };
          localStorage.setItem(CACHE_KEY, JSON.stringify(newState));
          return newState;
      });
      try {
          await dbService.updateEntry(tableName, id, data);
      } catch { refreshTable(tableName); }
  }, [dbState, refreshTable]);

  const createEntry = useCallback(async (tableName: string, data: Record<string, any>) => {
    try {
        const payload = { ...data, id: data.id || uuidv4() };
        await dbService.createEntry(tableName, payload);
        await refreshTable(tableName);
    } catch (e: any) { throw e; }
  }, [refreshTable]);

  const activateTheme = useCallback(async (themeId: string) => {
      setDbState((prev: any) => ({
          ...prev,
          ui_themes: (prev.ui_themes || []).map((t: any) => ({ ...t, status: t.id === themeId ? 'active' : 'inactive' }))
      }));
      try {
          await supabase.from('ui_themes').update({ status: 'inactive' }).neq('id', 'theme_placeholder');
          await dbService.updateEntry('ui_themes', themeId, { status: 'active' });
      } catch { refreshTable('ui_themes'); }
  }, [refreshTable]);

  return (
    <DbContext.Provider value={{ db: dbState, toggleStatus, activateTheme, createEntry, updateEntry, refresh, refreshTable, connectionStatus: connStatus, errorMessage: errMsg }}>
      {children}
    </DbContext.Provider>
  );
};
