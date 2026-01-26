
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { dbService } from '../services/db';

const MasterLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const addLog = (msg: string) => setLogs(p => [`> ${msg}`, ...p]);

  // Check if we are in a development environment to enable test features
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('stackblitz');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLogs([]);
    
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    addLog(`🔒 Authenticating: ${cleanEmail}`);

    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
            email: cleanEmail, 
            password: cleanPass 
        });
        
        if (authError) {
            addLog(`❌ Auth Failed: ${authError.message}`);
            setIsLoading(false);
            return;
        }

        if (authData.user) {
            addLog("✅ Identity Verified. Performing Sovereign Handshake...");
            
            // 🛡️ RECURSION-SAFE VERIFICATION
            const isAdmin = await dbService.checkIsAdmin();

            if (isAdmin) {
                addLog("🚀 Sovereign Clearance Verified. Access Granted.");
                localStorage.setItem('glyph_admin_session', JSON.stringify({
                    user: cleanEmail,
                    role: 'admin',
                    method: 'Sovereign RPC'
                }));
                
                await refreshUser(); 
                addLog("⏳ Redirecting to Sanctum...");
                setTimeout(() => navigate('/admin/dashboard'), 800);
            } else {
                addLog("❌ Sovereign Denied: User role must be explicitly promoted in DB.");
                addLog("💡 Tip: Use the 'Bypass Verification' button below for local testing.");
                await supabase.auth.signOut();
            }
        }
    } catch (err: any) {
        addLog(`❌ System Error: ${err.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleBypass = async () => {
      addLog("🛠️ DEVELOPER OVERRIDE: Bypassing Sovereign Check...");
      localStorage.setItem('glyph_admin_session', JSON.stringify({
          user: 'developer@test.local',
          role: 'admin',
          method: 'Local Bypass'
      }));
      // We force theverified state in the context manually for this session
      window.dispatchEvent(new CustomEvent('glyph_dev_bypass_admin'));
      navigate('/admin/dashboard');
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setLogs([]);
      
      addLog(`✨ Initializing genesis for: ${email}`);

      try {
          const { error } = await supabase.auth.signUp({
              email: email.trim(),
              password: password.trim(),
              options: { data: { full_name: 'Master Admin' } }
          });

          if (error) throw error;

          addLog("✅ Identity Created in Auth.");
          addLog("💡 NEXT: Run SQL V28 in Supabase to authorize.");
          setShowSetupGuide(true);
      } catch (err: any) {
          addLog(`❌ Creation Failed: ${err.message}`);
      } finally {
          setIsLoading(false);
      }
  };

  const PROMOTION_SQL = `-- 🔱 PROTOCOL V28: RECURSION KILLER
-- Run this in your Supabase SQL Editor.

-- 1. Create isolated schema
CREATE SCHEMA IF NOT EXISTS private;

-- 2. Create the Roles Table
CREATE TABLE IF NOT EXISTS private.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'seeker'
);

-- 3. Register your Admin account
INSERT INTO private.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = '${email || 'admin@glyphcircle.com'}'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- 4. Create the Sovereign Logic
CREATE OR REPLACE FUNCTION private._is_admin_direct(uid uuid) 
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = private AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = uid AND role = 'admin');
$$;

-- 5. Create Public Gateway
CREATE OR REPLACE FUNCTION public.check_is_admin() 
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
BEGIN RETURN private._is_admin_direct(auth.uid()); END;
$$;

GRANT EXECUTE ON FUNCTION public.check_is_admin() TO anon, authenticated;`;

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-4 flex flex-col items-center justify-center select-none">
      <div className="w-full max-w-lg border-2 border-green-700 bg-gray-900/50 p-6 shadow-[0_0_50px_rgba(0,255,0,0.1)] relative overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 left-0 w-full h-1 bg-green-500/30 animate-[scan_3s_linear_infinite] z-10"></div>

        <div className="relative z-20">
            <h1 className="text-2xl font-bold mb-6 text-center border-b border-green-900 pb-2">
               🛡️ ADMIN BYPASS PORTAL
            </h1>

            <div className="flex mb-6 border border-green-800 rounded overflow-hidden">
                <button onClick={() => setIsLoginMode(true)} className={`flex-1 py-2 text-xs font-bold uppercase ${isLoginMode ? 'bg-green-900 text-black' : 'hover:bg-green-900/20'}`}>Login</button>
                <button onClick={() => setIsLoginMode(false)} className={`flex-1 py-2 text-xs font-bold uppercase ${!isLoginMode ? 'bg-green-900 text-black' : 'hover:bg-green-900/20'}`}>Register</button>
            </div>

            <form onSubmit={isLoginMode ? handleLogin : handleCreateAdmin} className="space-y-4">
                <div>
                    <label className="block text-[10px] uppercase text-green-700 mb-1">Entity ID (Email)</label>
                    <input className="w-full bg-black border border-green-800 p-3 text-green-400 focus:border-green-400 outline-none" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@glyphcircle.com" />
                </div>
                <div>
                    <label className="block text-[10px] uppercase text-green-700 mb-1">Passphrase</label>
                    <input type="password" className="w-full bg-black border border-green-800 p-3 text-green-400 focus:border-green-400 outline-none" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                
                <button type="submit" disabled={isLoading} className="w-full bg-green-900 hover:bg-green-800 text-green-100 font-bold py-3 uppercase tracking-widest border border-green-700 disabled:opacity-50">
                    {isLoading ? "EXECUTING..." : "ENTER SANCTUM"}
                </button>
            </form>

            <div className="mt-4 grid grid-cols-2 gap-3">
                {isDev && (
                    <button 
                        onClick={handleBypass}
                        className="py-2 bg-blue-900/40 border border-blue-500/50 text-blue-400 text-[9px] font-bold uppercase rounded hover:bg-blue-900/60 transition-all"
                    >
                        Bypass Verification (Test Only)
                    </button>
                )}
                <button 
                    onClick={() => { addLog("🔍 Checking RPC Status..."); dbService.checkIsAdmin().then(res => addLog(res ? "✅ RPC ONLINE" : "❌ RPC OFFLINE")); }}
                    className="py-2 bg-gray-800 border border-gray-600 text-gray-400 text-[9px] font-bold uppercase rounded hover:bg-gray-700 transition-all"
                >
                    Diagnose Connection
                </button>
            </div>

            <div className="mt-6 bg-black border border-gray-800 p-3 h-32 overflow-y-auto text-[10px] font-mono shadow-inner custom-scrollbar">
                {logs.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
            </div>

            <div className="mt-6 text-center">
                <button onClick={() => setShowSetupGuide(!showSetupGuide)} className="text-[10px] text-green-700 underline uppercase">
                    {showSetupGuide ? "Hide Setup Script" : "Show Setup Script (Protocol V28)"}
                </button>
                {showSetupGuide && (
                    <div className="mt-4 text-left animate-fade-in-up">
                        <pre className="text-[9px] text-amber-500 bg-gray-900 p-3 rounded border border-amber-900/30 overflow-x-auto whitespace-pre-wrap">
                            {PROMOTION_SQL}
                        </pre>
                        <button onClick={() => { navigator.clipboard.writeText(PROMOTION_SQL); alert("SQL Copied!"); }} className="mt-2 w-full py-1 bg-amber-900/20 text-amber-500 border border-amber-500/30 text-[10px] font-bold rounded">COPY SCRIPT</button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default MasterLogin;
