
import React, { useState } from 'react';
// @ts-ignore
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
        tables: ['services', 'featured_content', 'image_assets', 'report_formats']
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
  ATOMIC_REPAIR: `-- 🔱 SANCTUM V25: ATOMIC REPAIR (RECURSION KILLER)
-- RUN THIS IN SUPABASE SQL EDITOR TO KILL THE 15S LATENCY LOOP.

BEGIN;

-- 1. KILL CIRCULAR FUNCTIONS
-- These are the functions causing the "mutable search path" and recursion warnings.
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_role_sync() CASCADE;

-- 2. CREATE A LEAN, TABLE-LESS ADMIN CHECK (JWT ONLY)
-- This function never touches the 'users' table, breaking the recursion cycle.
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean AS $$
BEGIN
  -- Check JWT app_metadata directly from the token memory.
  RETURN (COALESCE(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role', 'seeker') = 'admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 3. BYPASS SECURITY FOR NON-SENSITIVE UI DATA
-- This ensures the app loads UI components instantly even if Auth is spinning.
ALTER TABLE public.config DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.services DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_themes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_formats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_content DISABLE ROW LEVEL SECURITY;

-- 4. HARDEN IDENTITY WITH CLEAN POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "U_ALL" ON public.users;
DROP POLICY IF EXISTS "U_SOVEREIGN" ON public.users;
DROP POLICY IF EXISTS "U_BYPASS" ON public.users;
CREATE POLICY "U_FINAL" ON public.users 
FOR ALL USING ( (SELECT auth.uid()) = id OR public.is_admin() );

-- 5. RE-SYNC CURRENT ADMINS
-- Push the 'admin' role into the hidden auth metadata so the token check works.
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE id IN (SELECT id FROM public.users WHERE role = 'admin');

COMMIT;`,
  FULL_SCHEMA: `-- 🔱 SANCTUM V25: ZENITH COMPLETE SCHEMA
-- Run this ONLY if you want to wipe everything and start from scratch.

BEGIN;
DROP TABLE IF EXISTS public.users, public.readings, public.transactions, public.feedback, public.user_subscriptions, public.store_items, public.store_orders, public.services, public.featured_content, public.image_assets, public.report_formats, public.config, public.ui_themes, public.payment_providers, public.payment_methods, public.cloud_providers, public.payment_config CASCADE;

CREATE TABLE public.users (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, email text UNIQUE NOT NULL, name text, role text DEFAULT 'seeker' CHECK (role IN ('seeker', 'sage', 'admin')), credits integer DEFAULT 100, currency text DEFAULT 'INR', created_at timestamptz DEFAULT now());
CREATE TABLE public.config (id text PRIMARY KEY, key text UNIQUE, value text, status text DEFAULT 'active');
CREATE TABLE public.services (id text PRIMARY KEY, name text, price real, path text, status text DEFAULT 'active', image text, description text);
CREATE TABLE public.featured_content (id text PRIMARY KEY, title text, text text, image_url text, status text DEFAULT 'active');
CREATE TABLE public.image_assets (id text PRIMARY KEY, name text, path text, tags text, status text DEFAULT 'active');
CREATE TABLE public.report_formats (id text PRIMARY KEY, name text, url text, status text DEFAULT 'active');
CREATE TABLE public.ui_themes (id text PRIMARY KEY, name text, css_class text, accent_color text, status text DEFAULT 'inactive');
CREATE TABLE public.store_items (id text PRIMARY KEY, name text, price real, category text, image_url text, stock integer, status text DEFAULT 'active', description text);
CREATE TABLE public.store_orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, item_ids jsonb, total real, status text DEFAULT 'paid', created_at timestamptz DEFAULT now());
CREATE TABLE public.payment_providers (id text PRIMARY KEY, name text, provider_type text, is_active boolean DEFAULT true, currency text DEFAULT 'INR', api_key text, country_codes text, status text DEFAULT 'active');
CREATE TABLE public.payment_methods (id text PRIMARY KEY, name text, logo_url text, type text, status text DEFAULT 'active');
CREATE TABLE public.cloud_providers (id text PRIMARY KEY, provider text, name text, is_active boolean DEFAULT true, status text DEFAULT 'active', api_key text, folder_id text);
CREATE TABLE public.payment_config (id text PRIMARY KEY, account_email text, creditor_name text, creditor_address text, status text DEFAULT 'active');
CREATE TABLE public.readings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES public.users(id) ON DELETE CASCADE, type text, title text, content text, meta_data jsonb DEFAULT '{}'::jsonb, is_favorite boolean DEFAULT false, created_at timestamptz DEFAULT now());
CREATE TABLE public.transactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES public.users(id), amount real, description text, status text DEFAULT 'success', created_at timestamptz DEFAULT now());
CREATE TABLE public.feedback (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, rating integer, comment text, created_at timestamptz DEFAULT now());
CREATE TABLE public.user_subscriptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, plan text, status text, expires_at timestamptz);

COMMIT;`
};

const AdminConfig: React.FC = () => {
  const { db, refresh, activateTheme, connectionStatus } = useDb();
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeScript, setActiveScript] = useState<'ATOMIC' | 'FULL'>('ATOMIC');
  
  const themes = db.ui_themes || [];

  const handleRefresh = async () => {
      setIsRefreshing(true);
      await refresh();
      setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0F0F23] to-[#1a0525] text-amber-50 font-lora pb-20">
        <div className="sticky top-0 z-40 bg-[#0F0F23]/80 backdrop-blur-lg border-b border-amber-500/20 shadow-lg">
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                        <span className="text-xl">🔱</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">Sovereign V25</h1>
                        <p className="text-[10px] text-amber-200/50 uppercase tracking-widest font-mono">Architect Prime</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleRefresh} 
                        className={`group relative px-5 py-2 rounded-xl border transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider
                            ${connectionStatus === 'error' ? 'bg-red-900/20 border-red-500 text-red-400' : 'bg-black/40 border-amber-500/30 hover:border-amber-400 text-amber-200'}
                        `}
                    >
                        <span className={`block ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}>↻</span>
                        <span>{isRefreshing ? 'Syncing...' : 'Refresh Registry'}</span>
                    </button>
                    <button onClick={() => setShowSqlModal(true)} className="px-5 py-2 rounded-xl bg-amber-900/40 border border-amber-500/50 hover:bg-amber-900/60 text-indigo-100 text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(245,158,11,0.3)]">Genesis Protocol (V25)</button>
                    <Link to="/admin/dashboard" className="px-5 py-2 rounded-xl bg-gradient-to-r from-gray-800 to-black hover:from-gray-700 text-white text-xs font-bold uppercase tracking-wider border border-white/10 shadow-lg transition-transform hover:scale-105">Exit</Link>
                </div>
            </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-12">
            <section className="animate-fade-in-up">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl filter drop-shadow-md">🎨</span>
                        <h2 className="text-xl font-cinzel font-bold text-amber-100 uppercase tracking-[0.2em]">Appearance Themes</h2>
                    </div>
                </div>
                <div className="bg-black/30 border border-amber-500/20 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {themes.map((theme: any) => {
                            const isActive = theme.status === 'active';
                            return (
                                <div key={theme.id} onClick={() => activateTheme(theme.id)} className={`group relative cursor-pointer rounded-xl border transition-all duration-300 h-32 flex flex-col overflow-hidden ${isActive ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.3)] scale-105 z-10' : 'border-white/10 hover:border-amber-500/50 hover:scale-105 opacity-80 hover:opacity-100'}`}>
                                    <div className={`absolute inset-0 opacity-50 transition-opacity group-hover:opacity-70 ${theme.css_class.startsWith('bg') ? theme.css_class : ''}`}></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                                    <div className="relative z-10 mt-auto p-3">
                                        <h4 className="font-bold text-xs text-white leading-tight font-cinzel">{theme.name}</h4>
                                        <p className="text-[9px] text-gray-300 uppercase tracking-wider">{isActive ? 'Active' : 'Apply'}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

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
            <div className="bg-[#0b0d18] border border-amber-500/30 rounded-2xl w-full max-w-4xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]">
                <div className="p-6 bg-gradient-to-r from-amber-950 to-orange-950 border-b border-white/10 flex justify-between items-center">
                    <div className="flex gap-4">
                        <button onClick={() => setActiveScript('ATOMIC')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeScript === 'ATOMIC' ? 'bg-amber-600 text-white shadow-lg' : 'text-amber-400 border border-amber-900'}`}>Atomic Repair (V25)</button>
                        <button onClick={() => setActiveScript('FULL')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeScript === 'FULL' ? 'bg-red-600 text-white shadow-lg' : 'text-red-400 border border-red-900'}`}>Wipe & Reset</button>
                    </div>
                    <button onClick={() => setShowSqlModal(false)} className="text-gray-400 hover:text-white text-3xl">&times;</button>
                </div>
                
                <div className="p-8">
                    <div className="bg-amber-900/10 p-5 rounded-2xl mb-8 border border-amber-500/20">
                        <h4 className="text-amber-300 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><span>🛡️</span> Repair Intelligence</h4>
                        <p className="text-xs text-amber-200/80 italic leading-relaxed">
                            {activeScript === 'ATOMIC' ? 'Recommended: Fixes recursion loops and hangs by disabling RLS for configuration tables and optimizing identity checks. Run this, then Log Out/In.' : 'Warning: Destructive operation. Use only if structure is permanently corrupted.'}
                        </p>
                    </div>

                    <div className="relative group">
                        <pre className="bg-black/80 p-6 rounded-2xl border border-gray-800 text-[11px] text-amber-500 font-mono overflow-auto max-h-[400px] custom-scrollbar shadow-inner leading-relaxed select-all">
                            {activeScript === 'ATOMIC' ? SQL_SCRIPTS.ATOMIC_REPAIR : SQL_SCRIPTS.FULL_SCHEMA}
                        </pre>
                        <button onClick={() => { navigator.clipboard.writeText(activeScript === 'ATOMIC' ? SQL_SCRIPTS.ATOMIC_REPAIR : SQL_SCRIPTS.FULL_SCHEMA); alert("V25 Atomic SQL Copied!"); }} className="absolute top-4 right-4 bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95">Copy Script</button>
                    </div>

                    <div className="mt-10 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                        <p className="text-[11px] text-gray-500 max-w-md">Run this in your Supabase SQL Editor. After execution, Log Out and Log In to refresh your identity token.</p>
                        <button onClick={() => setShowSqlModal(false)} className="w-full md:w-auto px-12 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl text-xs font-black uppercase tracking-[0.3em] transition-all">Done</button>
                    </div>
                </div>
            </div>
        </Modal>
        
        <AdminContextHelp context="dashboard" />
    </div>
  );
};

export default AdminConfig;
