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
      setDisplayContent(reading);
      setTranslations({}); 
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

  const SACRED_LOGO_ID = '1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO';
  const headerLogo = `https://lh3.googleusercontent.com/d/${SACRED_LOGO_ID}`;

  const reportBackground = useMemo(() => {
      const formats = db.report_formats?.filter((f: any) => f.status === 'active') || [];
      if (formats.length === 0) return null;
      const randomFormat = formats[Math.floor(Math.random() * formats.length)];
      return cloudManager.resolveImage(randomFormat.url);
  }, [db.report_formats]); 

  const renderFormattedText = (text: string) => {
    if (!text) return null;
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
              backgroundColor: '#fff8e1'
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
          className="relative transition-all duration-300 shadow-[0_30px_60px_rgba(0,0,0,0.4)] origin-top border-[16px] border-double border-[#d4af37]/60 rounded-lg bg-[#fff8e1] sacred-boundary"
          style={{ 
            width: '210mm', 
            height: '297mm',
            transform: `scale(${scaleFactor})`,
            marginBottom: `calc(297mm * (${scaleFactor} - 1) + 4rem)`,
          }}
        >
            <div 
                ref={reportRef} 
                className="absolute inset-0 bg-[#fff8e1] text-black overflow-hidden flex flex-col p-14 report-canvas"
            >
                <div className="absolute inset-4 border-2 border-[#8b4513]/10 z-0 pointer-events-none rounded"></div>
                {reportBackground && (
                    <OptimizedImage 
                        src={reportBackground} 
                        alt="" 
                        className="absolute inset-0 w-full h-full object-cover opacity-[0.05] z-0 grayscale"
                        showSkeleton={false}
                    />
                )}

                {/* 1. SACRED HEADER - ENHANCED */}
                <div className="relative z-20 w-full flex flex-col items-center flex-shrink-0 mb-8 pb-6 border-b-2 border-[#d4af37]/30">
                    {/* Floating Ornaments */}
                    <div className="absolute top-0 left-0 opacity-10 text-8xl text-[#8b4513] font-cinzel select-none -translate-x-1/2 -translate-y-1/2">ॐ</div>
                    <div className="absolute top-0 right-0 opacity-10 text-8xl text-[#8b4513] font-cinzel select-none translate-x-1/2 -translate-y-1/2">ॐ</div>
                    
                    <div className="w-28 h-28 relative mb-6">
                        <div className="absolute inset-0 bg-[#1a0b12] rounded-full shadow-[0_0_30px_rgba(212,175,55,0.4)] scale-110 border-4 border-[#d4af37]"></div>
                        <div className="absolute inset-[-8px] border border-[#d4af37]/20 rounded-full animate-pulse"></div>
                        <img 
                            src={headerLogo} 
                            alt="Sacred Emblem" 
                            className="w-full h-full object-contain relative z-30 drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)] rounded-full p-3"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    </div>

                    <h2 className="text-4xl font-cinzel font-black gold-gradient-text tracking-[0.2em] uppercase mb-2 text-center">{title}</h2>
                    {subtitle && (
                        <p className="text-[#8b4513] text-[10px] font-black uppercase tracking-[0.5em] italic opacity-70 border-t border-[#8b4513]/20 pt-2">{subtitle}</p>
                    )}
                </div>

                {/* 2. REPORT CONTENT */}
                <div className="relative z-10 flex-grow overflow-y-auto custom-scrollbar px-6">
                    {isTranslating ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="w-14 h-14 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[#8b4513] font-cinzel font-bold mt-6 animate-pulse uppercase tracking-widest text-sm">Decoding Ancient Script...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            <div className="font-lora text-[#2a1a1a] text-lg leading-relaxed space-y-4">
                                {renderFormattedText(displayContent)}
                            </div>

                            {/* 3. DYNAMIC DATA SECTION */}
                            {chartData && (
                                <div className="mt-8 pt-8 border-t border-[#8b4513]/20 grid grid-cols-1 md:grid-cols-2 gap-8">
                                    
                                    {/* Energy Signature (Vedic Metrics) */}
                                    {chartData.vedicMetrics && (
                                        <div className="bg-[#8b4513]/5 p-6 rounded-lg border border-[#8b4513]/10 shadow-inner">
                                            <h4 className="text-xs font-cinzel font-bold text-[#5c2a0d] mb-4 uppercase tracking-[0.2em]">Energy Alignment</h4>
                                            <div className="space-y-4">
                                                {chartData.vedicMetrics.map((m: any, i: number) => (
                                                    <div key={i}>
                                                        <div className="flex justify-between text-[10px] uppercase font-bold text-[#8b4513] mb-1">
                                                            <span>{m.label} <span className="opacity-50 font-normal italic">({m.sub})</span></span>
                                                            <span>{m.value}%</span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-[#8b4513]/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-gradient-to-r from-[#8b4513] to-[#d2691e]" style={{ width: `${m.value}%` }}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Cosmic Frequencies (Lucky Numbers) */}
                                    {chartData.luckyNumbers && (
                                        <div className="bg-[#d4af37]/10 p-6 rounded-lg border border-[#d4af37]/30 text-center shadow-inner">
                                            <h4 className="text-xs font-cinzel font-bold text-[#4a0404] mb-4 uppercase tracking-[0.2em]">Cosmic Frequencies</h4>
                                            <div className="flex flex-wrap justify-center gap-4">
                                                {chartData.luckyNumbers.map((num: number, i: number) => (
                                                    <div key={i} className="relative group">
                                                        <div className="absolute inset-0 bg-[#d4af37] rounded-full blur-sm opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                                        <div className="w-12 h-12 rounded-full border-2 border-[#d4af37] bg-[#fff8e1] flex items-center justify-center relative z-10 shadow-lg">
                                                            <span className="font-cinzel font-black text-xl text-[#4a0404]">{num}</span>
                                                        </div>
                                                        <div className="mt-1 text-[8px] uppercase font-bold text-[#d4af37]">Seal {i+1}</div>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="mt-6 text-[9px] italic text-[#8b4513]/60 leading-tight">These vibrational indices align with your current temporal trajectory.</p>
                                        </div>
                                    )}

                                    {/* Elemental Harmony */}
                                    {chartData.elementalBalance && (
                                        <div className="md:col-span-2 grid grid-cols-4 gap-2">
                                            {chartData.elementalBalance.map((e: any, i: number) => (
                                                <div key={i} className="text-center">
                                                    <div className="text-[9px] uppercase font-bold text-[#8b4513] mb-1">{e.element}</div>
                                                    <div className="text-[10px] font-cinzel text-[#d2691e] italic">{e.sanskrit}</div>
                                                    <div className="mt-1 h-1 w-full bg-[#8b4513]/10 rounded-full">
                                                        <div className="h-full bg-[#d2691e]" style={{ width: `${e.score}%` }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* FOOTER */}
                    <div className="mt-12 pt-8 text-center opacity-40 border-t border-[#d4af37]/30">
                        <div className="text-2xl text-[#d4af37] mb-4 font-cinzel tracking-[0.6em] opacity-60">❖ ❖ ❖</div>
                        <span className="text-[#8b4513] text-[10px] font-cinzel font-bold tracking-[0.3em] uppercase block mb-1">Encoded by Glyph Circle Sanctuary</span>
                        <span className="text-[#8b4513]/50 text-[8px] font-mono">HASHID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center w-full max-w-xl mb-12 no-print">
              <Button 
                onClick={handleDownloadPDF} 
                disabled={isDownloading || isTranslating} 
                className="flex-1 h-16 text-sm bg-[#4a0404] hover:bg-[#5a0505] text-white flex items-center justify-center gap-4 shadow-2xl border-none font-cinzel tracking-[0.2em] rounded-xl transform hover:scale-105 transition-all"
              >
                  {isDownloading ? <span className="animate-pulse">SCRIBING...</span> : <><span className="text-2xl">📜</span> {t('downloadPDF')}</>}
              </Button>
              <Button 
                onClick={() => window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent("Your spiritual report is ready: " + window.location.href)}`} 
                className="flex-1 h-16 text-sm bg-white hover:bg-gray-50 text-[#4a0404] flex items-center justify-center gap-4 shadow-xl border-2 border-[#4a0404]/20 font-cinzel tracking-[0.2em] rounded-xl transform hover:scale-105 transition-all"
              >
                  <span className="text-2xl">✉️</span> {t('emailReport')}
              </Button>
        </div>

        <Link to="/home" className="mb-24 no-print group">
            <button className="text-skin-accent font-cinzel font-bold text-xs uppercase tracking-[0.4em] hover:text-white transition-colors flex items-center gap-3">
                <span className="text-xl">←</span> Return to Sanctuary
            </button>
        </Link>
    </div>
  );
};

export default FullReport;