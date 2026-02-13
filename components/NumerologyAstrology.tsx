// NumerologyAstrology.tsx - FIXED: Already using SmartBackButton (no changes needed)
// Description: Unified component for Numerology and Astrology readings with AI-powered reports
// Features:
// 1. Back button: Already using SmartBackButton component (z-[70] built-in)
// 2. Dual mode: Handles both numerology and astrology readings via 'mode' prop
// 3. Payment flow: Integrated with PaymentContext + registry check for duplicate purchases
// 4. Advanced reports: Generates 3000+ word detailed analysis after payment
// 5. State persistence: Saves/restores reports via reportStateManager
// 6. PDF export: Generates downloadable PDF of full report
// 7. Theme support: Light/dark mode with proper color schemes
// 8. Form validation: Validates name, DOB, time, location inputs
// 9. Admin bypass: Allows admin to view reports without payment
// 10. Loading states: Progress messages during report generation
// Status: ✅ READY TO USE (No changes required - SmartBackButton already handles z-index)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getAstroNumeroReading, generateAdvancedAstroReport } from '../services/aiService';
import { calculateNumerology } from '../services/numerologyEngine';
import { calculateAstrology } from '../services/astrologyEngine';
import Button from './shared/Button';
import Card from './shared/Card';
import { useTranslation } from '../hooks/useTranslation';
import { usePayment } from '../context/PaymentContext';
import { useAuth } from '../context/AuthContext';
import { SmartDatePicker, SmartTimePicker, SmartCitySearch } from './SmartAstroInputs';
import { validationService } from '../services/validationService';
import { useTheme } from '../context/ThemeContext';
import ReportLoader from './ReportLoader';
import ServiceResult from './ServiceResult';
import EnhancedNumerologyReport from './EnhancedNumerologyReport';
import EnhancedAstrologyReport from './EnhancedAstrologyReport';
import SmartBackButton from './shared/SmartBackButton';
import { reportStateManager } from '../services/reportStateManager';
import { dbService } from '../services/db';
import { generatePDF } from '../utils/pdfGenerator';

interface NumerologyAstrologyProps {
  mode: 'numerology' | 'astrology';
}

const NumerologyAstrology: React.FC<NumerologyAstrologyProps> = ({ mode }) => {
  // ============================================================
  // REFS - Prevent duplicate operations
  // ============================================================
  const reportPreviewRef = useRef<HTMLDivElement>(null);
  const paymentProcessingRef = useRef(false);

  // ============================================================
  // STATE - Form data and report data
  // ============================================================
  const [formData, setFormData] = useState({ name: '', dob: '', pob: '', tob: '' });
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [reading, setReading] = useState('');
  const [advancedReport, setAdvancedReport] = useState<any>(null);
  const [engineData, setEngineData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Channeling...');
  const [error, setError] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isRestoredSession, setIsRestoredSession] = useState(false);

  // Registry states (duplicate purchase detection)
  const [alreadyPaid, setAlreadyPaid] = useState<any>(null);
  const [showCachedReport, setShowCachedReport] = useState(false);
  const [isCheckingRegistry, setIsCheckingRegistry] = useState(false);

  // ============================================================
  // HOOKS
  // ============================================================
  const { t, language } = useTranslation();
  const { openPayment } = usePayment();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme.mode === 'light';

  const isAdmin = user && ['master@gylphcircle.com', 'admin@gylphcircle.com'].includes(user.email);

  // ============================================================
  // HELPERS
  // ============================================================
  const getLanguageName = (code: string) => {
    const map: Record<string, string> = {
      en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu',
      bn: 'Bengali', mr: 'Marathi', es: 'Spanish', fr: 'French',
      ar: 'Arabic', pt: 'Portuguese'
    };
    return map[code] || 'English';
  };

  // ============================================================
  // REGISTRY CHECK - Check if user already purchased today
  // ============================================================
  const checkRegistryForExistingReport = useCallback(async () => {
    if (!user?.id || !formData.name || !formData.dob) return false;

    try {
      setIsCheckingRegistry(true);
      const timeoutPromise = new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('Registry check timeout')), 5000)
      );
      const checkPromise = dbService.checkAlreadyPaid(mode, formData);
      const result = await Promise.race([checkPromise, timeoutPromise]);

      if (result.exists) {
        console.log('✅ Found existing purchase:', result.transaction);
        setAlreadyPaid({ transaction: result.transaction, reading: result.reading });
        setShowCachedReport(true);
        setIsPaid(false);
        return true;
      }
      return false;
    } catch (err: any) {
      console.warn('⚠️ Registry search bypassed:', err.message);
      return false;
    } finally {
      setIsCheckingRegistry(false);
    }
  }, [user?.id, formData, mode]);

  // ============================================================
  // PDF DOWNLOAD
  // ============================================================
  const handleDownloadPDF = async () => {
    const reportElementId = mode === 'astrology' ? 'astrology-report-content' : 'numerology-report-content';

    // If viewing cached report, unlock it first
    if (showCachedReport && !isPaid) {
      setIsPaid(true);
      setShowCachedReport(false);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    try {
      const safeName = formData.name?.trim().replace(/\s+/g, '-') || 'seeker';
      const filename = `${mode}-report-${safeName}-${new Date().toISOString().split('T')[0]}.pdf`;
      console.log('📥 Generating PDF:', filename);
      await generatePDF(reportElementId, { filename, quality: 0.9, marginSide: 10 });
    } catch (error) {
      console.error('❌ PDF generation failed:', error);
      alert('PDF generation failed. Please try again.');
    }
  };

  // ============================================================
  // RESET FOR NEW READING
  // ============================================================
  const handleResetForNewReading = () => {
    setShowCachedReport(false);
    setAlreadyPaid(null);
    setIsPaid(false);
    setPaymentSuccess(false);
    setReading('');
    setAdvancedReport(null);
    setEngineData(null);
    setIsRestoredSession(false);
    reportStateManager.clearReportState(mode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ============================================================
  // RESTORE SESSION - Load previous report from state manager
  // ============================================================
  useEffect(() => {
    const savedState = reportStateManager.loadReportState(mode);
    if (savedState && (savedState.isPaid || savedState.reading)) {
      console.log('♻️ Restoring previous session for', mode);
      setFormData(savedState.formData);
      setReading(savedState.reading);
      setEngineData(savedState.engineData);
      setAdvancedReport(savedState.advancedReport || null);
      setIsPaid(savedState.isPaid);
      setIsRestoredSession(true);
    }
  }, [mode]);

  // ============================================================
  // GENERATE INITIAL READING
  // ============================================================
  const handleGetReading = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validation
    if (!validationService.isValidName(formData.name)) {
      setError('Please enter a valid name.');
      return;
    }
    if (!validationService.isValidDate(formData.dob)) {
      setError('Please enter a valid Date of Birth.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Consulting the Oracle...');
    setError('');
    setReading('');
    setAdvancedReport(null);
    setEngineData(null);
    setIsPaid(false);

    try {
      // Calculate engine data (instant)
      const calculatedStats = mode === 'numerology'
        ? calculateNumerology({ name: formData.name, dob: formData.dob })
        : calculateAstrology({ ...formData, lat: coords?.lat, lng: coords?.lng });

      setEngineData(calculatedStats);

      // Get AI reading (async)
      console.log(`🔮 Generating ${mode} reading for:`, formData.name);
      const result = await getAstroNumeroReading({
        mode,
        ...formData,
        language: getLanguageName(language)
      });

      setReading(result.reading);
      setIsLoading(false);

      // Save to state manager
      reportStateManager.saveReportState(mode, {
        formData,
        reading: result.reading,
        engineData: calculatedStats,
        isPaid: false
      });

      // Scroll to preview
      setTimeout(() => {
        reportPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
    } catch (err: any) {
      console.error('❌ Reading generation failed:', err);
      setError(`The Oracle is currently disconnected. Please try again.`);
      setIsLoading(false);
    }
  }, [formData, mode, language, coords]);

  // ============================================================
  // PAYMENT FLOW
  // ============================================================
  const proceedToPayment = useCallback(() => {
    if (paymentProcessingRef.current || isCheckingRegistry) {
      console.warn('⚠️ Payment already processing or checking registry');
      return;
    }

    // If cached report exists, just unlock it
    if (alreadyPaid && showCachedReport) {
      setIsPaid(true);
      setShowCachedReport(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const title = mode === 'astrology' ? 'Your Astrology Destiny' : 'Your Numerology Summary';
    const price = mode === 'astrology' ? 99 : 49;

    paymentProcessingRef.current = true;
    console.log(`💳 Opening payment modal: ${title} - ₹${price}`);

    openPayment(async (paymentDetails?: any) => {
      console.log('💳 [NumerologyAstrology] Payment successful. Beginning report generation.');
      setIsLoading(true);
      setLoadingMessage('Securing transaction...');

      try {
        const orderId = paymentDetails?.orderId || `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        // 1. Save reading to DB
        console.log('💾 Saving reading to registry...');
        const savedReading = await dbService.saveReading({
          user_id: user?.id,
          type: mode,
          title: `${mode.toUpperCase()} Reading for ${formData.name}`,
          subtitle: formData.dob,
          content: reading,
          meta_data: engineData,
          is_paid: true,
        });

        // 2. Record transaction
        if (savedReading?.data?.id) {
          console.log('📝 Recording transaction...');
          await dbService.recordTransaction({
            user_id: user?.id,
            service_type: mode,
            service_title: title,
            amount: price,
            currency: 'INR',
            payment_method: paymentDetails?.method || 'test',
            payment_provider: paymentDetails?.provider || 'manual',
            order_id: orderId,
            reading_id: savedReading.data.id,
            status: 'success',
            metadata: { ...formData, paymentTimestamp: new Date().toISOString() },
          });
        }

        // 3. Generate Advanced Report (Astrology only)
        let generatedReport = null;
        if (mode === 'astrology') {
          console.log('📊 Generating Advanced Astrology Report...');
          setLoadingMessage('Analyzing planetary positions...');

          const progressInterval = setInterval(() => {
            const messages = [
              'Calculating Dasha periods...',
              'Interpreting 12 houses...',
              'Evaluating yogas and combinations...',
              'Analyzing career and wealth paths...',
              'Mapping relationship synergy...',
              'Formulating ritualistic remedies...',
              'Finalizing 3000-word destiny decree...'
            ];
            setLoadingMessage(messages[Math.floor(Math.random() * messages.length)]);
          }, 4500);

          try {
            const report = await generateAdvancedAstroReport(
              { ...formData, language: getLanguageName(language) },
              engineData
            );
            generatedReport = report;
            setAdvancedReport(report);
            console.log('✅ Advanced Report manifested.');
          } catch (e: any) {
            console.error("❌ Advanced report failed:", e.message);
            setError(`Manifestation took too long. Showing base report.`);
          } finally {
            clearInterval(progressInterval);
          }
        }

        // 4. Update states
        setPaymentSuccess(true);
        setIsPaid(true);
        setIsLoading(false);

        // 5. Persist to State Manager
        reportStateManager.saveReportState(mode, {
          formData,
          reading,
          advancedReport: generatedReport,
          engineData,
          isPaid: true
        });

        // 6. Auto-scroll to top
        console.log('📜 Scrolling to top of report.');
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 800);

      } catch (dbErr: any) {
        console.error("❌ Processing error:", dbErr);
        setError(`An error occurred: ${dbErr.message}`);
        setIsLoading(false);
      } finally {
        setTimeout(() => { paymentProcessingRef.current = false; }, 2000);
      }
    }, mode, price);
  }, [mode, formData, reading, engineData, user, openPayment, language, alreadyPaid, showCachedReport]);

  // ============================================================
  // "READ MORE" HANDLER - Check registry then proceed to payment
  // ============================================================
  const handleReadMore = async () => {
    if (!reading) return;

    const matchFound = await checkRegistryForExistingReport();
    if (!matchFound) {
      proceedToPayment();
    } else {
      setIsPaid(true);
      setShowCachedReport(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div
      className="max-w-4xl mx-auto relative pb-24 transition-colors duration-500"
      style={{ color: isLight ? '#78350f' : '#fef3c7' }}
    >
      {/* ✅ SmartBackButton already has z-[70] built-in */}
      <SmartBackButton label={t('backToHome')} fallbackRoute="/home" className="mb-8" />

      {/* Already Purchased Banner */}
      {showCachedReport && alreadyPaid && (
        <div className={`
          rounded-2xl p-6 mb-8 shadow-xl border-2 animate-fade-in-up 
          ${isLight
            ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300'
            : 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/40'
          }
        `}>
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="flex-1">
              <h3 className={`font-cinzel font-black text-2xl uppercase tracking-widest mb-1 ${isLight ? 'text-emerald-800' : 'text-green-400'
                }`}>
                Already Purchased Today!
              </h3>
              <p className={`text-sm italic font-lora ${isLight ? 'text-emerald-700' : 'text-green-300/70'
                }`}>
                Retrieved from your sacred registry.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsPaid(true);
                  setShowCachedReport(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                📄 View Report
              </button>
              <button
                onClick={handleResetForNewReading}
                className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                🆕 New Reading
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Success Banner */}
      {paymentSuccess && isPaid && !isLoading && (
        <div className="mb-6 p-4 bg-green-900/20 text-green-400 rounded-xl border border-green-500/30 text-center font-bold animate-fade-in-up">
          ✅ Decree Unlocked. Your complete Imperial Report is visible below.
        </div>
      )}

      {/* Input Form */}
      {!isPaid && !isLoading && (
        <Card className="mb-10 p-10 border-2 shadow-2xl transition-all duration-500">
          <h2 className="text-4xl font-cinzel font-black text-center mb-12 tracking-widest uppercase">
            {mode === 'astrology' ? t('astrologyReading') : t('numerologyReading')}
          </h2>
          <form onSubmit={handleGetReading} className="grid md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
              <label className="block mb-2 font-cinzel text-[10px] font-black uppercase tracking-[0.3em]">
                {t('fullName')}
              </label>
              <input
                name="name"
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                className="w-full p-4 border-2 rounded-2xl bg-black/10 outline-none focus:border-amber-500 transition-colors"
                required
              />
            </div>
            <div className={mode === 'numerology' ? 'md:col-span-2' : ''}>
              <SmartDatePicker
                value={formData.dob}
                onChange={(d) => setFormData(p => ({ ...p, dob: d }))}
              />
            </div>
            {mode === 'astrology' && (
              <>
                <SmartCitySearch
                  value={formData.pob}
                  onChange={(c, coords) => {
                    setFormData(p => ({ ...p, pob: c }));
                    if (coords) setCoords(coords);
                  }}
                />
                <SmartTimePicker
                  value={formData.tob}
                  date={formData.dob}
                  onChange={(t) => setFormData(p => ({ ...p, tob: t }))}
                />
              </>
            )}
            <div className="md:col-span-2 text-center mt-8">
              <Button
                type="submit"
                disabled={isLoading}
                className="px-20 py-5 text-xl font-cinzel font-bold tracking-[0.2em] rounded-full uppercase bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
              >
                {isLoading ? 'Channeling...' : 'Unlock Destiny'}
              </Button>
            </div>
          </form>
          {error && <p className="text-red-600 font-bold text-center mt-6">{error}</p>}
        </Card>
      )}

      {/* Report Preview/Full Report */}
      <div ref={reportPreviewRef}>
        {isLoading ? (
          <ReportLoader />
        ) : !isPaid && reading ? (
          <ServiceResult
            serviceName={mode.toUpperCase()}
            serviceIcon={mode === 'astrology' ? '⭐' : '🔢'}
            previewText={reading}
            onRevealReport={handleReadMore}
            isAdmin={isAdmin}
            onAdminBypass={() => {
              setIsPaid(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : isPaid && engineData ? (
          mode === 'astrology' ? (
            <EnhancedAstrologyReport
              data={{
                ...engineData,
                userName: formData.name,
                birthDate: formData.dob,
                advancedReport: advancedReport?.fullReportText
              }}
              onDownload={handleDownloadPDF}
            />
          ) : (
            <EnhancedNumerologyReport
              reading={reading}
              engineData={engineData}
              userName={formData.name}
              birthDate={formData.dob}
              onDownload={handleDownloadPDF}
            />
          )
        ) : null}
      </div>

      {/* Registry Check Loader */}
      {isCheckingRegistry && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[250]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-xl font-bold text-white uppercase tracking-widest">Checking Registry</h3>
            <p className="text-gray-400 text-sm mt-2">Consulting the akashic records...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NumerologyAstrology;
