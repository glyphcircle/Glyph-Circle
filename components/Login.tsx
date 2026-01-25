
import React, { useState, useEffect, useMemo } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDb } from '../hooks/useDb';
import { useTranslation } from '../hooks/useTranslation';
import GoogleAuth from './GoogleAuth';
import { cloudManager } from '../services/cloudManager';
import { biometricService } from '../services/biometricService';
import Modal from './shared/Modal';

interface LoginProps {
    onLoginSuccess?: (username: string) => void;
}

const DEFAULT_BRAND_LOGO = 'https://lh3.googleusercontent.com/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO';

const ATOMIC_FIX_V25 = `-- 🔱 SANCTUM V25: ATOMIC REPAIR (RLS BYPASS & RECURSION BREAKER)
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

COMMIT;`;

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFixModal, setShowFixModal] = useState(false);
  
  const { login, sendMagicLink, error: authError } = useAuth();
  const { db, errorMessage: dbError } = useDb();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const brandLogo = useMemo(() => {
    const asset = db.image_assets?.find((a: any) => a.id === 'sacred_emblem' || a.tags?.includes('brand_logo'));
    return asset ? cloudManager.resolveImage(asset.path) : DEFAULT_BRAND_LOGO;
  }, [db.image_assets]);

  useEffect(() => {
      if (location.hash) {
          const params = new URLSearchParams(location.hash.substring(1));
          const errorMsg = params.get('error_description');
          if (errorMsg) {
              setUrlError(errorMsg.includes('otp_expired') ? "Link expired." : errorMsg.replace(/\+/g, ' '));
          }
      }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setUrlError(null);
    try {
        if (useMagicLink) {
            await sendMagicLink(email);
            alert("Magic Link Sent!");
        } else {
            await login(email, password);
            navigate('/home');
        }
    } catch (err) {
        console.error("Auth Failed", err);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 pb-12">
      <div className="w-full max-w-md bg-skin-surface border border-skin-border rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl animate-fade-in-up">
        <div className="p-8">
          <div className="text-center mb-8">
             <div className="mx-auto w-28 h-28 md:w-36 md:h-36 mb-6 rounded-full p-1 bg-gradient-to-tr from-skin-accent to-purple-600 shadow-xl animate-float-gentle flex items-center justify-center overflow-hidden bg-black border-2 border-skin-accent/30 relative">
                <img src={brandLogo} alt="Logo" className="w-[85%] h-[85%] object-contain" />
             </div>
             <h1 className="text-3xl font-cinzel font-bold text-skin-accent tracking-widest mb-1 uppercase">GlyphCircle</h1>
             <p className="text-skin-text/60 font-lora italic text-sm">Enter the Circle of Wisdom</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-skin-accent font-cinzel font-bold text-[10px] mb-1.5 uppercase tracking-[0.2em]">Email Address</label>
                <input 
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)} 
                    className="w-full p-3.5 bg-black/40 border border-skin-border/50 rounded-xl text-skin-text outline-none focus:border-skin-accent transition-all" 
                    placeholder="seeker@glyph.circle" required 
                />
            </div>
            
            {!useMagicLink && (
                <div className="animate-fade-in-up">
                    <label className="block text-skin-accent font-cinzel font-bold text-[10px] mb-1.5 uppercase tracking-[0.2em]">Passphrase</label>
                    <input 
                        type="password" value={password} onChange={(e) => setPassword(e.target.value)} 
                        className="w-full p-3.5 bg-black/40 border border-skin-border/50 rounded-xl text-skin-text outline-none focus:border-skin-accent transition-all" 
                        placeholder="••••••••" required 
                    />
                </div>
            )}

            {(authError || urlError || dbError?.includes('Timeout')) && (
                <div className="bg-red-900/30 border-2 border-red-500/50 p-4 rounded-xl text-red-100 text-xs text-center animate-shake space-y-2">
                    <p className="font-bold uppercase tracking-widest text-[10px]">⚠️ Cosmic Disruption Detected</p>
                    <p className="opacity-80 italic">{urlError || authError || "The database is stuck in a loop. Run the Atomic Fix below."}</p>
                    {dbError?.includes('Timeout') && (
                        <button 
                            type="button"
                            onClick={() => setShowFixModal(true)}
                            className="bg-red-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter mt-1"
                        >
                            Open Repair Kit
                        </button>
                    )}
                </div>
            )}

            <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-skin-accent to-amber-700 hover:brightness-110 text-skin-button-text font-bold py-4 rounded-xl shadow-lg font-cinzel tracking-widest text-sm border border-white/10 transition-all transform active:scale-95 disabled:opacity-50">
                {isSubmitting ? 'CHALICE FILLING...' : (useMagicLink ? 'SEND MAGIC LINK' : 'ENTER THE CIRCLE')}
            </button>
            
            <div className="text-center pt-2">
                <button type="button" onClick={() => setUseMagicLink(!useMagicLink)} className="text-[10px] text-skin-accent/60 hover:text-skin-accent uppercase font-bold tracking-widest">
                    {useMagicLink ? "I have a password" : "Use Magic Link"}
                </button>
            </div>
          </form>

          <div className="mt-8 border-t border-skin-border/20 pt-8">
              <GoogleAuth />
          </div>

          <div className="mt-10 text-center">
            <p className="text-skin-text/40 text-xs font-lora">
              New Seeker? <button onClick={() => navigate('/register')} className="text-skin-accent hover:underline font-bold font-cinzel cursor-pointer">Create Profile</button>
            </p>
          </div>
        </div>
      </div>

      {/* 🛠️ NUCLEAR REPAIR BUTTON 🛠️ */}
      <div className="mt-8 flex flex-col items-center gap-4">
        <button 
            onClick={() => setShowFixModal(true)}
            className="px-8 py-3 bg-indigo-900/30 hover:bg-indigo-900/50 border-2 border-indigo-500/30 text-indigo-200 text-[10px] font-black uppercase tracking-[0.4em] rounded-full transition-all flex items-center gap-3 shadow-2xl animate-pulse"
        >
            <span className="text-lg">🛡️</span>
            Atomic Repair (V25 SQL)
        </button>
        <p className="text-[9px] text-gray-600 uppercase tracking-widest text-center max-w-xs leading-relaxed font-bold">
            Required if seeing "Database Latency Timeout" or stuck at login.
        </p>
      </div>

      {/* REPAIR MODAL */}
      <Modal isVisible={showFixModal} onClose={() => setShowFixModal(false)}>
        <div className="p-8 bg-[#0b0c15] border-2 border-amber-500/40 rounded-2xl max-w-2xl w-full shadow-[0_0_100px_rgba(0,0,0,0.8)]">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-2xl font-black text-amber-100 font-cinzel tracking-widest uppercase">Atomic Repair Protocol</h3>
                    <p className="text-[10px] text-amber-500/60 uppercase font-mono mt-1 tracking-widest">Protocol V25 • Loop Breaker</p>
                </div>
                <button onClick={() => setShowFixModal(false)} className="text-gray-500 hover:text-white text-3xl transition-colors">&times;</button>
            </div>

            <div className="bg-amber-900/10 p-5 rounded-xl mb-6 border border-amber-500/20">
                <p className="text-xs text-amber-100/80 leading-relaxed italic">
                    <strong>Warning:</strong> This script disables security checks on UI tables (services, assets) to bypass the Postgres recursion hang. It resets the identity claim layer.
                </p>
            </div>

            <div className="relative group">
                <pre className="bg-black/80 p-5 rounded-xl border border-gray-800 text-[10px] text-indigo-400 font-mono overflow-auto max-h-[350px] select-all custom-scrollbar leading-relaxed">
                    {ATOMIC_FIX_V25}
                </pre>
                <button 
                    onClick={() => { navigator.clipboard.writeText(ATOMIC_FIX_V25); alert("Atomic Fix V25 Copied! Run it in Supabase SQL Editor."); }}
                    className="absolute top-4 right-4 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95"
                >
                    Copy Scribe
                </button>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                <p className="text-[10px] text-gray-500 text-center uppercase tracking-widest">
                    1. Copy Code &rarr; 2. Run in Supabase SQL Editor &rarr; 3. Log In
                </p>
                <button 
                    onClick={() => setShowFixModal(false)}
                    className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-black uppercase tracking-[0.3em] border border-gray-700 transition-all"
                >
                    I have run the protocol
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default Login;
