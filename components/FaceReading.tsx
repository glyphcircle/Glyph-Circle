import React, { useState, useCallback, useRef, useEffect } from 'react';
import { getFaceReading } from '../services/aiService';
import { calculateFaceReading, FaceAnalysis } from '../services/faceReadingEngine';
import Button from './shared/Button';
import ProgressBar from './shared/ProgressBar';
import { useTranslation } from '../hooks/useTranslation';
import { usePayment } from '../context/PaymentContext';
import FullReport from './FullReport';
import { useAuth } from '../context/AuthContext';
import { useDb } from '../hooks/useDb';
import { useTheme } from '../context/ThemeContext';
import { cloudManager } from '../services/cloudManager';
import SmartBackButton from './shared/SmartBackButton';
import { supabase } from '../services/supabaseClient';
import { useDevice } from '../hooks/useDevice';

const FALLBACK_READING = `## **Facial Structure Analysis**

**Upper Zone (Forehead Region) - Intelligence & Wisdom**

✅ **Strengths:**
- Strong analytical thinking and problem-solving abilities
- Capacity for deep reflection and strategic planning
- Natural wisdom that grows with experience
- Ability to learn quickly from various sources

⚠️ **Areas to Watch:**
- Tendency to overthink situations at times
- May need to balance logic with intuition

---

## **Middle Zone (Eyes, Nose, Cheeks) - Emotions & Social Life**

✅ **Positive Traits:**
- Excellent communication and interpersonal skills
- Strong empathy and understanding of others' feelings
- Natural ability to build meaningful connections

⚠️ **Potential Challenges:**
- May sometimes take on others' emotional burdens
- Need to maintain personal boundaries

---

## **Lower Zone (Mouth, Jaw, Chin) - Action & Determination**

✅ **Strengths:**
- Strong willpower and persistence in achieving goals
- Practical approach to implementing ideas
- Natural leadership qualities when needed

⚠️ **Watch Points:**
- Balance ambition with realistic expectations
- Ensure work-life harmony

---

## **Planetary Influences**

🌞 **Sun (Leadership):** Moderate to strong influence
🌙 **Moon (Emotions):** Well-balanced emotional nature
♂️ **Mars (Energy):** Good drive and determination
☿ **Mercury (Communication):** Excellent expression
♃ **Jupiter (Wisdom):** Growing wisdom through experience
♀ **Venus (Relationships):** Harmonious social connections
♄ **Saturn (Discipline):** Strong sense of responsibility

---

## **Overall Character Summary**

You possess a **well-rounded and balanced personality** with harmonious development across all three facial zones.

🎯 **Core Strengths:** Adaptability, balanced thinking, strong integrity, ability to inspire others.
🌟 **Life Path:** Best suited for roles requiring both intellect and empathy.
💡 **Recommendations:** Trust intuition alongside analysis; maintain healthy work-life balance.`;

const FALLBACK_ANALYSIS: FaceAnalysis = {
  zones: {
    upper: 33,
    middle: 34,
    lower: 33,
    dominance: 'Middle (Intellect & Emotion)',
  },
  planetary: {
    Sun: 75, Moon: 80, Mars: 70,
    Mercury: 85, Jupiter: 78, Venus: 82, Saturn: 68,
  },
  personality: {
    primary: 'Balanced',
    traits: ['Intellectual', 'Emotional', 'Practical'],
  },
};

const FaceReading: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [reading, setReading] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<FaceAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [servicePrice, setServicePrice] = useState(49);
  const [readingId, setReadingId] = useState<string | null>(null);

  // ✅ Refs — reliable across async boundaries
  const readingIdRef = useRef<string | null>(null);
  const isPaymentOpenRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const analyzeButtonRef = useRef<HTMLDivElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const { t, language } = useTranslation();
  const { openPayment } = usePayment();
  const { user } = useAuth();
  const { db } = useDb();
  const { theme } = useTheme();
  const { isMobile } = useDevice();
  const isLight = theme.mode === 'light';

  const reportImage = db.image_assets?.find((a: any) => a.id === 'report_bg_face')?.path
    || 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=800';

  useEffect(() => { fetchServicePrice(); }, []);

  const fetchServicePrice = async () => {
    try {
      const { data, error } = await supabase
        .from('services').select('price')
        .eq('name', 'Face Reading').eq('status', 'active').single();
      if (!error && data) setServicePrice(data.price);
    } catch (err) { console.error('Error fetching price:', err); }
  };

  // Scroll to report when paid
  useEffect(() => {
    if (isPaid && reportRef.current) {
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  }, [isPaid]);

  // Connect camera stream to video element
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(err => {
        console.error('❌ Video play error:', err);
        setError('Failed to start video preview. Please use Gallery instead.');
      });
    }
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    };
  }, [cameraStream]);

  // Auto-scroll to analyze button on mobile after image selection
  useEffect(() => {
    if (imageFile && analyzeButtonRef.current && isMobile) {
      setTimeout(() => analyzeButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
  }, [imageFile, isMobile]);

  // ── HELPERS ─────────────────────────────────────────────────────────

  const getLanguageName = (code: string) => {
    const map: Record<string, string> = {
      en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu',
      bn: 'Bengali', mr: 'Marathi', es: 'Spanish', fr: 'French',
      ar: 'Arabic', pt: 'Portuguese',
    };
    return map[code] || 'English';
  };

  const getLoadingMessage = (p: number) => {
    if (p < 20) return 'Scanning physiological structure...';
    if (p < 40) return 'Identifying Samudrika landmarks...';
    if (p < 60) return 'Analyzing planetary correspondences...';
    if (p < 80) return 'Extracting karmic signatures...';
    if (p < 95) return 'Finalizing character synthesis...';
    return 'Manifesting destiny...';
  };

  const generateReadingKey = () =>
    `face_${user?.id || 'anon'}_${Date.now()}`.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // ── DATABASE ─────────────────────────────────────────────────────────

  const saveToDatabase = async (faceData: FaceAnalysis, readingText: string) => {
    try {
      if (!supabase) return null;
      const readingKey = generateReadingKey();

      const { data: rec, error: err } = await supabase
        .from('readings')
        .insert({
          user_id: user?.id || null,
          type: 'face-reading',
          title: 'Face Reading Analysis',
          subtitle: `Dominant: ${faceData.zones.dominance}`,
          content: readingText,
          is_paid: false,
          meta_data: {
            reading_key: readingKey,
            personality: faceData.personality,
            timestamp: new Date().toISOString(),
          },
        })
        .select().single();

      if (err) { console.error('❌ Reading save error:', err); return null; }

      await supabase.from('face_reading_cache').upsert({
        reading_key: readingKey,
        user_id: user?.id || null,
        dob: null,
        face_metrics: null,
        analysis_data: faceData,
        reading_text: readingText,
        reading_id: rec.id,
        is_paid: false,
        language: language,
      }, { onConflict: 'reading_key' });

      setReadingId(rec.id);
      readingIdRef.current = rec.id; // ✅ Always sync ref
      console.log('✅ Face reading saved:', rec.id);
      return rec.id;
    } catch (error) {
      console.error('❌ Database save error:', error);
      return null;
    }
  };

  const savePaymentRecord = async (readId: string) => {
    try {
      const { data: txn, error: txnErr } = await supabase
        .from('transactions')
        .insert({
          user_id: user?.id || null,
          service_type: 'face-reading',
          service_title: 'Face Reading Analysis',
          amount: servicePrice,
          currency: 'INR',
          status: 'success',
          payment_method: 'upi',
          payment_provider: 'manual',
          reading_id: readId,
          order_id: `FACE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          metadata: { dominant_zone: analysisData?.zones.dominance },
        })
        .select().single();

      if (!txnErr) {
        await supabase.from('readings').update({ is_paid: true }).eq('id', readId);
        console.log('✅ Transaction saved:', txn);
      }
    } catch (error) { console.error('❌ Payment save error:', error); }
  };

  // ── CAMERA ───────────────────────────────────────────────────────────

  const handleOpenCamera = async () => {
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera not supported on this device. Please use Gallery instead.');
        return;
      }

      if (isMobile && navigator.permissions) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (result.state === 'denied') {
            setError('Camera permission denied. Please enable it in browser settings or use Gallery.');
            return;
          }
        } catch { /* Permissions API not available — proceed */ }
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }

      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch (err: any) {
      const msgs: Record<string, string> = {
        NotAllowedError: 'Camera permission denied. Enable in browser settings or use Gallery.',
        PermissionDeniedError: 'Camera permission denied. Enable in browser settings or use Gallery.',
        NotFoundError: 'No camera found. Please use Gallery to upload a photo.',
        DevicesNotFoundError: 'No camera found. Please use Gallery to upload a photo.',
        NotReadableError: 'Camera is busy with another app. Close it and retry, or use Gallery.',
        TrackStartError: 'Camera is busy with another app. Close it and retry, or use Gallery.',
        OverconstrainedError: 'Camera settings unsupported. Please use Gallery.',
        SecurityError: 'Camera blocked by security policy. Use HTTPS or Gallery.',
      };
      setError(msgs[err.name] || `Unable to access camera (${err.name || 'Unknown'}). Use Gallery.`);
    }
  };

  const handleStopCamera = () => {
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraOpen(false);
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob(blob => {
        if (!blob) return;
        const file = new File([blob], 'face_capture.jpg', { type: 'image/jpeg' });
        setImageFile(file);
        setImagePreview(URL.createObjectURL(blob));
        handleStopCamera();
        setReading('');
        setAnalysisData(null);
        setError('');
        setIsPaid(false);
      }, 'image/jpeg', 0.95);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setReading('');
    setAnalysisData(null);
    setError('');
    setIsPaid(false);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleGalleryClick = () => galleryInputRef.current?.click();

  // ── MAIN ANALYZE ─────────────────────────────────────────────────────

  const handleGetReading = useCallback(async () => {
    if (!imageFile) { setError('Please upload an image of your face first.'); return; }

    setIsLoading(true);
    setProgress(0);
    setReading('');
    setAnalysisData(null);
    setError('');
    setReadingId(null);
    readingIdRef.current = null;

    const timer = setInterval(() => {
      setProgress(p => p >= 92 ? p : p + Math.random() * 5);
    }, 400);

    try {
      // ✅ Pass undefined (not null) for optional dob
      const result = await getFaceReading(imageFile, getLanguageName(language));
      clearInterval(timer);
      setProgress(100);

      // Detect AI refusal or too-short response
      const isRefusal = !result.textReading || (
        result.textReading.length < 100 ||
        result.textReading.toLowerCase().includes("i'm sorry") ||
        result.textReading.toLowerCase().includes("i can't assist") ||
        result.textReading.toLowerCase().includes("i cannot")
      );

      const finalReading = isRefusal ? FALLBACK_READING : result.textReading;
      const finalAnalysis = (result.rawMetrics?.width && result.rawMetrics?.height)
        ? calculateFaceReading(result.rawMetrics)
        : FALLBACK_ANALYSIS;

      // ✅ Set UI immediately — don't wait for DB
      setAnalysisData(finalAnalysis);
      setReading(finalReading);

      // ✅ Save to DB in background
      saveToDatabase(finalAnalysis, finalReading)
        .then(id => {
          if (id) { readingIdRef.current = id; }
        })
        .catch(err => console.error('❌ Background DB save error:', err));

    } catch (err: any) {
      clearInterval(timer);
      setProgress(0);
      console.error('❌ Face reading error:', err);
      setError(`Failed to analyze face: ${err.message || 'Unknown error'}. Please try again.`);
    } finally {
      clearInterval(timer);
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 500);
    }
  }, [imageFile, language, user?.id]);

  // ── PAYMENT ──────────────────────────────────────────────────────────

  const handleReadMore = () => {
    if (isPaymentOpenRef.current) { console.warn('⚠️ Payment already open'); return; }
    isPaymentOpenRef.current = true;

    openPayment(
      async () => {
        isPaymentOpenRef.current = false;
        let currentReadingId = readingIdRef.current;

        if (!currentReadingId && analysisData) {
          currentReadingId = await saveToDatabase(analysisData, reading);
          if (currentReadingId) readingIdRef.current = currentReadingId;
        }

        if (currentReadingId) await savePaymentRecord(currentReadingId);

        // ✅ Always unlock — even if DB fails
        setIsPaid(true);
        console.log('✅ Face Reading payment complete');
      },
      'Face Reading',
      servicePrice
    );

    // Reset if user cancels
    setTimeout(() => { isPaymentOpenRef.current = false; }, 30000);
  };

  // ── VEDIC DASHBOARD ──────────────────────────────────────────────────

  const renderVedicDashboard = () => {
    if (!analysisData) return null;
    const { zones, planetary } = analysisData;

    return (
      <div className="space-y-4 md:space-y-6 mt-4 md:mt-6 animate-fade-in-up">
        {/* Zone Bars */}
        <div className={`p-4 rounded-lg border ${isLight ? 'bg-amber-50 border-amber-200' : 'bg-black/30 border-amber-500/10'
          }`}>
          <h4 className={`font-bold text-xs uppercase tracking-widest mb-3 ${isLight ? 'text-amber-700' : 'text-amber-400'
            }`}>
            Mukha Trikona (3 Zones)
          </h4>
          <div className="space-y-3 mb-3">
            {[
              { label: 'Upper (Forehead)', value: zones.upper, color: 'bg-blue-500' },
              { label: 'Middle (Eyes/Nose)', value: zones.middle, color: 'bg-green-500' },
              { label: 'Lower (Mouth/Chin)', value: zones.lower, color: 'bg-red-500' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className={isLight ? 'text-amber-800' : 'text-amber-100'}>{label}</span>
                  <span className={`font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{value}%</span>
                </div>
                <div className={`w-full h-1.5 rounded-full ${isLight ? 'bg-amber-100' : 'bg-gray-800'}`}>
                  <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className={`text-center p-2 rounded text-xs ${isLight ? 'bg-amber-100 text-amber-900' : 'bg-gray-800/50 text-amber-200'
            }`}>
            Dominant: <strong>{zones.dominance}</strong> ({analysisData.personality.primary})
          </div>
        </div>

        {/* Planetary Grid — 4 cols on md+, 3 cols on mobile */}
        <div className={`p-4 rounded-lg border ${isLight ? 'bg-amber-50 border-amber-200' : 'bg-black/30 border-amber-500/10'
          }`}>
          <h4 className={`font-bold text-xs uppercase tracking-widest mb-3 ${isLight ? 'text-amber-700' : 'text-amber-400'
            }`}>
            Planetary Influences
          </h4>
          {/* ✅ 3 cols on mobile, 4 on md+ — prevents cramping */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {Object.entries(planetary).map(([planet, score]) => (
              <div key={planet} className={`p-2 rounded text-center border ${isLight ? 'bg-white border-amber-200' : 'bg-gray-900 border-gray-700'
                }`}>
                <div className={`text-[10px] uppercase mb-1 ${isLight ? 'text-gray-500' : 'text-gray-400'
                  }`}>{planet}</div>
                <div className={`font-bold text-sm ${(score as number) > 80
                    ? isLight ? 'text-green-600' : 'text-green-400'
                    : isLight ? 'text-amber-700' : 'text-amber-100'
                  }`}>
                  {score as number}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── RENDER ───────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen py-6 px-4 transition-colors duration-500 ${isLight
        ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50'
        : 'bg-gradient-to-br from-gray-950 via-amber-950 to-black'
      }`}>
      <div className="max-w-4xl mx-auto">
        <SmartBackButton label={t('backToHome')} className="mb-4 md:mb-6" />

        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h2 className={`text-2xl md:text-3xl font-bold mb-2 ${isLight ? 'text-amber-800' : 'text-amber-300'
            }`}>
            {t('aiFaceReading')}
          </h2>
          <p className={`text-sm md:text-base ${isLight ? 'text-amber-700' : 'text-amber-100/70'
            }`}>
            {t('uploadFacePrompt')}
          </p>
        </div>

        {/* Main Card */}
        <div className={`p-4 md:p-6 rounded-xl shadow-2xl border backdrop-blur-md ${isLight
            ? 'bg-white/80 border-amber-200'
            : 'bg-gradient-to-br from-amber-900/40 via-orange-900/40 to-black/60 border-amber-500/30'
          }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 items-start">

            {/* LEFT: Upload / Camera */}
            <div className="space-y-4">
              {isCameraOpen ? (
                <div className="w-full relative bg-black rounded-lg overflow-hidden border-2 border-amber-500 shadow-xl">
                  <video
                    ref={videoRef}
                    autoPlay playsInline muted
                    className="w-full h-64 md:h-80 object-cover transform scale-x-[-1]"
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 z-10">
                    <button
                      onClick={handleStopCamera}
                      className="bg-red-600/80 hover:bg-red-600 text-white p-2.5 rounded-full backdrop-blur-sm"
                    >
                      <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <button
                      onClick={handleCapture}
                      className="bg-white/90 hover:bg-white text-black p-3 md:p-4 rounded-full shadow-lg border-4 border-amber-500/50 transform active:scale-95 transition-transform"
                    >
                      <div className="w-4 h-4 bg-red-600 rounded-full" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Preview Box */}
                  <div className={`w-full h-56 md:h-64 border-2 border-dashed rounded-lg flex flex-col justify-center items-center mb-4 ${isLight ? 'border-amber-400 bg-amber-50' : 'border-amber-400 bg-gray-900/50'
                    }`}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="Face preview" className="object-contain h-full w-full rounded-lg" />
                    ) : (
                      <>
                        <svg className={`h-10 w-10 md:h-12 md:w-12 mb-2 ${isLight ? 'text-amber-500' : 'text-amber-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span className={`text-center px-4 text-sm ${isLight ? 'text-amber-700' : 'text-amber-200'}`}>
                          {isMobile ? 'Tap Camera or Gallery below' : 'Use webcam or upload file'}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Hidden file input */}
                  <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

                  {/* Camera / Gallery buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={handleOpenCamera}
                      className="py-3 text-sm bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 flex items-center justify-center gap-2"
                    >
                      <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      📸 Camera
                    </Button>
                    <Button
                      onClick={handleGalleryClick}
                      className="py-3 text-sm bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 flex items-center justify-center gap-2"
                    >
                      <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      🖼️ Gallery
                    </Button>
                  </div>
                </div>
              )}

              {/* Camera permission hint */}
              {error && error.toLowerCase().includes('camera') && (
                <div className={`p-3 rounded-lg border text-xs ${isLight
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-blue-900/20 border-blue-500/30 text-blue-200'
                  }`}>
                  <p className="font-bold mb-1">💡 Tip:</p>
                  <p>Use the <strong>Gallery</strong> button to upload from your photos.</p>
                </div>
              )}

              {/* Analyze button */}
              <div ref={analyzeButtonRef}>
                {imageFile && !isCameraOpen && (
                  <Button
                    onClick={handleGetReading}
                    disabled={isLoading}
                    className={`w-full py-3 md:py-4 font-cinzel font-bold tracking-wider ${isLight
                        ? 'bg-gradient-to-r from-amber-600 to-orange-700 text-white'
                        : 'bg-gradient-to-r from-amber-600 to-orange-700'
                      }`}
                  >
                    {isLoading ? t('analyzing') : t('getYourReading')}
                  </Button>
                )}
              </div>

              {/* General errors */}
              {error && !error.toLowerCase().includes('camera') && (
                <p className={`text-center text-sm p-3 rounded-lg border ${isLight
                    ? 'text-red-700 bg-red-50 border-red-200'
                    : 'text-red-400 bg-red-900/20 border-red-500/20'
                  }`}>
                  {error}
                </p>
              )}
            </div>

            {/* RIGHT: Results Preview */}
            <div className={`min-h-[16rem] md:min-h-[20rem] rounded-lg border p-4 md:p-6 relative overflow-hidden flex flex-col ${isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-black/20 border-amber-500/20'
              }`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 rounded-full blur-3xl -z-10" />

              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20 rounded-lg">
                  <ProgressBar progress={progress} message={getLoadingMessage(progress)} />
                </div>
              )}

              {/* Empty state */}
              {!analysisData && !isLoading && (
                <div className="flex-grow flex flex-col items-center justify-center text-center">
                  <span className="text-5xl md:text-7xl mb-4 animate-float opacity-50">😐</span>
                  <p className={`font-lora italic text-sm md:text-base ${isLight ? 'text-amber-500' : 'text-amber-300/40'
                    }`}>
                    Upload your photo to begin analysis.
                  </p>
                </div>
              )}

              {/* Results */}
              {analysisData && !isLoading && (
                <div className="space-y-4 animate-fade-in-up">
                  {renderVedicDashboard()}

                  {!isPaid ? (
                    <div className="relative mt-4">
                      <div className={`p-4 rounded-xl border font-lora italic leading-relaxed
                                                text-sm relative overflow-hidden min-h-[120px] ${isLight
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-black/40 border-amber-500/20 text-amber-100'
                        }`}>
                        <span className={`text-3xl absolute top-0 left-2 ${isLight ? 'text-amber-400/40' : 'text-amber-500/30'
                          }`}>"</span>
                        {reading.substring(0, 160)}...
                        <div className={`absolute bottom-0 left-0 w-full h-14 bg-gradient-to-t ${isLight ? 'from-amber-50' : 'from-gray-900/90'
                          } to-transparent`} />
                      </div>
                      <Button
                        onClick={handleReadMore}
                        className="w-full mt-3 py-3 md:py-4 bg-gradient-to-r from-amber-600 to-orange-800 border-amber-500 shadow-xl font-cinzel tracking-widest text-sm md:text-base text-white transition-all hover:scale-105"
                      >
                        🔓 Unlock Full Reading - ₹{servicePrice}
                      </Button>
                    </div>
                  ) : (
                    <div className={`text-center p-4 rounded-xl border ${isLight ? 'bg-green-100 border-green-300' : 'bg-green-900/30 border-green-500/30'
                      }`}>
                      <p className={`font-bold ${isLight ? 'text-green-700' : 'text-green-400'}`}>
                        ✅ Full Report Unlocked!
                      </p>
                      <p className={`text-xs mt-1 ${isLight ? 'text-green-600' : 'text-green-300'}`}>
                        Scroll down to read
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FULL REPORT */}
        {analysisData && isPaid && (
          <div ref={reportRef} className="mt-6 md:mt-8 animate-fade-in-up scroll-mt-24">
            <div className={`p-5 md:p-8 rounded-xl shadow-2xl border backdrop-blur-md ${isLight
                ? 'bg-white/80 border-amber-200'
                : 'bg-gradient-to-br from-amber-900/40 via-orange-900/40 to-black/60 border-amber-500/30'
              }`}>
              <div className="text-center mb-6 md:mb-8">
                <div className="w-20 h-20 md:w-32 md:h-32 mx-auto mb-4 md:mb-6 rounded-full border-4 border-amber-500 shadow-2xl overflow-hidden">
                  <img src={cloudManager.resolveImage(reportImage)} alt="Face Reading" className="w-full h-full object-cover" />
                </div>
                {/* ✅ text-2xl on mobile, text-5xl on md+ */}
                <h1 className={`text-2xl md:text-5xl font-cinzel font-black mb-2 uppercase tracking-wider ${isLight ? 'text-amber-900' : 'text-white'
                  }`}>
                  Face Reading Analysis
                </h1>
                <p className={`text-base md:text-xl font-lora italic ${isLight ? 'text-amber-700' : 'text-amber-300'
                  }`}>
                  Mukha Samudrika Shastra
                </p>
              </div>

              {renderVedicDashboard()}

              <div className={`rounded-2xl p-5 md:p-8 border mt-6 md:mt-8 ${isLight ? 'bg-amber-50 border-amber-200' : 'bg-black/20 border-amber-500/20'
                }`}>
                <FullReport
                  reading={reading}
                  category="face-reading"
                  title="Face Reading Analysis"
                  subtitle={user?.name || 'Seeker'}
                  imageUrl={cloudManager.resolveImage(reportImage)}
                  chartData={analysisData}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceReading;
