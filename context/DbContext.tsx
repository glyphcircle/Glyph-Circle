
import React, { createContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { dbService } from '../services/db';
import { v4 as uuidv4 } from 'uuid';

interface DbContextType {
  db: any;
  toggleStatus: (tableName: string, recordId: number | string) => void;
  activateTheme: (themeId: string) => void;
  createEntry: (tableName: string, newRecordData: Record<string, any>) => Promise<any>;
  updateEntry: (tableName: string, id: number | string, updatedData: Record<string, any>) => Promise<any>;
  deleteEntry: (tableName: string, id: number | string) => Promise<void>;
  refresh: () => Promise<boolean>;
  refreshTable: (tableName: string) => Promise<void>;
  connectionStatus: 'connecting' | 'connected' | 'error';
  errorMessage: string | null;
}

export const DbContext = createContext<DbContextType | undefined>(undefined);

const CACHE_KEY = 'glyph_eternal_cache_v43';

export const DbProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dbState, setDbState] = useState<any>(() => {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
  });
  const [connStatus, setConnStatus] = useState<'connecting' | 'connected' | 'error'>('connected');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  
  const tableBlacklist = useRef<Set<string>>(new Set());

  const CORE_TABLES = [
    'config', 'services', 'store_items', 'featured_content', 'cloud_providers', 
    'payment_providers', 'payment_config', 'payment_methods', 'image_assets',
    'ui_themes', 'report_formats', 'gemstones', 'users'
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
              tableBlacklist.current.delete(tableName);
          }
      } catch (e: any) {
          console.error(`Sync error on ${tableName}:`, e.message);
          if (e.message?.includes('Timeout')) tableBlacklist.current.add(tableName);
      }
  }, []);

  // Listen for security rollback triggers
  useEffect(() => {
    const handleSyncRequest = (e: any) => {
        if (e.detail?.table) refreshTable(e.detail.table);
    };
    window.addEventListener('glyph_db_sync_required', handleSyncRequest);
    return () => window.removeEventListener('glyph_db_sync_required', handleSyncRequest);
  }, [refreshTable]);

  const refresh = useCallback(async (): Promise<boolean> => {
    setConnStatus('connecting');
    setErrMsg(null);
    let successCount = 0;
    const workingState = { ...dbState };

    const syncPromises = CORE_TABLES.map(async (table) => {
        if (tableBlacklist.current.has(table)) return;
        try {
            const data = await dbService.getAll(table);
            if (data && Array.isArray(data)) {
                workingState[table] = data;
                successCount++;
            }
        } catch (e: any) {
            console.warn(`Initial sync skip on ${table}:`, e.message);
        }
    });

    await Promise.allSettled(syncPromises);
    setDbState(workingState);
    localStorage.setItem(CACHE_KEY, JSON.stringify(workingState));
    setConnStatus(successCount > 0 ? 'connected' : 'error');
    return successCount > 0;
  }, [dbState]);

  useEffect(() => { refresh(); }, []);

  const toggleStatus = useCallback(async (tableName: string, recordId: number | string) => {
    const list = dbState[tableName] || [];
    const record = list.find((r: any) => r.id == recordId);
    if (!record) return;

    const newStatus = record.status === 'active' ? 'inactive' : 'active';
    
    // Optimistic UI Update
    const updatedList = list.map((r: any) => r.id == recordId ? { ...r, status: newStatus } : r);
    setDbState((prev: any) => ({ ...prev, [tableName]: updatedList }));

    try {
        await dbService.updateEntry(tableName, recordId, { status: newStatus });
    } catch { 
        refreshTable(tableName); 
    }
  }, [dbState, refreshTable]);

  const updateEntry = useCallback(async (tableName: string, id: number | string, data: Record<string, any>) => {
      try {
          const result = await dbService.updateEntry(tableName, id, data);
          await refreshTable(tableName);
          return result;
      } catch (e) {
          refreshTable(tableName);
          throw e;
      }
  }, [refreshTable]);

  const createEntry = useCallback(async (tableName: string, data: Record<string, any>) => {
    try {
        const payload = { ...data, id: data.id || uuidv4() };
        const result = await dbService.createEntry(tableName, payload);
        await refreshTable(tableName);
        return result;
    } catch (e: any) { 
        throw e; 
    }
  }, [refreshTable]);

  const deleteEntry = useCallback(async (tableName: string, id: number | string) => {
    try {
        await dbService.deleteEntry(tableName, id);
        setDbState((prev: any) => ({
            ...prev,
            [tableName]: (prev[tableName] || []).filter((r: any) => r.id != id)
        }));
    } catch (e: any) { 
        throw e; 
    }
  }, []);

  const activateTheme = useCallback(async (themeId: string) => {
      try {
          const themes = dbState.ui_themes || [];
          for (const theme of themes) {
              if (theme.id !== themeId) {
                  await dbService.updateEntry('ui_themes', theme.id, { status: 'inactive' });
              }
          }
          await dbService.updateEntry('ui_themes', themeId, { status: 'active' });
          await refreshTable('ui_themes');
      } catch { 
          refreshTable('ui_themes'); 
      }
  }, [dbState.ui_themes, refreshTable]);

  return (
    <DbContext.Provider value={{ 
        db: dbState, 
        toggleStatus, 
        activateTheme, 
        createEntry, 
        updateEntry, 
        deleteEntry, 
        refresh, 
        refreshTable, 
        connectionStatus: connStatus, 
        errorMessage: errMsg 
    }}>
      {children}
    </DbContext.Provider>
  );
};
