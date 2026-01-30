import React, { useState, useCallback, useEffect } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { getAstroNumeroReading } from '../services/geminiService';
import { calculateNumerology } from '../services/numerologyEngine';
import { calculateAstrology } from '../services/astrologyEngine';
import Button from './shared/Button';
import ProgressBar from './shared/ProgressBar';
import Card from './shared/Card';
import { useTranslation } from '../hooks/useTranslation';
import { usePayment } from '../context/PaymentContext';
import FullReport from './FullReport';
import { useDb } from '../hooks/useDb';
import { useAuth } from '../context/AuthContext';
import { SmartDatePicker, SmartTimePicker, SmartCitySearch } from './SmartAstroInputs';
import { validationService } from '../services/validationService';
import { cloudManager } from '../services/cloudManager';
import InlineError from './shared/InlineError';

interface NumerologyAstrologyProps {
  mode: 'numerology' | 'astrology';
}

const NumerologyAstrology: React.FC<NumerologyAstrologyProps> = ({ mode }) => {
  const [formData, setFormData] = useState({ name: '', dob: '', pob: '', tob: '' });
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [reading, setReading] = useState<string>('');
  const [engineData, setEngineData] = useState<any>(null); 
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [isPaid, setIsPaid] = useState<boolean>(false);
  
  const { t, language } = useTranslation();
  const { openPayment } = usePayment();
  const { db } = useDb();
  const { user, saveReading } = useAuth();

  const isAdmin = user?.role === 'admin';
  const serviceConfig = db.services?.find((s: any) => s.id === mode);
  const servicePrice = serviceConfig?.price || (mode === 'astrology' ? 99 : 49);
  const reportImage = db.image_assets?.find((a: any) => a.id === (mode === 'numerology' ? 'report_bg_numerology' : 'report_bg_astrology'))?.path || "https://images.unsplash.com/photo-1509228627129-6690a87531bc?q=80&w=800";

  useEffect(() => {
    const cached = localStorage.getItem('glyph_user_details');
    if (cached) { try { const p = JSON.parse(cached); setFormData(prev => ({ ...prev, ...p })); } catch (e) {} }
  }, []);

  const handleGetReading = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validationService.isValidName(formData.name)) { setError('Provide a valid name for the decree.'); return; }
    setIsLoading(true); setProgress(0); setReading(''); setEngineData(null); setError(''); setIsPaid(false);
    const timer = setInterval(() => setProgress(p => (p >= 90 ? p : p + 5)), 300);
    try {
      const stats = mode === 'numerology' ? calculateNumerology({ name: formData.name, dob: formData.dob }) : calculateAstrology({ name: formData.name, dob: formData.dob, tob: formData.tob, pob: formData.pob, lat: coords?.lat, lng: coords?.lng });
      setEngineData(stats);
      const result = await getAstroNumeroReading({ mode, ...formData, language: language === 'hi' ? 'Hindi' : 'English' });
      clearInterval(timer); setProgress(100);
      setReading(result.reading);
      saveReading({ type: mode, title: `${mode.toUpperCase()} reading for ${formData.name}`, content: result.reading, meta_data: stats });
    } catch (err: any) { clearInterval(timer); setError("The Oracle's signal is interrupted by solar winds."); } finally { setIsLoading(false); }
  }, [formData, mode, language, coords, saveReading]);

  return (
    <div className="relative min-h-screen bg-[#0F0F23] pt-12 pb-24 overflow-hidden">
        {/* 🔱 IMPERIAL DECORATIONS */}
        <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
            <div className="absolute top-10 left-10 w-32 h-32 border-t-4 border-l-4 border-amber-500 rounded-tl-3xl"></div>
            <div className="absolute top-10 right-10 w-32 h-32 border-t-4 border-r-4 border-amber-500 rounded-tr-3xl"></div>
            <div className="absolute bottom-10 left-10 w-32 h-32 border-b-4 border-l-4 border-amber-500 rounded-bl-3xl"></div>
            <div className="absolute bottom-10 right-10 w-32 h-32 border-b-4 border-r-4 border-amber-500 rounded-br-3xl"></div>
        </div>

        <div className="max-w-6xl mx-auto px-4 relative z-10">
            <Link to="/home" className="inline-flex items-center text-amber-200/60 hover:text-amber-400 transition-all mb-12 group">
                <span className="text-2xl mr-3 group-hover:-translate-x-2 transition-transform">←</span>
                <span className="font-cinzel font-black uppercase tracking-widest text-xs">Exit Sanctuary</span>
            </Link>

            <div className="flex flex-col items-center text-center mb-16">
                <div className="relative w-48 h-48 mb-10 flex items-center justify-center">
                    <div className="absolute inset-[-40px] bg-[radial-gradient(circle,rgba(245,158,11,0.15)_0%,transparent_70%)] animate-pulse rounded-full blur-2xl"></div>
                    <div className="w-32 h-32 bg-black rounded-full border-4 border-amber-500 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.5)] transition-transform hover:scale-110 duration-700">
                        <span className="text-6xl">{mode === 'astrology' ? '🌟' : '🔢'}</span>
                    </div>
                </div>
                <h1 className="text-5xl md:text-6xl font-cinzel font-black text-white uppercase tracking-widest mb-4 drop-shadow-2xl">AI <span className="gold-gradient-text">{mode}</span></h1>
                <p className="text-amber-100/60 font-lora italic text-lg max-w-xl mx-auto">Input your temporal coordinates to reveal the patterns of your destiny.</p>
            </div>

            <div className="grid lg:grid-cols-12 gap-12 items-start">
                <div className="lg:col-span-5">
                    <Card className="p-8 bg-black/40 border-2 border-amber-500/20 rounded-[2.5rem] shadow-2xl">
                        <form onSubmit={handleGetReading} className="space-y-6">
                            <div><label className="block text-amber-200 mb-2 font-cinzel text-[10px] font-black uppercase tracking-widest">Full Name</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-black/40 border border-amber-500/20 rounded-2xl text-white outline-none focus:border-amber-400 shadow-inner" placeholder="Enter Full Name" /></div>
                            <SmartDatePicker value={formData.dob} onChange={d => setFormData({...formData, dob: d})} />
                            {mode === 'astrology' && (<><SmartCitySearch value={formData.pob} onChange={(c, co) => { setFormData({...formData, pob: c}); if(co) setCoords(co); }} /><SmartTimePicker value={formData.tob} date={formData.dob} onChange={t => setFormData({...formData, tob: t})} /></>)}
                            <Button type="submit" disabled={isLoading} className="w-full py-5 bg-gradient-to-r from-amber-600 to-amber-900 shadow-xl font-cinzel font-black uppercase tracking-[0.2em]">{isLoading ? 'Consulting Akasha...' : 'Unlock Destiny'}</Button>
                        </form>
                    </Card>
                </div>

                <div className="lg:col-span-7">
                    {isLoading && <div className="max-w-md mx-auto mt-20"><ProgressBar progress={progress} message="Aligning Planets..." /></div>}
                    {error && <InlineError message={error} onRetry={handleGetReading} />}
                    {reading && !isLoading && (
                        <div className="space-y-10 animate-fade-in-up">
                            <div className="bg-[#fffcf0] text-black p-8 md:p-12 rounded-[2rem] shadow-2xl relative overflow-hidden report-canvas sacred-boundary">
                                <h3 className="text-2xl font-cinzel font-black text-amber-950 uppercase tracking-widest mb-6 border-b-2 border-amber-900/10 pb-4">Oracle Findings</h3>
                                {!isPaid ? (
                                    <div className="space-y-8">
                                        <div className="p-6 bg-amber-900/5 rounded-2xl border border-amber-900/10 italic text-amber-950 font-lora leading-relaxed text-lg line-clamp-4">"{reading}"</div>
                                        <div className="flex flex-col items-center">
                                            <Button onClick={() => openPayment(() => setIsPaid(true), `Imperial ${mode} Report`, servicePrice)} className="px-12 py-5 bg-[#2d0a18] hover:bg-[#4a0404] text-white rounded-full font-cinzel font-black uppercase tracking-[0.2em] shadow-2xl transition-all">Reveal Full Decree</Button>
                                            {isAdmin && <button onClick={() => setIsPaid(true)} className="mt-4 text-[9px] text-amber-900/40 uppercase underline">Master Access</button>}
                                        </div>
                                    </div>
                                ) : (
                                    <FullReport reading={reading} title={`${mode} Decree`} subtitle="The Eternal Cycle" imageUrl={cloudManager.resolveImage(reportImage)} chartData={engineData} />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default NumerologyAstrology;
