import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDb } from '../hooks/useDb';
import Card from './shared/Card';
import Modal from './shared/Modal';

const TABLE_GROUPS = [
    {
        title: "Content Grimoire",
        subtitle: "Offerings & Globals",
        icon: "📖",
        gradient: "from-purple-900/20 to-fuchsia-900/20",
        border: "border-purple-500/30",
        text: "text-purple-200",
        tables: ['services', 'config']
    }
];

const AdminConfig: React.FC = () => {
  const { db, refresh, networkLedger } = useDb();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showScripts, setShowScripts] = useState(false);

  const handleRefresh = async (force: boolean = false) => {
      if (isRefreshing) return;
      setIsRefreshing(true);
      try {
          await refresh();
      } finally {
          setTimeout(() => setIsRefreshing(false), 1000);
      }
  };

  const REFRESH_SQL = `-- 🔱 SCHEMA REFRESH SCRIPT
NOTIFY pgrst, 'reload schema';
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.services TO anon, authenticated;
GRANT ALL ON TABLE public.config TO anon, authenticated;`;

  return (
    <div className="min-h-screen bg-[#050510] text-amber-50 font-lora pb-20">
        <div className="sticky top-0 z-40 bg-[#0F0F23]/95 backdrop-blur-xl border-b border-amber-500/20 shadow-2xl">
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate('/admin/dashboard')} className="p-3 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all border border-amber-500/30 group shadow-lg"><svg className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
                    <div>
                        <h1 className="text-2xl font-cinzel font-black text-white tracking-widest uppercase">Global <span className="text-amber-50 text-amber-500">Config</span></h1>
                        <p className="text-[9px] text-amber-200/40 uppercase tracking-[0.6em] font-mono">PHASE 1: REGISTRY CONTROLS</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => handleRefresh(true)} disabled={isRefreshing} className="px-5 py-2.5 rounded-xl border border-blue-500/30 bg-blue-900/10 text-blue-300 text-xs font-bold uppercase tracking-wider hover:bg-blue-900/30 transition-all shadow-xl">
                        {isRefreshing ? 'SYNCING...' : 'Sync Registry'}
                    </button>
                    <button onClick={() => setShowScripts(true)} className="px-5 py-2.5 rounded-xl bg-purple-900/40 border border-purple-500/40 text-purple-300 text-xs font-bold uppercase tracking-wider hover:bg-purple-900/60 transition-all shadow-xl">📜 SQL Repair</button>
                </div>
            </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-12 pt-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Card className="bg-black/60 border-amber-500/20 h-full flex flex-col overflow-hidden shadow-2xl rounded-3xl">
                        <div className="p-5 border-b border-white/5 bg-white/5 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase tracking-widest text-amber-400">Activity Ledger</h3>
                            <span className="text-[9px] font-mono bg-green-900/40 text-green-400 px-2 py-0.5 rounded">ONLINE</span>
                        </div>
                        <div className="flex-grow overflow-y-auto max-h-[500px] custom-scrollbar p-4 space-y-3">
                            {networkLedger.map(event => (
                                <div key={event.id} className="p-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-mono group hover:bg-white/10 transition-colors">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex gap-2 items-center">
                                            <span className={`font-black ${event.method === 'POST' ? 'text-green-400' : event.method === 'PATCH' ? 'text-blue-400' : 'text-purple-400'}`}>{event.method}</span>
                                            <span className="text-[8px] bg-gray-800 text-gray-400 px-1 rounded uppercase tracking-tighter">{event.source}</span>
                                        </div>
                                        <span className={`text-[8px] ${event.status === 'success' ? 'text-green-500' : event.status === 'pending' ? 'text-amber-500 animate-pulse' : 'text-red-500'}`}>{event.status.toUpperCase()}</span>
                                    </div>
                                    <div className="text-gray-500 truncate">{event.endpoint}</div>
                                </div>
                            ))}
                            {networkLedger.length === 0 && <p className="text-center text-gray-600 text-xs py-10 italic">Awaiting service activity...</p>}
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <div className="grid grid-cols-1 gap-8">
                        {TABLE_GROUPS.map((group, idx) => (
                            <section key={group.title} className="animate-fade-in-up">
                                <div className={`rounded-3xl border ${group.border} bg-gradient-to-br ${group.gradient} backdrop-blur-md overflow-hidden shadow-2xl`}>
                                    <div className={`p-6 border-b ${group.border} flex items-center gap-4 bg-black/30`}>
                                        <span className="text-3xl">{group.icon}</span>
                                        <div>
                                            <h3 className={`text-lg font-cinzel font-black tracking-widest ${group.text} uppercase`}>{group.title}</h3>
                                            <p className="text-[10px] opacity-60 uppercase tracking-widest">{group.subtitle}</p>
                                        </div>
                                    </div>
                                    <div className="p-6 grid grid-cols-1 gap-4">
                                        {group.tables.map(tableName => (
                                            <Link key={tableName} to={`/admin/db/${tableName}`} className="group flex flex-col justify-between p-8 bg-black/40 border border-white/5 hover:border-amber-500/40 rounded-2xl transition-all shadow-lg hover:translate-x-2">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <h4 className="text-2xl font-cinzel font-bold text-amber-200 uppercase tracking-widest">Manage {tableName}</h4>
                                                        <p className="text-xs text-gray-500 mt-2 italic">Configure properties and status for the {tableName} registry.</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-4xl font-mono font-bold text-amber-400">{db[tableName]?.length || 0}</span>
                                                        <span className="block text-[8px] text-gray-500 uppercase mt-1 font-black">Entries Found</span>
                                                    </div>
                                                </div>
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
                <div className="p-4 bg-black/60 rounded-xl border border-amber-900/30 mb-6">
                    <pre className="text-[10px] text-amber-500 overflow-x-auto">{REFRESH_SQL}</pre>
                </div>
                <button onClick={() => setShowScripts(false)} className="w-full py-4 bg-gray-800 text-gray-200 rounded-xl text-xs font-black uppercase shadow-lg">Return to Registry</button>
            </div>
        </Modal>
    </div>
  );
};

export default AdminConfig;