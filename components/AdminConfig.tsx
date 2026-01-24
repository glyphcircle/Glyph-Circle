
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
        tables: ['config', 'ui_themes', 'report_formats', 'cloud_providers', 'payment_providers', 'payment_config', 'payment_methods', 'logs']
    }
];

const PERMANENT_RLS_FIX_SQL = `-- 🚀 PERMANENT RLS FIX: Helper Table Method
-- This script creates a separate table for roles to permanently break the recursion loop.
-- Run this entire script in your Supabase SQL Editor to resolve the timeout issue.

BEGIN;

-- 1. Create a dedicated table for user roles.
-- This table will have simpler RLS and won't be part of the recursion.
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user'
);

-- 2. One-time data migration.
-- Copy existing roles from the 'users' table to the new 'user_roles' table.
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.users
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

-- 3. Redefine the is_admin() function to read from the NEW table.
-- This is the crucial step that breaks the infinite loop.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER -- Use SECURITY DEFINER for robustness
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- 4. Harden security by preventing direct calls from non-admins.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role; -- Ensure Supabase internal functions can use it

-- 5. Apply simple RLS policies to the new user_roles table.
-- is_admin() is now safe to use here because it doesn't read from 'users'.
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can read their own role" ON public.user_roles;
CREATE POLICY "Users can read their own role" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- 6. Re-apply the separated policies on the main 'users' table for consistency.
-- The read policy remains simple, breaking any potential edge-case loops.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- SAFE READ POLICY (No is_admin() call)
DROP POLICY IF EXISTS "users_read_authenticated" ON public.users;
CREATE POLICY "users_read_authenticated" ON public.users FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- WRITE POLICIES (Now safely use the new is_admin())
DROP POLICY IF EXISTS "users_write_policies" ON public.users;
CREATE POLICY "users_write_policies" ON public.users FOR ALL TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- 7. Clean up old, possibly conflicting/redundant policies.
DROP POLICY IF EXISTS "users_insert_admin" ON public.users;
DROP POLICY IF EXISTS "users_update_admin" ON public.users;
DROP POLICY IF EXISTS "users_delete_admin" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;

COMMIT;

-- Notify PostgREST to reload its schema cache.
NOTIFY pgrst, 'reload schema';
`;

const AdminConfig: React.FC = () => {
  const { db, refresh, activateTheme } = useDb();
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const themes = db.ui_themes || [];

  const handleRefresh = async () => {
      setIsRefreshing(true);
      await refresh();
      setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0505] via-[#0F0F23] to-[#0f0518] text-amber-50 font-lora pb-20">
        <div className="sticky top-0 z-40 bg-[#0F0F23]/80 backdrop-blur-lg border-b border-amber-500/20 shadow-lg">
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-maroon-600 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                        <span className="text-xl">🛡️</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-gold-400">Sanctum Config</h1>
                        <p className="text-[10px] text-amber-200/50 uppercase tracking-widest font-mono">Master Control Plane</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleRefresh} className="group relative px-4 py-2 rounded-lg bg-black/40 border border-amber-500/30 hover:border-amber-400 text-amber-200 text-xs font-bold uppercase tracking-wider transition-all overflow-hidden">
                        <span className={`relative z-10 flex items-center gap-2 ${isRefreshing ? 'animate-pulse' : ''}`}><span className={isRefreshing ? "animate-spin" : ""}>↻</span> Refresh</span>
                    </button>
                    <button onClick={() => setShowSqlModal(true)} className="px-4 py-2 rounded-lg bg-red-900/40 border border-red-500/50 hover:bg-red-900/60 text-red-200 text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(239,68,68,0.2)]">SQL Repair Kit</button>
                    <Link to="/home" className="px-5 py-2 rounded-lg bg-gradient-to-r from-maroon-800 to-red-900 hover:from-maroon-700 hover:to-red-800 text-white text-xs font-bold uppercase tracking-wider border border-red-500/30 shadow-lg transition-transform hover:scale-105">Exit</Link>
                </div>
            </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-12">
            <section className="animate-fade-in-up">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl filter drop-shadow-md">🎨</span>
                        <h2 className="text-xl font-cinzel font-bold text-amber-100">Visual Manifestation</h2>
                    </div>
                </div>
                <div className="bg-black/30 border border-amber-500/20 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {themes.length === 0 && (
                            <div className="col-span-full text-center p-8 text-gray-500 bg-black/20 rounded border border-dashed border-gray-700">
                                <p>No themes found.</p>
                                <button onClick={() => setShowSqlModal(true)} className="text-amber-400 underline text-xs mt-2">Run SQL Setup</button>
                            </div>
                        )}
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
            <div className="bg-[#0F0F23] border border-red-500/50 rounded-xl p-0 w-full max-w-3xl overflow-hidden shadow-2xl">
                <div className="p-4 bg-red-950/50 border-b border-red-500/30 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-red-200 flex items-center gap-2"><span>🚀</span> Permanent RLS Fix</h3>
                    <button onClick={() => setShowSqlModal(false)} className="text-red-300 hover:text-white">&times;</button>
                </div>
                <div className="p-6">
                    <p className="text-xs text-amber-200/80 mb-4">This script creates a helper table for roles to permanently break the database recursion loop. <strong className="text-amber-100">Run this entire script in your Supabase SQL Editor.</strong></p>
                    <div className="relative group">
                        <pre className="bg-[#050510] p-4 rounded-lg border border-gray-800 text-[10px] text-green-400 font-mono overflow-auto max-h-64 custom-scrollbar shadow-inner">
                            {PERMANENT_RLS_FIX_SQL}
                        </pre>
                        <button onClick={() => { navigator.clipboard.writeText(PERMANENT_RLS_FIX_SQL); alert("SQL Copied! Run this in your Supabase SQL editor to permanently fix the timeout issue."); }} className="absolute top-2 right-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">Copy SQL</button>
                    </div>
                    <p className="mt-4 text-xs text-gray-500 text-center">This is the recommended and definitive solution to the "Cosmic Timeout" error.</p>
                </div>
            </div>
        </Modal>
    </div>
  );
};

export default AdminConfig;
