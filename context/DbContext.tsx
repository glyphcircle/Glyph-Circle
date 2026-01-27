
import React, { createContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { dbService } from '../services/db';
import { v4 as uuidv4 } from 'uuid';

interface NetworkEvent {
    id: string;
    method: string;
    endpoint: string;
    timestamp: string;
    status: 'pending' | 'success' | 'error';
    source: 'network' | 'cache';
    duration?: number;
}

interface DbContextType {
  db: any;
  toggleStatus: (tableName: string, recordId: number | string) => void;
  activateTheme: (themeId: string) => void;
  createEntry: (tableName: string, newRecordData: Record<string, any>) => Promise<any>;
  updateEntry: (tableName: string, id: number | string, updatedData: Record<string, any>) => Promise<any>;
  deleteEntry: (tableName: string, id: number | string) => Promise<void>;
  refresh: (forceNetwork?: boolean) => Promise<boolean>;
  refreshTable: (tableName: string) => Promise<void>;
  connectionStatus: 'connecting' | 'connected' | 'error';
  errorMessage: string | null;
  networkLedger: NetworkEvent[];
}

export const DbContext = createContext<DbContextType | undefined>(undefined);

const CACHE_KEY = 'glyph_eternal_cache_v53';

export const DbProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dbState, setDbState] = useState<any>(() => {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
  });
  const [connStatus, setConnStatus] = useState<'connecting' | 'connected' | 'error'>('connected');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [ledger, setLedger] = useState<NetworkEvent[]>([]);
  
  const isRefreshing = useRef(false);

  const logActivity = useCallback((method: string, endpoint: string, status: 'pending' | 'success' | 'error', source: 'network' | 'cache', duration?: number) => {
      const event: NetworkEvent = { id: uuidv4(), method, endpoint, timestamp: new Date().toLocaleTimeString(), status, source, duration };
      setLedger(prev => [event, ...prev].slice(0, 30));
  }, []);

  const MASTER_TABLE_LIST = [
      'config', 'ui_themes', 'featured_content', 'payment_providers', 
      'payment_methods', 'report_formats', 'services', 'store_items', 
      'image_assets', 'gemstones', 'users', 'readings', 'transactions', 'feedback'
  ];

  const refreshTable = useCallback(async (tableName: string) => {
      const start = Date.now();
      try {
          const tableData = await dbService.getAll(tableName);
          logActivity('GET', `tables/${tableName}`, 'success', 'network', Date.now() - start);
          if (Array.isArray(tableData)) {
              setDbState((prev: any) => {
                  const newState = { ...prev, [tableName]: tableData };
                  localStorage.setItem(CACHE_KEY, JSON.stringify(newState));
                  return newState;
              });
          }
      } catch (e: any) {
          logActivity('GET', `tables/${tableName}`, 'error', 'network', Date.now() - start);
      }
  }, [logActivity]);

  const refresh = useCallback(async (forceNetwork: boolean = false): Promise<boolean> => {
    if (isRefreshing.current) return false;
    isRefreshing.current = true;
    setConnStatus('connecting');
    const startTotal = Date.now();
    
    try {
        let bundle: Record<string, any> = {};
        let bundleSuccess = false;
        
        // 1. ATOMIC BUNDLE FETCH (The "Imperial" Fast Path)
        if (!forceNetwork) {
            logActivity('POST', 'rpc/get_mystic_startup_bundle', 'pending', 'network');
            try {
                bundle = await dbService.getStartupBundle();
                // Ensure bundle actually contains data arrays (Backend fix confirms empty arrays now)
                if (bundle && Object.keys(bundle).length > 0) {
                    logActivity('POST', 'rpc/get_mystic_startup_bundle', 'success', 'network', Date.now() - startTotal);
                    bundleSuccess = true;
                }
            } catch (e) {
                logActivity('POST', 'rpc/get_mystic_startup_bundle', 'error', 'network', Date.now() - startTotal);
                console.warn("Fast Bundle failed. Falling back to individual table sync.");
            }
        }

        // 2. RELIABILITY PATH: Individual Fetches if Bundle fails or if forced
        const tablesToFetch = (!bundleSuccess || forceNetwork) 
            ? MASTER_TABLE_LIST 
            : MASTER_TABLE_LIST.filter(t => !bundle[t]);

        if (tablesToFetch.length > 0) {
            const results: Record<string, any[]> = {};
            const fetchPromises = tablesToFetch.map(async (table) => {
                const tStart = Date.now();
                try {
                    const data = await dbService.getAll(table);
                    logActivity('GET', `tables/${table}`, 'success', 'network', Date.now() - tStart);
                    if (Array.isArray(data)) results[table] = data;
                } catch (e) {
                    logActivity('GET', `tables/${table}`, 'error', 'network', Date.now() - tStart);
                }
            });

            await Promise.allSettled(fetchPromises);

            setDbState((prev: any) => {
                const newState = { ...prev, ...bundle, ...results };
                localStorage.setItem(CACHE_KEY, JSON.stringify(newState));
                return newState;
            });
        } else {
            setDbState((prev: any) => {
                const newState = { ...prev, ...bundle };
                localStorage.setItem(CACHE_KEY, JSON.stringify(newState));
                return newState;
            });
        }

        setConnStatus('connected');
        isRefreshing.current = false;
        return true;
    } catch (e: any) {
        setConnStatus('error');
        isRefreshing.current = false;
        return false;
    }
  }, [logActivity]);

  useEffect(() => { 
      refresh(); 
  }, [refresh]);

  const updateEntry = useCallback(async (tableName: string, id: number | string, data: Record<string, any>) => {
      const start = Date.now();
      try {
          // Use the admin proxy batch for single updates to ensure service-role clearance if needed
          const result = await dbService.updateEntry(tableName, id, data);
          logActivity('PATCH', `tables/${tableName}?id=${id}`, 'success', 'network', Date.now() - start);
          refreshTable(tableName);
          return result;
      } catch (e) {
          logActivity('PATCH', `tables/${tableName}?id=${id}`, 'error', 'network', Date.now() - start);
          throw e;
      }
  }, [refreshTable, logActivity]);

  const createEntry = useCallback(async (tableName: string, data: Record<string, any>) => {
    const start = Date.now();
    try {
        const payload = { ...data, id: data.id || uuidv4() };
        const result = await dbService.createEntry(tableName, payload);
        logActivity('POST', `tables/${tableName}`, 'success', 'network', Date.now() - start);
        refreshTable(tableName);
        return result;
    } catch (e) { 
        logActivity('POST', `tables/${tableName}`, 'error', 'network', Date.now() - start);
        throw e; 
    }
  }, [refreshTable, logActivity]);

  const deleteEntry = useCallback(async (tableName: string, id: number | string) => {
    const start = Date.now();
    try {
        await dbService.deleteEntry(tableName, id);
        logActivity('DELETE', `tables/${tableName}?id=${id}`, 'success', 'network', Date.now() - start);
        setDbState((prev: any) => ({
            ...prev,
            [tableName]: (prev[tableName] || []).filter((r: any) => r.id != id)
        }));
    } catch (e: any) { 
        logActivity('DELETE', `tables/${tableName}?id=${id}`, 'error', 'network', Date.now() - start);
        throw e; 
    }
  }, [logActivity]);

  const toggleStatus = useCallback(async (tableName: string, recordId: number | string) => {
    const list = dbState[tableName] || [];
    const record = list.find((r: any) => r.id == recordId);
    if (!record) return;
    const newStatus = record.status === 'active' ? 'inactive' : 'active';
    updateEntry(tableName, recordId, { status: newStatus });
  }, [dbState, updateEntry]);

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
        errorMessage: errMsg,
        networkLedger: ledger
    }}>
      {children}
    </DbContext.Provider>
  );
};
