
import React, { useState, useMemo } from 'react';
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

  // Determine if we should even consider showing admin tools
  const isPotentialAdmin = user?.role === 'admin' || localStorage.getItem('glyph_admin_session');

  const logoUrl = useMemo(() => {
    const logoAsset = db.image_assets?.find((a: any) => a.tags?.includes('brand_logo') && a.status === 'active') ||
                      db.image_assets?.find((a: any) => a.id === 'header_logo');
    return logoAsset ? cloudManager.resolveImage(logoAsset.path) : DEFAULT_LOGO;
  }, [db.image_assets]);

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
            {!isMobile && (
              <Link to="/history" className="hidden lg:flex items-center justify-center w-10 h-10 rounded-full bg-skin-base/30 hover:bg-skin-accent/10 text-skin-text border border-skin-border/30 hover:border-skin-accent transition-all ml-4 flex-shrink-0 group" title="Your History">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </Link>
            )}
        </div>
        <div className="flex items-center gap-2 md:gap-4 justify-end flex-shrink-0 relative">
            
            {/* 🛡️ MASTER TOOLS GEAR - IMPROVED VISIBILITY */}
            {isPotentialAdmin && (
                <div className="relative">
                    {isAdminLoading ? (
                        /* VERIFYING STATE */
                        <div 
                            className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/30 animate-pulse cursor-wait"
                            title="Verifying Sovereign Clearance..."
                        >
                            <span className="text-xs text-blue-400">🛡️</span>
                        </div>
                    ) : isAdminVerified ? (
                        /* VERIFIED ADMIN STATE */
                        <button 
                            onClick={() => setIsMasterToolsOpen(true)}
                            className="flex items-center justify-center w-9 h-9 rounded-full bg-skin-base/50 border border-amber-500/50 text-skin-accent hover:border-skin-accent hover:bg-skin-accent/10 transition-all transform hover:scale-105 group shadow-lg shadow-amber-500/20"
                            title="Master Tools (Sovereign Verified)"
                        >
                            <span className="text-lg group-hover:rotate-90 transition-transform duration-500">⚙️</span>
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-black shadow-[0_0_5px_rgba(34,197,94,0.8)]"></span>
                        </button>
                    ) : (
                        /* FAILED VERIFICATION STATE */
                        <button 
                            onClick={() => refreshUser()}
                            className="flex items-center justify-center w-9 h-9 rounded-full bg-red-900/20 border border-red-500/50 text-red-500 hover:bg-red-500/10 transition-all"
                            title="Clearance Denied. Click to retry."
                        >
                            <span className="text-xs">⚠️</span>
                        </button>
                    )}
                </div>
            )}

            <ThemeSwitcher />
            <div className="hidden sm:block"><LanguageSwitcher /></div>
            <button onClick={onLogout} className={`bg-skin-accent hover:opacity-90 border border-white/10 text-skin-button-text font-bold rounded-full transition duration-300 ease-in-out transform hover:scale-105 whitespace-nowrap shadow-xl uppercase font-cinzel tracking-wider ${isMobile ? 'py-1.5 px-4 text-[10px]' : 'py-2 px-6 text-xs'}`}>{t('logout')}</button>
            
            {isAdminVerified && <MasterToolsModal isVisible={isMasterToolsOpen} onClose={() => setIsMasterToolsOpen(false)} />}
        </div>
      </div>
    </header>
  );
};

export default Header;
