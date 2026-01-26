
import React, { createContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { dbService } from '../services/db';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';

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

const CACHE_KEY = 'glyph_eternal_cache_v46';

export const DbProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dbState, setDbState] = useState<any>(() => {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
  });
  const [connStatus, setConnStatus] = useState<'connecting' | 'connected' | 'error'>('connected');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  
  const isRefreshing = useRef(false);

  const CORE_TABLES = [
    'config', 'services', 'store_items', 'featured_content', 'cloud_providers', 
    'payment_providers', 'payment_config', 'payment_methods', 'image_assets',
    'ui_themes', 'report_formats', 'gemstones', 'users', 'readings', 'transactions', 'feedback'
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
      } catch (e: any) {
          console.warn(`Background sync skipped for ${tableName}:`, e.message);
      }
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (isRefreshing.current) return false;
    isRefreshing.current = true;
    setConnStatus('connecting');
    
    let successCount = 0;
    const workingResults: Record<string, any[]> = {};

    const syncPromises = CORE_TABLES.map(async (table) => {
        try {
            const data = await Promise.race([
                dbService.getAll(table),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
            ]) as any[];

            if (data && Array.isArray(data)) {
                workingResults[table] = data;
                successCount++;
            }
        } catch (e: any) {
            console.warn(`Fetch failed for ${table}:`, e.message);
        }
    });

    await Promise.allSettled(syncPromises);

    setDbState((prev: any) => {
        const newState = { ...prev, ...workingResults };
        localStorage.setItem(CACHE_KEY, JSON.stringify(newState));
        return newState;
    });

    setConnStatus(successCount > 0 ? 'connected' : 'error');
    isRefreshing.current = false;
    return successCount > 0;
  }, []);

  useEffect(() => { 
      refresh(); 
  }, [refresh]);

  const toggleStatus = useCallback(async (tableName: string, recordId: number | string) => {
    const list = dbState[tableName] || [];
    const record = list.find((r: any) => r.id == recordId);
    if (!record) return;

    const newStatus = record.status === 'active' ? 'inactive' : 'active';
    
    setDbState((prev: any) => ({ 
        ...prev, 
        [tableName]: prev[tableName].map((r: any) => r.id == recordId ? { ...r, status: newStatus } : r) 
    }));

    try {
        await dbService.updateEntry(tableName, recordId, { status: newStatus });
    } catch { 
        refreshTable(tableName); 
    }
  }, [dbState, refreshTable]);

  const updateEntry = useCallback(async (tableName: string, id: number | string, data: Record<string, any>) => {
      try {
          // Safety Race to prevent "Updating..." hang
          const result = await Promise.race([
              dbService.updateEntry(tableName, id, data),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Database unresponsive. Potential security loop detected.')), 10000))
          ]);
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
        const result = await Promise.race([
            dbService.createEntry(tableName, payload),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Genesis failed. Link timed out.')), 10000))
        ]);
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
      <SyncTrigger refresh={refresh} />
    </DbContext.Provider>
  );
};

const SyncTrigger: React.FC<{ refresh: () => void }> = ({ refresh }) => {
    const { isAdminVerified, isAuthenticated } = useAuth();
    const lastSyncId = useRef<string | null>(null);

    useEffect(() => {
        if (isAuthenticated) {
            const currentSyncId = `${isAuthenticated}-${isAdminVerified}`;
            if (lastSyncId.current !== currentSyncId) {
                refresh();
                lastSyncId.current = currentSyncId;
            }
        }
    }, [isAuthenticated, isAdminVerified, refresh]);

    return null;
};
