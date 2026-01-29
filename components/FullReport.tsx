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
  }, [language, reading]); 

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
              backgroundColor: '#fffcf0'
          });
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          const width = pdf.internal.pageSize.getWidth();
          const height = pdf.internal.pageSize.getHeight();
          pdf.addImage(imgData, 'JPEG', 0, 0, width, height, undefined, 'FAST');
          pdf.save(`${title.replace(/\s+/g, '_')}_Imperial_Decree.pdf`);
      } catch (err) {
          alert("Transcription error. Please retry.");
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
                {/* 📜 WATERMARK BACKGROUND */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none z-0">
                    <div className="text-[30rem] font-cinzel leading-none select-none">ॐ</div>
                </div>

                {/* 🛡️ ENHANCED IMPERIAL BOUNDARY */}
                <div className="absolute inset-0 z-40 pointer-events-none p-6 md:p-14">
                    <div className="w-full h-full border-[22px] border-double border-[#d4af37]/90 relative shadow-[inset_0_0_100px_rgba(139,92,5,0.15)]">
                        {/* Outer Precision Guard Line */}
                        <div className="absolute inset-[-14px] border-[2px] border-[#d4af37]/60 rounded-sm"></div>
                        {/* Inner Etched Frame */}
                        <div className="absolute inset-8 border-[1.5px] border-[#d4af37]/40 rounded-sm"></div>
                        {/* Final Micro Guard */}
                        <div className="absolute inset-14 border-[1px] border-[#d4af37]/20 rounded-sm"></div>
                    </div>
                    
                    {/* Golden Corner Flourishes (Ornate SVG) */}
                    {['top-8 left-8', 'top-8 right-8 rotate-90', 'bottom-8 left-8 -rotate-90', 'bottom-8 right-8 rotate-180'].map((pos, idx) => (
                        <div key={idx} className={`absolute w-40 h-40 md:w-64 md:h-64 text-[#b38728] ${pos} filter drop-shadow-xl`}>
                            <svg viewBox="0 0 100 100" fill="currentColor" className="opacity-100">
                                <path d="M0,0 L45,0 L45,3 L3,3 L3,45 L0,45 Z" />
                                <circle cx="8" cy="8" r="5" />
                                <path d="M22,22 Q22,45 45,45" fill="none" stroke="currentColor" strokeWidth="2" />
                                <path d="M45,22 Q45,45 22,45" fill="none" stroke="currentColor" strokeWidth="2" />
                                <path d="M30,30 L40,40" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                            </svg>
                        </div>
                    ))}
                </div>

                {/* 🌟 CELESTIAL RADIANT HEADER */}
                <div className="relative z-30 w-full flex flex-col items-center pt-14 mb-24">
                    <div className="relative w-64 h-64 mb-14 flex items-center justify-center">
                        {/* Layered Pulsating Auras */}
                        <div className="absolute inset-[-60px] bg-[radial-gradient(circle,rgba(212,175,55,0.3)_0%,transparent_70%)] animate-[pulse_4s_ease-in-out_infinite] rounded-full blur-3xl"></div>
                        <div className="absolute inset-[-20px] border-[1px] border-amber-500/10 rounded-full"></div>
                        
                        {/* Rotating Orbital Compass */}
                        <div className="absolute inset-0 border-[4px] border-dashed border-[#d4af37]/40 rounded-full animate-[spin_240s_linear_infinite]"></div>
                        <div className="absolute inset-6 border-[2px] border-amber-400/20 rounded-full animate-[spin_120s_linear_infinite_reverse]"></div>
                        
                        {/* Sovereignty Seal Container */}
                        <div className="w-44 h-44 bg-[#080808] rounded-full border-[10px] border-[#d4af37] shadow-[0_0_120px_rgba(212,175,55,0.8)] flex items-center justify-center overflow-hidden transform transition-transform duration-2000 hover:scale-110">
                             <div className="p-10">
                                <img src={DEFAULT_BRAND_LOGO} alt="Imperial Seal" className="w-full h-full object-contain brightness-150 contrast-125 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                             </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <h2 className="text-6xl md:text-8xl font-cinzel font-black gold-gradient-text tracking-[0.2em] uppercase mb-8 text-center leading-[1.1] drop-shadow-2xl px-12">
                          {title}
                        </h2>
                        {subtitle && (
                            <div className="flex items-center justify-center gap-12 mt-6">
                                <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent"></div>
                                <p className="text-[#4a0404] text-[15px] font-black uppercase tracking-[0.8em] font-cinzel italic opacity-100">
                                  {subtitle}
                                </p>
                                <div className="h-[2px] w-24 bg-gradient-to-l from-transparent via-[#d4af37] to-transparent"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 📜 SACRED DECREE CONTENT */}
                <div className="relative z-10 flex-grow px-10 md:px-20">
                    {isTranslating ? (
                        <div className="flex flex-col items-center justify-center py-40">
                            <div className="w-20 h-20 border-[8px] border-[#d4af37] border-t-transparent rounded-full animate-spin shadow-2xl"></div>
                            <p className="text-[#8b4513] font-cinzel font-black mt-14 animate-pulse uppercase tracking-[0.6em] text-sm">Scribing New Prophecy...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-14 pb-40">
                            <div className="font-lora text-[#1a1a1a] leading-relaxed">
                                {renderFormattedText(displayContent)}
                            </div>

                            {chartData && (
                                <div className="mt-20 pt-20 border-t-4 border-double border-[#d4af37]/50 grid grid-cols-1 md:grid-cols-2 gap-20">
                                    {chartData.vedicMetrics && (
                                        <div className="bg-[#8b4513]/5 p-12 rounded-[3rem] border-2 border-[#d4af37]/40 shadow-inner">
                                            <h4 className="text-xs font-cinzel font-black text-[#4a0404] mb-10 uppercase tracking-[0.6em] text-center border-b-2 border-[#8b4513]/10 pb-6">Alignment Balance</h4>
                                            <div className="space-y-8">
                                                {chartData.vedicMetrics.map((m: any, i: number) => (
                                                    <div key={i}>
                                                        <div className="flex justify-between text-xs uppercase font-black text-[#8b4513] mb-3 tracking-[0.4em]">
                                                            <span>{m.label}</span>
                                                            <span className="font-mono text-lg">{m.value}%</span>
                                                        </div>
                                                        <div className="w-full h-4 bg-[#8b4513]/10 rounded-full overflow-hidden border-2 border-[#8b4513]/5">
                                                            <div className="h-full bg-gradient-to-r from-[#4a0404] via-[#8b4513] to-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all duration-2000" style={{ width: `${m.value}%` }}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {chartData.luckyNumbers && (
                                        <div className="bg-[#d4af37]/5 p-12 rounded-[3rem] border-2 border-[#d4af37]/40 text-center flex flex-col justify-center shadow-inner relative overflow-hidden">
                                            <h4 className="text-xs font-cinzel font-black text-[#4a0404] mb-12 uppercase tracking-[0.6em] text-center border-b-2 border-[#d4af37]/10 pb-6">Sacred Numbers</h4>
                                            <div className="flex flex-wrap justify-center gap-10">
                                                {chartData.luckyNumbers.map((num: number, i: number) => (
                                                    <div key={i} className="w-24 h-24 rounded-full border-[6px] border-[#d4af37] bg-white flex items-center justify-center shadow-[0_20px_40px_rgba(0,0,0,0.15)] transform hover:scale-110 transition-all duration-700 cursor-help group">
                                                        <span className="font-cinzel font-black text-5xl text-[#4a0404] group-hover:text-amber-600 drop-shadow-sm">{num}</span>
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

                {/* 🖊️ SOVEREIGN REGISTRY AUTHENTICATION */}
                <div className="mt-auto pt-32 text-center opacity-100 border-t-[3px] border-double border-[#d4af37]/40 pb-20 relative">
                    <div className="text-6xl text-[#d4af37]/40 mb-16 tracking-[3.5em] pl-[3.5em] font-cinzel drop-shadow-sm">❂ ❂ ❂</div>
                    <p className="text-[#4a0404] text-[13px] font-cinzel font-black tracking-[0.8em] uppercase mb-6">Digitally Sealed by the Sovereign Registry</p>
                    <div className="inline-flex items-center gap-8 bg-[#050505] text-[#d4af37] px-14 py-5 rounded-full border-2 border-[#d4af37]/80 shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
                        <span className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-[0_0_25px_rgba(34,197,94,0.8)]"></span>
                        <p className="text-[13px] font-mono tracking-[0.4em] uppercase font-bold">NODE_SYNC_ID: {Math.random().toString(36).substring(2, 14).toUpperCase()}</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-8 justify-center w-full max-w-2xl mb-32 no-print px-6">
              <Button 
                onClick={handleDownloadPDF} 
                disabled={isDownloading || isTranslating} 
                className="flex-1 h-20 bg-[#2d0a18] hover:bg-[#4a0404] text-white flex items-center justify-center gap-8 shadow-[0_40px_80px_rgba(0,0,0,0.6)] border-none font-cinzel tracking-[0.4em] rounded-3xl transition-all active:scale-95 text-[12px] font-black"
              >
                  {isDownloading ? <span className="animate-pulse">SEALING RECORD...</span> : <><span className="text-3xl">📜</span> ARCHIVE DECREE</>}
              </Button>
              <Button 
                onClick={() => window.location.href = `mailto:?subject=${encodeURIComponent("Imperial Spiritual Decree: " + title)}`} 
                className="flex-1 h-20 bg-white hover:bg-gray-50 text-[#2d0a18] flex items-center justify-center gap-8 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border-2 border-[#2d0a18]/20 font-cinzel tracking-[0.4em] rounded-3xl transition-all active:scale-95 text-[12px] font-black"
              >
                  <span className="text-3xl">✉️</span> DISPATCH
              </Button>
        </div>

        <Link to="/home" className="mb-40 no-print group">
            <button className="text-[#d4af37] font-cinzel font-black text-[15px] uppercase tracking-[1.2em] group-hover:text-white transition-all flex items-center gap-10">
                <span className="text-4xl group-hover:-translate-x-5 transition-transform">←</span> EXIT SANCTUARY
            </button>
        </Link>
    </div>
  );
};

export default FullReport;