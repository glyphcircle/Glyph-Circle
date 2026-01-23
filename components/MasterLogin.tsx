
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';

const MasterLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [suggestCreation, setSuggestCreation] = useState(false);
  
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const addLog = (msg: string) => setLogs(p => [`> ${msg}`, ...p]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLogs([]);
    setSuggestCreation(false);
    
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    addLog(`🔒 Authenticating: ${cleanEmail}`);

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ 
            email: cleanEmail, 
            password: cleanPass 
        });
        
        if (error) {
            if (error.message.includes("Email not confirmed")) {
                addLog("🚫 BLOCKED: Email not confirmed.");
                addLog("💡 ACTION: Run the SQL below to force verify.");
                setShowSetupGuide(true);
            } else if (error.message.includes("Invalid login credentials")) {
                addLog("❌ Access Denied: Credentials Invalid.");
                addLog("❓ Identity may not exist.");
                setSuggestCreation(true);
            } else {
                addLog(`❌ Auth Failed: ${error.message}`);
            }
            setIsLoading(false);
            return;
        }

        if (data.user) {
            addLog("✅ Identity Verified. Checking Clearance...");
            
            // Fetch profile to check role
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('role')
                .eq('id', data.user.id)
                .single();

            // Definition of emails allowed to auto-promote via this portal
            const isAuthorizedEmail = 
                cleanEmail.includes('admin') || 
                cleanEmail.includes('master') || 
                cleanEmail.includes('glyphcircle.com');

            if (profileError) {
                addLog("⚠️ Profile Missing. Attempting Auto-Fix...");
                if (isAuthorizedEmail) {
                     await supabase.from('users').upsert({
                         id: data.user.id,
                         email: cleanEmail,
                         name: 'Master Admin',
                         role: 'admin',
                         credits: 99999
                     });
                     addLog("✅ Profile Auto-Created & Promoted.");
                     loginSuccess(cleanEmail);
                } else {
                     addLog("❌ Access Denied: No Profile.");
                     await supabase.auth.signOut();
                }
            } else if (profile.role !== 'admin') {
                addLog(`⚠️ Role mismatch detected: '${profile.role}'`);
                
                if (isAuthorizedEmail) {
                    addLog("⚡ Attempting Force Promotion...");
                    const { error: updateError } = await supabase
                        .from('users')
                        .update({ role: 'admin', credits: 99999 })
                        .eq('id', data.user.id);
                    
                    if (updateError) {
                        addLog(`❌ Promotion Failed: ${updateError.message}`);
                        addLog("💡 TIP: Check RLS policies or use SQL Guide.");
                        setShowSetupGuide(true);
                        await supabase.auth.signOut();
                    } else {
                        addLog("👑 Role Elevated to Admin.");
                        loginSuccess(cleanEmail);
                    }
                } else {
                    addLog("⛔ PERMISSION DENIED: Not an authorized admin email.");
                    await supabase.auth.signOut();
                }
            } else {
                loginSuccess(cleanEmail);
            }
        }
    } catch (err: any) {
        addLog(`❌ System Error: ${err.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  const loginSuccess = async (userEmail: string) => {
      addLog("🚀 Access Granted.");
      localStorage.setItem('glyph_admin_session', JSON.stringify({
          user: userEmail,
          role: 'admin',
          method: 'Master Auth'
      }));
      
      // Fire and forget refresh to not block UI
      refreshUser(); 
      
      addLog("⏳ Redirecting...");
      setTimeout(() => navigate('/admin/dashboard'), 500);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setLogs([]);
      
      const cleanEmail = email.trim();
      const cleanPass = password.trim();

      addLog(`✨ Initializing New Admin Entity: ${cleanEmail}`);

      try {
          // 1. Try to Create Auth User
          let userId = null;
          let hasSession = false;

          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: cleanEmail,
              password: cleanPass,
              options: { data: { full_name: 'Master Admin' } }
          });

          if (signUpError) {
              // If user exists, try to treat as login attempt for admin promotion
              if (signUpError.message.includes('already registered') || signUpError.status === 400) {
                  addLog("⚠️ User exists in auth system.");
                  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                      email: cleanEmail,
                      password: cleanPass
                  });
                  
                  if (signInError) {
                      if (signInError.message.includes('Email not confirmed')) {
                          addLog("🚫 BLOCKED: Identity is unconfirmed.");
                          addLog("💡 SOLUTION: Run 'Force Verify' SQL below.");
                          setShowSetupGuide(true);
                          setIsLoading(false);
                          return;
                      }
                      throw signInError;
                  }
                  userId = signInData.user?.id;
                  hasSession = true;
                  addLog("✅ Identity confirmed via existing credentials.");
              } else {
                  throw signUpError;
              }
          } else {
              userId = signUpData.user?.id;
              if (signUpData.session) {
                  hasSession = true;
                  addLog("✅ Identity Created & Verified.");
              } else {
                  addLog("⚠️ Identity created but UNCONFIRMED.");
                  addLog("💡 TIP: Profile link will likely fail with FK Error.");
                  addLog("👉 Use SQL God Mode below to bypass verification.");
                  setShowSetupGuide(true);
              }
          }

          // 2. Force Insert Admin Profile
          if (userId) {
              addLog("🛰️ Linking profile to public registry...");
              const { error: dbError } = await supabase
                  .from('users')
                  .upsert({
                      id: userId,
                      email: cleanEmail,
                      name: 'Master Admin',
                      role: 'admin',
                      credits: 99999,
                      created_at: new Date().toISOString()
                  });

              if (dbError) {
                  console.warn("Profile creation failed", dbError);
                  if (dbError.message.includes('foreign key constraint')) {
                      addLog("❌ LINK FAILED: Foreign Key Violation.");
                      addLog("👉 Reason: Auth record not committed/confirmed.");
                      addLog("👉 ACTION: Use SQL God Mode to bypass.");
                      setShowSetupGuide(true);
                  } else {
                      addLog(`⚠️ Profile creation error: ${dbError.message}`);
                  }
              } else {
                  addLog("👑 Admin Privileges Assigned.");
                  addLog("ℹ️ Account ready. Switching to Login mode...");
                  setPassword('');
                  setTimeout(() => {
                      setIsLoginMode(true);
                      setLogs(["✅ Admin Created Successfully.", "🔒 Log In to enter the Sanctum."]);
                  }, 2000);
              }
          }
      } catch (err: any) {
          addLog(`❌ Process Failed: ${err.message}`);
      } finally {
          setIsLoading(false);
      }
  };

  // SQL to bypass email verification and force admin role
  const PROMOTION_SQL = `-- ⚡ GOD MODE SQL
-- Run this in Supabase SQL Editor to bypass email verification & force admin.

-- 1. Force Confirm Email (Bypass Verification Link)
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email = '${email || 'target_email'}';

-- 2. Grant Admin Role & Credits
INSERT INTO public.users (id, email, role, credits)
SELECT id, email, 'admin', 99999
FROM auth.users
WHERE email = '${email || 'target_email'}'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', credits = 99999;`;

  return (
    <div className="min-h-screen bg-black text-green-500 font-mono p-4 flex flex-col items-center justify-center select-none">
      <div className="w-full max-w-lg border-2 border-green-700 bg-gray-900/50 p-6 shadow-[0_0_50px_rgba(0,255,0,0.1)] relative overflow-hidden backdrop-blur-sm">
        
        {/* CRT Scanline Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 pointer-events-none bg-[length:100%_2px,3px_100%]"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-green-500/30 animate-[scan_3s_linear_infinite] z-10"></div>

        <div className="relative z-20">
            <h1 className="text-2xl font-bold mb-6 text-center border-b border-green-900 pb-2 flex justify-between items-center">
               <span>🛡️ SECURE ENCLAVE</span>
               <span className="text-[10px] animate-pulse">{isLoginMode ? 'AUTH_MODE' : 'GENESIS_MODE'}</span>
            </h1>

            {/* Mode Toggle */}
            <div className="flex mb-6 border border-green-800 rounded overflow-hidden">
                <button 
                    onClick={() => { setIsLoginMode(true); setLogs([]); setSuggestCreation(false); }}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${isLoginMode ? 'bg-green-900 text-black' : 'hover:bg-green-900/20'}`}
                >
                    Login
                </button>
                <button 
                    onClick={() => { setIsLoginMode(false); setLogs([]); setSuggestCreation(false); }}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${!isLoginMode ? 'bg-green-900 text-black' : 'hover:bg-green-900/20'}`}
                >
                    Create Admin
                </button>
            </div>

            <form onSubmit={isLoginMode ? handleLogin : handleCreateAdmin} className="space-y-4">
                <div>
                    <label className="block text-[10px] uppercase text-green-700 mb-1">Identity (Email)</label>
                    <input 
                        className="w-full bg-black border border-green-800 p-3 text-green-400 focus:border-green-400 outline-none"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="admin@glyphcircle.com"
                        autoComplete="off"
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label className="block text-[10px] uppercase text-green-700 mb-1">Passphrase</label>
                    <input 
                        type="password"
                        className="w-full bg-black border border-green-800 p-3 text-green-400 focus:border-green-400 outline-none"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        disabled={isLoading}
                    />
                </div>
                
                <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-green-900 hover:bg-green-800 text-green-100 font-bold py-3 uppercase tracking-widest border border-green-700 disabled:opacity-50 mt-4 shadow-[0_0_15px_rgba(0,255,0,0.2)]"
                >
                    {isLoading ? "PROCESSING..." : (isLoginMode ? "AUTHENTICATE" : "INITIALIZE NEW ADMIN")}
                </button>
            </form>

            <div className="mt-6 bg-black border border-gray-800 p-3 h-32 overflow-y-auto text-[10px] font-mono shadow-inner custom-scrollbar relative">
                {logs.length === 0 && <div className="text-gray-700 italic opacity-50">System Ready...</div>}
                {logs.map((log, i) => (
                    <div key={i} className={`mb-1 pb-1 border-b border-gray-900/50 ${log.includes('❌') || log.includes('⛔') || log.includes('🚫') ? 'text-red-400' : 'text-green-500'}`}>
                        {log}
                    </div>
                ))}
            </div>

            {suggestCreation && (
                <div className="mt-4 animate-fade-in-up">
                    <button 
                        onClick={() => { setIsLoginMode(false); setLogs([]); setSuggestCreation(false); }}
                        className="w-full py-2 bg-amber-900/40 hover:bg-amber-800/60 border border-amber-600/50 text-amber-400 text-xs font-bold uppercase tracking-widest rounded transition-colors"
                    >
                        User not found? Switch to Create
                    </button>
                </div>
            )}

            <div className="mt-6 border-t border-green-900 pt-4 text-center">
                <button 
                    onClick={() => setShowSetupGuide(!showSetupGuide)}
                    className="text-[10px] text-green-700 hover:text-green-500 underline uppercase tracking-widest"
                >
                    {showSetupGuide ? "Close SQL Guide" : "Manual SQL Setup Guide"}
                </button>
                
                {showSetupGuide && (
                    <div className="mt-4 text-left bg-black p-4 border border-green-900 rounded animate-fade-in-up">
                        <p className="text-[10px] text-gray-400 mb-2">
                            <strong>To fix linking errors (FK Violations):</strong> <br/>
                            1. Copy the SQL code below.<br/>
                            2. Go to Supabase Dashboard &gt; SQL Editor.<br/>
                            3. Run the query.
                        </p>
                        <div className="relative group">
                            <pre className="text-[9px] text-amber-500 bg-gray-900 p-3 rounded border border-amber-900/30 overflow-x-auto whitespace-pre-wrap">
                                {PROMOTION_SQL}
                            </pre>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(PROMOTION_SQL);
                                    alert("Query Copied! Paste into Supabase SQL Editor.");
                                }}
                                className="absolute top-2 right-2 bg-green-900 text-[8px] px-2 py-1 rounded opacity-50 group-hover:opacity-100 transition-opacity"
                            >
                                COPY
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
      
      <button 
        onClick={() => navigate('/login')}
        className="mt-8 text-gray-600 hover:text-green-500 text-xs uppercase font-bold tracking-[0.2em] transition-colors"
      >
          &larr; Return to Public Access
      </button>
    </div>
  );
};

export default MasterLogin;
