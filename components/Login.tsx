import React, { useState, useEffect, useMemo } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDb } from '../hooks/useDb';
import { useTranslation } from '../hooks/useTranslation';
import GoogleAuth from './GoogleAuth';
import { cloudManager } from '../services/cloudManager';
import { biometricService } from '../services/biometricService';

interface LoginProps {
    onLoginSuccess?: (username: string) => void;
}

const DEFAULT_BRAND_LOGO = 'https://lh3.googleusercontent.com/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO';

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [bioError, setBioError] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, sendMagicLink, loginWithBiometrics, error: authError } = useAuth();
  const { db } = useDb();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Resolve brand logo from DB explicitly
  const brandLogo = useMemo(() => {
    const asset = db.image_assets?.find((a: any) => a.id === 'sacred_emblem' || a.tags?.includes('brand_logo'));
    return asset ? cloudManager.resolveImage(asset.path) : DEFAULT_BRAND_LOGO;
  }, [db.image_assets]);

  const adminAccessCode = db.config?.find((c: any) => c.key === 'admin_access_code')?.value || 'admin@admin';

  useEffect(() => {
      if (location.hash) {
          const params = new URLSearchParams(location.hash.substring(1));
          const errorMsg = params.get('error_description');
          if (errorMsg) {
              if (errorMsg.includes('otp_expired')) {
                  setUrlError("This verification link has expired or was already used. Please request a new one.");
              } else {
                  setUrlError(errorMsg.replace(/\+/g, ' '));
              }
          }
      }

      const isRegistered = localStorage.getItem('glyph_bio_registered') === 'true';
      if (isRegistered) {
          biometricService.isAvailable().then(avail => setHasBiometrics(avail));
      }
  }, [location]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setEmail(val);
      if (val === adminAccessCode) {
          navigate('/master-login');
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg(null);
    setUrlError(null);
    
    try {
        if (useMagicLink) {
            await sendMagicLink(email);
            setSuccessMsg("A mystical link has been sent to your email. Click it to enter the circle instantly.");
            if (navigator.vibrate) navigator.vibrate(50);
        } else {
            await login(email, password);
            localStorage.setItem('glyph_last_email', email);
            if (onLoginSuccess) onLoginSuccess(email);
            navigate('/home');
        }
    } catch (err) {
        console.error("Auth Failed", err);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleBiometricLogin = async () => {
      setBioError('');
      try {
          const success = await loginWithBiometrics();
          if (success) {
              navigate('/home');
          } else {
              setBioError("Biometric verification failed or expired.");
          }
      } catch (e: any) {
          setBioError(e.message || "Face/Touch ID not recognized.");
      }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
      <div className="w-full max-w-md bg-skin-surface border border-skin-border rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl animate-fade-in-up">
        <div className="p-8">
          <div className="text-center mb-8">
             {/* 🎯 PERFECT CENTER LOGO 🎯 */}
             <div className="mx-auto w-28 h-28 md:w-36 md:h-36 mb-6 rounded-full p-1 bg-gradient-to-tr from-skin-accent to-purple-600 shadow-xl animate-float-gentle flex items-center justify-center overflow-hidden bg-black border-2 border-skin-accent/30 relative">
                 <div className="absolute inset-0 flex items-center justify-center">
                    <img 
                        src={brandLogo} 
                        alt="Glyph Circle Logo" 
                        className="w-[85%] h-[85%] object-contain block m-auto transition-transform hover:scale-110 duration-700" 
                        referrerPolicy="no-referrer"
                    />
                 </div>
                 {/* Decorative spinning ring */}
                 <div className="absolute inset-[-5px] border border-white/5 rounded-full animate-[spin_12s_linear_infinite]"></div>
             </div>
             <h1 className="text-3xl font-cinzel font-bold text-skin-accent tracking-widest mb-1 uppercase drop-shadow-md">GlyphCircle</h1>
             <p className="text-skin-text/60 font-lora italic text-sm">Enter the Circle of Wisdom</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-skin-accent font-cinzel font-bold text-[10px] mb-1.5 uppercase tracking-[0.2em]">Email Address</label>
                <input 
                    autoFocus
                    type="email" 
                    value={email} 
                    onChange={handleEmailChange} 
                    className="w-full p-3.5 bg-black/40 border border-skin-border/50 rounded-xl text-skin-text focus:outline-none focus:border-skin-accent transition-all placeholder-skin-text/20" 
                    placeholder="seeker@glyph.circle" 
                    required 
                />
            </div>
            
            {!useMagicLink && (
                <div className="animate-fade-in-up">
                    <label className="block text-skin-accent font-cinzel font-bold text-[10px] mb-1.5 uppercase tracking-[0.2em]">Passphrase</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="w-full p-3.5 bg-black/40 border border-skin-border/50 rounded-xl text-skin-text focus:outline-none focus:border-skin-accent transition-all placeholder-skin-text/20" 
                        placeholder="••••••••" 
                        required 
                    />
                </div>
            )}

            <div className="flex justify-center">
                <button 
                    type="button"
                    onClick={() => { setUseMagicLink(!useMagicLink); setSuccessMsg(null); }}
                    className="text-[10px] text-skin-accent/60 hover:text-skin-accent uppercase font-bold tracking-widest transition-colors"
                >
                    {useMagicLink ? "Wait, I have a password" : "Send me a Magic Link instead"}
                </button>
            </div>
            
            {successMsg && (
                <div className="bg-green-900/20 border border-green-500/50 p-3 rounded-lg text-green-400 text-xs text-center animate-fade-in-up">
                    {successMsg}
                </div>
            )}

            {(authError || urlError) && (
                <div className="bg-red-900/20 border border-red-500/50 p-3 rounded-lg text-red-400 text-xs text-center animate-shake">
                    {urlError || authError}
                </div>
            )}

            <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-skin-accent to-amber-700 hover:brightness-110 text-skin-button-text font-bold py-4 rounded-xl shadow-lg font-cinzel tracking-widest text-sm border border-white/10 transition-all transform active:scale-95 disabled:opacity-50"
            >
                {isSubmitting ? 'CHALICE FILLING...' : (useMagicLink ? 'SEND MAGIC LINK' : 'ENTER THE CIRCLE')}
            </button>
          </form>

          <div className="mt-8">
              <div className="relative flex items-center justify-center mb-8">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-skin-border/20"></div></div>
                  <div className="relative bg-skin-surface px-4"><span className="text-skin-text/30 font-lora text-[10px] uppercase tracking-widest">{t('orContinueWith')}</span></div>
              </div>
              <GoogleAuth />
          </div>

          {hasBiometrics && (
              <div className="mt-6 flex flex-col items-center">
                  <button 
                    onClick={handleBiometricLogin}
                    className="flex items-center gap-3 px-5 py-2.5 bg-black/40 border border-purple-500/30 rounded-xl text-purple-200 hover:bg-purple-900/20 hover:border-purple-400 transition-all group"
                  >
                      <span className="text-lg group-hover:scale-110 transition-transform">👆</span>
                      <span className="font-bold text-xs uppercase tracking-widest">Face / Touch ID</span>
                  </button>
                  {bioError && <p className="text-red-400 text-[10px] mt-2">{bioError}</p>}
              </div>
          )}

          <div className="mt-10 text-center">
            <p className="text-skin-text/40 text-xs font-lora">
              New Seeker? {' '}
              <button
                onClick={() => navigate('/register')}
                className="text-skin-accent hover:underline font-bold transition-colors font-cinzel tracking-tight cursor-pointer"
              >
                Create Profile
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;