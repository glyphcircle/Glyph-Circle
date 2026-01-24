
import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { dbService } from '../services/db';
import { supabase } from '../services/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import RecursionErrorDisplay from '../components/shared/RecursionErrorDisplay';

interface DbContextType {
  db: any;
  toggleStatus: (tableName: string, recordId: number | string) => void;
  activateTheme: (themeId: string) => void; // New method for Radio behavior
  createEntry: (tableName: string, newRecordData: Record<string, any>) => void;
  updateEntry: (tableName: string, id: number | string, updatedData: Record<string, any>) => void;
  refresh: () => void;
  connectionStatus: 'connecting' | 'connected' | 'error';
  errorMessage: string | null;
}

export const DbContext = createContext<DbContextType | undefined>(undefined);

export const DbProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dbState, setDbState] = useState<any>({});
  const [isReady, setIsReady] = useState(false);
  const [connStatus, setConnStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [isRecursionError, setIsRecursionError] = useState(false);

  const CORE_TABLES = [
    'store_items', 
    'featured_content', 
    'services', 
    'config', 
    'cloud_providers', 
    'payment_providers', 
    'payment_config',
    'payment_methods', 
    'image_assets',
    'gemstones',
    'store_orders',
    'dosha_profiles',   
    'mood_entries',     
    'synastry_reports',
    'report_formats',
    'ui_themes' 
  ];

  const parseSupabaseError = (err: any): string => {
      if (!err) return "Unknown Cosmic Error";
      if (typeof err === 'string') return err;
      if (err.message) return err.message;
      return JSON.stringify(err);
  };

  const refresh = useCallback(async () => {
    setConnStatus('connecting');
    setErrMsg(null);
    setIsRecursionError(false);
    const newState: any = {};
    
    try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
            setErrMsg(`Auth Error: ${parseSupabaseError(authError)}`);
            setConnStatus('error');
            setIsReady(true);
            return;
        }

        const { error: tableError } = await supabase.from('services').select('id').limit(1);
        
        if (tableError) {
            const msg = parseSupabaseError(tableError);
            if (msg.includes('aborted') || msg.includes('AbortError')) {
                setIsReady(true);
                return;
            }
            if (tableError.code === '42P17' || msg.toLowerCase().includes('infinite recursion') || msg.includes('Cosmic Timeout')) {
                setIsRecursionError(true);
                setErrMsg("CRITICAL: Infinite Recursion Loop detected in your Supabase 'users' table policies.");
            } else {
                setErrMsg(`Connection Failed: ${msg}`);
            }
            setConnStatus('error');
            setIsReady(true);
            return;
        }

        setConnStatus('connected');
        
        await Promise.all(CORE_TABLES.map(async (table) => {
            try {
                newState[table] = await dbService.getAll(table);
            } catch (e: any) {
                newState[table] = [];
            }
        }));
        
        setDbState((prev: any) => ({ ...prev, ...newState }));
    } catch (e: any) {
        setErrMsg(parseSupabaseError(e));
        setConnStatus('error');
    } finally {
        setIsReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleStatus = useCallback(async (tableName: string, recordId: number | string) => {
    const list = dbState[tableName];
    if (!list) return;
    
    const record = list.find((r:any) => r.id == recordId);
    if (!record) return;

    const originalStatus = record.status;
    const newStatus = originalStatus === 'active' ? 'inactive' : 'active';

    setDbState((prev: any) => ({
        ...prev,
        [tableName]: prev[tableName].map((r: any) => 
            r.id == recordId ? { ...r, status: newStatus } : r
        )
    }));

    try {
        await dbService.updateEntry(tableName, recordId, { status: newStatus });
    } catch (e: any) {
        console.error("Status toggle failed:", e.message);
        setDbState((prev: any) => ({
            ...prev,
            [tableName]: prev[tableName].map((r: any) => 
                r.id == recordId ? { ...r, status: originalStatus } : r
            )
        }));
        alert(`Toggle Failed: ${e.message}`);
    }
  }, [dbState]);

  const activateTheme = useCallback(async (themeId: string) => {
      setDbState((prev: any) => ({
          ...prev,
          ui_themes: (prev.ui_themes || []).map((t: any) => ({
              ...t,
              status: t.id === themeId ? 'active' : 'inactive'
          }))
      }));

      try {
          await supabase.from('ui_themes').update({ status: 'inactive' }).neq('id', 'placeholder');
          await dbService.updateEntry('ui_themes', themeId, { status: 'active' });
      } catch (e: any) {
          console.error("Theme activation failed", e);
          refresh(); 
      }
  }, [refresh]);
  
  const createEntry = useCallback(async (tableName: string, data: Record<string, any>) => {
    try {
        const payload = { ...data };
        if (!payload.id) payload.id = uuidv4();
        await dbService.createEntry(tableName, payload);
        await refresh();
    } catch (e: any) { 
        console.error("Create failed:", e);
        throw e; // Re-throw to allow UI to handle
    }
  }, [refresh]);

  const updateEntry = useCallback(async (tableName: string, id: number | string, data: Record<string, any>) => {
    try {
        await dbService.updateEntry(tableName, id, data);
        await refresh();
    } catch (e: any) { 
        console.error("Update failed", e);
        throw e; // Re-throw to allow UI to handle
    }
  }, [refresh]);

  if (!isReady) {
      return (
          <div className="min-h-screen bg-[#0A0A1A] flex items-center justify-center">
              <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <h2 className="text-amber-200 font-cinzel tracking-widest text-sm">Aligning Frequencies...</h2>
              </div>
          </div>
      );
  }

  return (
    <DbContext.Provider value={{ 
        db: dbState, 
        toggleStatus, 
        activateTheme, 
        createEntry, 
        updateEntry, 
        refresh, 
        connectionStatus: connStatus, 
        errorMessage: errMsg 
    }}>
      {children}
      {errMsg && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
              <div className="max-w-lg w-full">
                {isRecursionError ? (
                  <RecursionErrorDisplay />
                ) : (
                  <div className="bg-red-950/20 border border-red-500/50 p-8 rounded-xl text-center">
                      <h3 className="text-xl text-red-200 font-bold mb-4">Connection Error</h3>
                      <p className="text-red-400 mb-6">{errMsg}</p>
                      <button onClick={() => refresh()} className="bg-red-700 text-white px-6 py-2 rounded">Retry</button>
                  </div>
                )}
              </div>
          </div>
      )}
    </DbContext.Provider>
  );
};
