import React, { useRef, useState, useEffect } from 'react';
import Button from './shared/Button';
import { useTranslation } from '../hooks/useTranslation';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { translateText } from '../services/geminiService';
import SageChat from './SageChat';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

interface FullReportProps {
  reading: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  chartData?: any; 
}

const DEFAULT_BRAND_LOGO = 'https://lh3.googleusercontent.com/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO';

const FullReport: React.FC<FullReportProps> = ({ reading, title, subtitle, chartData }) => {
  const { t, language } = useTranslation();
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
        const targetWidth = 850;
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
  }, [language, reading, translations]); 

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

        if (isHeader) return <h4 key={i} className="text-3xl font-cinzel font-black text-[#4a0404] mt-14 mb-8 border-b-2 border-[#d4af37] pb-3 uppercase tracking-[0.25em]">{cleanContent}</h4>;
        if (isBullet) return <div key={i} className="flex items-start mb-6 ml-6"><span className="text-[#d4af37] mr-6 mt-1.5 text-2xl">❂</span><p className="text-[#1a1a1a] leading-relaxed text-xl md:text-2xl font-medium">{parsedContent}</p></div>;
        
        if (i === 0) {
            return (
                <p key={i} className="mb-10 text-justify leading-[1.85] text-[#1a1a1a] text-xl md:text-2xl font-medium first-letter:text-[10rem] first-letter:font-cinzel first-letter:text-[#4a0404] first-letter:mr-8 first-letter:float-left first-letter:leading-none first-letter:font-black first-letter:drop-shadow-2xl">
                    {parsedContent}
                </p>
            );
        }

        return <p key={i} className="mb-10 text-justify leading-[1.85] text-[#1a1a1a] text-xl md:text-2xl font-medium">{parsedContent}</p>;
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
              scale: 2, 
              useCORS: true,
              logging: false,
              backgroundColor: '#fffcf0',
              allowTaint: false
          });
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          const width = pdf.internal.pageSize.getWidth();
          const height = pdf.internal.pageSize.getHeight();
          pdf.addImage(imgData, 'JPEG', 0, 0, width, height, undefined, 'FAST');
          pdf.save(`${title.replace(/\s+/g, '_')}_Imperial_Decree.pdf`);
      } catch (err: any) {
          console.error("PDF Export Error:", err);
          alert("Transcription error. Please ensure a stable cosmic connection.");
      } finally {
          content.style.transform = originalTransform;
          setIsDownloading(false);
      }
  };

  return (
    <div className="animate-fade-in-up w-full flex flex-col items-center py-10" ref={containerRef}>
        <SageChat context={displayContent} type={title} />
        
        <div 
          className="relative transition-all duration-300 shadow-[0_100px_250px_rgba(0,0,0,0.95)] origin-top rounded-sm bg-[#fffcf0] overflow-hidden"
          style={{ 
            width: '210mm', 
            minHeight: '297mm',
            transform: `scale(${scaleFactor})`,
            marginBottom: `calc(297mm * (${scaleFactor} - 1) + 6rem)`,
          }}
        >
            <div 
                ref={reportRef} 
                className="relative bg-[#fffcf0] text-black min-h-[297mm] flex flex-col p-16 md:p-32 report-canvas"
            >
                {/* 📜 PARCHMENT WATERMARK */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
                    <div className="text-[35rem] font-cinzel leading-none select-none">❂</div>
                </div>

                {/* 🛡️ IMPERIAL SACRED BOUNDARY */}
                <div className="absolute inset-0 z-40 pointer-events-none p-6 md:p-12">
                    <div className="w-full h-full border-[28px] border-double border-[#d4af37]/80 relative shadow-[inset_0_0_120px_rgba(139,92,5,0.1)]">
                        {/* Outer Gilded Accent */}
                        <div className="absolute inset-[-18px] border-[3px] border-[#d4af37]/50 rounded-sm"></div>
                        {/* Mid-Layer Etched Frame */}
                        <div className="absolute inset-6 border-[2px] border-[#d4af37]/30 rounded-sm"></div>
                        {/* Inner Micro-Line Guard */}
                        <div className="absolute inset-10 border-[1px] border-[#d4af37]/15 rounded-sm"></div>
                    </div>
                    
                    {/* Ornate Corner Symbols */}
                    {[
                      'top-4 left-4', 
                      'top-4 right-4 rotate-90', 
                      'bottom-4 left-4 -rotate-90', 
                      'bottom-4 right-4 rotate-180'
                    ].map((pos, idx) => (
                        <div key={idx} className={`absolute w-32 h-32 md:w-48 md:h-48 text-[#b38728] ${pos} filter drop-shadow-lg opacity-90`}>
                            <svg viewBox="0 0 100 100" fill="currentColor">
                                <path d="M0,0 L40,0 L40,4 L4,4 L4,40 L0,40 Z" />
                                <circle cx="10" cy="10" r="4" />
                                <path d="M25,25 Q25,50 50,50" fill="none" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                    ))}
                </div>

                {/* 🌟 CELESTIAL RADIANT HEADER */}
                <div className="relative z-30 w-full flex flex-col items-center pt-8 mb-20">
                    <div className="relative w-72 h-72 mb-10 flex items-center justify-center">
                        {/* Rotating Outer Ring */}
                        <div className="absolute inset-0 border-[6px] border-dashed border-[#d4af37]/30 rounded-full animate-[spin_300s_linear_infinite]"></div>
                        {/* Counter-Rotating Inner Ring */}
                        <div className="absolute inset-8 border-[2px] border-amber-400/20 rounded-full animate-[spin_180s_linear_infinite_reverse]"></div>
                        {/* Radiant Glow Aura */}
                        <div className="absolute inset-[-40px] bg-[radial-gradient(circle,rgba(212,175,55,0.25)_0%,transparent_70%)] animate-pulse rounded-full blur-3xl"></div>
                        
                        {/* Imperial Seal */}
                        <div className="w-48 h-48 bg-[#050505] rounded-full border-[12px] border-[#d4af37] shadow-[0_0_100px_rgba(212,175,55,0.7)] flex items-center justify-center overflow-hidden transform hover:scale-105 transition-transform duration-1000">
                             <div className="p-12">
                                <img 
                                    src={DEFAULT_BRAND_LOGO} 
                                    alt="Sovereign Seal" 
                                    crossOrigin="anonymous"
                                    className="w-full h-full object-contain brightness-125 contrast-110 drop-shadow-2xl" 
                                />
                             </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <h2 className="text-7xl md:text-9xl font-cinzel font-black gold-gradient-text tracking-[0.15em] uppercase mb-6 drop-shadow-2xl px-10">
                          {title}
                        </h2>
                        {subtitle && (
                            <div className="flex items-center justify-center gap-10 mt-4">
                                <div className="h-[3px] w-28 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent"></div>
                                <p className="text-[#4a0404] text-lg font-black uppercase tracking-[0.6em] font-cinzel italic opacity-90">
                                  {subtitle}
                                </p>
                                <div className="h-[3px] w-28 bg-gradient-to-l from-transparent via-[#d4af37] to-transparent"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 📜 DECREE CONTENT */}
                <div className="relative z-10 flex-grow px-12 md:px-24">
                    {isTranslating ? (
                        <div className="flex flex-col items-center justify-center py-48">
                            <div className="w-24 h-24 border-[10px] border-[#d4af37] border-t-transparent rounded-full animate-spin shadow-2xl"></div>
                            <p className="text-[#8b4513] font-cinzel font-black mt-12 animate-pulse uppercase tracking-[0.5em] text-sm">Transcribing Prophecy...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-12 pb-32">
                            <div className="font-lora text-[#1a1a1a] leading-relaxed">
                                {renderFormattedText(displayContent)}
                            </div>

                            {chartData && (
                                <div className="mt-16 pt-16 border-t-4 border-double border-[#d4af37]/40 grid grid-cols-1 md:grid-cols-2 gap-16">
                                    {chartData.vedicMetrics && (
                                        <div className="bg-[#8b4513]/5 p-10 rounded-[2.5rem] border-2 border-[#d4af37]/30 shadow-inner">
                                            <h4 className="text-xs font-cinzel font-black text-[#4a0404] mb-8 uppercase tracking-[0.5em] text-center border-b-2 border-[#8b4513]/5 pb-5">Vibrational Balance</h4>
                                            <div className="space-y-7">
                                                {chartData.vedicMetrics.map((m: any, i: number) => (
                                                    <div key={i}>
                                                        <div className="flex justify-between text-xs uppercase font-black text-[#8b4513] mb-2 tracking-[0.3em]">
                                                            <span>{m.label}</span>
                                                            <span className="font-mono text-base">{m.value}%</span>
                                                        </div>
                                                        <div className="w-full h-3 bg-[#8b4513]/10 rounded-full overflow-hidden border border-[#8b4513]/10">
                                                            <div className="h-full bg-gradient-to-r from-[#4a0404] via-[#8b4513] to-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all duration-2000" style={{ width: `${m.value}%` }}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {chartData.luckyNumbers && (
                                        <div className="bg-[#d4af37]/5 p-10 rounded-[2.5rem] border-2 border-[#d4af37]/30 text-center flex flex-col justify-center shadow-inner">
                                            <h4 className="text-xs font-cinzel font-black text-[#4a0404] mb-10 uppercase tracking-[0.5em] text-center border-b-2 border-[#8b4513]/5 pb-5">Sacred Frequencies</h4>
                                            <div className="flex flex-wrap justify-center gap-8">
                                                {chartData.luckyNumbers.map((num: number, i: number) => (
                                                    <div key={i} className="w-20 h-20 rounded-full border-[5px] border-[#d4af37] bg-white flex items-center justify-center shadow-xl transform hover:scale-110 transition-all duration-500">
                                                        <span className="font-cinzel font-black text-4xl text-[#4a0404]">{num}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 🖊️ SEAL OF AUTHENTICATION */}
                <div className="mt-auto pt-24 text-center border-t-[4px] border-double border-[#d4af37]/30 pb-16 relative">
                    <div className="text-7xl text-[#d4af37]/30 mb-12 tracking-[3em] pl-[3em] font-cinzel select-none">❂ ❂ ❂</div>
                    <p className="text-[#4a0404] text-[14px] font-cinzel font-black tracking-[0.7em] uppercase mb-5">Digitally Sealed by the Sovereign Registry</p>
                    <div className="inline-flex items-center gap-6 bg-[#0a0a0a] text-[#d4af37] px-10 py-4 rounded-full border-2 border-[#d4af37]/70 shadow-2xl">
                        <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_20px_rgba(34,197,94,0.6)]"></span>
                        <p className="text-[11px] font-mono tracking-widest uppercase font-bold">NODE_SYNC_ACTIVE: {Math.random().toString(36).substring(2, 10).toUpperCase()}</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 justify-center w-full max-w-xl mb-24 no-print px-4">
              <Button 
                onClick={handleDownloadPDF} 
                disabled={isDownloading || isTranslating} 
                className="flex-1 h-16 bg-[#2d0a18] hover:bg-[#4a0404] text-white flex items-center justify-center gap-6 shadow-2xl border-none font-cinzel tracking-widest rounded-2xl transition-all active:scale-95 text-[11px] font-black"
              >
                  {isDownloading ? <span className="animate-pulse">SEALING...</span> : <><span className="text-2xl">📜</span> ARCHIVE RECORD</>}
              </Button>
              <Button 
                onClick={() => window.location.href = `mailto:?subject=${encodeURIComponent("Sacred Decree: " + title)}`} 
                className="flex-1 h-16 bg-white hover:bg-gray-50 text-[#2d0a18] flex items-center justify-center gap-6 shadow-xl border-2 border-[#2d0a18]/10 font-cinzel tracking-widest rounded-2xl transition-all active:scale-95 text-[11px] font-black"
              >
                  <span className="text-2xl">✉️</span> DISPATCH
              </Button>
        </div>

        <Link to="/home" className="mb-32 no-print group">
            <button className="text-[#d4af37] font-cinzel font-black text-sm uppercase tracking-[1em] group-hover:text-white transition-all flex items-center gap-8">
                <span className="text-3xl group-hover:-translate-x-4 transition-transform">←</span> EXIT SANCTUARY
            </button>
        </Link>
    </div>
  );
};

export default FullReport;