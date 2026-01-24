
import React, { useState, useEffect, useMemo } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { SERVICE_OPTIONS, BACKGROUND_IMAGES } from '../constants';
import { useDb } from '../hooks/useDb';
import { useAuth } from '../context/AuthContext';
import Card from './shared/Card';
import { useTranslation } from '../hooks/useTranslation';
import { cloudManager } from '../services/cloudManager';
import { biometricService } from '../services/biometricService';
import OptimizedImage from './shared/OptimizedImage';

const DEFAULT_LOGO = 'https://images.unsplash.com/photo-1600609842388-3e4b489d71c6?q=80&w=600';
const FALLBACK_FEATURE_IMAGE = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800';

const Home: React.FC = () => {
  const [bgIndex, setBgIndex] = useState(0);
  const { db } = useDb();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [showBioSetup, setShowBioSetup] = useState(false);

  // --- OPTIMIZATION: Memoize Backgrounds to prevent recalc on slider tick ---
  const displayBackgrounds = useMemo(() => {
      const dbBackgrounds = db.image_assets?.filter((asset: any) => 
          asset.id === 'bg_ganesha' || asset.tags?.includes('background') || asset.tags?.includes('home_bg')
      ).map((asset: any) => cloudManager.resolveImage(asset.path)) || [];
      return dbBackgrounds.length > 0 ? dbBackgrounds : BACKGROUND_IMAGES;
  }, [db.image_assets]);

  // --- OPTIMIZATION: Memoize Service List ---
  const displayServices = useMemo(() => {
      const dbServices = (db.services || []);
      return SERVICE_OPTIONS.map(staticOpt => {
          const dynamicEntry = dbServices.find((s: any) => s.id === staticOpt.id);
          if (dynamicEntry) {
              const resolvedImg = dynamicEntry.image ? cloudManager.resolveImage(dynamicEntry.image) : null;
              return {
                  ...staticOpt,
                  ...dynamicEntry,
                  image: resolvedImg || dynamicEntry.image,
                  icon: staticOpt.icon
              };
          }
          return staticOpt;
      }).filter(s => s.status !== 'inactive');
  }, [db.services]);

  // --- OPTIMIZATION: Memoize Feature Content ---
  const activeFeature = useMemo(() => 
      db.featured_content?.find((c: any) => c.status === 'active'), 
  [db.featured_content]);

  // --- OPTIMIZATION: Memoize Config ---
  const hoverOpacity = useMemo(() => {
      const opacityConfig = db.config?.find((c: any) => c.key === 'card_hover_opacity');
      return opacityConfig ? parseFloat(opacityConfig.value) : 0.8;
  }, [db.config]);

  const isAdmin = useMemo(() => user?.role === 'admin', [user]);

  const logoUrl = useMemo(() => {
      const logoAsset = db.image_assets?.find((a: any) => a.id === 'login_logo') ||
                        db.image_assets?.find((a: any) => a.tags?.includes('login_logo'));
      return logoAsset ? cloudManager.resolveImage(logoAsset.path) : null;
  }, [db.image_assets]);

  useEffect(() => {
    // Check Biometrics only once on mount if user is logged in
    if (user && !localStorage.getItem('glyph_bio_registered')) {
        biometricService.isAvailable().then(avail => {
            if (avail) setShowBioSetup(true);
        });
    }
  }, [user]); // Run only when user status changes

  useEffect(() => {
    // Background Slider
    const timer = setInterval(() => {
      setBgIndex((prevIndex) => (prevIndex + 1) % displayBackgrounds.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [displayBackgrounds.length]);

  const handleRegisterBiometric = async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (!user) return;

      if (!window.isSecureContext) {
          alert("Biometric Setup Failed: Your browser requires a secure connection (HTTPS) or localhost to enable this feature.");
          return;
      }
      
      const btn = document.getElementById('bio-setup-btn');
      if(btn) btn.innerText = "Scanning...";
      
      try {
          if (navigator.vibrate) navigator.vibrate(50);
          const credId = await biometricService.register(user.id, user.name);
          
          if (credId) {
              if (navigator.vibrate) navigator.vibrate([50, 100]);
              alert("Biometrics Registered Successfully! You can now log in using fingerprint or Face ID.");
              localStorage.setItem('glyph_bio_registered', 'true');
              setShowBioSetup(false);
          } else {
              if(btn) btn.innerText = "Retry";
          }
      } catch (err: any) {
          console.error("Biometric Error:", err);
          let errorMessage = err.message || 'Unknown error';
          if (err.name === 'NotAllowedError') {
              errorMessage = "Access Denied. Please check your browser permission settings.";
          }
          alert(`Setup Failed: ${errorMessage}`);
          if(btn) btn.innerText = "Retry";
      }
  };

  return (
    <div className="-mt-8 -mx-4 relative min-h-[calc(100vh-80px)] overflow-hidden">
      {/* Dynamic Background Slider */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        {displayBackgrounds.map((image: string, index: number) => (
          <div
            key={index}
            className="absolute inset-0 bg-cover bg-center will-change-transform will-change-opacity"
            style={{ 
                backgroundImage: `url(${image})`, 
                opacity: index === bgIndex ? 1 : 0,
                transform: index === bgIndex ? 'scale(1.1)' : 'scale(1.0)',
                transition: 'opacity 2000ms ease-in-out, transform 8000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                zIndex: -1
            }}
          />
        ))}
        {/* Skin-aware overlay using CSS Variable for Base Color */}
        <div className="absolute inset-0 bg-gradient-to-b from-skin-base/80 via-skin-base/40 to-skin-base/90 mix-blend-multiply z-0 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,var(--color-bg-base)_100%)] z-0 pointer-events-none" />
      </div>

      <div className="relative z-10 container mx-auto px-4 pt-24 pb-16 md:py-20 flex flex-col items-center">
        
        {/* Hero Section */}
        <div className="text-center mb-12 md:mb-20 max-w-5xl mx-auto animate-fade-in-up">
            
            {/* LOGO DISPLAY */}
            {logoUrl && (
                <div className="mx-auto w-24 h-24 mb-6 rounded-full p-1 bg-gradient-to-tr from-skin-accent to-purple-600 shadow-lg animate-pulse-glow">
                    <OptimizedImage
                        src={logoUrl} 
                        alt="Glyph Circle" 
                        className="w-full h-full object-cover rounded-full border-2 border-black" 
                        fallbackSrc={DEFAULT_LOGO}
                        showSkeleton={false}
                    />
                </div>
            )}

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-cinzel font-black text-transparent bg-clip-text bg-gradient-to-r from-skin-accent via-skin-text to-skin-accent mb-6 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] tracking-wide">
                {t('welcomeToPath')}
            </h1>
            <div className="flex items-center justify-center gap-4 mb-8 opacity-80">
                <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-skin-accent"></div>
                <div className="text-skin-accent text-xl">✦</div>
                <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-skin-accent"></div>
            </div>
            <p className="text-xl md:text-2xl text-skin-text/90 font-lora italic max-w-3xl mx-auto leading-relaxed drop-shadow-lg">
                {t('chooseService')}
            </p>
        </div>
        
        {/* Biometric Setup Prompt */}
        {showBioSetup && (
            <div className="w-full max-w-md mb-8 animate-fade-in-up">
                <div 
                    className="bg-skin-surface hover:bg-skin-hover border border-skin-border p-4 rounded-xl flex items-center justify-between backdrop-blur-md shadow-lg transition-all group"
                >
                    <div className="flex items-center gap-3 cursor-default">
                        <span className="text-2xl animate-pulse">👆</span>
                        <div>
                            <h4 className="text-skin-text font-bold text-sm">Secure Your Sanctuary</h4>
                            <p className="text-skin-text/70 text-xs">Enable fingerprint login for instant access.</p>
                        </div>
                    </div>
                    <button 
                        id="bio-setup-btn"
                        onClick={handleRegisterBiometric}
                        className="bg-skin-accent hover:opacity-90 text-skin-base px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-lg active:scale-95 border border-skin-border"
                    >
                        Setup
                    </button>
                </div>
            </div>
        )}
        
        {/* Featured Content Card */}
         {activeFeature && (
            <div className="w-full max-w-5xl mb-24 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <Card className="border border-skin-border bg-skin-surface/60 backdrop-blur-xl overflow-hidden group hover:border-skin-accent/60 transition-colors duration-500 shadow-2xl">
                  <div className="md:flex h-full">
                    {activeFeature.image_url && (
                        <div className="md:w-2/5 h-72 md:h-auto feature-image-container relative">
                            <OptimizedImage
                                src={activeFeature.image_url}
                                alt={activeFeature.title}
                                className="dynamic-image"
                                fallbackSrc={FALLBACK_FEATURE_IMAGE}
                                containerClassName="w-full h-full"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-skin-base/90 via-transparent to-transparent md:bg-gradient-to-l pointer-events-none"></div>
                        </div>
                    )}
                    <div className={`p-8 md:p-12 flex flex-col justify-center ${activeFeature.image_url ? 'md:w-3/5' : 'w-full'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="h-px w-8 bg-skin-accent"></span>
                            <span className="text-skin-accent text-xs font-bold uppercase tracking-[0.25em] font-cinzel">Mystic Insight</span>
                        </div>
                        <h3 className="text-3xl font-cinzel font-bold text-skin-text mb-6 group-hover:text-skin-accent transition-colors">{activeFeature.title}</h3>
                        <p className="text-skin-text/80 text-lg font-lora leading-relaxed border-l-2 border-skin-border pl-6">{activeFeature.text}</p>
                    </div>
                  </div>
                </Card>
            </div>
        )}

        {/* Services Grid - Improved Responsive Breakpoints */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 xl:gap-10 max-w-[90rem] mx-auto w-full px-2">
          {displayServices.map((service: any, idx: number) => {
            return (
                <Link 
                    to={service.path} 
                    key={service.id} 
                    className="group relative transform transition-all duration-500 hover:-translate-y-2 hover:z-10"
                    style={{ animation: `fadeInUp 0.8s ease-out forwards ${0.4 + idx * 0.1}s`, opacity: 0 }}
                >
                <div className="absolute -inset-0.5 bg-gradient-to-br from-skin-accent/20 to-maroon-600/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-700"></div>
                <Card className="h-full bg-skin-surface border border-skin-border group-hover:border-skin-accent/50 transition-all duration-500 relative overflow-hidden flex flex-col">
                    
                    {/* Full Background Image for Card with Dynamic Opacity */}
                    {service.image && (
                        <div className="absolute inset-0 z-0">
                            <OptimizedImage 
                                src={service.image} 
                                alt={service.name} 
                                className="w-full h-full object-cover opacity-30 group-hover:opacity-[var(--hover-opacity)] transition-opacity duration-700 transform group-hover:scale-110"
                                style={{ '--hover-opacity': hoverOpacity } as React.CSSProperties}
                                containerClassName="w-full h-full"
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-skin-base/80 via-skin-base/60 to-skin-base/90"></div>
                        </div>
                    )}

                    <div className="relative z-10 flex flex-col items-center p-8 text-center h-full">
                        <div className="absolute top-4 right-4 text-skin-accent/30 group-hover:text-skin-accent/80 transition-colors duration-500 animate-float">✧</div>
                        
                        <div className={`mb-6 p-4 rounded-full bg-skin-base/60 border border-skin-border text-skin-accent group-hover:text-skin-text group-hover:bg-gradient-to-br group-hover:from-maroon-800 group-hover:to-amber-700 group-hover:border-skin-accent/50 transform group-hover:scale-110 transition-all duration-500 shadow-lg backdrop-blur-xl`}>
                            {service.icon}
                        </div>
                        
                        <h3 className="text-2xl font-cinzel font-bold mb-4 text-skin-text group-hover:text-skin-accent transition-colors tracking-wide drop-shadow-md">
                            {t(service.id) || service.name}
                        </h3>
                        
                        <div className="w-16 h-px bg-skin-border mb-6 group-hover:w-32 group-hover:bg-gradient-to-r group-hover:from-transparent group-hover:via-skin-accent group-hover:to-transparent transition-all duration-700"></div>
                        
                        <p className="text-skin-text/70 font-lora text-sm leading-7 mb-8 group-hover:text-white transition-colors flex-grow">
                            {t(`${service.id}Desc`) || service.description}
                        </p>
                        
                        <div className="mt-auto opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                            <span className="text-skin-accent text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 group-hover:gap-3 transition-all">
                                Enter <span className="text-lg leading-none">›</span>
                            </span>
                        </div>
                    </div>
                </Card>
                </Link>
            );
          })}

          {isAdmin && (
             <Link 
                to="/admin/config" 
                className="group relative transform transition-all duration-500 hover:-translate-y-2 hover:z-10"
                style={{ animation: `fadeInUp 0.8s ease-out forwards 1s`, opacity: 0 }}
             >
              <div className="absolute -inset-0.5 bg-gradient-to-br from-green-600/20 to-blue-600/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-700"></div>
              <Card className="h-full bg-gradient-to-b from-gray-900/90 to-blue-950/80 backdrop-blur-md border border-green-500/40 group-hover:border-green-400 group-hover:bg-skin-base/80 transition-all duration-500 relative overflow-hidden">
                <div className="flex flex-col items-center p-8 h-full text-center relative z-10">
                  <div className="absolute top-4 right-4 text-green-500/30 group-hover:text-green-400/80">⚙️</div>
                  <div className="mb-8 p-5 rounded-full bg-black/40 border border-green-500/30 text-green-400 group-hover:text-white group-hover:bg-green-700 transition-all duration-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-cinzel font-bold mb-4 text-green-100 group-hover:text-green-300 tracking-wide">Configuration</h3>
                  <div className="w-16 h-px bg-green-500/30 mb-6 group-hover:w-32 group-hover:bg-gradient-to-r group-hover:from-transparent group-hover:via-green-400 group-hover:to-transparent transition-all duration-700"></div>
                  <p className="text-green-200/60 font-lora text-sm leading-7 mb-8 group-hover:text-green-100/90">
                    Manage database tables, toggle features, and configure app settings.
                  </p>
                  <div className="mt-auto opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                      <span className="text-green-400 text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 group-hover:gap-3 transition-all">
                          Manage <span className="text-lg leading-none">›</span>
                      </span>
                  </div>
                </div>
              </Card>
             </Link>
          )}

        </div>
      </div>
    </div>
  );
};

export default Home;
