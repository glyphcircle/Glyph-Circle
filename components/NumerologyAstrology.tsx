import React, { useState, useCallback, useRef, useEffect } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { getAstroNumeroReading } from '../services/geminiService';
import { calculateNumerology } from '../services/numerologyEngine';
import { calculateAstrology, AstroChart } from '../services/astrologyEngine';
import Button from './shared/Button';
import ProgressBar from './shared/ProgressBar';
import Card from './shared/Card';
import Modal from './shared/Modal';
import { useTranslation } from '../hooks/useTranslation';
import { usePayment } from '../context/PaymentContext';
import FullReport from './FullReport';
import { useDb } from '../hooks/useDb';
import { useAuth } from '../context/AuthContext';
import { SmartDatePicker, SmartTimePicker, SmartCitySearch } from './SmartAstroInputs';
import { validationService } from '../services/validationService';
import { cloudManager } from '../services/cloudManager';

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
  const [showF4Help, setShowF4Help] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { t, language } = useTranslation();
  const { openPayment } = usePayment();
  const { db } = useDb();
  const { user, saveReading } = useAuth();

  const ADMIN_EMAILS = ['master@gylphcircle.com', 'admin@gylphcircle.com', 'admin@glyph.circle'];
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  const serviceConfig = db.services?.find((s: any) => s.id === mode);
  const servicePrice = serviceConfig?.price || (mode === 'astrology' ? 99 : 49);

  const assetId = mode === 'numerology' ? 'report_bg_numerology' : 'report_bg_astrology';
  const reportImage = db.image_assets?.find((a: any) => a.id === assetId)?.path 
      || db.services?.find((s:any) => s.id === mode)?.image 
      || "https://images.unsplash.com/photo-1509228627129-6690a87531bc?q=80&w=800";

  useEffect(() => {
    const cached = localStorage.getItem('glyph_user_details');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setFormData(prev => ({ ...prev, name: parsed.name || '', dob: parsed.dob || '', tob: parsed.tob || '', pob: parsed.pob || '' }));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
      setReading('');
      setEngineData(null);
      setIsPaid(false);
      setError('');
  }, [mode]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'F4') {
              e.preventDefault();
              setShowF4Help(true);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSmartDateChange = (date: string) => { setFormData(prev => ({ ...prev, dob: date })); setError(''); };
  const handleSmartTimeChange = (time: string) => { setFormData(prev => ({ ...prev, tob: time })); setError(''); };
  const handleSmartCityChange = (city: string, coordinates?: {lat: number, lng: number}) => {
      setFormData(prev => ({ ...prev, pob: city }));
      if (coordinates) setCoords(coordinates);
      setError('');
  };

  const validateForm = () => {
    if (!validationService.isValidName(formData.name)) return t('invalidName') || 'Please enter a valid name.';
    if (!validationService.isValidDate(formData.dob)) return t('invalidDob') || 'Please enter a valid Date of Birth.';
    if (mode === 'astrology') {
        if (!validationService.isNotEmpty(formData.pob)) return t('invalidPob') || 'Place of Birth is required for Astrology.';
        if (!validationService.isValidTime(formData.tob)) return t('invalidTob') || 'Valid Time of Birth is required for Astrology.';
    }
    return '';
  };

  const getLanguageName = (code: string) => {
      const map: Record<string, string> = { en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', bn: 'Bengali', mr: 'Marathi', es: 'Spanish', fr: 'French', ar: 'Arabic', pt: 'Portuguese' };
      return map[code] || 'English';
  };

  const handleGetReading = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setShowF4Help(false);
    const validationError = validateForm();
    if (validationError) {
        setError(validationError);
        return;
    }

    localStorage.setItem('glyph_user_details', JSON.stringify({ 
        name: formData.name, 
        dob: formData.dob,
        pob: formData.pob,
        tob: formData.tob
    }));

    setIsLoading(true);
    setProgress(0);
    setReading('');
    setEngineData(null);
    setError('');
    setIsPaid(false);

    const timer = setInterval(() => { setProgress(prev => (prev >= 90 ? prev : prev + (Math.random() * 5))); }, 500);

    let retryCount = 0;
    const maxRetries = 2;

    const performRetrieval = async () => {
        try {
          let calculatedStats = null;
          if (mode === 'numerology') {
              calculatedStats = calculateNumerology({ name: formData.name, dob: formData.dob, system: 'chaldean' });
              calculatedStats = { ...calculatedStats, vedicGrid: {} };
          } else {
              calculatedStats = calculateAstrology({ name: formData.name, dob: formData.dob, tob: formData.tob, pob: formData.pob, lat: coords?.lat, lng: coords?.lng });
          }
          setEngineData(calculatedStats);

          const result = await getAstroNumeroReading({ mode, ...formData, language: getLanguageName(language) });
          
          if (!result.reading || result.reading.length < 20) throw new Error("Incomplete reading");

          clearInterval(timer);
          setProgress(100);
          setReading(result.reading);

          const featureName = mode === 'astrology' ? t('astrology') : t('numerology');
          saveReading({
              type: mode,
              title: `${featureName} for ${formData.name}`,
              content: result.reading,
              image_url: cloudManager.resolveImage(reportImage),
              meta_data: calculatedStats
          });

        } catch (err: any) {
          if (retryCount < maxRetries) {
              retryCount++;
              console.warn(`Retry attempt ${retryCount}...`);
              await performRetrieval();
          } else {
              clearInterval(timer);
              setError(`The Oracle is currently busy. Please try again in a few moments.`);
          }
        }
    };

    await performRetrieval();
    setIsLoading(false);
  }, [formData, mode, language, t, coords, saveReading, db, reportImage]);
  
  const handleReadMore = () => {
    const title = mode === 'astrology' ? 'Astrology Reading' : 'Numerology Reading';
    openPayment(() => {
        setIsPaid(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, title, servicePrice);
  };

  useEffect(() => {
    if ((reading || engineData) && !isLoading && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0F0F23';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 2;
        ctx.strokeRect(5, 5, canvas.width-10, canvas.height-10);
        ctx.fillStyle = '#F59E0B'; ctx.font = '20px Cinzel'; ctx.textAlign = 'center';
        ctx.fillText(mode.toUpperCase(), canvas.width/2, canvas.height/2);
    }
  }, [reading, engineData, mode, isLoading]);

  const featureName = mode === 'astrology' ? t('astrology') : t('numerology');
  const featureTitle = mode === 'astrology' ? t('astrologyReading') : t('numerologyReading');

  return (
    <>
      <div className="max-w-4xl mx-auto relative">
          <Link to="/home" className="inline-flex items-center text-amber-200 hover:text-amber-400 transition-colors mb-4 group">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              {t('backToHome')}
          </Link>

        <Card>
          <div className="p-6">
            <h2 className="text-3xl font-bold text-center text-amber-300 mb-2">{featureTitle}</h2>
            <p className="text-center text-amber-100 mb-8">{t('enterDetailsPrompt', { featureName: featureName.toLowerCase() })}</p>

            <form onSubmit={handleGetReading} className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="md:col-span-2">
                <label className="block text-amber-200 mb-1 font-cinzel text-xs font-bold uppercase tracking-widest">{t('fullName')}</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full p-3 bg-gray-900 border border-amber-500/30 rounded-lg text-amber-50 placeholder-gray-600 font-mono text-sm" placeholder="e.g. John Doe" />
              </div>
              <div className={mode === 'numerology' ? "md:col-span-2" : ""}><SmartDatePicker value={formData.dob} onChange={handleSmartDateChange} /></div>
              {mode === 'astrology' && (<><div><SmartCitySearch value={formData.pob} onChange={handleSmartCityChange} /></div><div><SmartTimePicker value={formData.tob} date={formData.dob} onChange={handleSmartTimeChange} /></div></>)}
              <div className="md:col-span-2 text-center">
                  <Button type="submit" disabled={isLoading} className="mt-4 w-full md:w-auto px-12 bg-gradient-to-r from-amber-700 to-maroon-800 border-amber-500/50">{isLoading ? t('generating') : "Reveal My Destiny"}</Button>
              </div>
            </form>
            {error && <p className="text-red-400 text-center mb-4 bg-red-900/20 p-2 rounded animate-pulse">{error}</p>}
          </div>
        </Card>
        
        {(isLoading || reading) && (
          <Card className="mt-8 animate-fade-in-up">
              <div className="p-6">
                  <h3 className="text-2xl font-semibold text-amber-300 mb-4 text-center">{t('yourSummary', { featureName })}</h3>
                  {isLoading && <ProgressBar progress={progress} message={`Consulting the ${mode === 'astrology' ? 'Stars' : 'Numbers'}...`} estimatedTime="Approx. 8 seconds" />}
                  {reading && !isLoading && (
                      <div className="w-full">
                          {!isPaid ? (
                              <div className="grid md:grid-cols-2 gap-8 items-center">
                                  <div className="bg-black/40 p-4 rounded-lg border border-amber-500/20 flex justify-center"><canvas ref={canvasRef} width={300} height={300} className="max-w-full h-auto rounded shadow-lg bg-[#1a1a1a]" /></div>
                                  <div className="space-y-4 text-amber-100">
                                      <div className="whitespace-pre-wrap italic font-lora border-l-2 border-amber-500/30 pl-4 text-sm opacity-80 line-clamp-6">{reading}</div>
                                      <div className="pt-4 border-t border-amber-500/20 flex flex-col gap-2">
                                          <Button onClick={handleReadMore} className="w-full bg-gradient-to-r from-amber-600 to-maroon-700 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]">{t('readMore')}</Button>
                                          {isAdmin && <button onClick={() => setIsPaid(true)} className="text-xs text-amber-500 hover:text-amber-300 underline font-mono">👑 Admin Access: Skip Payment</button>}
                                      </div>
                                  </div>
                              </div>
                          ) : (
                              <FullReport reading={reading} title={t('yourSummary', { featureName })} imageUrl={reportImage} chartData={engineData} />
                          )}
                      </div>
                  )}
              </div>
          </Card>
        )}
        <Modal isVisible={showF4Help} onClose={() => setShowF4Help(false)}>
            <div className="p-6 bg-gray-900 text-amber-50 relative">
                <div className="flex items-center gap-3 mb-6 border-b border-amber-500/30 pb-4"><div className="w-10 h-10 bg-purple-900 rounded-full flex items-center justify-center text-xl shadow-lg border border-purple-500/50">✨</div><div><h3 className="text-xl font-cinzel font-bold text-amber-300">Astro-Smart Entry</h3><p className="text-[10px] text-gray-400 font-mono">INTELLIGENT DATA VALIDATION WIZARD</p></div></div>
                <div className="space-y-6">
                    <div className="bg-black/30 p-4 rounded-lg border border-amber-500/20"><SmartDatePicker value={formData.dob} onChange={handleSmartDateChange} /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-black/30 p-4 rounded-lg border border-amber-500/20"><SmartCitySearch value={formData.pob} onChange={handleSmartCityChange} /></div>
                        <div className="bg-black/30 p-4 rounded-lg border border-amber-500/20"><SmartTimePicker value={formData.tob} date={formData.dob} onChange={handleSmartTimeChange} /></div>
                    </div>
                    <div className="flex gap-4 pt-4"><button onClick={() => setShowF4Help(false)} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg font-bold border border-gray-600 transition-colors">Cancel</button><Button onClick={(e) => handleGetReading(e)} className="flex-1 bg-gradient-to-r from-purple-700 to-indigo-900 border-purple-500">Generate Reading ✨</Button></div>
                </div>
            </div>
        </Modal>
      </div>
    </>
  );
};

export default NumerologyAstrology;