import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SERVICE_OPTIONS } from '../constants';
import { useDb } from '../hooks/useDb';
import { useAuth } from '../context/AuthContext';
import Card from './shared/Card';
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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <div className="-mt-8 -mx-4 relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#0F0F23]">
      {/* 🔱 DECORATIVE PAGE BOUNDARIES */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
          <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-amber-500/40 rounded-tl-3xl"></div>
          <div className="absolute top-10 right-10 w-20 h-20 border-t-2 border-r-2 border-amber-500/40 rounded-tr-3xl"></div>
          <div className="absolute bottom-10 left-10 w-20 h-20 border-b-2 border-l-2 border-amber-500/40 rounded-bl-3xl"></div>
          <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-amber-500/40 rounded-br-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 pt-24 pb-16 md:py-20 flex flex-col items-center">
        
        {/* ADMIN QUICK-ACCESS BAR */}
        {isAdminVerified && (
            <div className="w-full max-w-5xl mb-16 animate-fade-in-up">
                <div className="bg-gradient-to-r from-amber-900/40 via-black/60 to-purple-900/40 p-8 rounded-[2.5rem] border-2 border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.15)] flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-xl">
                    <div className="text-center md:text-left">
                        <h2 className="text-2xl font-cinzel font-black text-amber-400 tracking-widest uppercase mb-1">Sovereign Command</h2>
                        <p className="text-xs text-amber-200/50 font-bold uppercase tracking-[0.3em]">System Registry is live and synchronized.</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => navigate('/admin/db/services')} className="bg-amber-600 hover:bg-amber-500 text-black font-black px-8 py-3 rounded-2xl text-[10px] uppercase tracking-widest shadow-2xl transition-all active:scale-95">Edit Services</button>
                        <button onClick={() => navigate('/admin/config')} className="bg-gray-900 border border-amber-500/50 hover:bg-gray-800 text-amber-500 font-black px-8 py-3 rounded-2xl text-[10px] uppercase tracking-widest transition-all active:scale-95">Global Config</button>
                    </div>
                </div>
            </div>
        )}

        <div className="text-center mb-12 md:mb-20 max-w-5xl mx-auto">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-cinzel font-black text-white mb-6 tracking-tighter uppercase drop-shadow-2xl">
                {t('glyphCircle')}
            </h1>
            <div className="flex items-center justify-center gap-6 mb-8">
                <div className="h-px w-20 bg-gradient-to-r from-transparent to-amber-500/50"></div>
                <p className="text-lg md:text-xl text-amber-200/80 font-lora italic leading-relaxed">
                    Consult the Sovereign Registry of Mystical Services.
                </p>
                <div className="h-px w-20 bg-gradient-to-l from-transparent to-amber-500/50"></div>
            </div>
        </div>

        {displayServices.length === 0 ? (
            <div className="text-center py-20 bg-black/20 rounded-2xl border border-dashed border-amber-500/20 max-w-md w-full">
                <p className="text-amber-200/40 font-lora italic">The Registry is being scribed...<br/>Please ensure Supabase SQL has been executed.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 xl:gap-10 max-w-[90rem] mx-auto w-full px-2 pb-20">
            {displayServices.map((service: any) => {
                const codedIds = ['calendar', 'numerology', 'astrology', 'ayurveda', 'muhurat', 'moon-journal', 'cosmic-sync', 'voice-oracle', 'gemstones', 'matchmaking', 'tarot', 'palmistry', 'face-reading', 'dream-analysis', 'remedy', 'store'];
                const isCoded = codedIds.includes(service.id);
                
                // Robust Path Resolution
                const rawPath = service.path || `/${service.id}`;
                const cleanPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
                const targetPath = isCoded ? cleanPath : `/coming-soon?id=${service.id}`;

                return (
                    <Link 
                        to={targetPath} 
                        key={service.id} 
                        className="group relative transform transition-all duration-500 hover:-translate-y-3 block h-full z-20"
                    >
                    <Card className="h-full bg-[#0a0a1a]/95 border border-amber-500/20 group-hover:border-amber-500/60 transition-all duration-500 p-8 text-center flex flex-col items-center shadow-2xl hover:shadow-[0_20px_50px_rgba(245,158,11,0.15)] relative overflow-hidden">
                        
                        {/* 🖼️ BACKGROUND IMAGE LAYER */}
                        {service.resolvedImageUrl && (
                            <div className="absolute inset-0 z-0 overflow-hidden">
                                <img 
                                    src={service.resolvedImageUrl} 
                                    alt={service.name}
                                    className="w-full h-full object-cover opacity-20 group-hover:opacity-60 transition-all duration-700 transform scale-110 group-hover:scale-100 filter brightness-50 group-hover:brightness-100"
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a]/40 via-transparent to-[#0a0a1a]"></div>
                            </div>
                        )}

                        {/* CONTENT LAYER */}
                        <div className="relative z-10 flex flex-col items-center h-full w-full">
                            <div className="mb-6 p-5 rounded-full bg-black/60 text-amber-500 border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-black group-hover:border-transparent transition-all duration-500 flex items-center justify-center w-24 h-24 shadow-xl">
                                {service.icon}
                            </div>
                            
                            <h3 className="text-2xl font-cinzel font-black mb-4 text-white uppercase tracking-widest group-hover:text-amber-300 transition-colors drop-shadow-md">
                                {service.name}
                            </h3>
                            
                            <p className="text-gray-400 font-lora text-sm leading-relaxed mb-8 italic opacity-90 group-hover:text-amber-100 transition-colors">
                                {service.description || "Divine offering details pending."}
                            </p>
                            
                            <div className="mt-auto pt-6 border-t border-white/10 w-full flex flex-col gap-3">
                                <div className="text-amber-500 font-mono font-bold text-lg">
                                    {service.price > 0 ? `₹${service.price}` : 'FREE'}
                                </div>
                                <span className="text-amber-500/60 text-[10px] font-black uppercase tracking-[0.3em] group-hover:text-amber-400 transition-colors bg-black/40 py-2 rounded-full border border-white/5">
                                    {isCoded ? 'Manifest Portal' : 'Under Observation'}
                                </span>
                            </div>
                        </div>
                    </Card>
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
