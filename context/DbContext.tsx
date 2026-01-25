
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

export const DbProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dbState, setDbState] = useState<any>({});
  const [isReady, setIsReady] = useState(false);
  const [connStatus, setConnStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const CORE_TABLES = [
    'config', 'services', 'store_items', 'featured_content', 'cloud_providers', 
    'payment_providers', 'payment_config', 'payment_methods', 'image_assets',
    'ui_themes', 'report_formats'
  ];

  const refreshTable = useCallback(async (tableName: string) => {
      try {
          const tableData = await dbService.getAll(tableName);
          setDbState((prev: any) => ({ ...prev, [tableName]: tableData }));
      } catch (e) {
          console.error(`Failed to refresh table: ${tableName}`);
      }
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    setConnStatus('connecting');
    const newState: any = { ...dbState };
    let fatalErrorCount = 0;
    let loopDetected = false;
    
    try {
        // Parallelized loading with failure isolation
        const results = await Promise.allSettled(
          CORE_TABLES.map(table => dbService.getAll(table))
        );

        results.forEach((res, index) => {
          const tableName = CORE_TABLES[index];
          if (res.status === 'fulfilled') {
            newState[tableName] = res.value;
          } else {
            console.warn(`Sync Warn [${tableName}]:`, res.reason.message);
            // Don't wipe existing state if it just times out, keep what we have
            if (!newState[tableName]) newState[tableName] = [];
            fatalErrorCount++;
            if (res.reason.message.includes('Latency Timeout')) loopDetected = true;
          }
        });
        
        setDbState(newState);

        if (fatalErrorCount === CORE_TABLES.length) {
            setConnStatus('error');
            setErrMsg(loopDetected ? "CRITICAL: Database Loop Detected. Visit Config > SQL Tools." : "The database is unresponsive.");
            return false;
        }

        setConnStatus('connected');
        setErrMsg(null);
        return true;
    } catch (e: any) {
        setErrMsg(e.message);
        setConnStatus('error');
        return false;
    } finally {
        setIsReady(true);
    }
  }, [dbState]);

  useEffect(() => { refresh(); }, []);

  const toggleStatus = useCallback(async (tableName: string, recordId: number | string) => {
    const list = dbState[tableName];
    const record = list?.find((r: any) => r.id == recordId);
    if (!record) return;

    const newStatus = record.status === 'active' ? 'inactive' : 'active';
    setDbState((prev: any) => ({
        ...prev,
        [tableName]: prev[tableName].map((r: any) => r.id == recordId ? { ...r, status: newStatus } : r)
    }));

    try {
        await dbService.updateEntry(tableName, recordId, { status: newStatus });
    } catch (e: any) {
        refreshTable(tableName); 
        alert(`Action Failed: ${e.message}. Run the V25 SQL Repair script.`);
    }
  }, [dbState, refreshTable]);

  const updateEntry = useCallback(async (tableName: string, id: number | string, data: Record<string, any>) => {
      setDbState((prev: any) => ({
          ...prev,
          [tableName]: prev[tableName].map((r: any) => r.id == id ? { ...r, ...data } : r)
      }));

      try {
          await dbService.updateEntry(tableName, id, data);
          await refreshTable(tableName);
      } catch (e: any) {
          refreshTable(tableName);
          throw e;
      }
  }, [refreshTable]);

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
          await supabase.from('ui_themes').update({ status: 'inactive' }).neq('id', 'placeholder');
          await dbService.updateEntry('ui_themes', themeId, { status: 'active' });
      } catch { refreshTable('ui_themes'); }
  }, [refreshTable]);

  return (
    <DbContext.Provider value={{ db: dbState, toggleStatus, activateTheme, createEntry, updateEntry, refresh, refreshTable, connectionStatus: connStatus, errorMessage: errMsg }}>
      {children}
    </DbContext.Provider>
  );
};
