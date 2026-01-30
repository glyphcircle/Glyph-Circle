import React, { useState, useCallback, useRef, useEffect } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import { getFaceReading } from '../services/geminiService';
import { calculateFaceReading, FaceAnalysis } from '../services/faceReadingEngine';
import Button from './shared/Button';
import ProgressBar from './shared/ProgressBar';
import { useTranslation } from '../hooks/useTranslation';
import { usePayment } from '../context/PaymentContext';
import FullReport from './FullReport';
import { useAuth } from '../context/AuthContext';
import { useDb } from '../hooks/useDb';
import { cloudManager } from '../services/cloudManager';
import Card from './shared/Card';
import InlineError from './shared/InlineError';

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
  const videoRef = useRef<HTMLVideoElement>(null);

  const { t, language } = useTranslation();
  const { openPayment } = usePayment();
  const { user, saveReading } = useAuth();
  const { db } = useDb();

  const isAdmin = user?.role === 'admin';
  const serviceConfig = db.services?.find((s: any) => s.id === 'face-reading');
  const servicePrice = serviceConfig?.price || 49;
  const reportImage = db.image_assets?.find((a: any) => a.id === 'report_bg_face')?.path || "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=800";

  useEffect(() => {
    return () => { if (cameraStream) cameraStream.getTracks().forEach(track => track.stop()); };
  }, [cameraStream]);

  useEffect(() => {
    if (isCameraOpen && videoRef.current && cameraStream) { videoRef.current.srcObject = cameraStream; }
  }, [isCameraOpen, cameraStream]);

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
            setIsCameraOpen(false);
          }
        }, 'image/jpeg');
      }
    }
  };

  const handleGetReading = useCallback(async () => {
    if (!imageFile) { setError('Please manifest a facial image first.'); return; }
    setIsLoading(true); setProgress(0); setReading(''); setAnalysisData(null); setError('');
    const timer = setInterval(() => setProgress(p => (p >= 90 ? p : p + (Math.random() * 8))), 600);
    try {
      const result = await getFaceReading(imageFile, language === 'hi' ? 'Hindi' : 'English');
      clearInterval(timer); setProgress(100);
      if (result.rawMetrics) setAnalysisData(calculateFaceReading(result.rawMetrics));
      setReading(result.textReading);
      saveReading({ type: 'face-reading', title: 'Facial Prophecy', content: result.textReading, image_url: imagePreview || undefined });
    } catch (err: any) { clearInterval(timer); setError(`${err.message || 'The mists cloud the facial features.'}`); } finally { setIsLoading(false); }
  }, [imageFile, language, saveReading, imagePreview]);

  return (
    <div className="relative min-h-screen bg-[#0F0F23] pt-12 pb-24 overflow-hidden">
        {/* 🔱 IMPERIAL DECORATIONS */}
        <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
            <div className="absolute top-10 left-10 w-32 h-32 border-t-4 border-l-4 border-amber-500 rounded-tl-3xl shadow-[0_0_20px_rgba(245,158,11,0.3)]"></div>
            <div className="absolute top-10 right-10 w-32 h-32 border-t-4 border-r-4 border-amber-500 rounded-tr-3xl"></div>
            <div className="absolute bottom-10 left-10 w-32 h-32 border-b-4 border-l-4 border-amber-500 rounded-bl-3xl"></div>
            <div className="absolute bottom-10 right-10 w-32 h-32 border-b-4 border-r-4 border-amber-500 rounded-br-3xl"></div>
        </div>

        <div className="max-w-6xl mx-auto px-4 relative z-10">
            <Link to="/home" className="inline-flex items-center text-amber-200/60 hover:text-amber-400 transition-all mb-12 group">
                <span className="text-2xl mr-3 group-hover:-translate-x-2 transition-transform">←</span>
                <span className="font-cinzel font-black uppercase tracking-widest text-xs">Exit Sanctuary</span>
            </Link>

            {/* 🌟 CELESTIAL RADIANT HEADER */}
            <div className="flex flex-col items-center text-center mb-16">
                <div className="relative w-48 h-48 mb-10 flex items-center justify-center">
                    <div className="absolute inset-[-40px] bg-[radial-gradient(circle,rgba(245,158,11,0.2)_0%,transparent_70%)] animate-pulse rounded-full blur-2xl"></div>
                    <div className="absolute inset-0 border-2 border-dashed border-amber-500/30 rounded-full animate-[spin_120s_linear_infinite]"></div>
                    <div className="w-32 h-32 bg-black rounded-full border-4 border-amber-500 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.5)] transform transition-transform hover:scale-110 duration-700 overflow-hidden">
                        <span className="text-6xl filter drop-shadow-lg">😐</span>
                    </div>
                </div>
                <h1 className="text-5xl md:text-6xl font-cinzel font-black text-white uppercase tracking-tighter mb-4 drop-shadow-2xl">
                    AI <span className="gold-gradient-text">Face Reading</span>
                </h1>
                <p className="text-amber-100/60 font-lora italic text-lg max-w-xl mx-auto">
                    The soul speaks through the architecture of the face. Let the digital eye perceive your true essence.
                </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-12 items-start">
                <div className="lg:col-span-5 space-y-8">
                    <Card className="p-8 bg-black/40 border-2 border-amber-500/20 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
                        <h3 className="text-amber-400 font-cinzel font-black text-[10px] uppercase tracking-[0.4em] mb-8 border-b border-white/5 pb-4">Facial Manifestation</h3>
                        
                        {isCameraOpen ? (
                            <div className="w-full relative bg-black rounded-3xl overflow-hidden border-2 border-amber-500/50 shadow-inner">
                                <video ref={videoRef} autoPlay playsInline muted className="w-full h-80 object-cover scale-x-[-1]" />
                                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6">
                                    <button onClick={() => setIsCameraOpen(false)} className="bg-red-900/80 p-3 rounded-full text-white border border-red-500/30">✕</button>
                                    <button onClick={handleCapture} className="bg-white p-5 rounded-full shadow-2xl transform active:scale-90 transition-all border-4 border-amber-500/40">
                                        <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <label htmlFor="face-upload" className="block w-full">
                                    <div className="w-full h-80 border-2 border-dashed border-amber-500/30 rounded-3xl flex flex-col justify-center items-center cursor-pointer hover:bg-amber-900/10 transition-all relative overflow-hidden bg-black/20 group">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                        ) : (
                                            <div className="text-center p-8">
                                                <div className="text-5xl mb-4 opacity-50">👤</div>
                                                <p className="text-amber-100/60 font-cinzel font-bold text-xs uppercase tracking-widest">Select Sacred Image</p>
                                            </div>
                                        )}
                                    </div>
                                </label>
                                <input id="face-upload" type="file" accept="image/*" className="hidden" onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setImageFile(file);
                                        const reader = new FileReader();
                                        reader.onloadend = () => setImagePreview(reader.result as string);
                                        reader.readAsDataURL(file);
                                    }
                                }} />
                                
                                <button onClick={async () => {
                                    try {
                                        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                                        setCameraStream(s); setIsCameraOpen(true);
                                    } catch (e) { alert("Access denied."); }
                                }} className="w-full py-4 bg-gray-900 border border-amber-500/30 text-amber-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-3">
                                    <span className="text-xl">📷</span> Take Imperial Selfie
                                </button>
                            </div>
                        )}

                        {imageFile && !isCameraOpen && (
                            <Button onClick={handleGetReading} disabled={isLoading} className="w-full mt-8 py-5 bg-gradient-to-r from-amber-600 to-amber-900 shadow-xl font-cinzel font-black uppercase tracking-[0.2em]">
                                {isLoading ? t('analyzing') : 'Initiate Analysis'}
                            </Button>
                        )}
                    </Card>
                </div>

                <div className="lg:col-span-7">
                    {isLoading && <div className="max-w-md mx-auto mt-20"><ProgressBar progress={progress} message="Mapping Facial Grid..." /></div>}
                    {error && <InlineError message={error} onRetry={handleGetReading} />}
                    {analysisData && !isLoading && (
                        <div className="space-y-10 animate-fade-in-up">
                            <div className="bg-[#fffcf0] text-black p-8 md:p-12 rounded-[2rem] shadow-2xl relative overflow-hidden report-canvas sacred-boundary">
                                <h3 className="text-2xl font-cinzel font-black text-amber-950 uppercase tracking-widest mb-6 border-b-2 border-amber-900/10 pb-4">Oracle Findings</h3>
                                {!isPaid ? (
                                    <div className="space-y-8">
                                        <div className="p-6 bg-amber-900/5 rounded-2xl border border-amber-900/10 italic text-amber-950 font-lora leading-relaxed text-lg line-clamp-4">"{reading}"</div>
                                        <div className="flex flex-col items-center">
                                            <Button onClick={() => openPayment(() => setIsPaid(true), 'Imperial Face Report', servicePrice)} className="px-12 py-5 bg-[#2d0a18] hover:bg-[#4a0404] text-white rounded-full font-cinzel font-black uppercase tracking-[0.2em] shadow-2xl transition-all">Reveal Full Decree</Button>
                                            {isAdmin && <button onClick={() => setIsPaid(true)} className="mt-4 text-[9px] text-amber-900/40 uppercase underline">Master Access Bypass</button>}
                                        </div>
                                    </div>
                                ) : (
                                    <FullReport reading={reading} title="Face Reading Decree" subtitle="The Mask of Destiny" imageUrl={cloudManager.resolveImage(reportImage)} chartData={{ ...analysisData, vedicMetrics: [{ label: 'Upper Zone', value: analysisData.zones.upper }, { label: 'Middle Zone', value: analysisData.zones.middle }, { label: 'Lower Zone', value: analysisData.zones.lower }] }} />
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

export default FaceReading;