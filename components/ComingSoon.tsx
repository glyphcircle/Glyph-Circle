import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Card from './shared/Card';
import { useTranslation } from '../hooks/useTranslation';

const ComingSoon: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get('id') || 'Unknown Service';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#050510]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1)_0%,transparent_70%)] pointer-events-none"></div>
      
      <Card className="max-w-lg w-full p-12 text-center bg-black/60 border-amber-500/20 backdrop-blur-2xl rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <div className="text-9xl font-cinzel">ॐ</div>
        </div>

        <div className="mb-10 inline-block p-6 rounded-full bg-amber-500/10 border border-amber-500/30 animate-pulse">
            <span className="text-6xl">⏳</span>
        </div>

        <h2 className="text-4xl font-cinzel font-black text-amber-100 uppercase tracking-widest mb-4">
            Under Observation
        </h2>
        
        <p className="text-amber-200/60 font-lora italic text-lg mb-10 leading-relaxed">
            "The stars are aligning for <span className="text-amber-400 font-bold capitalize">{serviceId.replace(/-/g, ' ')}</span>. The Oracle is currently scribing the destiny patterns for this gateway."
        </p>

        <Link to="/home">
            <button className="w-full bg-gradient-to-r from-amber-600 to-amber-900 hover:from-amber-500 hover:to-amber-800 text-black font-black py-4 rounded-2xl shadow-xl font-cinzel tracking-[0.2em] transition-all transform active:scale-95 uppercase text-xs">
                {t('goBackHome')}
            </button>
        </Link>
        
        <p className="text-[9px] text-gray-600 uppercase tracking-[0.3em] font-bold mt-8">
            Est. Arrival: Coming Moon Cycle
        </p>
      </Card>
    </div>
  );
};

export default ComingSoon;