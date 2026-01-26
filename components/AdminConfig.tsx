
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDb } from '../hooks/useDb';
import AdminContextHelp from './AdminContextHelp';

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
  const { db, refresh, connectionStatus } = useDb();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = async () => {
      setIsRefreshing(true);
      localStorage.removeItem('glyph_eternal_cache_v42');
      await refresh();
      setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050510] via-[#0F0F23] to-[#12031a] text-amber-50 font-lora pb-20">
        <div className="sticky top-0 z-40 bg-[#0F0F23]/80 backdrop-blur-lg border-b border-amber-500/20 shadow-lg">
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg">
                        <span className="text-xl">🛠️</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">Registry Control</h1>
                        <p className="text-[10px] text-amber-200/50 uppercase tracking-[0.4em] font-mono">Live Database Navigator</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleRefresh} className={`group px-5 py-2 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${connectionStatus === 'error' ? 'bg-red-900/20 border-red-500 text-red-400' : 'bg-black/40 border-amber-500/30 hover:border-amber-400 text-amber-200'}`}>
                        <span className={`${isRefreshing ? 'animate-spin' : ''}`}>↻</span>
                        <span>{isRefreshing ? 'Re-Syncing...' : 'Force Sync'}</span>
                    </button>
                    <Link to="/admin/dashboard" className="px-5 py-2 rounded-xl bg-gradient-to-r from-gray-800 to-black hover:from-gray-700 text-white text-xs font-bold uppercase tracking-wider border border-white/10 shadow-lg">Exit</Link>
                </div>
            </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-12">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {TABLE_GROUPS.map((group, idx) => (
                    <section key={group.title} className="animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                        <div className={`rounded-2xl border ${group.border} bg-gradient-to-br ${group.gradient} backdrop-blur-md overflow-hidden shadow-xl`}>
                            <div className={`p-5 border-b ${group.border} flex items-center justify-between bg-black/20`}>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{group.icon}</span>
                                    <div>
                                        <h3 className={`text-lg font-cinzel font-bold ${group.text}`}>{group.title}</h3>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">{group.subtitle}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {group.tables.map(tableName => {
                                    const count = db[tableName]?.length || 0;
                                    return (
                                        <Link key={tableName} to={`/admin/db/${tableName}`} className="group relative flex flex-col justify-between p-3 bg-black/40 border border-white/5 hover:border-amber-500/40 rounded-lg transition-all hover:-translate-y-1 hover:shadow-lg">
                                            <h4 className="text-xs font-bold text-gray-300 group-hover:text-amber-100 capitalize truncate w-full">{tableName.replace(/_/g, ' ')}</h4>
                                            <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-white/5 group-hover:bg-amber-500/20 group-hover:text-amber-300 transition-colors`}>{count}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                ))}
            </div>
        </div>
        <AdminContextHelp context="dashboard" />
    </div>
  );
};

export default AdminConfig;
