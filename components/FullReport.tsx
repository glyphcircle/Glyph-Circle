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
          className="relative transition-all duration-300 shadow-[0_30px_60px_rgba(0,0,0,0.4)] origin-top border-[16px] border-double border-[#d4af37]/40 rounded-lg bg-[#fff8e1]"
          style={{ 
            width: '210mm', 
            height: '297mm',
            transform: `scale(${scaleFactor})`,
            marginBottom: `calc(297mm * (${scaleFactor} - 1) + 4rem)`,
          }}
        >
            <div 
                ref={reportRef} 
                className="absolute inset-0 bg-[#fff8e1] text-black overflow-hidden flex flex-col p-14"
            >
                <div className="absolute inset-4 border border-[#8b4513]/10 z-0 pointer-events-none rounded"></div>
                {reportBackground && (
                    <OptimizedImage 
                        src={reportBackground} 
                        alt="" 
                        className="absolute inset-0 w-full h-full object-cover opacity-[0.05] z-0 grayscale"
                        showSkeleton={false}
                    />
                )}

                <div className="relative z-20 w-full flex flex-col items-center flex-shrink-0 mb-10 pb-8 border-b-2 border-[#d4af37]/30">
                    <div className="absolute -top-4 left-0 opacity-10 text-8xl text-[#8b4513] font-cinzel select-none">ॐ</div>
                    <div className="absolute -top-4 right-0 opacity-10 text-8xl text-[#8b4513] font-cinzel select-none">ॐ</div>
                    
                    <div className="w-28 h-28 relative mb-6">
                        <div className="absolute inset-0 bg-[#1a0b12] rounded-full shadow-2xl scale-110 border-2 border-[#d4af37]/50"></div>
                        <div className="absolute -inset-4 bg-gradient-to-tr from-[#d4af37]/30 to-transparent rounded-full blur animate-pulse"></div>
                        <img 
                            src={headerLogo} 
                            alt="Sacred Emblem" 
                            className="w-full h-full object-contain relative z-30 drop-shadow-xl rounded-full p-2"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent) parent.innerHTML = '<div class="w-full h-full rounded-full bg-[#1a0b12] flex items-center justify-center text-5xl">🕉️</div>';
                            }}
                        />
                    </div>

                    <h2 className="text-4xl font-cinzel font-black text-[#4a0404] tracking-[0.2em] uppercase drop-shadow-sm mb-3">{title}</h2>
                    {subtitle && (
                        <div className="flex items-center gap-6">
                            <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-[#d4af37]/60"></div>
                            <p className="text-[#8b4513] text-sm font-bold uppercase tracking-[0.4em] italic">{subtitle}</p>
                            <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-[#d4af37]/60"></div>
                        </div>
                    )}
                </div>

                <div className="relative z-10 flex-grow overflow-y-auto custom-scrollbar px-8">
                    {isTranslating ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="w-14 h-14 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[#8b4513] font-cinzel font-bold mt-6 animate-pulse uppercase tracking-widest text-sm">Decoding Ancient Script...</p>
                        </div>
                    ) : (
                        <div className="font-lora text-[#2a1a1a] text-lg leading-relaxed space-y-4">
                            {renderFormattedText(displayContent)}
                        </div>
                    )}

                    <div className="mt-20 pt-10 text-center opacity-40 border-t border-[#d4af37]/30">
                        <div className="text-3xl text-[#d4af37] mb-6 font-cinzel tracking-[0.8em] opacity-60">❖ ❖ ❖</div>
                        <span className="text-[#8b4513] text-[12px] font-cinzel font-bold tracking-[0.5em] uppercase block mb-1">Encoded by Glyph Circle Sanctuary</span>
                    </div>
                </div>
            </div>
        </div>

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
            <button className="text-[#8b4513] font-cinzel font-bold text-xs uppercase tracking-[0.4em] group-hover:text-amber-600 transition-colors flex items-center gap-3">
                <span className="text-xl">←</span> Return to Sanctuary
            </button>
        </Link>
    </div>
  );
};

export default FullReport;