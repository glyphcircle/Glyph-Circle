
import React, { useRef, useState, useMemo, useEffect } from 'react';
import Button from './shared/Button';
import { useTranslation } from '../hooks/useTranslation';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { cloudManager } from '../services/cloudManager';
import { translateText } from '../services/geminiService';
import SageChat from './SageChat';
import { useDb } from '../hooks/useDb';
import { useAuth } from '../context/AuthContext';
import OptimizedImage from './shared/OptimizedImage';
import { Link } from 'react-router-dom';

interface FullReportProps {
  reading: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  chartData?: any; 
}

const DEFAULT_BRAND_LOGO = 'https://lh3.googleusercontent.com/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO';

const FullReport: React.FC<FullReportProps> = ({ reading, title, subtitle, imageUrl, chartData }) => {
  const { t, language } = useTranslation();
  const { db } = useDb();
  const { user } = useAuth();
  
  const reportRef = useRef<HTMLDivElement>(null); 
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [displayContent, setDisplayContent] = useState(reading);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({}); 

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const viewportWidth = window.innerWidth - 32;
        const targetWidth = 800;
        if (viewportWidth < targetWidth) {
          setScaleFactor(viewportWidth / targetWidth);
        } else {
          setScaleFactor(1);
        }
      }
    };
    window.addEventListener('resize', updateScale);
    updateScale();
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
      if (reading) {
        setDisplayContent(reading);
        setTranslations({}); 
      }
  }, [reading]);

  useEffect(() => {
      const getLanguageName = (code: string) => {
          const map: Record<string, string> = { 
              en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu',
              bn: 'Bengali', mr: 'Marathi', es: 'Spanish', fr: 'French',
              ar: 'Arabic', pt: 'Portuguese', de: 'German', ja: 'Japanese', 
              ru: 'Russian', zh: 'Chinese'
          };
          return map[code] || 'English';
      };

      const handleTranslation = async () => {
          if (!reading) return;
          if (language === 'en') {
              setDisplayContent(reading);
              return;
          }
          if (translations[language]) {
              setDisplayContent(translations[language]);
              return;
          }
          setIsTranslating(true);
          try {
              const translated = await translateText(reading, getLanguageName(language));
              setTranslations(prev => ({ ...prev, [language]: translated }));
              setDisplayContent(translated);
          } catch (e) {
              console.error("Translation Error", e);
          } finally {
              setIsTranslating(false);
          }
      };
      handleTranslation();
  }, [language, reading]); 

  const logoUrl = useMemo(() => {
    const asset = db.image_assets?.find((a: any) => a.id === 'sacred_emblem' || a.tags?.includes('brand_logo'));
    return asset ? cloudManager.resolveImage(asset.path) : DEFAULT_BRAND_LOGO;
  }, [db.image_assets]);

  const reportBackground = useMemo(() => {
      const formats = db.report_formats?.filter((f: any) => f.status === 'active') || [];
      if (formats.length === 0) return null;
      const randomFormat = formats[Math.floor(Math.random() * formats.length)];
      return cloudManager.resolveImage(randomFormat.url);
  }, [db.report_formats]); 

  const renderFormattedText = (text: string) => {
    if (!text || text.trim() === '') return null;
    
    let normalizedText = text.replace(/\\n/g, '\n').replace(/\n/g, '\n');
    const lines = normalizedText.split('\n').filter(line => line.trim() !== '');

    return lines.map((line, i) => {
        let trimmed = line.trim();
        const isHeader = trimmed.startsWith('#') || (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length < 60);
        const isBullet = /^[-•*]/.test(trimmed) || /^\d+\.\s/.test(trimmed);
        const cleanContent = trimmed.replace(/^[#*]+\s*/, '').replace(/\s*[#*]+$/, '').replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '');
        const parts = cleanContent.split(/(\*\*.*?\*\*)/g);
        const parsedContent = parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) return <strong key={j} className="text-[#8b4513] font-bold">{part.slice(2, -2)}</strong>;
            return <span key={j}>{part}</span>;
        });

        if (isHeader) return <h4 key={i} className="text-xl font-cinzel font-bold text-[#5c2a0d] mt-10 mb-6 border-b border-[#8b4513]/20 pb-2 uppercase tracking-widest">{cleanContent}</h4>;
        if (isBullet) return <div key={i} className="flex items-start mb-4 ml-3"><span className="text-[#d2691e] mr-4 mt-2 text-[12px]">❖</span><p className="text-[#2a1a1a] leading-relaxed text-base md:text-lg">{parsedContent}</p></div>;
        return <p key={i} className="mb-6 text-justify leading-relaxed text-[#2a1a1a] text-base md:text-lg font-medium">{parsedContent}</p>;
    });
  };

  const handleDownloadPDF = async () => {
      const content = reportRef.current;
      if (!content) return;
      setIsDownloading(true);
      const originalTransform = content.style.transform;
      content.style.transform = 'none';

      try {
          const canvas = await html2canvas(content, { 
              scale: 3, 
              useCORS: true,
              logging: false,
              backgroundColor: '#fffcf0'
          });
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const pdf = new jsPDF({
              orientation: 'portrait',
              unit: 'mm',
              format: 'a4'
          });
          const width = pdf.internal.pageSize.getWidth();
          const height = pdf.internal.pageSize.getHeight();
          pdf.addImage(imgData, 'JPEG', 0, 0, width, height, undefined, 'FAST');
          pdf.save(`${title.replace(/\s+/g, '_')}_Sacred_Report.pdf`);
      } catch (err) {
          alert("Transcription error. Please retry.");
      } finally {
          content.style.transform = originalTransform;
          setIsDownloading(false);
      }
  };

  return (
    <div className="animate-fade-in-up w-full flex flex-col items-center py-6" ref={containerRef}>
        <SageChat context={displayContent} type={title} />
        
        <div 
          className="relative transition-all duration-300 shadow-[0_50px_100px_rgba(0,0,0,0.7)] origin-top rounded-sm bg-[#fffcf0] sacred-boundary"
          style={{ 
            width: '210mm', 
            height: '297mm',
            transform: `scale(${scaleFactor})`,
            marginBottom: `calc(297mm * (${scaleFactor} - 1) + 4rem)`,
          }}
        >
            <div 
                ref={reportRef} 
                className="absolute inset-0 bg-[#fffcf0] text-black overflow-hidden flex flex-col p-14 report-canvas"
            >
                {reportBackground && (
                    <OptimizedImage 
                        src={reportBackground} 
                        alt="" 
                        className="absolute inset-0 w-full h-full object-cover opacity-[0.06] z-0 grayscale"
                        showSkeleton={false}
                    />
                )}

                {/* 🛡️ ENHANCED SACRED BOUNDARY FRAME */}
                <div className="absolute inset-0 z-40 pointer-events-none p-6 md:p-12">
                    <div className="w-full h-full border-[20px] md:border-[28px] border-double border-[#d4af37]/60 shadow-[inset_0_0_100px_rgba(0,0,0,0.05)] relative">
                        <div className="absolute inset-[-4px] border-[1px] border-white/20"></div>
                        <div className="absolute inset-1 border-[4px] border-[#d4af37]/20 m-1"></div>
                    </div>
                    
                    {/* Corner Ornaments */}
                    {['top-2 left-2', 'top-2 right-2 rotate-90', 'bottom-2 left-2 -rotate-90', 'bottom-2 right-2 rotate-180'].map((pos, idx) => (
                        <div key={idx} className={`absolute w-32 h-32 md:w-48 md:h-48 text-[#b38728]/50 ${pos}`}>
                            <svg viewBox="0 0 100 100" fill="currentColor">
                                <path d="M0,0 L35,0 L35,3 L3,3 L3,35 L0,35 Z" />
                                <circle cx="8" cy="8" r="2.5" />
                                <path d="M16,16 L24,16 L24,18 L18,18 L18,24 L16,24 Z" opacity="0.4" />
                            </svg>
                        </div>
                    ))}
                </div>

                {/* 🌟 ENHANCED CELESTIAL HEADER */}
                <div className="relative z-30 w-full flex flex-col items-center pt-16 mb-16 pb-12 border-b border-[#d4af37]/20">
                    <div className="relative w-52 h-52 mb-10 flex items-center justify-center">
                        <div className="absolute inset-[-30px] bg-[radial-gradient(circle,rgba(212,175,55,0.15)_0%,transparent_70%)] animate-pulse rounded-full blur-2xl"></div>
                        <div className="absolute inset-0 border-[3px] border-dashed border-[#d4af37]/25 rounded-full animate-[spin_240s_linear_infinite]"></div>
                        <div className="absolute inset-8 border-[1px] border-dotted border-[#d4af37]/30 rounded-full animate-[spin_120s_linear_infinite_reverse]"></div>
                        
                        <div className="w-36 h-36 bg-black rounded-full border-[6px] border-[#d4af37] shadow-[0_0_80px_rgba(212,175,55,0.5)] flex items-center justify-center overflow-hidden">
                             <div className="absolute inset-0 p-8 transform hover:scale-110 transition-transform duration-1000">
                                <img src={logoUrl} alt="Seal" className="w-full h-full object-contain brightness-125" />
                             </div>
                             <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/20 pointer-events-none"></div>
                        </div>
                    </div>

                    <h2 className="text-5xl font-cinzel font-black gold-gradient-text tracking-[0.2em] uppercase mb-2 text-center leading-tight max-w-[80%]">
                      {title}
                    </h2>
                    {subtitle && (
                        <p className="text-[#8b4513] text-[10px] md:text-[11px] font-black uppercase tracking-[0.5em] mt-2 opacity-70 italic text-center w-[60%]">
                          {subtitle}
                        </p>
                    )}
                </div>

                {/* 📜 CONTENT AREA */}
                <div className="relative z-10 flex-grow overflow-y-auto custom-scrollbar px-16 md:px-24">
                    {isTranslating ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="w-12 h-12 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[#8b4513] font-cinzel font-bold mt-6 animate-pulse uppercase tracking-[0.2em] text-[10px]">Aligning Translations...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-8 pb-16">
                            <div className="font-lora text-[#2a1a1a] text-base md:text-lg leading-relaxed space-y-6">
                                {renderFormattedText(displayContent)}
                            </div>

                            {chartData && (
                                <div className="mt-10 pt-10 border-t border-[#d4af37]/15 grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {chartData.vedicMetrics && (
                                        <div className="bg-[#8b4513]/5 p-6 rounded-2xl border border-[#d4af37]/10">
                                            <h4 className="text-[10px] font-cinzel font-bold text-[#5c2a0d] mb-4 uppercase tracking-[0.4em] text-center border-b border-[#8b4513]/10 pb-2">Celestial Balance</h4>
                                            <div className="space-y-4">
                                                {chartData.vedicMetrics.map((m: any, i: number) => (
                                                    <div key={i}>
                                                        <div className="flex justify-between text-[9px] uppercase font-black text-[#8b4513] mb-1.5 tracking-widest">
                                                            <span>{m.label}</span>
                                                            <span className="font-mono">{m.value}%</span>
                                                        </div>
                                                        <div className="w-full h-2 bg-[#8b4513]/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-gradient-to-r from-[#8b4513] to-[#d4af37]" style={{ width: `${m.value}%` }}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {chartData.luckyNumbers && (
                                        <div className="bg-[#d4af37]/5 p-6 rounded-2xl border border-[#d4af37]/15 text-center flex flex-col justify-center">
                                            <h4 className="text-[10px] font-cinzel font-bold text-[#4a0404] mb-4 uppercase tracking-[0.4em] text-center border-b border-[#d4af37]/10 pb-2">Propitious Frequencies</h4>
                                            <div className="flex flex-wrap justify-center gap-4 mt-2">
                                                {chartData.luckyNumbers.map((num: number, i: number) => (
                                                    <div key={i} className="w-12 h-12 rounded-full border-2 border-[#d4af37]/50 bg-white/60 flex items-center justify-center shadow-lg">
                                                        <span className="font-cinzel font-black text-xl text-[#4a0404]">{num}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Authenticated Stamp Footer */}
                    <div className="mt-auto pt-10 text-center opacity-40 border-t border-[#d4af37]/15 pb-8">
                        <div className="text-4xl text-[#d4af37] mb-4 font-cinzel tracking-[1.2em] pl-[1.2em]">❂ ❂ ❂</div>
                        <span className="text-[#8b4513] text-[8px] font-cinzel font-black tracking-[0.5em] uppercase block mb-1">Authenticated Sovereign Decree</span>
                        <span className="text-[#8b4513]/40 text-[7px] font-mono tracking-widest uppercase">NODE_SYNC_{Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center w-full max-w-xl mb-16 no-print px-4">
              <Button 
                onClick={handleDownloadPDF} 
                disabled={isDownloading || isTranslating} 
                className="flex-1 h-14 bg-[#3a0303] hover:bg-[#4a0404] text-white flex items-center justify-center gap-4 shadow-xl border-none font-cinzel tracking-widest rounded-xl transition-all active:scale-95"
              >
                  {isDownloading ? <span className="animate-pulse">SCRIBING...</span> : <><span className="text-xl">📜</span> Download PDF</>}
              </Button>
              <Button 
                onClick={() => window.location.href = `mailto:?subject=${encodeURIComponent("My Sacred Report: " + title)}&body=${encodeURIComponent("My spiritual report is ready. View it here.")}`} 
                className="flex-1 h-14 bg-white hover:bg-gray-50 text-[#3a0303] flex items-center justify-center gap-4 shadow-lg border border-[#3a0303]/10 font-cinzel tracking-widest rounded-xl transition-all active:scale-95"
              >
                  <span className="text-xl">✉️</span> Share Report
              </Button>
        </div>

        <Link to="/home" className="mb-24 no-print">
            <button className="text-skin-accent font-cinzel font-bold text-[10px] uppercase tracking-[0.6em] hover:text-white transition-all flex items-center gap-3">
                <span className="text-lg">←</span> Sanctuary
            </button>
        </Link>
    </div>
  );
};

export default FullReport;
