
import React, { useRef, useState, useMemo, useEffect } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
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
    if (!text || text.trim() === '') return (
        <div className="flex flex-col items-center justify-center p-12 text-gray-400 italic">
            <span className="text-4xl mb-4 opacity-20">📜</span>
            <p>The Oracle is still channeling your report. Please wait...</p>
        </div>
    );
    
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

        if (isHeader) return <h4 key={i} className="text-lg font-cinzel font-bold text-[#5c2a0d] mt-8 mb-4 border-b border-[#8b4513]/20 pb-1 uppercase tracking-wider">{cleanContent}</h4>;
        if (isBullet) return <div key={i} className="flex items-start mb-3 ml-2"><span className="text-[#d2691e] mr-3 mt-1.5 text-[10px]">❖</span><p className="text-[#2a1a1a] leading-relaxed text-sm md:text-base">{parsedContent}</p></div>;
        return <p key={i} className="mb-4 text-justify leading-relaxed text-[#2a1a1a] text-sm md:text-base font-medium">{parsedContent}</p>;
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
          pdf.save(`${title.replace(/\s+/g, '_')}_Report.pdf`);
      } catch (err) {
          alert("Divine scribe was interrupted. Please try again.");
      } finally {
          content.style.transform = originalTransform;
          setIsDownloading(false);
      }
  };

  return (
    <div className="animate-fade-in-up w-full flex flex-col items-center py-6" ref={containerRef}>
        <SageChat context={displayContent} type={title} />
        
        <div 
          className="relative transition-all duration-300 shadow-[0_40px_80px_rgba(0,0,0,0.6)] origin-top rounded-sm bg-[#fffcf0] sacred-boundary"
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
                {/* Decorative Elements */}
                <div className="absolute top-8 left-8 text-7xl text-[#d4af37]/15 font-cinzel select-none leading-none pointer-events-none">ॐ</div>
                <div className="absolute top-8 right-8 text-7xl text-[#d4af37]/15 font-cinzel select-none leading-none pointer-events-none">ॐ</div>
                
                {reportBackground && (
                    <OptimizedImage 
                        src={reportBackground} 
                        alt="" 
                        className="absolute inset-0 w-full h-full object-cover opacity-[0.04] z-0 grayscale"
                        showSkeleton={false}
                    />
                )}

                {/* 🛡️ ENHANCED DECORATIVE BORDER (Sacred Frame) */}
                <div className="absolute inset-0 z-40 pointer-events-none p-6 md:p-8">
                    <div className="w-full h-full border-[12px] md:border-[16px] border-double border-[#d4af37]/50 shadow-[inset_0_0_60px_rgba(0,0,0,0.03)] relative">
                        {/* Inner hair-line border */}
                        <div className="absolute inset-1 border border-[#d4af37]/20"></div>
                    </div>
                    
                    {/* Corner Ornaments - High detail */}
                    <div className="absolute top-4 left-4 w-16 h-16 text-[#b38728]/40">
                        <svg viewBox="0 0 100 100" fill="currentColor"><path d="M0 0 L40 0 L40 5 L5 5 L5 40 L0 40 Z M15 15 L30 15 L30 20 L20 20 L20 30 L15 30 Z"/></svg>
                    </div>
                    <div className="absolute top-4 right-4 w-16 h-16 text-[#b38728]/40 rotate-90">
                        <svg viewBox="0 0 100 100" fill="currentColor"><path d="M0 0 L40 0 L40 5 L5 5 L5 40 L0 40 Z M15 15 L30 15 L30 20 L20 20 L20 30 L15 30 Z"/></svg>
                    </div>
                    <div className="absolute bottom-4 left-4 w-16 h-16 text-[#b38728]/40 -rotate-90">
                        <svg viewBox="0 0 100 100" fill="currentColor"><path d="M0 0 L40 0 L40 5 L5 5 L5 40 L0 40 Z M15 15 L30 15 L30 20 L20 20 L20 30 L15 30 Z"/></svg>
                    </div>
                    <div className="absolute bottom-4 right-4 w-16 h-16 text-[#b38728]/40 rotate-180">
                        <svg viewBox="0 0 100 100" fill="currentColor"><path d="M0 0 L40 0 L40 5 L5 5 L5 40 L0 40 Z M15 15 L30 15 L30 20 L20 20 L20 30 L15 30 Z"/></svg>
                    </div>
                </div>

                {/* 🌟 ENHANCED HEADER (Orbital Astral Seal) */}
                <div className="relative z-20 w-full flex flex-col items-center flex-shrink-0 mb-12 pb-10 border-b border-[#d4af37]/25 pt-8">
                    <div className="w-48 h-48 relative mb-6 flex items-center justify-center">
                        {/* Animated orbits */}
                        <div className="absolute inset-0 border-2 border-dashed border-[#d4af37]/20 rounded-full animate-[spin_120s_linear_infinite]"></div>
                        <div className="absolute inset-4 border border-dotted border-[#d4af37]/30 rounded-full animate-[spin_80s_linear_infinite_reverse]"></div>
                        <div className="absolute inset-8 border border-[#d4af37]/10 rounded-full"></div>
                        
                        {/* Central Seal */}
                        <div className="w-32 h-32 bg-[#0d0d0d] rounded-full border-[4px] border-[#d4af37] shadow-[0_0_60px_rgba(212,175,55,0.25)] flex items-center justify-center overflow-hidden group">
                             <div className="absolute inset-0 flex items-center justify-center p-5 transform group-hover:scale-110 transition-transform duration-1000">
                                <img 
                                    src={logoUrl} 
                                    alt="Sacred Seal" 
                                    className="max-w-full max-h-full object-contain brightness-125" 
                                    referrerPolicy="no-referrer"
                                />
                             </div>
                             {/* Gloss layer */}
                             <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none"></div>
                        </div>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-cinzel font-black gold-gradient-text tracking-[0.15em] uppercase mb-1 text-center drop-shadow-sm leading-tight max-w-[85%]">
                      {title}
                    </h2>
                    {subtitle && (
                        <p className="text-[#8b4513] text-[9px] md:text-[10px] font-black uppercase tracking-[0.6em] mt-3 opacity-60 italic pt-3 text-center border-t border-[#d4af37]/10 w-[60%]">
                          {subtitle}
                        </p>
                    )}
                </div>

                {/* 📜 CONTENT AREA */}
                <div className="relative z-10 flex-grow overflow-y-auto custom-scrollbar px-12 md:px-16">
                    {isTranslating ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="w-16 h-16 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[#8b4513] font-cinzel font-bold mt-8 animate-pulse uppercase tracking-[0.3em] text-xs">Transcending Tongues...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-8">
                            <div className="font-lora text-[#2a1a1a] text-lg md:text-xl leading-relaxed space-y-6">
                                {renderFormattedText(displayContent)}
                            </div>

                            {/* PERSISTED CHARTS / METADATA */}
                            {chartData && (
                                <div className="mt-12 pt-12 border-t border-[#d4af37]/20 grid grid-cols-1 md:grid-cols-2 gap-12">
                                    {chartData.vedicMetrics && (
                                        <div className="bg-[#8b4513]/5 p-8 rounded-3xl border border-[#d4af37]/15 shadow-inner">
                                            <h4 className="text-[10px] font-cinzel font-bold text-[#5c2a0d] mb-6 uppercase tracking-[0.5em] text-center border-b border-[#8b4513]/10 pb-3">Celestial Alignment</h4>
                                            <div className="space-y-6">
                                                {chartData.vedicMetrics.map((m: any, i: number) => (
                                                    <div key={i}>
                                                        <div className="flex justify-between text-[9px] uppercase font-black text-[#8b4513] mb-2 tracking-widest">
                                                            <span>{m.label}</span>
                                                            <span className="font-mono text-xs">{m.value}%</span>
                                                        </div>
                                                        <div className="w-full h-2.5 bg-[#8b4513]/10 rounded-full overflow-hidden p-[1px]">
                                                            <div className="h-full bg-gradient-to-r from-[#8b4513] to-[#d4af37] rounded-full shadow-[0_0_10px_rgba(139,69,19,0.2)]" style={{ width: `${m.value}%` }}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {chartData.luckyNumbers && (
                                        <div className="bg-[#d4af37]/8 p-8 rounded-3xl border border-[#d4af37]/25 text-center shadow-inner flex flex-col justify-center">
                                            <h4 className="text-[10px] font-cinzel font-bold text-[#4a0404] mb-6 uppercase tracking-[0.5em] text-center border-b border-[#d4af37]/20 pb-3">Propitious Frequencies</h4>
                                            <div className="flex flex-wrap justify-center gap-5 mt-2">
                                                {chartData.luckyNumbers.map((num: number, i: number) => (
                                                    <div key={i} className="w-16 h-16 rounded-full border-[3px] border-[#d4af37]/60 bg-white/80 flex items-center justify-center shadow-xl transform hover:scale-110 transition-transform">
                                                        <span className="font-cinzel font-black text-2xl text-[#4a0404] drop-shadow-sm">{num}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Authenticated Seal Footer */}
                    <div className="mt-28 pt-12 text-center opacity-40 border-t border-[#d4af37]/25 pb-10">
                        <div className="text-3xl text-[#d4af37] mb-6 font-cinzel tracking-[1.5em] pl-[1.5em]">❂ ❂ ❂</div>
                        <span className="text-[#8b4513] text-[9px] font-cinzel font-black tracking-[0.6em] uppercase block mb-1">Authenticated Sovereign Decree</span>
                        <span className="text-[#8b4513]/50 text-[7px] font-mono tracking-widest uppercase">ENCLAVE_TOKEN: {Math.random().toString(36).substring(2, 18).toUpperCase()}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center w-full max-w-xl mb-16 no-print px-4">
              <Button 
                onClick={handleDownloadPDF} 
                disabled={isDownloading || isTranslating} 
                className="flex-1 h-16 text-sm bg-[#3a0303] hover:bg-[#4a0404] text-white flex items-center justify-center gap-4 shadow-2xl border-none font-cinzel tracking-[0.25em] rounded-2xl transform hover:scale-105 transition-all"
              >
                  {isDownloading ? <span className="animate-pulse">SCRIBING...</span> : <><span className="text-2xl">📜</span> Download Scroll</>}
              </Button>
              <Button 
                onClick={() => window.location.href = `mailto:?subject=${encodeURIComponent("My Sacred Report: " + title)}&body=${encodeURIComponent("My spiritual report is ready. View it here.")}`} 
                className="flex-1 h-16 text-sm bg-white hover:bg-gray-50 text-[#3a0303] flex items-center justify-center gap-4 shadow-xl border-2 border-[#3a0303]/20 font-cinzel tracking-[0.25em] rounded-2xl transform hover:scale-105 transition-all"
              >
                  <span className="text-2xl">✉️</span> Email Wisdom
              </Button>
        </div>

        <Link to="/home" className="mb-24 no-print">
            <button className="text-skin-accent font-cinzel font-bold text-xs uppercase tracking-[0.6em] hover:text-white transition-all flex items-center gap-3 active:scale-95">
                <span className="text-xl">←</span> Sanctuary
            </button>
        </Link>
    </div>
  );
};

export default FullReport;
