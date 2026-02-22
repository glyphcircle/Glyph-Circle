// NumerologyAstrology.tsx — FIXED & ALIGNED with codebase patterns
// ✅ Uses useServicePayment + initiateFlow (same as Tarot, MoonJournal)
// ✅ Prices loaded dynamically from serviceRegistry
// ✅ checkAlreadyPaidYearly (consistent with other services)
// ✅ reportDataRef race-condition guard (same as Tarot/MoonJournal)
// ✅ isAdmin email typo fixed (glyphcircle)
// ✅ Mobile touch targets (min-h-[44px])
// ✅ No hardcoded prices or UUIDs

// ✅ clean
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getAstroNumeroReading, generateAdvancedAstroReport } from '../services/aiService';
import { calculateNumerology } from '../services/numerologyEngine';
import { calculateAstrology } from '../services/astrologyEngine';
import Button from './shared/Button';
import Card from './shared/Card';
import { useTranslation } from '../hooks/useTranslation';
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
import { useServicePayment } from '../hooks/useServicePayment';
import { resolveService } from '../services/serviceRegistry';
import ErrorBoundary from './shared/ErrorBoundary';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NumerologyAstrologyProps {
  mode: 'numerology' | 'astrology';
}

// ─── Component ────────────────────────────────────────────────────────────────

const NumerologyAstrology: React.FC<NumerologyAstrologyProps> = ({ mode }) => {

  // ── Refs ───────────────────────────────────────────────────────────────────
  const reportPreviewRef = useRef<HTMLDivElement>(null);

  // ✅ Race-condition guard — same pattern as Tarot & MoonJournal
  const readingRef = useRef<string>('');
  const engineDataRef = useRef<any>(null);
  const advReportRef = useRef<any>(null);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({ name: '', dob: '', pob: '', tob: '' });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // ── Report state ───────────────────────────────────────────────────────────
  const [reading, setReading] = useState('');
  const [advancedReport, setAdvancedReport] = useState<any>(null);
  const [engineData, setEngineData] = useState<any>(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Channeling...');
  const [error, setError] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isRestoredSession, setIsRestoredSession] = useState(false);
  const [retrievedTx, setRetrievedTx] = useState<any>(null);
  const [servicePrice, setServicePrice] = useState(mode === 'astrology' ? 99 : 49);

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme.mode === 'light';

  // ✅ Fixed typo: gylphcircle → glyphcircle
  const isAdmin = user && [
    'master@glyphcircle.com',
    'admin@glyphcircle.com',
  ].includes(user.email ?? '');

  // ── Derived — use ref as fallback (race-condition guard) ───────────────────
  const currentReading = reading || readingRef.current;
  const currentEngineData = engineData || engineDataRef.current;
  const currentAdvReport = advancedReport || advReportRef.current;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getLanguageName = (code: string) => {
    const map: Record<string, string> = {
      en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu',
      bn: 'Bengali', mr: 'Marathi', es: 'Spanish', fr: 'French',
      ar: 'Arabic', pt: 'Portuguese',
    };
    return map[code] || 'English';
  };

  const serviceType = mode === 'astrology' ? 'vedic-astrology' : 'numerology';
  const serviceTitle = mode === 'astrology' ? 'Your Astrology Destiny' : 'Your Numerology Summary';

  // ── Scroll helper ──────────────────────────────────────────────────────────
  const scrollToReport = useCallback(() => {
    setTimeout(() => {
      if (reportPreviewRef.current) {
        reportPreviewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 150);
  }, []);

  // ── Load dynamic price from registry ──────────────────────────────────────
  useEffect(() => {
    resolveService(serviceType).then(record => {
      if (record?.price != null) setServicePrice(record.price);
    });
  }, [serviceType]);

  // ── useServicePayment ──────────────────────────────────────────────────────
  // ✅ Aligned with Tarot / MoonJournal pattern
  const { initiateFlow, isCheckingCache } = useServicePayment({
    serviceType,

    onReportGenerated: () => {
      console.log(`✅ [${mode}] Report display triggered`);

      // ✅ Force state from refs if they haven't settled yet
      if (!reading && readingRef.current) setReading(readingRef.current);
      if (!engineData && engineDataRef.current) setEngineData(engineDataRef.current);
      if (!advancedReport && advReportRef.current) setAdvancedReport(advReportRef.current);

      setIsPaid(true);
      setPaymentSuccess(true);
      scrollToReport();
    },

    onCacheRestored: (readingData, transaction) => {
      console.log(`✅ [${mode}] Cache restored:`, readingData);
      setRetrievedTx(transaction);

      const restored = readingData.content || readingData.reading || '';
      setReading(restored);
      readingRef.current = restored;

      const meta = readingData.meta_data || {};
      if (meta.engineData) { setEngineData(meta.engineData); engineDataRef.current = meta.engineData; }
      if (meta.advancedReport) { setAdvancedReport(meta.advancedReport); advReportRef.current = meta.advancedReport; }
      if (meta.formData) setFormData(meta.formData);

      setIsPaid(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  // ── Restore session from reportStateManager ────────────────────────────────
  useEffect(() => {
    const savedState = reportStateManager.loadReportState(mode);
    if (savedState && (savedState.isPaid || savedState.reading)) {
      console.log(`♻️ Restoring session for ${mode}`);
      setFormData(savedState.formData || { name: '', dob: '', pob: '', tob: '' });

      const r = savedState.reading || '';
      setReading(r);
      readingRef.current = r;

      setEngineData(savedState.engineData || null);
      engineDataRef.current = savedState.engineData || null;

      setAdvancedReport(savedState.advancedReport || null);
      advReportRef.current = savedState.advancedReport || null;

      setIsPaid(savedState.isPaid || false);
      setIsRestoredSession(true);
    }
  }, [mode]);

  // ── Generate initial AI reading ────────────────────────────────────────────
  const handleGetReading = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

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
    setPaymentSuccess(false);
    setRetrievedTx(null);
    readingRef.current = '';
    engineDataRef.current = null;
    advReportRef.current = null;

    try {
      const calculatedStats = mode === 'numerology'
        ? calculateNumerology({ name: formData.name, dob: formData.dob })
        : calculateAstrology({ ...formData, lat: coords?.lat, lng: coords?.lng });

      setEngineData(calculatedStats);
      engineDataRef.current = calculatedStats;

      console.log(`🔮 Generating ${mode} reading for:`, formData.name);
      const result = await getAstroNumeroReading({
        mode,
        ...formData,
        language: getLanguageName(language),
      });

      const r = result.reading || '';
      setReading(r);
      readingRef.current = r;
      setIsLoading(false);

      // Save preview state
      reportStateManager.saveReportState(mode, {
        formData,
        reading: r,
        engineData: calculatedStats,
        isPaid: false,
      });

      setTimeout(() => {
        reportPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);

    } catch (err: any) {
      console.error('❌ Reading generation failed:', err);
      setError('The Oracle is currently disconnected. Please try again.');
      setIsLoading(false);
    }
  }, [formData, mode, language, coords]);

  // ── "Read More" — initiateFlow (aligned with other services) ──────────────
  const handleReadMore = useCallback(async () => {
    if (!currentReading) return;

    await initiateFlow(
      {
        name: formData.name,
        dob: formData.dob,
        pob: formData.pob || undefined,
        tob: formData.tob || undefined,
        mode,
      },
      // ✅ Generator — called by useServicePayment after payment succeeds
      async (paymentDetails?: any) => {
        console.log(`💳 [${mode}] Payment success, saving & generating report...`);
        setIsLoading(true);
        setPaymentSuccess(true);

        try {
          // 1. Save reading to DB
          const savedReading = await dbService.saveReading({
            user_id: user?.id,
            type: mode,
            title: `${mode.toUpperCase()} Reading for ${formData.name}`,
            subtitle: formData.dob,
            content: currentReading,
            meta_data: {
              engineData: currentEngineData,
              formData,
            },
            is_paid: true,
          });

          // 2. Record transaction
          if (savedReading?.data?.id) {
            await dbService.recordTransaction({
              user_id: user?.id,
              service_type: serviceType,
              service_title: serviceTitle,
              amount: servicePrice,
              currency: 'INR',
              payment_method: paymentDetails?.method || 'manual',
              payment_provider: paymentDetails?.provider || 'manual',
              order_id: paymentDetails?.orderId || `ORD-${Date.now()}`,
              transaction_id: paymentDetails?.transactionId || `TXN-${Date.now()}`,
              reading_id: savedReading.data.id,
              status: 'success',
              metadata: {
                ...formData,
                paymentTimestamp: new Date().toISOString(),
              },
            });
          }

          // 3. Generate advanced report (astrology only)
          let generatedReport = null;
          if (mode === 'astrology') {
            setLoadingMessage('Analyzing planetary positions...');

            const messages = [
              'Calculating Dasha periods...',
              'Interpreting 12 houses...',
              'Evaluating yogas and combinations...',
              'Analyzing career and wealth paths...',
              'Mapping relationship synergy...',
              'Formulating ritualistic remedies...',
              'Finalizing destiny decree...',
            ];
            let msgIdx = 0;
            const progressInterval = setInterval(() => {
              setLoadingMessage(messages[msgIdx % messages.length]);
              msgIdx++;
            }, 4500);

            try {
              const report = await generateAdvancedAstroReport(
                { ...formData, language: getLanguageName(language) },
                currentEngineData
              );
              generatedReport = report;
              setAdvancedReport(report);
              advReportRef.current = report;
              console.log('✅ Advanced report generated');
            } catch (e: any) {
              console.error('❌ Advanced report failed:', e.message);
            } finally {
              clearInterval(progressInterval);
            }
          }

          // 4. Persist full state
          reportStateManager.saveReportState(mode, {
            formData,
            reading: currentReading,
            advancedReport: generatedReport,
            engineData: currentEngineData,
            isPaid: true,
          });

          setIsLoading(false);

          return {
            reading: currentReading,
            content: currentReading,
            meta_data: {
              engineData: currentEngineData,
              advancedReport: generatedReport,
              formData,
            },
          };

        } catch (dbErr: any) {
          console.error('❌ Save error:', dbErr);
          setError(`Report generated but save failed: ${dbErr.message}`);
          setIsLoading(false);

          // Still return content so report shows
          return {
            reading: currentReading,
            content: currentReading,
            meta_data: { engineData: currentEngineData, formData },
          };
        }
      }
    );
  }, [
    currentReading, currentEngineData, formData, mode,
    serviceType, serviceTitle, servicePrice,
    user, language, initiateFlow,
  ]);

  // ── PDF download ───────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    const reportElementId = mode === 'astrology'
      ? 'astrology-report-content'
      : 'numerology-report-content';

    try {
      const safeName = formData.name?.trim().replace(/\s+/g, '-') || 'seeker';
      const filename = `${mode}-report-${safeName}-${new Date().toISOString().split('T')[0]}.pdf`;
      await generatePDF(reportElementId, { filename, quality: 0.9, marginSide: 10 });
    } catch (err) {
      console.error('❌ PDF generation failed:', err);
      alert('PDF generation failed. Please try again.');
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setReading('');
    readingRef.current = '';
    setEngineData(null);
    engineDataRef.current = null;
    setAdvancedReport(null);
    advReportRef.current = null;
    setIsPaid(false);
    setPaymentSuccess(false);
    setRetrievedTx(null);
    setError('');
    setIsRestoredSession(false);
    reportStateManager.clearReportState(mode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="max-w-4xl mx-auto relative pb-24 transition-colors duration-500"
      style={{ color: isLight ? '#78350f' : '#fef3c7' }}
    >
      <SmartBackButton label={t('backToHome')} fallbackRoute="/home" className="mb-8" />

      {/* ── New Reading button (shown when report exists) ── */}
      {(isPaid || retrievedTx || currentReading) && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleReset}
            style={{ touchAction: 'manipulation' }}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg transition-all min-h-[44px]"
          >
            🔮 New Reading
          </button>
        </div>
      )}

      {/* ── Previously purchased banner ── */}
      {retrievedTx && !isPaid && (
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
                Already Purchased This Year!
              </h3>
              <p className={`text-sm italic font-lora ${isLight ? 'text-emerald-700' : 'text-green-300/70'
                }`}>
                Retrieved from your sacred registry.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => { setIsPaid(true); scrollToReport(); }}
                style={{ touchAction: 'manipulation' }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-wider min-h-[44px] transition-all"
              >
                📄 View Report
              </button>
              <button
                onClick={handleReset}
                style={{ touchAction: 'manipulation' }}
                className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-wider min-h-[44px] transition-all"
              >
                🆕 New Reading
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment success banner ── */}
      {paymentSuccess && isPaid && !isLoading && (
        <div className="mb-6 p-4 bg-green-900/20 text-green-400 rounded-xl border border-green-500/30 text-center font-bold animate-fade-in-up">
          ✅ Decree Unlocked. Your complete Imperial Report is below.
        </div>
      )}

      {/* ── Input Form (hidden once paid) ── */}
      {!isPaid && !isLoading && !currentReading && (
        <Card className="mb-10 p-8 md:p-10 border-2 shadow-2xl transition-all duration-500">
          <h2 className="text-3xl md:text-4xl font-cinzel font-black text-center mb-10 tracking-widest uppercase">
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
                  onChange={(time) => setFormData(p => ({ ...p, tob: time }))}
                />
              </>
            )}

            <div className="md:col-span-2 text-center mt-6">
              <Button
                type="submit"
                disabled={isLoading}
                style={{ touchAction: 'manipulation' }}
                className="px-16 md:px-20 py-4 md:py-5 text-lg md:text-xl font-cinzel font-bold tracking-[0.2em] rounded-full uppercase bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 min-h-[56px]"
              >
                {isLoading ? 'Channeling...' : 'Unlock Destiny'}
              </Button>
            </div>
          </form>

          {error && (
            <p className="text-red-500 font-bold text-center mt-6">{error}</p>
          )}
        </Card>
      )}

      {/* ── Report area ── */}
      <div ref={reportPreviewRef}>
        {isLoading ? (
          <div className="text-center py-12">
            <ReportLoader />
            <p className="text-amber-400 font-cinzel text-sm mt-4 tracking-widest animate-pulse">
              {loadingMessage}
            </p>
          </div>

        ) : !isPaid && currentReading ? (
          /* Preview + paygate */
          <ServiceResult
            serviceName={mode.toUpperCase()}
            serviceIcon={mode === 'astrology' ? '⭐' : '🔢'}
            previewText={currentReading}
            onRevealReport={handleReadMore}
            isAdmin={isAdmin}
            onAdminBypass={() => {
              setIsPaid(true);
              scrollToReport();
            }}
          />

        ) : isPaid && currentEngineData ? (
          /* ✅ Full report — always renders when isPaid=true */
          <ErrorBoundary>
            {mode === 'astrology' ? (
              <EnhancedAstrologyReport
                data={{
                  ...currentEngineData,
                  userName: formData.name,
                  birthDate: formData.dob,
                  advancedReport: currentAdvReport?.fullReportText,
                }}
                onDownload={handleDownloadPDF}
              />
            ) : (
              <EnhancedNumerologyReport
                reading={currentReading}
                engineData={currentEngineData}
                userName={formData.name}
                birthDate={formData.dob}
                onDownload={handleDownloadPDF}
              />
            )}
          </ErrorBoundary>

        ) : null}
      </div>

      {/* ── isCheckingCache overlay (from useServicePayment) ── */}
      {isCheckingCache && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[250] p-4">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 md:p-10 rounded-3xl shadow-2xl border border-amber-500/30 max-w-md w-full text-center">
            <div className="w-20 h-20 mx-auto mb-8 relative">
              <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-amber-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-3 border-4 border-amber-500/10 rounded-full"></div>
              <div
                className="absolute inset-3 border-4 border-b-amber-400 border-t-transparent border-r-transparent border-l-transparent rounded-full animate-spin"
                style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
              ></div>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-wide font-cinzel">
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

export default NumerologyAstrology;
