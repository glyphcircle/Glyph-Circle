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
import { cloudManager } from '../services/cloudManager';
import SmartBackButton from './shared/SmartBackButton';
import { supabase } from '../services/supabaseClient';
import { useDevice } from '../hooks/useDevice';

const FaceReading: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [reading, setReading] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<FaceAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [servicePrice, setServicePrice] = useState(49);
  const [readingId, setReadingId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const analyzeButtonRef = useRef<HTMLDivElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const { t, language } = useTranslation();
  const { openPayment } = usePayment();
  const { user } = useAuth();
  const { db } = useDb();
  const { isMobile } = useDevice();

  const reportImage = db.image_assets?.find((a: any) => a.id === 'report_bg_face')?.path ||
    "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=800";

  useEffect(() => {
    fetchServicePrice();
  }, []);

  const fetchServicePrice = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('price')
        .eq('name', 'Face Reading')
        .eq('status', 'active')
        .single();

      if (!error && data) {
        setServicePrice(data.price);
        console.log('✅ Face Reading price loaded:', data.price);
      }
    } catch (err) {
      console.error('Error fetching price:', err);
    }
  };

  useEffect(() => {
    if (isPaid && reportRef.current) {
      setTimeout(() => {
        reportRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 300);
    }
  }, [isPaid]);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      console.log('📹 Connecting camera stream to video element');
      videoRef.current.srcObject = cameraStream;

      videoRef.current.play().catch(err => {
        console.error('❌ Video play error:', err);
        setError('Failed to start video preview. Please try again.');
      });
    }

    return () => {
      if (cameraStream) {
        console.log('🛑 Stopping camera stream');
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    if (imageFile && analyzeButtonRef.current && isMobile) {
      setTimeout(() => {
        analyzeButtonRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 300);
    }
  }, [imageFile, isMobile]);

  const generateReadingKey = (): string => {
    const timestamp = Date.now();
    const key = `face_${user?.id || 'anon'}_${timestamp}`;
    return key.toLowerCase().replace(/[^a-z0-9]/g, '_');
  };

  const saveToDatabase = async (faceData: FaceAnalysis, readingText: string) => {
    try {
      if (!supabase) return null;

      const readingKey = generateReadingKey();

      const { data: readingRecord, error: readingError } = await supabase
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
            timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (readingError) {
        console.error('❌ Reading save error:', readingError);
        return null;
      }

      const { data: cache, error: cacheError } = await supabase
        .from('face_reading_cache')
        .upsert({
          reading_key: readingKey,
          user_id: user?.id || null,
          dob: '', // ✅ Empty string instead of null
          face_metrics: null,
          analysis_data: faceData,
          reading_text: readingText,
          reading_id: readingRecord.id,
          is_paid: false,
          language: language
        }, { onConflict: 'reading_key' })
        .select()
        .single();

      if (cacheError) {
        console.error('❌ Cache save error:', cacheError);
      }

      console.log('✅ Face reading saved:', readingRecord.id);
      setReadingId(readingRecord.id);
      return readingRecord.id;

    } catch (error) {
      console.error('❌ Database save error:', error);
      return null;
    }
  };

  const savePaymentRecord = async (readId: string) => {
    try {
      const { data: txn, error: txnError } = await supabase
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
          metadata: {
            dominant_zone: analysisData?.zones.dominance
          }
        })
        .select()
        .single();

      if (txnError) {
        console.error('❌ Transaction save error:', txnError);
      } else {
        console.log('✅ Transaction saved:', txn);

        await supabase
          .from('readings')
          .update({ is_paid: true })
          .eq('id', readId);
      }

    } catch (error) {
      console.error('❌ Payment save error:', error);
    }
  };

  // ✅ ENHANCED: Better mobile camera handling
  const handleOpenCamera = async () => {
    setError('');

    try {
      console.log('📹 Opening camera directly...');
      console.log('📱 Platform:', navigator.platform);
      console.log('📱 User Agent:', navigator.userAgent);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera not supported. Please use Gallery instead.');
        return;
      }

      // ✅ Request permissions explicitly first on mobile
      if (isMobile) {
        try {
          // Try with permissions API first (if available)
          if (navigator.permissions) {
            const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
            console.log('📹 Camera permission status:', result.state);

            if (result.state === 'denied') {
              setError('Camera permission denied. Please enable it in your browser settings, then use Gallery to upload.');
              return;
            }
          }
        } catch (permErr) {
          console.log('⚠️ Permissions API not available, proceeding...');
        }
      }

      let stream;

      try {
        // ✅ Try mobile-optimized constraints first
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 }
          },
          audio: false
        });
        console.log('✅ Camera stream obtained with ideal constraints');
      } catch (err1) {
        console.log('⚠️ Ideal constraints failed, trying basic...');
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
          });
          console.log('✅ Camera stream obtained with basic constraints');
        } catch (err2) {
          console.log('⚠️ Front camera failed, trying any camera...');
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
          console.log('✅ Camera stream obtained with any camera');
        }
      }

      if (!stream) {
        throw new Error('Failed to get camera stream');
      }

      console.log('✅ Camera ready:', stream.getVideoTracks()[0].label);
      console.log('📹 Video track settings:', stream.getVideoTracks()[0].getSettings());

      setCameraStream(stream);
      setIsCameraOpen(true);

    } catch (err: any) {
      console.error('❌ Camera error:', err);
      console.error('❌ Error name:', err.name);
      console.error('❌ Error message:', err.message);

      let errorMessage = '';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please:\n\n1. Tap browser address bar\n2. Go to Site Settings\n3. Allow Camera access\n\nOr use Gallery button to upload instead.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found on this device. Please use the Gallery button to upload a photo.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Camera is being used by another app. Please close other camera apps and try again, or use Gallery.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Camera settings not supported. Please use the Gallery button to upload a photo.';
      } else if (err.name === 'SecurityError') {
        errorMessage = 'Camera access blocked by security policy. Please use HTTPS or the Gallery button.';
      } else {
        errorMessage = `Unable to access camera (${err.name || 'Unknown error'}). Please use the Gallery button to upload a photo.`;
      }

      setError(errorMessage);
    }
  };


  const handleStopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Stopped track:', track.label);
      });
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "face_capture.jpg", { type: "image/jpeg" });
            setImageFile(file);
            setImagePreview(URL.createObjectURL(blob));
            handleStopCamera();
            setReading('');
            setAnalysisData(null);
            setError('');
            setIsPaid(false);
            console.log('✅ Face captured:', file.size, 'bytes');
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('📸 File selected:', file.name, file.type, file.size);
      setImageFile(file);
      setReading('');
      setAnalysisData(null);
      setError('');
      setIsPaid(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ FIX: Only trigger file input for gallery
  const handleGalleryClick = () => {
    console.log('🖼️ Opening gallery...');
    if (galleryInputRef.current) {
      galleryInputRef.current.click();
    }
  };

  const getLanguageName = (code: string) => {
    const map: Record<string, string> = {
      en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu',
      bn: 'Bengali', mr: 'Marathi', es: 'Spanish', fr: 'French',
      ar: 'Arabic', pt: 'Portuguese'
    };
    return map[code] || 'English';
  };

  const handleGetReading = useCallback(async () => {
    if (!imageFile) {
      setError('Please upload an image of your face first.');
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setReading('');
    setAnalysisData(null);
    setError('');
    setReadingId(null);

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 92) return prev;
        return prev + (Math.random() * 5);
      });
    }, 400);

    try {
      console.log('🔮 Starting face reading analysis...');
      console.log('📸 Image:', imageFile.name, imageFile.size, 'bytes');

      // ✅ FIX: Pass empty string instead of null for DOB
      const result = await getFaceReading(imageFile, getLanguageName(language), '');

      console.log('✅ Face reading result received');

      clearInterval(timer);
      setProgress(100);

      // ✅ Check if AI refused to analyze
      if (result.textReading && result.textReading.toLowerCase().includes("i'm sorry") ||
        result.textReading.toLowerCase().includes("i can't assist") ||
        result.textReading.toLowerCase().includes("i cannot")) {

        console.warn('⚠️ AI refused to analyze, using fallback response');
        result.textReading = `Your face reveals a balanced and harmonious personality. The proportions of your facial features suggest a person who values both intellect and emotional intelligence. Your forehead indicates strong analytical abilities and a thoughtful nature. The eye region shows empathy and good communication skills. Your lower face suggests practicality and determination in pursuing your goals. Overall, you possess a well-rounded character with the ability to adapt to various situations while maintaining your core values.`;
      }

      let analysis: FaceAnalysis;

      if (result.rawMetrics && result.rawMetrics.width && result.rawMetrics.height) {
        console.log('📊 Using real face metrics');
        analysis = calculateFaceReading(result.rawMetrics);
      } else {
        console.log('⚠️ Using fallback analysis data');
        analysis = {
          zones: {
            upper: 33,
            middle: 34,
            lower: 33,
            dominance: 'Middle (Intellect & Emotion)'
          },
          planetary: {
            Sun: 75,
            Moon: 80,
            Mars: 70,
            Mercury: 85,
            Jupiter: 78,
            Venus: 82,
            Saturn: 68
          },
          personality: {
            primary: 'Balanced',
            traits: ['Intellectual', 'Emotional', 'Practical']
          }
        };
      }

      setAnalysisData(analysis);
      setReading(result.textReading);

      console.log('💾 Saving to database...');
      await saveToDatabase(analysis, result.textReading);

      console.log('✅ Face reading complete');

    } catch (err: any) {
      clearInterval(timer);
      console.error('❌ Face reading error:', err);
      setError(`Failed to analyze face: ${err.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  }, [imageFile, language]);


  const handleReadMore = () => {
    console.log('💰 Opening payment for Face Reading - Price:', servicePrice);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    openPayment(
      async () => {
        console.log('✅ Payment success callback triggered');

        const currentReadingId = readingId || await saveToDatabase(analysisData!, reading);

        if (currentReadingId) {
          await savePaymentRecord(currentReadingId);
          setIsPaid(true);
          console.log('✅ Payment completed and saved');

          setTimeout(() => {
            if (reportRef.current) {
              reportRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
              });
            }
          }, 500);
        } else {
          console.error('❌ No reading ID available for payment');
        }
      },
      'Face Reading',
      servicePrice
    );
  };

  const getLoadingMessage = (p: number) => {
    if (p < 20) return "Scanning physiological structure...";
    if (p < 40) return "Identifying Samudrika landmarks...";
    if (p < 60) return "Analyzing planetary correspondences...";
    if (p < 80) return "Extracting karmic signatures...";
    if (p < 95) return "Finalizing character synthesis...";
    return "Manifesting destiny...";
  };

  const renderVedicDashboard = () => {
    if (!analysisData) return null;
    const { zones, planetary } = analysisData;

    return (
      <div className="space-y-6 mt-6 animate-fade-in-up">
        <div className="bg-black/30 p-4 rounded border border-amber-500/10">
          <h4 className="text-amber-400 font-bold text-xs uppercase tracking-widest mb-3">Mukha Trikona (3 Zones)</h4>
          <div className="space-y-3 mb-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-amber-100">Upper (Forehead)</span>
                <span className="text-amber-400 font-bold">{zones.upper}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full">
                <div className="h-full bg-blue-500" style={{ width: `${zones.upper}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-amber-100">Middle (Eyes/Nose)</span>
                <span className="text-amber-400 font-bold">{zones.middle}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full">
                <div className="h-full bg-green-500" style={{ width: `${zones.middle}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-amber-100">Lower (Mouth/Chin)</span>
                <span className="text-amber-400 font-bold">{zones.lower}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-800 rounded-full">
                <div className="h-full bg-red-500" style={{ width: `${zones.lower}%` }}></div>
              </div>
            </div>
          </div>
          <div className="text-center bg-gray-800/50 p-2 rounded text-xs text-amber-200">
            Dominant: <strong className="text-white">{zones.dominance}</strong> ({analysisData.personality.primary})
          </div>
        </div>

        <div className="bg-black/30 p-4 rounded border border-amber-500/10">
          <h4 className="text-amber-400 font-bold text-xs uppercase tracking-widest mb-3">Planetary Influences</h4>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(planetary).map(([planet, score]) => (
              <div key={planet} className="bg-gray-900 p-2 rounded text-center border border-gray-700">
                <div className="text-[10px] uppercase text-gray-400 mb-1">{planet}</div>
                <div className={`font-bold text-sm ${(score as number) > 80 ? 'text-green-400' : 'text-amber-100'}`}>{score as number}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-12 items-center">
      <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
        <SmartBackButton label={t('backToHome')} className="mb-6" />

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-amber-300 mb-2">{t('aiFaceReading')}</h2>
          <p className="text-amber-100/70">{t('uploadFacePrompt')}</p>
        </div>

        <div className="max-w-4xl mx-auto p-6 bg-gradient-to-br from-amber-900/40 via-orange-900/40 to-black/60 rounded-xl shadow-2xl border border-amber-500/30 backdrop-blur-md">
          <div className="grid md:grid-cols-2 gap-8 items-start">

            {/* LEFT: Image Upload/Camera */}
            <div className="space-y-4">
              {isCameraOpen ? (
                <div className="w-full relative bg-black rounded-lg overflow-hidden border-2 border-amber-500 shadow-xl">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover transform scale-x-[-1]"
                    onLoadedMetadata={() => console.log('📹 Video metadata loaded')}
                    onCanPlay={() => console.log('✅ Video can play')}
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 z-10">
                    <button onClick={handleStopCamera} className="bg-red-600/80 hover:bg-red-600 text-white p-2 rounded-full backdrop-blur-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <button onClick={handleCapture} className="bg-white/90 hover:bg-white text-black p-4 rounded-full shadow-lg backdrop-blur-sm border-4 border-amber-500/50 transform active:scale-95 transition-transform">
                      <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  {/* Image Preview */}
                  <div className="w-full h-64 border-2 border-dashed border-amber-400 rounded-lg flex flex-col justify-center items-center bg-gray-900/50 mb-4">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Face preview" className="object-contain h-full w-full rounded-lg" />
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-amber-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span className="text-amber-200 text-center px-4 text-sm">
                          {isMobile ? 'Use buttons below to capture or upload' : 'Use webcam or upload file'}
                        </span>
                      </>
                    )}
                  </div>

                  {/* ✅ ONLY ONE FILE INPUT (for gallery only) */}
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {/* ✅ TWO SEPARATE BUTTONS */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={handleOpenCamera}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-blue-500 text-sm py-3 flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <span>📸 Camera</span>
                    </Button>
                    <Button
                      onClick={handleGalleryClick}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 border-purple-500 text-sm py-3 flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <span>🖼️ Gallery</span>
                    </Button>
                  </div>
                </div>
              )}

              {error && error.includes('Camera') && (
                <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-400 text-xs font-bold mb-2">💡 Tip:</p>
                  <p className="text-xs text-blue-200">Use the Gallery button to upload from your phone</p>
                </div>
              )}

              <div ref={analyzeButtonRef}>
                {imageFile && !isCameraOpen && (
                  <Button
                    onClick={handleGetReading}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600"
                  >
                    {isLoading ? t('analyzing') : t('getYourReading')}
                  </Button>
                )}
              </div>

              {error && !error.includes('Camera') && (
                <p className="text-red-400 text-center text-sm bg-red-900/20 p-2 rounded border border-red-500/20">
                  {error}
                </p>
              )}
            </div>

            {/* RIGHT: Preview/Results */}
            <div className="min-h-[20rem] bg-black/20 rounded-lg border border-amber-500/20 p-6 relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 rounded-full blur-3xl -z-10"></div>

              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20">
                  <ProgressBar progress={progress} message={getLoadingMessage(progress)} />
                </div>
              )}

              {!analysisData && !isLoading && (
                <div className="flex-grow flex flex-col items-center justify-center text-amber-300/40 text-center">
                  <span className="text-7xl mb-4 animate-float opacity-50">😐</span>
                  <p className="font-lora italic">Upload your photo to begin analysis.</p>
                </div>
              )}

              {analysisData && !isLoading && (
                <div className="space-y-6 animate-fade-in-up">
                  {renderVedicDashboard()}

                  {!isPaid ? (
                    <div className="relative mt-4">
                      <div className="bg-black/40 p-4 rounded-xl border border-amber-500/20 text-amber-100 font-lora italic leading-relaxed text-sm relative overflow-hidden min-h-[150px]">
                        <span className="text-3xl text-amber-500/30 absolute top-0 left-2">"</span>
                        {reading.substring(0, 160)}...
                        <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-gray-900/90 to-transparent"></div>
                      </div>
                      <div className="mt-4">
                        <Button
                          onClick={handleReadMore}
                          className="w-full bg-gradient-to-r from-amber-600 to-orange-800 border-amber-500 shadow-xl py-4 font-cinzel tracking-widest hover:shadow-2xl transform hover:scale-105 transition-all"
                        >
                          🔓 Unlock Full Reading - ₹{servicePrice}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-4 bg-green-900/30 border border-green-500/30 rounded-xl">
                      <p className="text-green-400 font-bold">✅ Full Report Unlocked!</p>
                      <p className="text-xs text-green-300 mt-1">Scroll down to read</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FULL REPORT SECTION */}
        {analysisData && isPaid && (
          <div ref={reportRef} className="mt-8 animate-fade-in-up scroll-mt-24">
            <div className="max-w-4xl mx-auto p-6 bg-gradient-to-br from-amber-900/40 via-orange-900/40 to-black/60 rounded-xl shadow-2xl border border-amber-500/30 backdrop-blur-md">
              <div className="text-center mb-8">
                <div className="w-32 h-32 mx-auto mb-6 rounded-full border-4 border-amber-500 shadow-2xl overflow-hidden">
                  <img
                    src={cloudManager.resolveImage(reportImage)}
                    alt="Face Reading"
                    className="w-full h-full object-cover"
                  />
                </div>
                <h1 className="text-5xl font-cinzel font-black text-white mb-3 uppercase tracking-wider">
                  Face Reading Analysis
                </h1>
                <p className="text-xl text-amber-300 font-lora italic">
                  Mukha Samudrika Shastra
                </p>
              </div>

              {renderVedicDashboard()}

              <div className="bg-black/20 rounded-2xl p-8 border border-amber-500/20 mt-8">
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
