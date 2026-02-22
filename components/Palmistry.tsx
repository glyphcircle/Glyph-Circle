// Palmistry.tsx — FIXED & ALIGNED
// ✅ Camera capture (front/back) + gallery upload
// ✅ useTheme from ThemeContext (not useDb hack)
// ✅ resolveService for dynamic price
// ✅ saveReading + recordTransaction in generator callback
// ✅ Camera stream cleanup on unmount
// ✅ reportImage passed to ReportRenderer
// ✅ Mobile touch targets (min-h-[44px])
// ✅ Removed unused usePayment import

import React, {
  useState, useCallback, useRef, useEffect, useMemo
} from 'react';
import { useServicePayment } from '../hooks/useServicePayment';
import { getPalmReading } from '../services/aiService';
import { calculatePalmistry, PalmAnalysis } from '../services/palmistryEngine';
import { dbService } from '../services/db';
import { resolveService } from '../services/serviceRegistry';
import Button from './shared/Button';
import ProgressBar from './shared/ProgressBar';
import { useTranslation } from '../hooks/useTranslation';
import ReportRenderer from './reports/ReportRenderer';
import { useAuth } from '../context/AuthContext';
import { useDb } from '../hooks/useDb';
import { useTheme } from '../context/ThemeContext';          // ✅ proper import
import { cloudManager } from '../services/cloudManager';
import SmartBackButton from './shared/SmartBackButton';
import { reportStateManager } from '../services/reportStateManager';
import ServiceResult from './ServiceResult';
import ReportLoader from './ReportLoader';
import ErrorBoundary from './shared/ErrorBoundary';

// ─── Component ────────────────────────────────────────────────────────────────

const Palmistry: React.FC = () => {

  // ── Image / camera state ───────────────────────────────────────────────────
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Camera
  const [cameraMode, setCameraMode] = useState<'off' | 'front' | 'back'>('off');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Report state ───────────────────────────────────────────────────────────
  const [readingText, setReadingText] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<PalmAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
  const [retrievedTx, setRetrievedTx] = useState<any>(null);
  const [servicePrice, setServicePrice] = useState(49);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const { db } = useDb();
  const { theme } = useTheme();                       // ✅ proper hook
  const isLight = theme.mode === 'light';

  const reportAge = useMemo(
    () => reportStateManager.getReportAge('palmistry'),
    []
  );

  // ── Derived ────────────────────────────────────────────────────────────────
  const isAdmin = user?.role === 'admin';

  const reportImageRaw =
    db.image_assets?.find((a: any) => a.id === 'report_bg_palmistry')?.path ||
    'https://images.unsplash.com/photo-1542553457-3f92a3449339?q=80&w=800';

  // ✅ Handle both string and cloud object
  const reportImage = typeof reportImageRaw === 'string'
    ? reportImageRaw
    : cloudManager.resolveImage(reportImageRaw);

  const siteLogo = useMemo(() => {
    const logoAsset = db.image_assets?.find((a: any) => a.id === 'site_logo');
    if (logoAsset?.path) {
      return typeof logoAsset.path === 'string'
        ? logoAsset.path
        : cloudManager.resolveImage(logoAsset.path);
    }
    return '/logo.png';
  }, [db.image_assets]);

  const getLanguageName = (code: string) => {
    const map: Record<string, string> = {
      en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', bn: 'Bengali',
      mr: 'Marathi', es: 'Spanish', fr: 'French', ar: 'Arabic', pt: 'Portuguese',
    };
    return map[code] || 'English';
  };

  // ── Dynamic price from serviceRegistry ────────────────────────────────────
  useEffect(() => {
    resolveService('palmistry').then(record => {
      if (record?.price != null) setServicePrice(record.price);
    });
  }, []);

  // ── useServicePayment ──────────────────────────────────────────────────────
  const { initiateFlow, isCheckingCache } = useServicePayment({
    serviceType: 'palmistry',

    onReportGenerated: () => {
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
      setReadingText(reading.content || '');
      setAnalysisData(reading.meta_data || null);
      setImagePreview(reading.image_url || null);
      setIsPaid(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  // ── Restore session ────────────────────────────────────────────────────────
  useEffect(() => {
    // Check sessionStorage first (from "View Report" redirect)
    const savedReport = sessionStorage.getItem('viewReport');
    if (savedReport) {
      try {
        const { reading: savedReading, timestamp } = JSON.parse(savedReport);
        if (Date.now() - timestamp < 300000 && savedReading.type === 'palmistry') {
          setReadingText(savedReading.content || '');
          setAnalysisData(savedReading.meta_data || null);
          setImagePreview(savedReading.image_url || null);
          setIsPaid(true);
          setIsRestored(true);
          sessionStorage.removeItem('viewReport');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      } catch {
        sessionStorage.removeItem('viewReport');
      }
    }

    // Fallback: reportStateManager
    const saved = reportStateManager.loadReportState('palmistry');
    if (saved?.reading) {
      setReadingText(saved.reading);
      setAnalysisData(saved.engineData || null);
      setIsPaid(saved.isPaid || false);
      setImagePreview(saved.formData?.preview || null);
      setIsRestored(true);
    }
  }, []);

  // ── Auto PDF download ──────────────────────────────────────────────────────
  useEffect(() => {
    const flag = sessionStorage.getItem('autoDownloadPDF');
    if (flag && isPaid && readingText) {
      sessionStorage.removeItem('autoDownloadPDF');
      setTimeout(() => {
        const btn = document.querySelector(
          '[data-report-download="true"]'
        ) as HTMLButtonElement | null;
        if (btn) btn.click();
      }, 1500);
    }
  }, [isPaid, readingText]);

  // ── Camera: cleanup on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [cameraStream]);

  // ── Camera: attach stream to video element ─────────────────────────────────
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(console.error);
    }
  }, [cameraStream]);

  // ─── Camera helpers ────────────────────────────────────────────────────────

  const openCamera = useCallback(async (facing: 'user' | 'environment') => {
    // Stop any existing stream first
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      setFacingMode(facing);
      setCameraStream(stream);
      setCameraMode(facing === 'user' ? 'front' : 'back');
      setError('');
    } catch (err: any) {
      console.error('❌ Camera error:', err);
      // Specific user-friendly messages
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device. Please upload an image instead.');
      } else {
        setError('Could not open camera. Please upload an image instead.');
      }
    }
  }, [cameraStream]);

  const closeCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setCameraMode('off');
  }, [cameraStream]);

  const flipCamera = useCallback(() => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    openCamera(next);
  }, [facingMode, openCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror front camera capture
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `palm-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setImageFile(file);
      setImagePreview(canvas.toDataURL('image/jpeg', 0.92));
      closeCamera();
    }, 'image/jpeg', 0.92);
  }, [facingMode, closeCamera]);

  // ── Gallery upload ─────────────────────────────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ── Analyze palm ───────────────────────────────────────────────────────────
  const handleAnalyzePalm = () => {
    if (!imageFile) return;

    setReadingText('');
    setIsLoading(true);
    setProgress(0);
    setError('');

    const timer = setInterval(() => {
      setProgress(p => p >= 90 ? p : p + Math.random() * 8);
    }, 600);

    getPalmReading(imageFile, getLanguageName(language))
      .then(res => {
        clearInterval(timer);
        setProgress(100);
        setReadingText(res.textReading);

        let analysis: PalmAnalysis | null = null;
        if (res.rawMetrics && typeof res.rawMetrics === 'object') {
          try {
            analysis = calculatePalmistry(res.rawMetrics);
          } catch (err) {
            console.warn('⚠️ Palmistry metrics calc failed:', err);
          }
        }
        setAnalysisData(analysis);

        reportStateManager.saveReportState('palmistry', {
          formData: { preview: imagePreview },
          reading: res.textReading,
          engineData: analysis,
          isPaid: false,
        });
      })
      .catch(err => {
        console.error('❌ Palmistry analysis error:', err);
        setError('Failed to analyze palm. Please try a clearer image.');
      })
      .finally(() => {
        clearInterval(timer);
        setIsLoading(false);
      });
  };

  // ── Read More → payment flow ───────────────────────────────────────────────
  const handleReadMore = async () => {
    if (!readingText) return;

    await initiateFlow(
      { name: user?.user_metadata?.full_name || user?.email, preview: imagePreview },
      async (paymentDetails?: any) => {
        // ✅ Save reading to DB
        const savedReading = await dbService.saveReading({
          user_id: user?.id,
          type: 'palmistry',
          title: 'Palmistry Reading',
          subtitle: user?.user_metadata?.full_name || 'Seeker',
          content: readingText,
          meta_data: analysisData,
          is_paid: true,
          image_url: imagePreview || undefined,
        });

        // ✅ Record transaction
        if (savedReading?.data?.id) {
          await dbService.recordTransaction({
            user_id: user?.id,
            service_type: 'palmistry',
            service_title: 'Palm Reading',
            amount: servicePrice,
            currency: 'INR',
            payment_method: paymentDetails?.method || 'manual',
            payment_provider: paymentDetails?.provider || 'manual',
            order_id: paymentDetails?.orderId || `PALM-ORD-${Date.now()}`,
            transaction_id: paymentDetails?.transactionId || `PALM-TXN-${Date.now()}`,
            reading_id: savedReading.data.id,
            status: 'success',
            metadata: {
              analysis_date: new Date().toISOString(),
              has_image: !!imagePreview,
            },
          });
        }

        return { textReading: readingText, rawMetrics: analysisData };
      }
    );
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const startNewReading = () => {
    setImageFile(null);
    setImagePreview(null);
    setReadingText('');
    setAnalysisData(null);
    setError('');
    setIsPaid(false);
    setRetrievedTx(null);
    setIsRestored(false);
    closeCamera();
    sessionStorage.removeItem('viewReport');
    reportStateManager.clearReportState('palmistry');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-12 items-center">
      <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
        <SmartBackButton label={t('backToHome')} className="mb-6" />

        {/* ── New reading button ── */}
        {(isPaid || retrievedTx || isRestored) && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={startNewReading}
              style={{ touchAction: 'manipulation' }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg transition-all min-h-[44px] flex items-center gap-2"
            >
              <span>✨</span><span>New Palm Reading</span>
            </button>
          </div>
        )}

        {/* ── Already purchased banner ── */}
        {retrievedTx && !isPaid && (
          <div className={`
            rounded-2xl p-6 mb-8 shadow-xl border-2 animate-fade-in-up
            ${isLight
              ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300'
              : 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/40'
            }
          `}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                  onClick={() => { setIsPaid(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ touchAction: 'manipulation' }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest min-h-[44px] transition-all"
                >
                  📄 View
                </button>
                <button
                  onClick={startNewReading}
                  style={{ touchAction: 'manipulation' }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest min-h-[44px] transition-all"
                >
                  ✨ New
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Restored session banner ── */}
        {isRestored && isPaid && !retrievedTx && (
          <div className="mb-4 p-3 bg-blue-900/20 text-blue-300 text-xs rounded-lg text-center border border-blue-500/20">
            ✅ Restored previous palm reading from {reportAge}m ago.
          </div>
        )}

        {/* ── Page header ── */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-cinzel font-bold text-amber-300 mb-2">
            🖐️ {t('aiPalmReading')}
          </h2>
          <p className="text-amber-100/70 text-sm md:text-base">
            {t('uploadPalmPrompt')}
          </p>
        </div>

        <div className="flex flex-col gap-8 items-center w-full">

          {/* ── Upload / Camera UI (hidden once reading exists) ── */}
          {!readingText && !isLoading && (
            <div className="w-full max-w-md">

              {/* ── Live camera view ── */}
              {cameraMode !== 'off' ? (
                <div className="relative w-full rounded-2xl overflow-hidden border-2 border-amber-400 bg-black">
                  {/* Video feed */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full aspect-[4/3] object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''
                      }`}
                  />
                  {/* Palm guide overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-64 border-2 border-dashed border-amber-400/60 rounded-3xl opacity-70" />
                    <span className="absolute bottom-24 text-amber-300 text-xs font-medium tracking-wider">
                      Place palm inside the frame
                    </span>
                  </div>
                  {/* Camera controls */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
                    {/* Capture */}
                    <button
                      onClick={capturePhoto}
                      style={{ touchAction: 'manipulation' }}
                      className="w-16 h-16 rounded-full bg-white border-4 border-amber-400 shadow-lg flex items-center justify-center text-2xl active:scale-95 transition-transform"
                      aria-label="Capture"
                    >
                      📸
                    </button>
                    {/* Flip camera */}
                    <button
                      onClick={flipCamera}
                      style={{ touchAction: 'manipulation' }}
                      className="w-12 h-12 rounded-full bg-black/60 border border-amber-400/50 flex items-center justify-center text-xl active:scale-95 transition-transform self-center"
                      aria-label="Flip camera"
                    >
                      🔄
                    </button>
                    {/* Close */}
                    <button
                      onClick={closeCamera}
                      style={{ touchAction: 'manipulation' }}
                      className="w-12 h-12 rounded-full bg-black/60 border border-red-400/50 flex items-center justify-center text-xl active:scale-95 transition-transform self-center"
                      aria-label="Close camera"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Upload area ── */
                <>
                  <label htmlFor="palm-upload" className="w-full cursor-pointer">
                    <div className={`
                      w-full h-64 border-2 border-dashed rounded-2xl
                      flex flex-col justify-center items-center gap-3
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
                          className="object-contain h-full w-full rounded-xl"
                        />
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-12 w-12 ${isLight ? 'text-green-600' : 'text-amber-400'}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                            />
                          </svg>
                          <span className={`text-sm font-medium ${isLight ? 'text-green-700' : 'text-amber-200'
                            }`}>
                            {t('uploadInstruction')}
                          </span>
                          <span className={`text-xs ${isLight ? 'text-green-500' : 'text-amber-400/60'
                            }`}>
                            Tap to choose from gallery
                          </span>
                        </>
                      )}
                    </div>
                  </label>
                  <input
                    id="palm-upload"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </>
              )}

              {/* ── Camera open buttons (shown when no image yet) ── */}
              {!imagePreview && cameraMode === 'off' && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => openCamera('environment')}
                    style={{ touchAction: 'manipulation' }}
                    className={`
                      flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                      border-2 font-semibold text-sm transition-all min-h-[48px]
                      ${isLight
                        ? 'border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100'
                        : 'border-amber-500/50 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40'
                      }
                    `}
                  >
                    <span className="text-lg">📷</span>
                    <span>Back Camera</span>
                  </button>
                  <button
                    onClick={() => openCamera('user')}
                    style={{ touchAction: 'manipulation' }}
                    className={`
                      flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                      border-2 font-semibold text-sm transition-all min-h-[48px]
                      ${isLight
                        ? 'border-purple-400 bg-purple-50 text-purple-800 hover:bg-purple-100'
                        : 'border-purple-500/50 bg-purple-900/20 text-purple-300 hover:bg-purple-900/40'
                      }
                    `}
                  >
                    <span className="text-lg">🤳</span>
                    <span>Front Camera</span>
                  </button>
                </div>
              )}

              {/* ── Change image / Analyze buttons ── */}
              {imagePreview && cameraMode === 'off' && (
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    style={{ touchAction: 'manipulation' }}
                    className="flex-1 py-3 border-2 border-amber-500/40 text-amber-300 rounded-xl text-sm font-semibold hover:bg-amber-900/20 transition-all min-h-[48px]"
                  >
                    🔄 Change
                  </button>
                  <Button
                    onClick={handleAnalyzePalm}
                    disabled={isLoading}
                    style={{ touchAction: 'manipulation' }}
                    className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 min-h-[48px]"
                  >
                    {isLoading ? t('analyzing') : t('getYourReading')}
                  </Button>
                </div>
              )}

              {/* Error message */}
              {error && (
                <p className="mt-3 text-red-400 text-sm text-center font-medium">{error}</p>
              )}
            </div>
          )}

          {/* ── Report area ── */}
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
                <ErrorBoundary>
                  <ReportRenderer
                    reading={readingText}
                    category="palmistry"
                    title="Palmistry Analysis"
                    subtitle={user?.user_metadata?.full_name || 'Seeker'}
                    chartData={analysisData}
                    imageUrl={reportImage}
                  />
                </ErrorBoundary>
              </div>
            )}
          </div>
        </div>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* ── isCheckingCache overlay ── */}
      {isCheckingCache && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[250] p-4">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 md:p-10 rounded-3xl shadow-2xl border border-amber-500/30 max-w-md w-full text-center">
            <div className="w-24 h-24 mx-auto mb-8 relative">
              <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-amber-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-3 border-4 border-amber-500/10 rounded-full"></div>
              <div
                className="absolute inset-3 border-4 border-b-amber-400 border-t-transparent border-r-transparent border-l-transparent rounded-full animate-spin"
                style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
              ></div>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-wide">
              Checking Registry
            </h3>
            <p className="text-gray-300 mb-2 text-base md:text-lg">
              Verifying your purchase history
            </p>
            <p className="text-gray-500 text-sm">
              Consulting the akashic records...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Palmistry;
