
import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SERVICE_OPTIONS } from '../constants';
import { useDb } from '../hooks/useDb';
import Card from './shared/Card';
import { useTranslation } from '../hooks/useTranslation';

const Home: React.FC = () => {
  const { db } = useDb();
  const { t } = useTranslation();

  // --- FOCUS: Only services ---
  const displayServices = useMemo(() => {
      // Use optional chaining and nullish coalescing to avoid crashes
      const raw = Array.isArray(db?.services) ? db.services : [];
      return raw.filter((s: any) => s && s.status === 'active').map((service: any) => {
          const standardOpt = SERVICE_OPTIONS.find(opt => opt.id === service.id);
          return {
              ...service,
              icon: standardOpt ? standardOpt.icon : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
                </svg>
              )
          };
      });
  }, [db?.services]);

  return (
    <div className="-mt-8 -mx-4 relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#0F0F23]">
      <div className="relative z-10 container mx-auto px-4 pt-24 pb-16 md:py-20 flex flex-col items-center">
        <div className="text-center mb-12 md:mb-20 max-w-5xl mx-auto">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-cinzel font-black text-white mb-6 tracking-wide uppercase">
                {t('glyphCircle')}
            </h1>
            <p className="text-xl md:text-2xl text-amber-200/80 font-lora italic max-w-3xl mx-auto leading-relaxed">
                Focusing on the Registry of Services.
            </p>
        </div>

        {displayServices.length === 0 ? (
            <div className="text-center py-20 bg-black/20 rounded-2xl border border-dashed border-amber-500/20 max-w-md w-full">
                <p className="text-amber-200/40 font-lora italic">The Registry is being scribed...<br/>Please ensure Supabase SQL has been executed.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 xl:gap-10 max-w-[90rem] mx-auto w-full px-2">
            {displayServices.map((service: any) => {
                const codedIds = ['calendar', 'numerology', 'astrology', 'ayurveda', 'muhurat', 'moon-journal', 'cosmic-sync', 'voice-oracle', 'gemstones', 'matchmaking', 'tarot', 'palmistry', 'face-reading', 'dream-analysis', 'remedy', 'store'];
                const isCoded = codedIds.includes(service.id);
                const targetPath = isCoded ? service.path : `/coming-soon?id=${service.id}`;

                return (
                    <Link to={targetPath} key={service.id} className="group relative transform transition-all duration-500 hover:-translate-y-2">
                    <Card className="h-full bg-gray-900 border border-amber-500/20 group-hover:border-amber-500/50 transition-all duration-500 p-8 text-center flex flex-col items-center">
                        <div className="mb-6 p-4 rounded-full bg-black/40 text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all">
                            {service.icon}
                        </div>
                        <h3 className="text-2xl font-cinzel font-bold mb-4 text-white uppercase tracking-widest">
                            {service.name}
                        </h3>
                        <p className="text-gray-400 font-lora text-sm leading-relaxed mb-8">
                            {service.description || "Divine offering details pending."}
                        </p>
                        <div className="mt-auto">
                            <span className="text-amber-500 text-xs font-bold uppercase tracking-widest">
                                {isCoded ? 'Enter Portal' : 'Under Development'}
                            </span>
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
