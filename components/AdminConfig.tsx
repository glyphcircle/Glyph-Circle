
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDb } from '../hooks/useDb';
import { sqliteService } from '../services/sqliteService';
import AdminContextHelp from './AdminContextHelp';
import Card from './shared/Card';
import Modal from './shared/Modal';

const TABLE_GROUPS = [
    {
        title: "Seeker Archives",
        subtitle: "Profiles & history",
        icon: "👥",
        gradient: "from-blue-900/20 to-indigo-900/20",
        border: "border-blue-500/30",
        text: "text-blue-200",
        tables: ['users', 'readings', 'transactions', 'feedback', 'user_subscriptions']
    },
    {
        title: "Mystic Bazaar",
        subtitle: "Store & Inventory",
        icon: "🛒",
        gradient: "from-emerald-900/20 to-teal-900/20",
        border: "border-emerald-500/30",
        text: "text-emerald-200",
        tables: ['store_items', 'store_orders']
    },
    {
        title: "Content Grimoire",
        subtitle: "Services & Assets",
        icon: "📖",
        gradient: "from-purple-900/20 to-fuchsia-900/20",
        border: "border-purple-500/30",
        text: "text-purple-200",
        tables: ['services', 'featured_content', 'image_assets', 'report_formats', 'gemstones']
    },
    {
        title: "System Core",
        subtitle: "Configuration",
        icon: "⚙️",
        gradient: "from-gray-800/40 to-gray-900/40",
        border: "border-gray-500/30",
        text: "text-gray-300",
        tables: ['config', 'ui_themes', 'payment_providers', 'payment_methods', 'cloud_providers', 'payment_config']
    }
];

const AdminConfig: React.FC = () => {
  const { db, refresh, connectionStatus, updateEntry, createEntry } = useDb();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingSecret, setIsSavingSecret] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showScripts, setShowScripts] = useState(false);
  const [isEditingSecret, setIsEditingSecret] = useState(false);
  const [newSecret, setNewSecret] = useState('');
  
  const secretConfig = useMemo(() => {
    return db.config?.find((c: any) => c.key === 'admin_portal_secret');
  }, [db.config]);

  useEffect(() => {
    if (secretConfig) setNewSecret(secretConfig.value);
  }, [secretConfig]);

  const handleRefresh = async () => {
      if (isRefreshing) return;
      setIsRefreshing(true);
      try {
          await refresh();
      } catch (e) {
          console.error("Refresh failed", e);
      } finally {
          // Guaranteed reset of loading state
          setTimeout(() => setIsRefreshing(false), 1000);
      }
  };

  const handleRestoreDefaults = async () => {
      if (window.confirm("CRITICAL: This will wipe ALL current local records and restore themed defaults. Proceed?")) {
          setIsRefreshing(true);
          try {
              await sqliteService.factoryReset();
              await refresh();
              alert("Temple Records Aligned. Defaults Restored.");
          } catch (e: any) {
              alert("Restoration Interrupted: " + e.message);
          } finally {
              setIsRefreshing(false);
          }
      }
  };

  const handleUpdateSecret = async () => {
      setIsSavingSecret(true);
      setSaveSuccess(false);
      try {
          if (secretConfig) {
              await updateEntry('config', secretConfig.id, { value: newSecret });
          } else {
              await createEntry('config', { 
                  id: 'admin_secret_key', 
                  key: 'admin_portal_secret', 
                  value: newSecret, 
                  status: 'active' 
              });
          }
          await refresh();
          setSaveSuccess(true);
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          setTimeout(() => {
              setSaveSuccess(false);
              setIsEditingSecret(false);
          }, 2000);
      } catch (e: any) {
          alert("Update failed: " + e.message);
      } finally {
          setIsSavingSecret(false);
      }
  };

  const REPAIR_SQL = `-- 🔱 PERMISSION REPAIR SCRIPT
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO anon, authenticated;
ALTER FUNCTION public.check_is_admin() SECURITY DEFINER;
DROP POLICY IF EXISTS "Allow anon to read portal secret" ON public.config;
CREATE POLICY "Allow anon to read portal secret" ON public.config FOR SELECT USING (key = 'admin_portal_secret');`;

  const SEED_SQL = `-- 🔱 MASTER SEED SCRIPT
INSERT INTO public.config (id, key, value, status) 
VALUES ('admin_secret_key', 'admin_portal_secret', 'G0-MAST3R-99', 'active')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`;

  return (
    <div className="min-h-screen bg-[#050510] text-amber-50 font-lora pb-20">
        {/* 🧭 NAVIGATION HEADER */}
        <div className="sticky top-0 z-40 bg-[#0F0F23]/95 backdrop-blur-xl border-b border-amber-500/20 shadow-2xl">
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-6">
                    <button 
                      onClick={() => navigate('/admin/dashboard')}
                      className="p-3 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all border border-amber-500/30 group shadow-lg active:scale-95" 
                      title="Back to Dashboard"
                    >
                        <svg className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div>
                        <h1 className="text-2xl font-cinzel font-black text-white tracking-widest uppercase">System <span className="text-amber-500">Registry</span></h1>
                        <p className="text-[9px] text-amber-200/40 uppercase tracking-[0.6em] font-mono">Core Infrastructure</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleRestoreDefaults} className="px-5 py-2.5 rounded-xl border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider hover:bg-red-500/10 transition-all shadow-xl">Reset Defaults</button>
                    <button 
                        onClick={handleRefresh} 
                        disabled={isRefreshing}
                        className={`group px-5 py-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${connectionStatus === 'error' ? 'bg-red-900/20 border-red-500 text-red-400' : 'bg-black/40 border-amber-500/30 hover:border-amber-400 text-amber-200 shadow-xl'} ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <span className={`${isRefreshing ? 'animate-spin' : ''}`}>↻</span>
                        <span>{isRefreshing ? 'Syncing...' : 'Sync Cloud'}</span>
                    </button>
                    <button onClick={() => setShowScripts(true)} className="px-5 py-2.5 rounded-xl bg-purple-900/40 border border-purple-500/40 text-purple-300 text-xs font-bold uppercase tracking-wider hover:bg-purple-900/60 transition-all shadow-xl">📜 SQL Tools</button>
                </div>
            </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-12">
            {/* 🛡️ SECURITY TRAPDOOR CONFIGURATION */}
            <section className="animate-fade-in-up">
                <Card className={`bg-gradient-to-r from-gray-900 via-black to-gray-900 border-amber-500/30 p-8 overflow-hidden relative transition-all shadow-2xl ${saveSuccess ? 'ring-4 ring-green-500' : ''}`}>
                    <div className="absolute top-0 right-0 p-8 text-7xl opacity-5 pointer-events-none">🔐</div>
                    
                    {saveSuccess && (
                        <div className="absolute inset-0 bg-green-600 flex items-center justify-center z-50 animate-fade-in">
                            <div className="text-white text-center">
                                <div className="text-6xl mb-4 animate-bounce">✓</div>
                                <div className="font-cinzel font-black text-2xl uppercase tracking-[0.2em]">Secret Key Updated</div>
                                <div className="text-sm opacity-80 mt-2">Committing to Sovereign Ledger...</div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                        <div className="max-w-xl">
                            <h3 className="text-2xl font-cinzel font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-3">
                                Entry Trapdoor
                                {!secretConfig && <span className="bg-red-600 text-white text-[9px] px-2 py-1 rounded animate-pulse font-sans">MISSING</span>}
                            </h3>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                This code acts as a master key. Entering it in the <strong>Administrative ID</strong> field on the login screen automatically jumps to the Admin Portal.
                            </p>
                        </div>
                        <div className="flex flex-col items-center gap-4 w-full md:w-auto min-w-[280px]">
                            {isRefreshing ? (
                                <div className="w-full flex flex-col items-center gap-2">
                                    <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-[10px] text-amber-500 animate-pulse font-mono uppercase">Awaiting Cloud Response...</span>
                                </div>
                            ) : isEditingSecret ? (
                                <div className="flex flex-col gap-3 w-full">
                                    <input 
                                        autoFocus
                                        value={newSecret}
                                        disabled={isSavingSecret}
                                        onChange={e => setNewSecret(e.target.value)}
                                        className={`bg-black border-2 rounded-xl px-4 py-3 text-amber-100 font-mono text-center text-lg focus:outline-none shadow-inner transition-all ${isSavingSecret ? 'border-amber-500/20' : 'border-amber-500'}`}
                                        placeholder="New Secret..."
                                    />
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={handleUpdateSecret} 
                                            disabled={isSavingSecret}
                                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isSavingSecret ? 'bg-green-900/50 text-green-300' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20'}`}
                                        >
                                            {isSavingSecret ? 'SAVING...' : 'COMMIT KEY'}
                                        </button>
                                        <button 
                                            onClick={() => setIsEditingSecret(false)} 
                                            disabled={isSavingSecret}
                                            className="px-4 py-3 bg-gray-800 text-gray-400 rounded-xl text-xs font-bold uppercase hover:text-white transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className={`w-full bg-black/60 border-2 rounded-2xl px-8 py-5 text-center shadow-inner ${!secretConfig ? 'border-red-500/30' : 'border-amber-500/20'}`}>
                                        <span className={`font-mono text-xl font-black tracking-[0.2em] ${!secretConfig ? 'text-red-400' : 'text-amber-200'}`}>
                                            {secretConfig?.value || 'NOT_SET'}
                                        </span>
                                    </div>
                                    <button onClick={() => setIsEditingSecret(true)} className="w-full px-6 py-4 bg-amber-600 hover:bg-amber-500 text-black rounded-xl font-black text-xs uppercase tracking-widest transition-all transform active:scale-95 shadow-xl">
                                        {secretConfig ? 'Update Secret Key' : 'Configure Trapdoor'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </Card>
            </section>

            {/* 📊 DATABASE TABLES GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {TABLE_GROUPS.map((group, idx) => (
                    <section key={group.title} className="animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                        <div className={`rounded-2xl border ${group.border} bg-gradient-to-br ${group.gradient} backdrop-blur-md overflow-hidden shadow-2xl`}>
                            <div className={`p-6 border-b ${group.border} flex items-center justify-between bg-black/30`}>
                                <div className="flex items-center gap-4">
                                    <span className="text-3xl filter drop-shadow-lg">{group.icon}</span>
                                    <div>
                                        <h3 className={`text-xl font-cinzel font-bold tracking-widest ${group.text}`}>{group.title}</h3>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em] font-bold mt-0.5">{group.subtitle}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {group.tables.map(tableName => {
                                    const count = db[tableName]?.length || 0;
                                    return (
                                        <Link key={tableName} to={`/admin/db/${tableName}`} className="group relative flex flex-col justify-between p-4 bg-black/40 border border-white/5 hover:border-amber-500/40 rounded-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
                                            <h4 className="text-xs font-black text-gray-400 group-hover:text-amber-200 uppercase tracking-widest truncate w-full mb-4">{tableName.replace(/_/g, ' ')}</h4>
                                            <div className="flex justify-between items-end">
                                                <span className={`text-lg font-mono font-bold px-2 py-0.5 rounded bg-white/5 text-gray-500 group-hover:bg-amber-500/20 group-hover:text-amber-400 transition-all`}>{count}</span>
                                                <span className="text-amber-500/0 group-hover:text-amber-500/100 transition-all text-lg">→</span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                ))}
            </div>
        </div>

        {/* 📜 SQL TOOLS MODAL */}
        <Modal isVisible={showScripts} onClose={() => setShowScripts(false)}>
            <div className="p-8 bg-[#0b0c15] text-amber-50 font-mono rounded-2xl">
                <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-5">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🛠️</span>
                        <h3 className="text-xl font-cinzel font-black text-purple-400 uppercase tracking-widest">Sovereign Recovery</h3>
                    </div>
                    <button onClick={() => setShowScripts(false)} className="text-gray-500 hover:text-white text-3xl leading-none">&times;</button>
                </div>
                <div className="space-y-10">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-black text-amber-500 uppercase tracking-[0.2em]">1. Initialize Trapdoor</h4>
                            <button onClick={() => { navigator.clipboard.writeText(SEED_SQL); alert("SQL Copied"); }} className="text-[10px] bg-amber-500 text-black px-3 py-1.5 rounded-lg font-bold hover:brightness-110 active:scale-95 transition-all">COPY</button>
                        </div>
                        <pre className="p-4 bg-black rounded-xl border border-gray-800 text-[10px] overflow-x-auto text-amber-100/70">{SEED_SQL}</pre>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-black text-blue-500 uppercase tracking-[0.2em]">2. Permission Repair</h4>
                            <button onClick={() => { navigator.clipboard.writeText(REPAIR_SQL); alert("SQL Copied"); }} className="text-[10px] bg-blue-500 text-white px-3 py-1.5 rounded-lg font-bold hover:brightness-110 active:scale-95 transition-all">COPY</button>
                        </div>
                        <pre className="p-4 bg-black rounded-xl border border-gray-800 text-[10px] overflow-x-auto text-blue-100/70">{REPAIR_SQL}</pre>
                    </div>
                </div>
                <button onClick={() => setShowScripts(false)} className="w-full mt-10 py-4 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl border border-gray-600 text-xs uppercase font-black tracking-widest">Close</button>
            </div>
        </Modal>

        <AdminContextHelp context="dashboard" />
    </div>
  );
};

export default AdminConfig;
