
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeSwitcher from './ThemeSwitcher';
import MasterToolsModal from './MasterToolsModal';

const DEFAULT_LOGO = 'https://lh3.googleusercontent.com/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO';

const Header: React.FC<{ onLogout: () => void; isMobile?: boolean }> = ({ onLogout, isMobile }) => {
  const { t } = useTranslation();
  const { isAdminVerified, isAdminLoading } = useAuth();
  const [isMasterToolsOpen, setIsMasterToolsOpen] = useState(false);

  return (
    <header className="bg-[#0F0F23]/95 backdrop-blur-xl shadow-2xl sticky top-0 z-50 border-b border-amber-500/20">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/home" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-amber-500/30 overflow-hidden bg-black flex items-center justify-center">
                <img src={DEFAULT_LOGO} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-amber-500 tracking-widest font-cinzel uppercase">
              {t('glyphCircle')}
            </h1>
        </Link>
        <div className="flex items-center gap-4">
            {isAdminVerified && (
                <button onClick={() => setIsMasterToolsOpen(true)} className="p-2 text-amber-500 hover:text-white">⚙️</button>
            )}
            <ThemeSwitcher />
            <LanguageSwitcher />
            <button onClick={onLogout} className="bg-amber-600 text-black font-bold rounded-full py-2 px-6 text-xs uppercase tracking-widest">{t('logout')}</button>
            {isAdminVerified && <MasterToolsModal isVisible={isMasterToolsOpen} onClose={() => setIsMasterToolsOpen(false)} />}
        </div>
      </div>
    </header>
  );
};

export default Header;
