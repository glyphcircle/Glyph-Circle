
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

  // --- RESPONSIVE SCALE ENGINE ---
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const viewportWidth = window.innerWidth - 32; // padding
        const targetWidth = 800; // approx 210mm in pixels at 96dpi
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

  // --- TRANSLATION LOGIC ---
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

  // --- LOGO & BANNER RESOLUTION ---
  const headerLogo = useMemo(() => {
    const asset = db.image_assets?.find((a: any) => a.id === 'header_logo');
    return asset ? cloudManager.resolveImage(asset.path) : null;
  }, [db.image_assets]);

  const reportBackground = useMemo(() => {
      const formats = db.report_formats?.filter((f: any) => f.status === 'active') || [];
      if (formats.length === 0) return null;
      const randomFormat = formats[Math.floor(Math.random() * formats.length)];
      return cloudManager.resolveImage(randomFormat.url);
  }, [db.report_formats]); 

  // --- TEXT RENDERING ENGINE ---
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
      
      // Ensure the container is fully visible and not scaled for capture
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
        
        {/* A4 REPORT CONTAINER */}
        <div 
          className="relative transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.3)] origin-top border-4 border-[#8b4513]/10 rounded"
          style={{ 
            width: '210mm', 
            height: '297mm',
            transform: `scale(${scaleFactor})`,
            marginBottom: `calc(297mm * (${scaleFactor} - 1) + 4rem)`,
            backgroundColor: '#fff8e1'
          }}
        >
            <div 
                ref={reportRef} 
                className="absolute inset-0 bg-[#fff8e1] text-black overflow-hidden flex flex-col"
            >
                {/* 1. SCALABLE WATERMARK BACKGROUND */}
                <div className="absolute inset-0 border-[20px] border-double border-[#8b4513]/10 z-0 pointer-events-none"></div>
                {reportBackground && (
                    <OptimizedImage 
                        src={reportBackground} 
                        alt="" 
                        className="absolute inset-0 w-full h-full object-cover opacity-[0.03] z-0 grayscale"
                        showSkeleton={false}
                    />
                )}

                {/* 2. STICKY SACRED HEADER */}
                <div className="relative z-20 w-full bg-[#fff8e1]/95 backdrop-blur-sm pt-8 pb-4 border-b border-[#8b4513]/20 shadow-sm flex flex-col items-center flex-shrink-0">
                    {/* OM Symbols Left/Right */}
                    <div className="absolute top-8 left-12 opacity-15 text-6xl text-[#8b4513] font-cinzel select-none">ॐ</div>
                    <div className="absolute top-8 right-12 opacity-15 text-6xl text-[#8b4513] font-cinzel select-none">ॐ</div>
                    
                    {/* Centered Logo */}
                    <div className="w-24 h-24 relative mb-4">
                        <div className="absolute -inset-2 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full blur animate-pulse"></div>
                        {headerLogo ? (
                            <img 
                                src={headerLogo} 
                                alt="Sacred Emblem" 
                                className="w-full h-full object-contain relative z-10 drop-shadow-md"
                            />
                        ) : (
                            <div className="w-full h-full rounded-full border-2 border-[#8b4513]/20 flex items-center justify-center text-4xl">🕉️</div>
                        )}
                    </div>

                    <h2 className="text-3xl font-cinzel font-black text-[#4a0404] tracking-[0.1em] uppercase drop-shadow-sm mb-1">{title}</h2>
                    {subtitle && (
                        <div className="flex items-center gap-4">
                            <div className="h-px w-8 bg-[#8b4513]/30"></div>
                            <p className="text-[#8b4513] text-[10px] font-bold uppercase tracking-[0.2em]">{subtitle}</p>
                            <div className="h-px w-8 bg-[#8b4513]/30"></div>
                        </div>
                    )}
                    
                    {/* Holy Text Banner - From Screenshot */}
                    <div className="mt-4 px-12 text-center opacity-30 text-[9px] font-cinzel italic text-[#8b4513] border-t border-[#8b4513]/10 pt-2 w-full max-w-[80%]">
                        ॐ धन्वन्तरये नमः ॥ ॐ सर्वे भवन्तु सुखिनः ॥ ॐ नमो भगवते वासुदेवाय ॥
                    </div>
                </div>

                {/* 3. REPORT BODY (SCROLLABLE IN UI, FULL IN PDF) */}
                <div className="relative z-10 flex-grow overflow-y-auto px-[15%] pb-16 custom-scrollbar pt-8">
                    {isTranslating ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[#8b4513] font-cinzel font-bold mt-6 animate-pulse uppercase tracking-widest text-xs">Unrolling Sacred Parchment...</p>
                        </div>
                    ) : (
                        <div className="font-lora text-[#2a1a1a] text-lg leading-relaxed space-y-2">
                            {renderFormattedText(displayContent)}
                        </div>
                    )}

                    {/* Footer Signature */}
                    <div className="mt-20 pt-10 text-center opacity-40 border-t border-[#8b4513]/10">
                        <div className="text-3xl text-[#8b4513] mb-4 font-cinzel tracking-[0.4em]">❖ ❖ ❖</div>
                        <span className="text-[#8b4513] text-[10px] font-cinzel tracking-[0.3em] uppercase block">Encoded by Glyph Circle Sanctuary</span>
                        <span className="text-[#8b4513]/60 text-[8px] font-mono mt-1 block">Ref: {Date.now().toString(36).toUpperCase()}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* 4. EXTERNAL ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-lg mb-12 no-print">
              <Button 
                onClick={handleDownloadPDF} 
                disabled={isDownloading || isTranslating} 
                className="flex-1 h-14 text-sm bg-[#4a0404] hover:bg-[#5a0505] text-white flex items-center justify-center gap-3 shadow-xl border-none font-cinzel tracking-widest"
              >
                  {isDownloading ? (
                      <span className="animate-pulse">SCRIBING PDF...</span>
                  ) : (
                      <><span className="text-lg">📜</span> {t('downloadPDF')}</>
                  )}
              </Button>
              <Button 
                onClick={() => window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent("Your report is ready: " + window.location.href)}`} 
                className="flex-1 h-14 text-sm bg-gray-800 hover:bg-gray-700 text-amber-100 flex items-center justify-center gap-3 shadow-xl border-gray-600 font-cinzel tracking-widest"
              >
                  <span className="text-lg">✉️</span> {t('emailReport')}
              </Button>
        </div>

        <Link to="/home" className="mb-24 no-print">
            <button className="text-amber-500 font-cinzel font-bold text-xs uppercase tracking-[0.3em] hover:text-amber-400 transition-colors">
                &larr; Return to Dashboard
            </button>
        </Link>
    </div>
  );
};

export default FullReport;
