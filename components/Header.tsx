
import React, { useState, useMemo, useEffect } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeSwitcher from './ThemeSwitcher';
import MasterToolsModal from './MasterToolsModal';
import { useDb } from '../hooks/useDb';
import { cloudManager } from '../services/cloudManager';
import OptimizedImage from './shared/OptimizedImage';

interface HeaderProps {
  onLogout: () => void;
  isMobile?: boolean;
}

const DEFAULT_LOGO = 'https://lh3.googleusercontent.com/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO';

const Header: React.FC<HeaderProps> = ({ onLogout, isMobile }) => {
  const { t } = useTranslation();
  const { isAdminVerified, isAdminLoading, user, refreshUser } = useAuth();
  const { db } = useDb();
  const [isMasterToolsOpen, setIsMasterToolsOpen] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);

  // Listen for low-level diagnostic errors from dbService
  useEffect(() => {
      const handleSecurityAlert = (e: any) => {
          setSecurityError(e.detail.message);
      };
      window.addEventListener('glyph_security_alert', handleSecurityAlert);
      return () => window.removeEventListener('glyph_security_alert', handleSecurityAlert);
  }, []);

  const logoUrl = useMemo(() => {
    const logoAsset = db.image_assets?.find((a: any) => a.tags?.includes('brand_logo') && a.status === 'active') ||
                      db.image_assets?.find((a: any) => a.id === 'header_logo');
    return logoAsset ? cloudManager.resolveImage(logoAsset.path) : DEFAULT_LOGO;
  }, [db.image_assets]);

  const handleFixSecurity = () => {
      const sql = `GRANT USAGE ON SCHEMA public TO anon, authenticated;\nGRANT EXECUTE ON FUNCTION public.check_is_admin() TO anon, authenticated;\nALTER FUNCTION public.check_is_admin() SECURITY DEFINER;`;
      navigator.clipboard.writeText(sql);
      alert(`🛡️ SECURITY REPAIR INITIATED\n\nError: 403 Permission Denied.\nThe app cannot verify your admin status because Supabase is blocking the RPC call.\n\nI have copied the REPAIR SQL to your clipboard. Run it in your Supabase SQL Editor to fix this.`);
  };

  return (
    <header className="bg-skin-surface/95 backdrop-blur-xl shadow-2xl sticky top-0 z-50 border-b border-skin-border/20 transition-all duration-500">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center gap-2">
        <div className="flex items-center gap-3 overflow-hidden min-w-0">
            <Link to="/home" className="cursor-pointer flex-shrink-0 group flex items-center gap-2 md:gap-3 min-w-0">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-skin-accent/30 overflow-hidden shadow-lg group-hover:scale-110 group-hover:border-skin-accent/60 transition-all duration-500 flex-shrink-0 bg-black flex items-center justify-center">
                    <OptimizedImage src={logoUrl} alt="Logo" className="w-full h-full object-contain" showSkeleton={false} />
                </div>
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-skin-accent tracking-widest font-cinzel group-hover:brightness-125 transition-all truncate drop-shadow-sm uppercase">
                  {t('glyphCircle')}
                </h1>
            </Link>
        </div>
        <div className="flex items-center gap-2 md:gap-4 justify-end flex-shrink-0 relative">
            
            {/* 🛡️ MASTER TOOLS GEAR - SMART VISIBILITY */}
            <div className="relative">
                {isAdminLoading ? (
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/30 animate-pulse" title="Verifying Clearance...">
                        <span className="text-[10px] text-blue-400">🛡️</span>
                    </div>
                ) : securityError ? (
                    <button 
                        onClick={handleFixSecurity}
                        className="flex items-center justify-center w-9 h-9 rounded-full bg-red-900/40 border border-red-500 text-red-500 animate-bounce shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                        title="Permission Error (403): Click to get fix script"
                    >
                        <span className="text-xs font-bold">!</span>
                    </button>
                ) : isAdminVerified ? (
                    <button 
                        onClick={() => setIsMasterToolsOpen(true)}
                        className="flex items-center justify-center w-9 h-9 rounded-full bg-skin-base/50 border border-amber-500/50 text-skin-accent hover:border-skin-accent hover:bg-skin-accent/10 transition-all transform hover:scale-105 group shadow-lg shadow-amber-500/20"
                        title="Master Tools"
                    >
                        <span className="text-lg group-hover:rotate-90 transition-transform duration-500">⚙️</span>
                    </button>
                ) : null}
            </div>

            <ThemeSwitcher />
            <div className="hidden sm:block"><LanguageSwitcher /></div>
            <button onClick={onLogout} className="bg-skin-accent hover:opacity-90 border border-white/10 text-skin-button-text font-bold rounded-full transition duration-300 ease-in-out transform hover:scale-105 whitespace-nowrap shadow-xl uppercase font-cinzel tracking-wider py-2 px-6 text-xs">{t('logout')}</button>
            
            {isAdminVerified && <MasterToolsModal isVisible={isMasterToolsOpen} onClose={() => setIsMasterToolsOpen(false)} />}
        </div>
      </div>
    </header>
  );
};

export default Header;
