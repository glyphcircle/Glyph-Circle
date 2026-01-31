import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SERVICE_OPTIONS } from '../constants';
import { useDb } from '../hooks/useDb';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { cloudManager } from '../services/cloudManager';

const Home: React.FC = () => {
  const { db } = useDb();
  const { t } = useTranslation();
  const { isAdminVerified } = useAuth();
  const navigate = useNavigate();

  const displayServices = useMemo(() => {
      const raw = Array.isArray(db?.services) ? db.services : [];
      return raw.filter((s: any) => s && s.status === 'active').map((service: any) => {
          const standardOpt = SERVICE_OPTIONS.find(opt => opt.id === service.id);
          
          let iconToDisplay = standardOpt ? standardOpt.icon : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
            </svg>
          );

          return {
              ...service,
              icon: iconToDisplay,
              resolvedImageUrl: service.image ? cloudManager.resolveImage(service.image) : null
          };
      });
  }, [db?.services]);

  return (
    <div className="-mt-8 -mx-4 relative min-h-screen overflow-hidden bg-[#050510]">
      {/* 🔱 ATMOSPHERIC BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none opacity-30 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.15)_0%,transparent_50%)]"></div>
          <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-[#050510] to-transparent"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 pt-20 pb-32 flex flex-col items-center">
        
        {/* ADMIN QUICK-ACCESS BAR */}
        {isAdminVerified && (
            <div className="w-full max-w-5xl mb-12 animate-fade-in-up">
                <div className="bg-black/40 p-6 rounded-[2rem] border border-amber-500/20 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-xl font-cinzel font-black text-amber-400 tracking-widest uppercase">Master Registry</h2>
                        <p className="text-[9px] text-amber-200/40 uppercase tracking-[0.3em] font-bold">Systems operational and aligned</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => navigate('/admin/db/services')} className="bg-amber-600 hover:bg-amber-500 text-black font-black px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95">Offerings</button>
                        <button onClick={() => navigate('/admin/config')} className="bg-gray-900 border border-amber-500/30 hover:bg-gray-800 text-amber-500 font-black px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all active:scale-95">Global Sync</button>
                    </div>
                </div>
            </div>
        )}

        <div className="text-center mb-16 max-w-5xl mx-auto px-4">
            <h1 className="text-6xl md:text-8xl font-cinzel font-black text-white mb-6 tracking-tighter uppercase drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                {t('glyphCircle')}
            </h1>
            <div className="flex items-center justify-center gap-6">
                <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-500/40"></div>
                <p className="text-lg md:text-xl text-amber-100/60 font-lora italic tracking-wide">
                    Select your gateway into the ancient mysteries.
                </p>
                <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-500/40"></div>
            </div>
        </div>

        {displayServices.length === 0 ? (
            <div className="text-center py-24 bg-black/40 rounded-[3rem] border border-dashed border-amber-500/10 max-w-md w-full">
                <div className="text-4xl mb-4 animate-pulse">📜</div>
                <p className="text-amber-200/40 font-lora italic">The Registry is being prepared...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-[95rem] mx-auto w-full px-4">
            {displayServices.map((service: any) => {
                const codedIds = ['calendar', 'numerology', 'astrology', 'ayurveda', 'muhurat', 'moon-journal', 'cosmic-sync', 'voice-oracle', 'gemstones', 'matchmaking', 'tarot', 'palmistry', 'face-reading', 'dream-analysis', 'remedy', 'store'];
                const isCoded = codedIds.includes(service.id);
                
                const rawPath = service.path || `/${service.id}`;
                const cleanPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
                const targetPath = isCoded ? cleanPath : `/coming-soon?id=${service.id}`;

                return (
                    <Link 
                        to={targetPath} 
                        key={service.id} 
                        className="group relative block h-full z-20"
                    >
                    <div className="imperial-card h-full rounded-[2rem] p-10 text-center flex flex-col items-center relative overflow-hidden group">
                        
                        {/* 🖼️ BACKGROUND IMAGE LAYER */}
                        {service.resolvedImageUrl && (
                            <div className="absolute inset-0 z-0 overflow-hidden">
                                <img 
                                    src={service.resolvedImageUrl} 
                                    alt={service.name}
                                    className="w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-all duration-1000 transform scale-105 group-hover:scale-100 filter brightness-50 group-hover:brightness-90"
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a]/80 via-transparent to-[#050510]"></div>
                            </div>
                        )}

                        {/* 🔱 SACRED CIRCLE ICON HEADER */}
                        <div className="relative z-10 mb-8 w-28 h-28 rounded-full sacred-circle-icon flex items-center justify-center transform group-hover:scale-110 transition-all duration-700">
                             <div className="text-black drop-shadow-lg">
                                {service.icon}
                             </div>
                             {/* ॐ Decorative Overlays */}
                             <div className="absolute -top-2 -right-2 text-3xl font-cinzel text-amber-500 opacity-60 group-hover:opacity-100 transition-opacity">ॐ</div>
                        </div>

                        {/* CONTENT LAYER */}
                        <div className="relative z-10 flex flex-col items-center h-full w-full">
                            <h3 className="text-3xl font-cinzel font-black mb-4 text-white uppercase tracking-widest group-hover:text-amber-400 transition-colors drop-shadow-xl">
                                {service.name}
                            </h3>
                            
                            <p className="text-amber-100/50 font-lora text-sm leading-relaxed mb-10 italic group-hover:text-amber-100/80 transition-colors">
                                {service.description || "Divine details currently masked."}
                            </p>
                            
                            <div className="mt-auto w-full pt-8 border-t border-white/5 flex flex-col items-center gap-4">
                                <div className="text-amber-500 font-mono font-black text-xl tracking-tighter">
                                    {service.price > 0 ? `₹${service.price}` : 'FREE'}
                                </div>
                                <div className="w-full bg-black/60 py-3 rounded-full border border-amber-500/20 group-hover:border-amber-500/60 group-hover:bg-amber-500 group-hover:text-black transition-all">
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] transition-colors">
                                        {isCoded ? 'Manifest Portal' : 'Under Observation'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    </Link>
                );
            })}
            </div>
        )}
      </div>
    </div>
  );
};

export default Home;