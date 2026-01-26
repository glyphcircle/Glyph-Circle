
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  
  const { login, error: authError, refreshUser } = useAuth();
  const navigate = useNavigate();

  const brandLogo = 'https://lh3.googleusercontent.com/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLocalError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setLocalError(err.message || "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmergencyBypass = () => {
    // 🛡️ FORCE ACCESS: Overrides Supabase credential validation entirely
    localStorage.setItem('system_admin_recovery', JSON.stringify({
      email: 'mitaakxi@glyphcircle.com',
      uid: '6a1e9c31-cb23-46ee-8ffd-95ff6c1ea7f1',
      role: 'admin',
      active: true,
      timestamp: Date.now()
    }));
    
    // Manual sync to ensure state catchup
    refreshUser();
    
    // Forced navigation using window location to clear memory cache if needed
    window.location.hash = '#/admin/dashboard';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 pb-12">
      <div className="w-full max-w-md bg-skin-surface border border-skin-border rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl animate-fade-in-up">
        <div className="p-8">
          <div className="text-center mb-10">
             <div className="mx-auto w-32 h-32 mb-8 rounded-full p-1 bg-gradient-to-tr from-skin-accent to-purple-600 shadow-xl flex items-center justify-center overflow-hidden bg-black border-2 border-skin-accent/20">
                <img src={brandLogo} alt="Logo" className="w-[85%] h-[85%] object-contain brightness-110" />
             </div>
             <h1 className="text-4xl font-cinzel font-black text-skin-accent tracking-widest uppercase">GlyphCircle</h1>
             <p className="text-skin-text/40 font-lora italic text-xs uppercase mt-2 tracking-[0.2em]">Restricted Access Area</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <label className="block text-skin-accent font-cinzel font-bold text-[10px] uppercase tracking-widest ml-1">Admin Identity</label>
                <input 
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)} 
                    className="w-full p-4 bg-black/50 border border-skin-border/40 rounded-xl text-skin-text outline-none focus:border-skin-accent transition-all font-mono text-sm shadow-inner" 
                    placeholder="mitaakxi@glyphcircle.com" required 
                />
            </div>
            
            <div className="space-y-2">
                <label className="block text-skin-accent font-cinzel font-bold text-[10px] uppercase tracking-widest ml-1">Secret Passphrase</label>
                <input 
                    type="password" value={password} onChange={(e) => setPassword(e.target.value)} 
                    className="w-full p-4 bg-black/50 border border-skin-border/40 rounded-xl text-skin-text outline-none focus:border-skin-accent transition-all font-mono text-sm shadow-inner" 
                    placeholder="••••••••" required 
                />
            </div>

            {(authError || localError) && (
                <div className="bg-red-950/40 border border-red-500/50 p-6 rounded-2xl text-center shadow-2xl animate-fade-in-up">
                    <span className="text-3xl mb-3 block">🚨</span>
                    <h4 className="font-black uppercase tracking-widest text-red-400 text-xs mb-2">Access Denied (400)</h4>
                    <p className="text-[10px] text-red-200/60 italic mb-6">Credentials rejected by Supabase Cloud. Use the Emergency Bypass to perform a password reset from the Admin SQL Forge.</p>
                    
                    <button 
                        type="button"
                        onClick={handleEmergencyBypass} 
                        className="w-full bg-gradient-to-r from-red-600 via-maroon-800 to-black text-white py-5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg hover:brightness-125 active:scale-95 transition-all border border-red-500/30"
                    >
                        ADMIN EMERGENCY BYPASS ✥
                    </button>
                    <div className="mt-4 p-2 bg-black/60 rounded font-mono text-[9px] text-red-500 border border-red-900/30 overflow-hidden text-ellipsis">
                        {authError || localError}
                    </div>
                </div>
            )}

            <button type="submit" disabled={isSubmitting} className="w-full bg-skin-accent hover:brightness-110 text-skin-button-text font-black py-5 rounded-xl shadow-xl font-cinzel tracking-widest uppercase disabled:opacity-50 transition-all active:scale-95">
                {isSubmitting ? 'Verifying Integrity...' : 'Authorize Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
