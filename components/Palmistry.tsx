// Palmistry.tsx - COMPLETE & FIXED
// ✅ Fixed image resolution
// ✅ Fixed palmistry engine error handling
// ✅ All other features intact

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useServicePayment } from '../hooks/useServicePayment';
import { getPalmReading, translateText } from '../services/aiService';
import { calculatePalmistry, PalmAnalysis } from '../services/palmistryEngine';
import { dbService } from '../services/db';
import Button from './shared/Button';
import ProgressBar from './shared/ProgressBar';
import { useTranslation } from '../hooks/useTranslation';
import { usePayment } from '../context/PaymentContext';
import ReportRenderer from './reports/ReportRenderer';
import { useAuth } from '../context/AuthContext';
import { useDb } from '../hooks/useDb';
import { cloudManager } from '../services/cloudManager';
import InlineError from './shared/InlineError';
import Card from './shared/Card';
import SmartBackButton from './shared/SmartBackButton';
import { reportStateManager } from '../services/reportStateManager';
import ServiceResult from './ServiceResult';
import ReportLoader from './ReportLoader';

const Palmistry: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [readingText, setReadingText] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<PalmAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [isRestored, setIsRestored] = useState(false);

  const [retrievedTx, setRetrievedTx] = useState<any>(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);

  const { t, language } = useTranslation();
  const { openPayment } = usePayment();
  const { user } = useAuth();
  const { db } = useDb();
  const { theme } = (useDb() as any).theme || { theme: { mode: 'dark' } };
  const isLight = theme.mode === 'light';
  const reportAge = useMemo(() => {
    return reportStateManager.getReportAge('palmistry');
  }, []);
  const getLanguageName = (code: string) => {
    const map: Record<string, string> = {
      en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', bn: 'Bengali',
      mr: 'Marathi', es: 'Spanish', fr: 'French', ar: 'Arabic', pt: 'Portuguese'
    };
    return map[code] || 'English';
  };

  //  Get the logo from config
  const siteLogo = useMemo(() => {
    const logoAsset = db.image_assets?.find((a: any) => a.id === 'site_logo');
    if (logoAsset?.path) {
      return typeof logoAsset.path === 'string'
        ? logoAsset.path
        : cloudManager.resolveImage(logoAsset.path);
    }
    // Fallback logo
    return '/logo.png';
  }, [db.image_assets]);

  const { initiateFlow, isCheckingCache } = useServicePayment({
    serviceType: 'palmistry',

    onReportGenerated: (data) => {
      console.log('✅ [Palmistry] Report display triggered');
      setIsPaid(true);

      const current = reportStateManager.loadReportState('palmistry');
      if (current) {
        reportStateManager.saveReportState('palmistry', { ...current, isPaid: true });
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    onCacheRestored: (reading, transaction) => {
      console.log('✅ [Palmistry] Cache restored:', reading);
      setRetrievedTx(transaction);
      setReadingText(reading.content);
      setAnalysisData(reading.meta_data);
      setImagePreview(reading.image_url || null);
      setIsPaid(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  useEffect(() => {
    const savedReport = sessionStorage.getItem('viewReport');
    if (savedReport) {
      try {
        const { reading: savedReading, timestamp } = JSON.parse(savedReport);
        if (Date.now() - timestamp < 300000 && savedReading.type === 'palmistry') {
          setReadingText(savedReading.content);
          setAnalysisData(savedReading.meta_data);
          setIsPaid(true);
          setImagePreview(savedReading.image_url);
          setIsRestored(true);
          sessionStorage.removeItem('viewReport');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      } catch (e) {
        sessionStorage.removeItem('viewReport');
      }
    }

    const saved = reportStateManager.loadReportState('palmistry');
    if (saved) {
      setReadingText(saved.reading);
      setAnalysisData(saved.engineData);
      setIsPaid(saved.isPaid);
      setImagePreview(saved.formData?.preview || null);
      setIsRestored(true);
    }
  }, []);

  useEffect(() => {
    const flag = sessionStorage.getItem('autoDownloadPDF');
    if (flag && isPaid && readingText) {
      sessionStorage.removeItem('autoDownloadPDF');
      console.log('🚀 [Palmistry] Auto-triggering PDF download...');
      setTimeout(() => {
        const btn = document.querySelector('[data-report-download="true"]') as HTMLButtonElement | null;
        if (btn) {
          console.log('✅ PDF download button found, clicking...');
          btn.click();
        } else {
          console.warn('⚠️ PDF download button not found');
        }
      }, 1500);
    }
  }, [isPaid, readingText]);

  const isAdmin = user?.role === 'admin';
  const serviceConfig = db.services?.find((s: any) => s.id === 'palmistry');
  const servicePrice = serviceConfig?.price || 49;

  // ✅ FIXED: Don't use cloudManager.resolveImage() - image is already a URL
  const reportImage = serviceConfig?.image ||
    db.image_assets?.find((a: any) => a.id === 'report_bg_palmistry')?.path ||
    "https://images.unsplash.com/photo-1542553457-3f92a3449339?q=80&w=800";

  const startNewReading = () => {
    console.log('🆕 [Palmistry] Starting new reading');

    setImageFile(null);
    setImagePreview(null);
    setReadingText('');
    setAnalysisData(null);
    setError('');
    setIsPaid(false);
    setRetrievedTx(null);
    setIsRestored(false);

    sessionStorage.removeItem('viewReport');
    reportStateManager.clearReportState('palmistry');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReadMore = async () => {
    if (!readingText) return;

    await initiateFlow(
      { name: user?.name, dob: user?.dob, preview: imagePreview },
      async () => {
        return { textReading: readingText, rawMetrics: analysisData };
      }
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };
  // utils: parse and render colored bullet points
  const renderBulletReport = (text: string, isLight: boolean) => {
    if (!text) return null;

    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('✅') || l.startsWith('❌'));

    if (lines.length === 0) {
      // Fallback: render as plain paragraph if model didn't follow format
      return (
        <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
          {text}
        </p>
      );
    }

    return (
      <ul className="space-y-2">
        {lines.map((line, idx) => {
          const isPositive = line.startsWith('✅');
          const content = line.replace(/^[✅❌]\s*/, '');

          return (
            <li
              key={idx}
              className={`flex items-start gap-2 text-sm leading-relaxed px-3 py-2 rounded-lg border ${isPositive
                  ? isLight
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-green-950/30 border-green-800/50 text-green-300'
                  : isLight
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-red-950/30 border-red-800/50 text-red-300'
                }`}
            >
              <span className="text-base shrink-0 mt-0.5">
                {isPositive ? '✅' : '❌'}
              </span>
              {/* Render **bold** markdown inline */}
              <span
                dangerouslySetInnerHTML={{
                  __html: content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                }}
              />
            </li>
          );
        })}
      </ul>
    );
  };

  const handleAnalyzePalm = () => {
    if (!imageFile) return;

    setReadingText('');
    setIsLoading(true);
    setProgress(0);
    setError('');

    const timer = setInterval(() => {
      setProgress(p => p >= 90 ? p : p + (Math.random() * 8));
    }, 600);

    getPalmReading(imageFile, getLanguageName(language))
      .then(res => {
        clearInterval(timer);
        setProgress(100);
        setReadingText(res.textReading);

        // ✅ FIX: Check if rawMetrics exists before calculating
        let analysis = null;
        if (res.rawMetrics && typeof res.rawMetrics === 'object') {
          try {
            analysis = calculatePalmistry(res.rawMetrics);
          } catch (err) {
            console.warn('⚠️ Failed to calculate palmistry metrics:', err);
            // Continue without analysis data
          }
        }

        setAnalysisData(analysis);

        reportStateManager.saveReportState('palmistry', {
          formData: { preview: imagePreview },
          reading: res.textReading,
          engineData: analysis,
          isPaid: false
        });
      })
      .catch(err => {
        console.error('❌ Palmistry analysis error:', err);
        setError('Failed to analyze palm. Please try again.');
      })
      .finally(() => {
        clearInterval(timer);
        setIsLoading(false);
      });
  };

  return (
    <div className="flex flex-col gap-12 items-center">
      <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
        <SmartBackButton label={t('backToHome')} className="mb-6" />

        {(isPaid || retrievedTx || isRestored) && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={startNewReading}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg transition-all flex items-center gap-2"
            >
              <span>✨</span>
              <span>New Palm Reading</span>
            </button>
          </div>
        )}

        {retrievedTx && !isPaid && (
          <div className={`
            rounded-2xl p-6 mb-8 shadow-xl border-2 animate-fade-in-up
            ${isLight
              ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300'
              : 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/40'
            }
          `}>
            <div className="flex items-center justify-between gap-6">
              <div>
                <h3 className={`font-cinzel font-black text-xl uppercase ${isLight ? 'text-emerald-800' : 'text-green-400'
                  }`}>
                  Already Purchased This Year!
                </h3>
                <p className={`text-sm italic ${isLight ? 'text-emerald-700' : 'text-green-300/70'
                  }`}>
                  Entry retrieved from history.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPaid(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  📄 View
                </button>
                <button
                  onClick={startNewReading}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  ✨ New
                </button>
              </div>
            </div>
          </div>
        )}

        {isRestored && isPaid && !retrievedTx && (
          <div className="mb-4 p-3 bg-blue-900/20 text-blue-300 text-xs rounded-lg text-center border border-blue-500/20">
            ✅ Restored previous palm reading from {reportAge}m ago.
          </div>
        )}


        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-cinzel font-bold text-amber-300 mb-2">
            🖐️ {t('aiPalmReading')}
          </h2>
          <p className="text-amber-100/70">{t('uploadPalmPrompt')}</p>
        </div>

        <div className="flex flex-col gap-8 items-center w-full">
          {!readingText && !isLoading && (
            <div className="w-full max-w-md">
              <div className="w-full">
                <label htmlFor="palm-upload" className="w-full cursor-pointer">
                  <div className={`
                    w-full h-64 border-2 border-dashed rounded-lg 
                    flex flex-col justify-center items-center 
                    transition-colors relative overflow-hidden
                    ${isLight
                      ? 'border-green-400 bg-green-50 hover:bg-green-100'
                      : 'border-amber-400 bg-gray-900/50 hover:bg-amber-900/20'
                    }
                  `}>
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Palm preview"
                        className="object-contain h-full w-full rounded-lg"
                      />
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-12 w-12 mb-2 ${isLight ? 'text-green-600' : 'text-amber-400'}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                          />
                        </svg>
                        <span className={isLight ? 'text-green-700' : 'text-amber-200'}>
                          {t('uploadInstruction')}
                        </span>
                      </>
                    )}
                  </div>
                </label>
                <input
                  id="palm-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              {imageFile && (
                <Button
                  onClick={handleAnalyzePalm}
                  disabled={isLoading}
                  className="mt-6 w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                >
                  {isLoading ? t('analyzing') : t('getYourReading')}
                </Button>
              )}
            </div>
          )}

          <div className="w-full max-w-5xl">
            {isLoading && !readingText && (
              <ProgressBar progress={progress} message="Scanning Lines & Mounts..." />
            )}

            {readingText && !isPaid && (
              <div className="animate-fade-in-up">
                <ServiceResult
                  serviceName="PALMISTRY"
                  serviceIcon="🖐️"
                  previewText={readingText}
                  onRevealReport={handleReadMore}
                  isAdmin={isAdmin}
                  onAdminBypass={() => setIsPaid(true)}
                />
              </div>
            )}

            {isPaid && readingText && (
              <div className="animate-fade-in-up w-full">
                <ReportRenderer
                  reading={readingText}
                  category="palmistry"
                  title="Palmistry Analysis"
                  subtitle={user?.name || 'Seeker'}
                  chartData={analysisData}
                />
              </div>
            )}

          </div>
        </div>
      </div>

      {isCheckingCache && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[250]">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-10 rounded-3xl shadow-2xl border border-amber-500/30 max-w-md text-center">
            <div className="relative mb-8">
              <div className="w-24 h-24 mx-auto">
                <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-amber-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-3 border-4 border-amber-500/10 rounded-full"></div>
                <div className="absolute inset-3 border-4 border-b-amber-400 border-t-transparent border-r-transparent border-l-transparent rounded-full animate-spin-reverse" style={{ animationDuration: '1.5s' }}></div>
              </div>
            </div>
            <h3 className="text-3xl font-bold text-white mb-3 tracking-wide">Checking Registry</h3>
            <p className="text-gray-300 mb-2 text-lg">Verifying your purchase history</p>
            <p className="text-gray-500 text-sm mb-6">Consulting the akashic records for your payment seal...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Palmistry;
