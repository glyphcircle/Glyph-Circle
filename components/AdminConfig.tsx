
import React, { useState } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { useDb } from '../hooks/useDb';
import Modal from './shared/Modal';

// --- STATIC CONSTANTS ---
const TABLE_GROUPS = [
    {
        title: "Seeker Archives",
        subtitle: "User profiles, history & personal data",
        icon: "👥",
        gradient: "from-blue-900/20 to-indigo-900/20",
        border: "border-blue-500/30",
        text: "text-blue-200",
        tables: ['users', 'readings', 'transactions', 'feedback', 'user_subscriptions', 'mood_entries', 'dosha_profiles', 'synastry_reports', 'remedy_requests']
    },
    {
        title: "Mystic Bazaar",
        subtitle: "Store inventory & commerce",
        icon: "🛒",
        gradient: "from-emerald-900/20 to-teal-900/20",
        border: "border-emerald-500/30",
        text: "text-emerald-200",
        tables: ['store_items', 'store_orders', 'store_categories', 'store_discounts']
    },
    {
        title: "Content Grimoire",
        subtitle: "Services, assets & knowledge base",
        icon: "📖",
        gradient: "from-purple-900/20 to-fuchsia-900/20",
        border: "border-purple-500/30",
        text: "text-purple-200",
        tables: ['services', 'featured_content', 'image_assets', 'gemstones']
    },
    {
        title: "System Core",
        subtitle: "Configuration & integrations",
        icon: "⚙️",
        gradient: "from-gray-800/40 to-gray-900/40",
        border: "border-gray-500/30",
        text: "text-gray-300",
        tables: ['config', 'ui_themes', 'report_formats', 'cloud_providers', 'payment_providers', 'payment_config', 'logs']
    }
];

const UI_THEMES_SQL = `-- 🎨 UI THEMES TABLE SETUP
CREATE TABLE IF NOT EXISTS public.ui_themes (
    id TEXT PRIMARY KEY,
    name TEXT,
    css_class TEXT,
    accent_color TEXT,
    font_family TEXT DEFAULT 'cinzel',
    background_url TEXT,
    status TEXT DEFAULT 'inactive',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ui_themes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Themes" ON public.ui_themes;
CREATE POLICY "Public Read Themes" ON public.ui_themes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin Write Themes" ON public.ui_themes;
CREATE POLICY "Admin Write Themes" ON public.ui_themes FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.ui_themes (id, name, css_class, accent_color, font_family, status) VALUES
('theme_default', 'Mystic Night', 'bg-[#0F0F23]', 'text-amber-400', 'lora', 'active'),
('theme_solar', 'Solar Flare', 'bg-gradient-to-br from-[#2a0a00] to-[#450a0a]', 'text-orange-400', 'cinzel', 'inactive'),
('theme_forest', 'Forest Sage', 'bg-gradient-to-b from-[#051a05] to-[#0a2f15]', 'text-emerald-400', 'lora', 'inactive'),
('theme_silver', 'Celestial Silver', 'bg-[#0a0a12]', 'text-cyan-200', 'cinzel', 'inactive'),
('theme_rose', 'Rose Quartz', 'bg-gradient-to-br from-[#1f0510] to-[#2d0a18]', 'text-pink-300', 'lora', 'inactive'),
('theme_saffron', 'Vedic Saffron', 'bg-[#2b0505]', 'text-yellow-400', 'cinzel', 'inactive'),
('theme_cyber', 'Cyber Zen', 'bg-black', 'text-neon-magenta', 'mono', 'inactive')
ON CONFLICT (id) DO NOTHING;`;

const PERMISSIONS_SQL = `-- 🔓 FIX SCHEMA & REFRESH CACHE
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE public.report_formats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Full Access" ON public.report_formats;
CREATE POLICY "Public Full Access" ON public.report_formats FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.ui_themes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Themes Full Access" ON public.ui_themes;
CREATE POLICY "Themes Full Access" ON public.ui_themes FOR ALL USING (true) WITH CHECK (true);
NOTIFY pgrst, 'reload config';`;

const AdminConfig: React.FC = () => {
  const { db, refresh, activateTheme } = useDb();
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeScript, setActiveScript] = useState<'themes' | 'permissions'>('themes'); 
  
  // Theme Data
  const themes = db.ui_themes || [];

  const handleRefresh = async () => {
      setIsRefreshing(true);
      await refresh();
      setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0505] via-[#0F0F23] to-[#0f0518] text-amber-50 font-lora selection:bg-maroon-500 selection:text-white pb-20">
        
        {/* Sticky Glass Header */}
        <div className="sticky top-0 z-40 bg-[#0F0F23]/80 backdrop-blur-lg border-b border-amber-500/20 shadow-lg">
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-maroon-600 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                        <span className="text-xl">🛡️</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-gold-400">
                            Sanctum Config
                        </h1>
                        <p className="text-[10px] text-amber-200/50 uppercase tracking-widest font-mono">Master Control Plane</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleRefresh} 
                        className="group relative px-4 py-2 rounded-lg bg-black/40 border border-amber-500/30 hover:border-amber-400 text-amber-200 text-xs font-bold uppercase tracking-wider transition-all overflow-hidden"
                    >
                        <span className={`relative z-10 flex items-center gap-2 ${isRefreshing ? 'animate-pulse' : ''}`}>
                            <span className={isRefreshing ? "animate-spin" : ""}>↻</span> Refresh
                        </span>
                        <div className="absolute inset-0 bg-amber-500/10 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                    </button>

                    <button 
                        onClick={() => setShowSeedModal(true)} 
                        className="px-4 py-2 rounded-lg bg-indigo-900/40 border border-indigo-500/50 hover:bg-indigo-900/60 text-indigo-200 text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                    >
                        Tools
                    </button>

                    <Link 
                        to="/home" 
                        className="px-5 py-2 rounded-lg bg-gradient-to-r from-maroon-800 to-red-900 hover:from-maroon-700 hover:to-red-800 text-white text-xs font-bold uppercase tracking-wider border border-red-500/30 shadow-lg transition-transform hover:scale-105"
                    >
                        Exit
                    </Link>
                </div>
            </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-12">

            {/* THEME MANAGER SECTION */}
            <section className="animate-fade-in-up">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl filter drop-shadow-md">🎨</span>
                        <h2 className="text-xl font-cinzel font-bold text-amber-100">Visual Manifestation</h2>
                    </div>
                    <Link to="/admin/db/ui_themes" className="text-xs text-amber-400 hover:text-amber-200 underline font-mono">
                        Edit Theme Data
                    </Link>
                </div>

                <div className="bg-black/30 border border-amber-500/20 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {themes.length === 0 && (
                            <div className="col-span-full text-center p-8 text-gray-500 bg-black/20 rounded border border-dashed border-gray-700">
                                <p>No themes found.</p>
                                <button onClick={() => setShowSeedModal(true)} className="text-amber-400 underline text-xs mt-2">Run SQL Setup</button>
                            </div>
                        )}
                        
                        {themes.map((theme: any) => {
                            const isActive = theme.status === 'active';
                            // Extract color for preview if it's a tailwind class or hex
                            const previewColor = theme.css_class.includes('bg-[') 
                                ? theme.css_class.match(/bg-\[(.*?)\]/)?.[1] 
                                : null;

                            return (
                                <div 
                                    key={theme.id}
                                    onClick={() => activateTheme(theme.id)}
                                    className={`
                                        group relative cursor-pointer rounded-xl border transition-all duration-300 h-32 flex flex-col overflow-hidden
                                        ${isActive 
                                            ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.3)] scale-105 z-10' 
                                            : 'border-white/10 hover:border-amber-500/50 hover:scale-105 opacity-80 hover:opacity-100'
                                        }
                                    `}
                                >
                                    {/* Theme Background Preview */}
                                    <div className={`absolute inset-0 opacity-50 transition-opacity group-hover:opacity-70 ${theme.css_class.startsWith('bg') ? theme.css_class : ''}`} style={previewColor ? {backgroundColor: previewColor} : {}}></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>

                                    {/* Active Indicator */}
                                    <div className="absolute top-2 right-2">
                                        <div className={`w-3 h-3 rounded-full border shadow-sm ${isActive ? 'bg-green-500 border-green-300 animate-pulse' : 'bg-black/50 border-white/30'}`}></div>
                                    </div>

                                    <div className="relative z-10 mt-auto p-3">
                                        <h4 className="font-bold text-xs text-white leading-tight mb-1 font-cinzel">{theme.name}</h4>
                                        <p className="text-[9px] text-gray-300 uppercase tracking-wider">{isActive ? 'Active' : 'Apply'}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* DATA TABLES GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {TABLE_GROUPS.map((group, idx) => (
                    <section key={group.title} className="animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                        <div className={`rounded-2xl border ${group.border} bg-gradient-to-br ${group.gradient} backdrop-blur-md overflow-hidden shadow-xl`}>
                            {/* Group Header */}
                            <div className={`p-5 border-b ${group.border} flex items-center justify-between bg-black/20`}>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{group.icon}</span>
                                    <div>
                                        <h3 className={`text-lg font-cinzel font-bold ${group.text}`}>{group.title}</h3>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">{group.subtitle}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Tables Grid */}
                            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {group.tables.map(tableName => {
                                    const count = db[tableName]?.length || 0;
                                    return (
                                        <Link 
                                            key={tableName} 
                                            to={`/admin/db/${tableName}`} 
                                            className="group relative flex flex-col justify-between p-3 bg-black/40 border border-white/5 hover:border-amber-500/40 rounded-lg transition-all hover:-translate-y-1 hover:shadow-lg"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="text-xs font-bold text-gray-300 group-hover:text-amber-100 capitalize truncate w-full" title={tableName.replace(/_/g, ' ')}>
                                                    {tableName.replace(/_/g, ' ')}
                                                </h4>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] text-gray-500 group-hover:text-amber-500/70 uppercase">Table</span>
                                                <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-white/5 group-hover:bg-amber-500/20 group-hover:text-amber-300 transition-colors`}>
                                                    {count}
                                                </span>
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

        {/* SQL Tools Modal */}
        <Modal isVisible={showSeedModal} onClose={() => setShowSeedModal(false)}>
            <div className="bg-[#0F0F23] border border-indigo-500/50 rounded-xl p-0 w-full max-w-3xl overflow-hidden shadow-2xl">
                <div className="p-4 bg-indigo-950/50 border-b border-indigo-500/30 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-indigo-200 flex items-center gap-2">
                        <span>🛠️</span> Database Engineers
                    </h3>
                    <button onClick={() => setShowSeedModal(false)} className="text-indigo-300 hover:text-white">&times;</button>
                </div>
                <div className="p-6">
                    <div className="flex gap-2 mb-4 bg-black/30 p-1 rounded-lg inline-flex">
                        <button onClick={() => setActiveScript('themes')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${activeScript === 'themes' ? 'bg-pink-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>🎨 1. Theme Schema</button>
                        <button onClick={() => setActiveScript('permissions')} className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${activeScript === 'permissions' ? 'bg-green-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}>🔓 2. Fix Permissions</button>
                    </div>

                    <div className="relative group">
                        <pre className="bg-[#050510] p-4 rounded-lg border border-gray-800 text-[10px] text-green-400 font-mono overflow-auto max-h-64 custom-scrollbar shadow-inner">
                            {activeScript === 'themes' ? UI_THEMES_SQL : PERMISSIONS_SQL}
                        </pre>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(activeScript === 'themes' ? UI_THEMES_SQL : PERMISSIONS_SQL);
                                alert("SQL Copied! Run this in Supabase SQL Editor.");
                            }}
                            className="absolute top-2 right-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                            Copy SQL
                        </button>
                    </div>
                    
                    <p className="mt-4 text-xs text-gray-500 text-center">
                        Copy the SQL above and run it in the Supabase Dashboard SQL Editor to apply structure updates.
                    </p>
                </div>
            </div>
        </Modal>
    </div>
  );
};

export default AdminConfig;
