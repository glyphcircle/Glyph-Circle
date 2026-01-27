import React, { useState, useEffect, useMemo } from 'react';
// @ts-ignore
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [showBioSetup, setShowBioSetup] = useState(false);

  // --- OPTIMIZATION: Memoize Backgrounds ---
  const displayBackgrounds = useMemo(() => {
      const dbBackgrounds = db.image_assets?.filter((asset: any) => 
          asset.id === 'bg_ganesha' || asset.tags?.includes('background') || asset.tags?.includes('home_bg')
      ).map((asset: any) => cloudManager.resolveImage(asset.path)) || [];
      return dbBackgrounds.length > 0 ? dbBackgrounds : BACKGROUND_IMAGES;
  }, [db.image_assets]);

  // --- OPTIMIZATION: Dynamic Service List with Deduplication & View Priority ---
  const displayServices = useMemo(() => {
      const raw = db.services || [];
      const uniqueMap = new Map<string, any>();

      // vw_services_full might return multiple rows per service if there are multiple store items.
      // We deduplicate here to show one card per service, picking the cheapest variant.
      raw.forEach((s: any) => {
          if (s.status !== 'active') return;

          if (!uniqueMap.has(s.id)) {
              uniqueMap.set(s.id, s);
          } else {
              const existing = uniqueMap.get(s.id);
              // Pick lowest store_price if multiple variants exist
              const currentPrice = s.store_price || s.price || 0;
              const existingPrice = existing.store_price || existing.price || 0;
              if (currentPrice < existingPrice) {
                  uniqueMap.set(s.id, s);
              }
          }
      });

      return Array.from(uniqueMap.values()).map((service: any) => {
          // Find standard icon if ID matches
          const standardOpt = SERVICE_OPTIONS.find(opt => opt.id === service.id);
          
          // Image Resolution Priority: image_path (from joined view) > image (old id) > path
          const imageSrc = service.image_path || service.image || service.path;
          const resolvedImg = imageSrc ? cloudManager.resolveImage(imageSrc) : null;
          
          return {
              ...service,
              displayPrice: service.store_price || service.price,
              image: resolvedImg,
              icon: standardOpt ? standardOpt.icon : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
                </svg>
              )
          };
      });
  }, [db.services]);

  const activeFeature = useMemo(() => 
      db.featured_content?.find((c: any) => c.status === 'active'), 
  [db.featured_content]);

  const hoverOpacity = useMemo(() => {
      const opacityConfig = db.config?.find((c: any) => c.key === 'card_hover_opacity');
      return opacityConfig ? parseFloat(opacityConfig.value) : 0.8;
  }, [db.config]);

  const logoUrl = useMemo(() => {
      const logoAsset = db.image_assets?.find((a: any) => a.tags?.includes('brand_logo'));
      return logoAsset ? cloudManager.resolveImage(logoAsset.path) : null;
  }, [db.image_assets]);

  useEffect(() => {
    if (user && !localStorage.getItem('glyph_bio_registered')) {
        biometricService.isAvailable().then(avail => {
            if (avail) setShowBioSetup(true);
        });
    }
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIndex((prevIndex) => (prevIndex + 1) % displayBackgrounds.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [displayBackgrounds.length]);

  return (
    <div className="-mt-8 -mx-4 relative min-h-[calc(100vh-80px)] overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-b from-skin-base/80 via-skin-base/40 to-skin-base/90 mix-blend-multiply z-0 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,var(--color-bg-base)_100%)] z-0 pointer-events-none" />
      </div>

      <div className="relative z-10 container mx-auto px-4 pt-24 pb-16 md:py-20 flex flex-col items-center">
        <div className="text-center mb-12 md:mb-20 max-w-5xl mx-auto animate-fade-in-up">
            {logoUrl && (
                <div className="mx-auto w-24 h-24 mb-6 rounded-full p-1 bg-gradient-to-tr from-skin-accent to-purple-600 shadow-lg animate-pulse-glow">
                    <OptimizedImage
                        src={logoUrl} alt="Glyph Circle" 
                        className="w-full h-full object-cover rounded-full border-2 border-black" 
                        fallbackSrc={DEFAULT_LOGO} showSkeleton={false}
                    />
                </div>
            )}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-cinzel font-black text-transparent bg-clip-text bg-gradient-to-r from-skin-accent via-skin-text to-skin-accent mb-6 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] tracking-wide text-white">
                {t('welcomeToPath')}
            </h1>
            <p className="text-xl md:text-2xl text-skin-text/90 font-lora italic max-w-3xl mx-auto leading-relaxed drop-shadow-lg text-white">
                {t('chooseService')}
            </p>
        </div>
        
        {activeFeature && (
            <div className="w-full max-w-5xl mb-24 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <Card className="border border-skin-border bg-skin-surface/60 backdrop-blur-xl overflow-hidden group hover:border-skin-accent/60 transition-colors duration-500 shadow-2xl">
                  <div className="md:flex h-full">
                    {activeFeature.image_url && (
                        <div className="md:w-2/5 h-72 md:h-auto feature-image-container relative">
                            <OptimizedImage src={activeFeature.image_url} alt={activeFeature.title} className="dynamic-image" fallbackSrc={FALLBACK_FEATURE_IMAGE} containerClassName="w-full h-full" />
                            <div className="absolute inset-0 bg-gradient-to-t from-skin-base/90 via-transparent to-transparent md:bg-gradient-to-l pointer-events-none"></div>
                        </div>
                    )}
                    <div className={`p-8 md:p-12 flex flex-col justify-center ${activeFeature.image_url ? 'md:w-3/5' : 'w-full'}`}>
                        <div className="flex items-center gap-3 mb-4"><span className="h-px w-8 bg-skin-accent"></span><span className="text-skin-accent text-xs font-bold uppercase tracking-[0.25em] font-cinzel">Mystic Insight</span></div>
                        <h3 className="text-3xl font-cinzel font-bold text-skin-text mb-6 group-hover:text-skin-accent transition-colors">{activeFeature.title}</h3>
                        <p className="text-skin-text/80 text-lg font-lora leading-relaxed border-l-2 border-skin-border pl-6">{activeFeature.text}</p>
                    </div>
                  </div>
                </Card>
            </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 xl:gap-10 max-w-[90rem] mx-auto w-full px-2">
          {displayServices.map((service: any, idx: number) => {
            const codedIds = ['calendar', 'numerology', 'astrology', 'ayurveda', 'muhurat', 'moon-journal', 'cosmic-sync', 'voice-oracle', 'gemstones', 'matchmaking', 'tarot', 'palmistry', 'face-reading', 'dream-analysis', 'remedy', 'store'];
            const isCoded = codedIds.includes(service.id);
            const targetPath = isCoded ? service.path : `/coming-soon?id=${service.id}`;

            return (
                <Link to={targetPath} key={service.id} className="group relative transform transition-all duration-500 hover:-translate-y-2 hover:z-10" style={{ animation: `fadeInUp 0.8s ease-out forwards ${0.4 + idx * 0.1}s`, opacity: 0 }}>
                <div className="absolute -inset-0.5 bg-gradient-to-br from-skin-accent/20 to-maroon-600/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-700"></div>
                <Card className="h-full bg-skin-surface border border-skin-border group-hover:border-skin-accent/50 transition-all duration-500 relative overflow-hidden flex flex-col">
                    {service.image && (
                        <div className="absolute inset-0 z-0">
                            <OptimizedImage src={service.image} alt={service.name} className="w-full h-full object-cover opacity-30 group-hover:opacity-[var(--hover-opacity)] transition-opacity duration-700 transform group-hover:scale-110" style={{ '--hover-opacity': hoverOpacity } as React.CSSProperties} containerClassName="w-full h-full" />
                            <div className="absolute inset-0 bg-gradient-to-b from-skin-base/80 via-skin-base/60 to-skin-base/90"></div>
                        </div>
                    )}
                    <div className="relative z-10 flex flex-col items-center p-8 text-center h-full">
                        <div className="mb-6 p-4 rounded-full bg-skin-base/60 border border-skin-border text-skin-accent group-hover:text-skin-text group-hover:bg-gradient-to-br group-hover:from-maroon-800 group-hover:to-amber-700 transform transition-all duration-500 shadow-lg backdrop-blur-xl">
                            {service.icon}
                        </div>
                        <h3 className="text-2xl font-cinzel font-bold mb-4 text-skin-text group-hover:text-skin-accent transition-colors tracking-wide drop-shadow-md">
                            {t(service.id) || service.name}
                        </h3>
                        <p className="text-skin-text/70 font-lora text-sm leading-7 mb-8 group-hover:text-white transition-colors flex-grow">
                            {t(`${service.id}Desc`) || service.description}
                        </p>
                        <div className="mt-auto opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                            <span className="text-skin-accent text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 group-hover:gap-3 transition-all">
                                {isCoded ? 'Enter' : 'Coming Soon'} <span className="text-lg leading-none">›</span>
                            </span>
                        </div>
                    </div>
                </Card>
                </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Home;