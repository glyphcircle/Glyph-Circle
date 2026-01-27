
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
  const { db, refresh, connectionStatus, updateEntry, createEntry, networkLedger } = useDb();
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

  const handleRefresh = async (force: boolean = false) => {
      if (isRefreshing) return;
      setIsRefreshing(true);
      try {
          await refresh(force);
          if (force) alert("Force Network Sync Triggered. Individual table calls are now visible in your Network Tab.");
      } catch (e) {
          console.error("Refresh failed", e);
      } finally {
          setTimeout(() => setIsRefreshing(false), 1000);
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

  const REFRESH_SQL = `-- 🔱 SCHEMA REFRESH SCRIPT
NOTIFY pgrst, 'reload schema';
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;`;

  return (
    <div className="min-h-screen bg-[#050510] text-amber-50 font-lora pb-20">
        <div className="sticky top-0 z-40 bg-[#0F0F23]/95 backdrop-blur-xl border-b border-amber-500/20 shadow-2xl">
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate('/admin/dashboard')} className="p-3 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all border border-amber-500/30 group shadow-lg"><svg className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                    <div>
                        <h1 className="text-2xl font-cinzel font-black text-white tracking-widest uppercase">System <span className="text-amber-50">Registry</span></h1>
                        <p className="text-[9px] text-amber-200/40 uppercase tracking-[0.6em] font-mono">SUPABASE REST API v1.0</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => handleRefresh(true)} disabled={isRefreshing} className="px-5 py-2.5 rounded-xl border border-blue-500/30 bg-blue-900/10 text-blue-300 text-xs font-bold uppercase tracking-wider hover:bg-blue-900/30 transition-all shadow-xl">
                        {isRefreshing ? 'FORCE SYNCING...' : 'Force Network Sync'}
                    </button>
                    <button onClick={() => setShowScripts(true)} className="px-5 py-2.5 rounded-xl bg-purple-900/40 border border-purple-500/40 text-purple-300 text-xs font-bold uppercase tracking-wider hover:bg-purple-900/60 transition-all shadow-xl">📜 SQL Repair</button>
                </div>
            </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-12">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 📡 API MONITOR */}
                <div className="lg:col-span-1">
                    <Card className="bg-black/60 border-amber-500/20 h-full flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase tracking-widest text-amber-400">Communication Ledger</h3>
                            <span className="text-[9px] font-mono bg-green-900/40 text-green-400 px-2 py-0.5 rounded">LIVE LINK</span>
                        </div>
                        <div className="flex-grow overflow-y-auto max-h-[500px] custom-scrollbar p-3 space-y-2">
                            {networkLedger.map(event => (
                                <div key={event.id} className="p-2 bg-white/5 border border-white/5 rounded text-[10px] font-mono group hover:bg-white/10 transition-colors">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex gap-2 items-center">
                                            <span className={`font-black ${event.method === 'POST' ? 'text-green-400' : event.method === 'PATCH' ? 'text-blue-400' : 'text-purple-400'}`}>{event.method}</span>
                                            <span className="text-[8px] bg-gray-800 text-gray-400 px-1 rounded uppercase tracking-tighter">{event.source}</span>
                                        </div>
                                        <span className={`text-[8px] ${event.status === 'success' ? 'text-green-500' : event.status === 'pending' ? 'text-amber-500 animate-pulse' : 'text-red-500'}`}>{event.status.toUpperCase()}</span>
                                    </div>
                                    <div className="text-gray-500 truncate group-hover:whitespace-normal transition-all">{event.endpoint}</div>
                                    <div className="flex justify-between mt-1 text-[8px] text-gray-600">
                                        <span>{event.timestamp}</span>
                                        {event.duration && <span>{event.duration}ms</span>}
                                    </div>
                                </div>
                            ))}
                            {networkLedger.length === 0 && <p className="text-center text-gray-600 text-xs py-10 italic">Awaiting API activity...</p>}
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-8">
                     <section>
                        <Card className={`bg-gradient-to-r from-gray-900 via-black to-gray-900 border-amber-500/30 p-8 overflow-hidden relative transition-all shadow-2xl ${saveSuccess ? 'ring-4 ring-green-500' : ''}`}>
                            <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                                <div className="max-w-xl">
                                    <h3 className="text-2xl font-cinzel font-black text-amber-400 uppercase tracking-widest mb-2">Registry Access Key</h3>
                                    <p className="text-sm text-gray-400">Administrative entry code for the portal.</p>
                                </div>
                                <div className="flex flex-col items-center gap-4 min-w-[280px]">
                                    {isEditingSecret ? (
                                        <div className="flex flex-col gap-3 w-full">
                                            <input autoFocus value={newSecret} onChange={e => setNewSecret(e.target.value)} className="bg-black border-2 rounded-xl px-4 py-3 text-amber-100 font-mono text-center text-lg focus:outline-none border-amber-500" />
                                            <div className="flex gap-2">
                                                <button onClick={handleUpdateSecret} className="flex-1 py-3 bg-green-600 rounded-xl text-xs font-black uppercase text-white shadow-lg">SAVE</button>
                                                <button onClick={() => setIsEditingSecret(false)} className="px-4 py-3 bg-gray-800 text-gray-400 rounded-xl text-xs font-bold uppercase">Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-full bg-black/60 border-2 rounded-2xl px-8 py-5 text-center border-amber-500/20 shadow-inner"><span className="font-mono text-xl font-black text-amber-200">{secretConfig?.value || 'NOT_SET'}</span></div>
                                            <button onClick={() => setIsEditingSecret(true)} className="w-full px-6 py-4 bg-amber-600 text-black rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all">Update Entry Secret</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {TABLE_GROUPS.map((group, idx) => (
                            <section key={group.title} className="animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                                <div className={`rounded-2xl border ${group.border} bg-gradient-to-br ${group.gradient} backdrop-blur-md overflow-hidden shadow-2xl`}>
                                    <div className={`p-5 border-b ${group.border} flex items-center gap-4 bg-black/30`}>
                                        <span className="text-2xl">{group.icon}</span>
                                        <div><h3 className={`text-sm font-cinzel font-bold tracking-widest ${group.text}`}>{group.title}</h3></div>
                                    </div>
                                    <div className="p-4 grid grid-cols-2 gap-3">
                                        {group.tables.map(tableName => (
                                            <Link key={tableName} to={`/admin/db/${tableName}`} className="group flex flex-col justify-between p-3 bg-black/40 border border-white/5 hover:border-amber-500/40 rounded-xl transition-all">
                                                <h4 className="text-[9px] font-black text-gray-500 group-hover:text-amber-200 uppercase tracking-widest truncate mb-2">{tableName.replace(/_/g, ' ')}</h4>
                                                <div className="flex justify-between items-end"><span className="text-lg font-mono font-bold text-gray-700 group-hover:text-amber-400">{db[tableName]?.length || 0}</span><span className="text-amber-500/0 group-hover:text-amber-500/100 transition-all text-xs">→</span></div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <Modal isVisible={showScripts} onClose={() => setShowScripts(false)}>
            <div className="p-8 bg-[#0b0c15] text-amber-50 font-mono rounded-2xl w-full max-w-2xl border border-purple-500/30 shadow-2xl">
                <h3 className="text-xl font-cinzel font-black text-purple-400 uppercase tracking-widest mb-6">Internal Repair Protocol</h3>
                <div className="space-y-6">
                    <p className="text-xs text-gray-400 leading-relaxed">If you see "PGRST205" (View Not Found), the PostgREST cache is stale. Run the script below in your Supabase SQL Editor to force a refresh.</p>
                    <div className="p-4 bg-black/60 rounded-xl border border-amber-900/30">
                        <pre className="text-[10px] text-amber-500 overflow-x-auto">{REFRESH_SQL}</pre>
                        <button onClick={() => { navigator.clipboard.writeText(REFRESH_SQL); alert("SQL Copied!"); }} className="mt-3 w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded text-[10px] font-bold text-amber-400 uppercase tracking-widest transition-all">Copy Refresh SQL</button>
                    </div>
                    <button onClick={() => { navigate('/admin/backup'); setShowScripts(false); }} className="w-full py-4 bg-amber-900/30 border border-amber-500/30 rounded-xl text-xs font-bold uppercase text-amber-200 hover:bg-amber-900/50 transition-colors">Go to System Backups</button>
                </div>
                <button onClick={() => setShowScripts(false)} className="w-full mt-10 py-4 bg-gray-800 text-gray-200 rounded-xl text-xs font-black uppercase shadow-lg">Return to Registry</button>
            </div>
        </Modal>
    </div>
  );
};

export default AdminConfig;
