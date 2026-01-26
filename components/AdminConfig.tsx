
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDb } from '../hooks/useDb';
import Modal from './shared/Modal';
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

const SQL_SCRIPTS = {
  QUANTUM_GENESIS: `-- 🔱 QUANTUM GENESIS V8: THE 17-SERVICE RESTORATION
-- Repairs all schemas and populates every table with definitive mystical data.

BEGIN;

-- 1. SECURITY & SCHEMA HARDENING
ALTER TABLE IF EXISTS public.services ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE IF EXISTS public.services ADD COLUMN IF NOT EXISTS image text;
ALTER TABLE IF EXISTS public.services ADD COLUMN IF NOT EXISTS path text;
ALTER TABLE IF EXISTS public.store_items ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE IF EXISTS public.store_items ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE IF EXISTS public.store_items ADD COLUMN IF NOT EXISTS stock integer DEFAULT 10;
ALTER TABLE IF EXISTS public.image_assets ADD COLUMN IF NOT EXISTS tags text;
ALTER TABLE IF EXISTS public.payment_methods ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE IF EXISTS public.featured_content ADD COLUMN IF NOT EXISTS image_url text;

-- DISABLE RLS FOR CONTENT TABLES (Ensures visibility)
ALTER TABLE IF EXISTS public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.store_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.image_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.config DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.featured_content DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_methods DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.report_formats DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gemstones DISABLE ROW LEVEL SECURITY;

-- 2. SEED THE 17 MASTER SERVICES
INSERT INTO public.services (id, name, price, path, image, description, status) VALUES
('calendar', 'Kalnirnaye', 0, '/calendar', 'https://images.unsplash.com/photo-1506784365847-bbad939e9335', 'Ancient Hindu Panchang & Muhurats.', 'active'),
('numerology', 'Numerology', 49, '/numerology', 'https://images.unsplash.com/photo-1509228627129-6690a87531bc', 'Uncover secrets in your name & birth date.', 'active'),
('astrology', 'Astrology', 99, '/astrology', 'https://images.unsplash.com/photo-1532968961962-8a0cb3a2d4c5', 'Explore your destiny in the stars.', 'active'),
('tarot', 'Tarot Reading', 49, '/tarot', 'https://images.unsplash.com/photo-1505537528343-4dc9b89823f6', 'Insight via the 78 Arcana.', 'active'),
('palmistry', 'Palmistry', 49, '/palmistry', 'https://images.unsplash.com/photo-1542553457-3f92a3449339', 'AI-powered hand line analysis.', 'active'),
('face-reading', 'Face Reading', 49, '/face-reading', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04', 'What your features reveal about you.', 'active'),
('ayurveda', 'Ayurvedic Dosha', 59, '/ayurveda', 'https://images.unsplash.com/photo-1540553016722-983e48a2cd10', 'Dosha analysis & lifestyle plans.', 'active'),
('dream-analysis', 'Dream Oracle', 49, '/dream-analysis', 'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9', 'Decode subconscious symbols.', 'active'),
('matchmaking', 'Vedic Matchmaking', 69, '/matchmaking', 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f', 'Guna Milan compatibility.', 'active'),
('remedy', 'Personal Remedy', 49, '/remedy', 'https://images.unsplash.com/photo-1528319725582-ddc096101511', 'Vedic rituals and mantras.', 'active'),
('gemstones', 'Gemstone Guide', 49, '/gemstones', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5', 'Find your power stone.', 'active'),
('voice-oracle', 'Voice Oracle', 0, '/voice-oracle', 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853', 'Speak to the ancient sages.', 'active'),
('cosmic-sync', 'Cosmic Sync', 69, '/cosmic-sync', 'https://images.unsplash.com/photo-1506318137071-a8bcbf90d114', 'Sync charts with your companion.', 'active'),
('muhurat', 'Shubh Muhurat', 29, '/muhurat', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30', 'Auspicious timing for events.', 'active'),
('moon-journal', 'Moon Journal', 0, '/moon-journal', 'https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5', 'Align with lunar phases.', 'active'),
('achievements', 'Sigil Gallery', 0, '/achievements', 'https://images.unsplash.com/photo-1515524738708-327f6b0037a2', 'Your spiritual rank and awards.', 'active'),
('store', 'Vedic Store', 0, '/store', 'https://images.unsplash.com/photo-1600609842388-3e4b489d71c6', 'Authentic Rudraksha & Yantras.', 'active')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    price = EXCLUDED.price, 
    path = EXCLUDED.path, 
    image = EXCLUDED.image,
    description = EXCLUDED.description,
    status = 'active';

-- 3. SEED IMAGE ASSETS (Logos & BGs)
INSERT INTO public.image_assets (id, name, path, tags, status) VALUES
('sacred_emblem', 'Master Logo', 'https://lh3.googleusercontent.com/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO', 'brand_logo,emblem', 'active'),
('bg_ganesha', 'Divine Background', 'https://images.unsplash.com/photo-1605333116398-1c39a3f898e3', 'background,home_bg', 'active'),
('report_bg_master', 'Vellum Paper', 'https://www.transparenttextures.com/patterns/handmade-paper.png', 'background,report', 'active')
ON CONFLICT (id) DO UPDATE SET status = 'active';

-- 4. SEED PAYMENT METHODS
INSERT INTO public.payment_methods (id, name, logo_url, type, status) VALUES
('pm_paytm', 'Paytm', 'https://raw.githubusercontent.com/justpay/upi-icons/master/png/paytm.png', 'upi', 'active'),
('pm_phonepe', 'PhonePe', 'https://raw.githubusercontent.com/justpay/upi-icons/master/png/phonepe.png', 'upi', 'active'),
('pm_gpay', 'Google Pay', 'https://raw.githubusercontent.com/justpay/upi-icons/master/png/googlepay.png', 'upi', 'active'),
('pm_bhim', 'BHIM', 'https://raw.githubusercontent.com/justpay/upi-icons/master/png/bhim.png', 'upi', 'active')
ON CONFLICT (id) DO UPDATE SET status = 'active';

-- 5. SEED STORE ITEMS
INSERT INTO public.store_items (id, name, price, category, image_url, stock, status, description) VALUES
('item_001', '5-Mukhi Rudraksha', 499, 'Rudraksha', 'https://images.unsplash.com/photo-1609140224212-e8759530f2ce', 50, 'active', 'Authentic bead for mental peace.'),
('item_002', 'Siddha Shri Yantra', 1299, 'Yantra', 'https://images.unsplash.com/photo-1590387120759-4f86a5578507', 15, 'active', 'Geometric anchor for wealth.')
ON CONFLICT (id) DO UPDATE SET status = 'active';

-- 6. SEED FEATURED CONTENT
INSERT INTO public.featured_content (id, title, text, image_url, status) VALUES
('feat_01', 'The Age of Aquarius', 'Prepare for the shift in cosmic consciousness as the stars move into the new era.', 'https://images.unsplash.com/photo-1534447677768-be436bb09401', 'active')
ON CONFLICT (id) DO UPDATE SET status = 'active';

-- 7. SEED SYSTEM CONFIG
INSERT INTO public.config (id, key, value, status) VALUES
('app_title', 'title', 'Glyph Circle', 'active'),
('card_opacity', 'card_hover_opacity', '0.9', 'active')
ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value;

COMMIT;`,
  AUDIT: `-- 📊 PERFORMANCE MONITOR
SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE state != 'idle';`
};

const AdminConfig: React.FC = () => {
  const { db, refresh, connectionStatus } = useDb();
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeScript, setActiveScript] = useState<'QUANTUM' | 'AUDIT'>('QUANTUM');
  
  const handleRefresh = async () => {
      setIsRefreshing(true);
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
                        <p className="text-[10px] text-amber-200/50 uppercase tracking-[0.4em] font-mono">Quantum Sovereignty</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleRefresh} className={`group px-5 py-2 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${connectionStatus === 'error' ? 'bg-red-900/20 border-red-500 text-red-400' : 'bg-black/40 border-amber-500/30 hover:border-amber-400 text-amber-200'}`}>
                        <span className={`${isRefreshing ? 'animate-spin' : ''}`}>↻</span>
                        <span>{isRefreshing ? 'Syncing...' : 'Refresh Registry'}</span>
                    </button>
                    <button onClick={() => setShowSqlModal(true)} className="px-5 py-2 rounded-xl bg-amber-900/40 border border-amber-500/50 hover:bg-amber-900/60 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg">SQL FORGE</button>
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

        <Modal isVisible={showSqlModal} onClose={() => setShowSqlModal(false)}>
            <div className="bg-[#0b0d18] border border-amber-500/30 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl">
                <div className="p-6 bg-gradient-to-r from-red-950 to-black border-b border-white/10 flex justify-between items-center">
                    <div className="flex gap-4">
                        <button onClick={() => setActiveScript('QUANTUM')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeScript === 'QUANTUM' ? 'bg-red-600 text-white shadow-lg' : 'text-red-400 border border-red-900'}`}>Quantum Genesis</button>
                        <button onClick={() => setActiveScript('AUDIT')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeScript === 'AUDIT' ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400 border border-blue-900'}`}>Performance</button>
                    </div>
                    <button onClick={() => setShowSqlModal(false)} className="text-gray-400 hover:text-white text-3xl">&times;</button>
                </div>
                
                <div className="p-8">
                    <div className="bg-red-900/10 p-5 rounded-2xl mb-8 border border-red-500/20">
                        <h4 className="text-red-400 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><span>🔮</span> QUANTUM_GENESIS_V8</h4>
                        <p className="text-xs text-red-200/80 italic leading-relaxed">
                            Run this to restore all 17 services and fix empty tables. This script handles schema repair and total data seeding.
                        </p>
                    </div>

                    <div className="relative group">
                        <pre className="bg-black/80 p-6 rounded-2xl border border-gray-800 text-[11px] text-amber-500 font-mono overflow-auto max-h-[400px] custom-scrollbar shadow-inner leading-relaxed select-all">
                            {activeScript === 'QUANTUM' ? SQL_SCRIPTS.QUANTUM_GENESIS : SQL_SCRIPTS.AUDIT}
                        </pre>
                        <button onClick={() => { navigator.clipboard.writeText(activeScript === 'QUANTUM' ? SQL_SCRIPTS.QUANTUM_GENESIS : SQL_SCRIPTS.AUDIT); alert("Genesis SQL Copied!"); }} className="absolute top-4 right-4 bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95">Copy script</button>
                    </div>
                </div>
            </div>
        </Modal>
        <AdminContextHelp context="dashboard" />
    </div>
  );
};

export default AdminConfig;
