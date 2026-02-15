import React, { useRef, useState, useEffect, useMemo } from 'react';
import Button from './shared/Button';
import { useTranslation } from '../hooks/useTranslation';
import SageChat from './SageChat';
import { Link } from 'react-router-dom';
import { dbService, ReportTemplate } from '../services/db';
import { cloudManager } from '../services/cloudManager';
import { generatePDF } from '../utils/pdfGenerator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download, Home, ZoomIn, ZoomOut } from 'lucide-react';

interface FullReportProps {
  reading: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  chartData?: any;
  category?: string;
}

const DEFAULT_BRAND_LOGO = 'https://lh3.googleusercontent.com/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO';

const FullReport: React.FC<FullReportProps> = ({ reading, title, subtitle, chartData, category = 'general' }) => {
  const { t } = useTranslation();
  const reportRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState(1.0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [pages, setPages] = useState<string[][]>([]);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);

  // Standardized container ID based on category
  const containerId = useMemo(() => {
    switch (category) {
      case 'palmistry': return 'palmistry-full-report';
      case 'tarot': return 'tarot-full-report';
      case 'face-reading': return 'face-reading-full-report';
      case 'dream-analysis': return 'dream-analysis-full-report';
      case 'remedy': return 'ayurveda-full-report';
      case 'ayurveda': return 'ayurveda-full-report';
      case 'personal-guidance': return 'personal-guidance-full-report';
      default: return 'report-full-report';
    }
  }, [category]);

  // --- FETCH DYNAMIC TEMPLATE ---
  useEffect(() => {
    const fetchTemplate = async () => {
      setIsLoadingTemplate(true);
      const res = await dbService.getRandomTemplate(category);
      setTemplate(res);
      setIsLoadingTemplate(false);
    };
    fetchTemplate();
  }, [category]);

  // --- CONTENT FORMATTING ---
  const segments = useMemo(() => {
    if (!reading) return [];
    let normalizedText = reading.replace(/\\n/g, '\n');
    return normalizedText.split(/\n+/).filter(s => s.trim().length > 0);
  }, [reading]);

  // --- SECTION-BASED PAGINATION ---
  useEffect(() => {
    if (!segments.length) return;
    const chunks: string[][] = [[]];
    let currentChunk = 0;
    let charCount = 0;
    const MAX_CHARS_PER_PAGE = 2200;

    segments.forEach(seg => {
      if (charCount + seg.length > MAX_CHARS_PER_PAGE && chunks[currentChunk].length > 0) {
        currentChunk++;
        chunks[currentChunk] = [];
        charCount = 0;
      }
      chunks[currentChunk].push(seg);
      charCount += seg.length;
    });
    setPages(chunks);
  }, [segments]);

  // Custom markdown components for rendering images and links
  const markdownComponents = useMemo(() => ({
    img: ({ node, src, alt, ...props }: any) => {
      let imageSrc = src || '';
      const resolvedSrc = cloudManager.resolveImage(imageSrc);

      return (
        <div className="my-6 flex justify-center">
          <img
            src={resolvedSrc}
            alt={alt || 'Product Image'}
            className="rounded-lg shadow-lg max-w-md w-full h-auto object-cover border-2 border-purple-500/30"
            onError={(e) => {
              console.error('❌ Image failed to load:', resolvedSrc);
              e.currentTarget.src = 'https://images.unsplash.com/photo-1615529182904-14819d19f5d4?w=400&h=300&fit=crop';
            }}
            loading="lazy"
            {...props}
          />
        </div>
      );
    },
    a: ({ node, href, children, ...props }: any) => {
      if (href?.startsWith('/')) {
        return (
          <Link to={href} className="text-purple-600 hover:text-purple-800 underline font-semibold">
            {children}
          </Link>
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-purple-600 hover:text-purple-800 underline font-semibold"
          {...props}
        >
          {children}
        </a>
      );
    },
    h1: ({ node, children, ...props }: any) => (
      <h1 className="text-4xl font-cinzel font-black uppercase tracking-tight mt-8 mb-4" style={{ color: template?.content_area_config.textColor || '#4a0404' }} {...props}>
        {children}
      </h1>
    ),
    h2: ({ node, children, ...props }: any) => (
      <h2 className="text-3xl font-cinzel font-black uppercase tracking-tight mt-6 mb-3" style={{ color: template?.content_area_config.textColor || '#4a0404' }} {...props}>
        {children}
      </h2>
    ),
    h3: ({ node, children, ...props }: any) => (
      <h3 className="text-2xl font-cinzel font-bold uppercase tracking-tight mt-6 mb-3" style={{ color: template?.content_area_config.textColor || '#4a0404' }} {...props}>
        {children}
      </h3>
    ),
    p: ({ node, children, ...props }: any) => (
      <p className="leading-relaxed text-lg mb-4" style={{ color: template?.content_area_config.textColor || '#1a1a1a' }} {...props}>
        {children}
      </p>
    ),
    ul: ({ node, children, ...props }: any) => (
      <ul className="list-disc list-inside mb-4 space-y-2" {...props}>
        {children}
      </ul>
    ),
    ol: ({ node, children, ...props }: any) => (
      <ol className="list-decimal list-inside mb-4 space-y-2" {...props}>
        {children}
      </ol>
    ),
    li: ({ node, children, ...props }: any) => (
      <li className="leading-relaxed text-lg" style={{ color: template?.content_area_config.textColor || '#1a1a1a' }} {...props}>
        {children}
      </li>
    ),
    strong: ({ node, children, ...props }: any) => (
      <strong className="font-black" style={{ color: template?.content_area_config.textColor || '#3a0000' }} {...props}>
        {children}
      </strong>
    ),
    em: ({ node, children, ...props }: any) => (
      <em className="italic opacity-90" {...props}>
        {children}
      </em>
    ),
    hr: ({ node, ...props }: any) => (
      <hr className="my-8 border-t-2 border-amber-500/20" {...props} />
    ),
    blockquote: ({ node, children, ...props }: any) => (
      <blockquote className="border-l-4 border-purple-500 pl-4 italic my-4 bg-purple-50/50 py-2 rounded" {...props}>
        {children}
      </blockquote>
    ),
  }), [template]);

  const renderSegment = (line: string, index: number) => {
    let trimmed = line.trim();

    const hasMarkdownImage = trimmed.includes('![');
    const hasMarkdownLink = trimmed.includes('[') && trimmed.includes('](');
    const hasMarkdownHeading = trimmed.startsWith('#');

    if (hasMarkdownImage || hasMarkdownLink || hasMarkdownHeading) {
      return (
        <div key={index} className="w-full">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {trimmed}
          </ReactMarkdown>
        </div>
      );
    }

    const isPositive = trimmed.includes('[POSITIVE]');
    const isNegative = trimmed.includes('[NEGATIVE]');

    const cleanLine = trimmed
      .replace(/\[POSITIVE\]/g, '')
      .replace(/\[\/POSITIVE\]/g, '')
      .replace(/\[NEGATIVE\]/g, '')
      .replace(/\[\/NEGATIVE\]/g, '');

    const isHeader = cleanLine.startsWith('###') || cleanLine.startsWith('#') || (cleanLine.startsWith('**') && cleanLine.endsWith('**') && cleanLine.length < 80);
    const rawContent = cleanLine.replace(/^[#*•-]+\s*/, '').replace(/\s*[#*]+$/, '');
    const parts = rawContent.split(/(\*\*.*?\*\*)/g);

    const parsedContent = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} className="font-black" style={{ color: template?.content_area_config.textColor || '#3a0000' }}>{part.slice(2, -2)}</strong>;
      }
      return <span key={j}>{part}</span>;
    });

    if (isHeader) {
      return (
        <div key={index} className="w-full mt-12 mb-6">
          <h4 className="text-2xl md:text-4xl font-cinzel font-black text-center uppercase tracking-tight" style={{ color: template?.content_area_config.textColor || '#4a0404' }}>
            {parsedContent}
          </h4>
          <div className="mx-auto w-24 h-0.5 bg-amber-500/20 mt-2"></div>
        </div>
      );
    }

    return (
      <div
        key={index}
        className={`relative flex items-start mb-4 p-4 rounded-xl transition-all ${isPositive ? 'bg-green-600/5' : isNegative ? 'bg-red-600/5' : ''}`}
      >
        <div className="leading-relaxed text-lg" style={{ color: template?.content_area_config.textColor || '#1a1a1a' }}>
          {parsedContent}
        </div>
      </div>
    );
  };

  const handleDownloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      const safeTitle = title?.trim().length > 0 ? title.trim().replace(/\s+/g, '_') : 'Decree';
      await generatePDF(containerId, {
        filename: `Decree_${safeTitle}.pdf`,
        quality: 0.95,
        marginSide: 5,
      });
    } catch (err) {
      console.error('PDF Export Error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const contentStyles = template ? {
    paddingTop: `${template.content_area_config.marginTop}px`,
    paddingBottom: `${template.content_area_config.marginBottom}px`,
    paddingLeft: `${template.content_area_config.marginLeft}px`,
    paddingRight: `${template.content_area_config.marginRight}px`,
    color: template.content_area_config.textColor,
    fontFamily: template.content_area_config.fontFamily || 'Lora, serif',
    backgroundColor: template.content_area_config.backgroundColor || 'transparent'
  } : {
    padding: '4rem'
  };

  const bgUrl = template ? cloudManager.resolveImage(template.template_image_url) : "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E";

  if (isLoadingTemplate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up w-full flex flex-col items-center min-h-screen pb-40">
      <SageChat context={reading} type={title} />

      {/* ✅ FIXED: Sticky Zoom Controls that follow scroll */}
      <div className="sticky top-24 right-4 z-[100] no-print flex justify-end w-full max-w-[210mm] mb-4 px-4">
        <div className="bg-gradient-to-br from-amber-900/90 to-orange-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-amber-500/30 flex items-center gap-2 px-4 py-3">
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="p-2 hover:bg-amber-500/20 rounded-xl transition-all"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5 text-amber-300" />
          </button>
          <span className="text-amber-100 font-bold text-sm min-w-[70px] text-center font-mono">
            {(zoom * 100).toFixed(0)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
            className="p-2 hover:bg-amber-500/20 rounded-xl transition-all"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5 text-amber-300" />
          </button>
        </div>
      </div>

      <div
        id={containerId}
        ref={reportRef}
        className="flex flex-col items-center gap-8 origin-top transition-transform duration-500"
        style={{ transform: `scale(${zoom})`, marginBottom: `${(zoom - 1) * 100}%` }}
      >
        <div
          className="report-page relative bg-[#fffcf0] shadow-2xl w-[210mm] min-h-[297mm] overflow-hidden"
          style={{ backgroundImage: `url(${bgUrl})`, backgroundSize: 'cover' }}
        >
          <div style={contentStyles} className="relative z-10 flex flex-col items-center">
            <div className="w-32 h-32 mb-8 bg-black rounded-full border-4 border-amber-500 flex items-center justify-center shadow-xl overflow-hidden mt-12">
              <img src={DEFAULT_BRAND_LOGO} alt="Seal" className="w-[60%] h-[60%] object-contain" />
            </div>

            <div className="text-center px-10">
              <h2 className="text-5xl font-cinzel font-black uppercase tracking-tight leading-tight" style={{ color: template?.content_area_config.textColor || '#2d0a18' }}>
                {title}
              </h2>
              {subtitle && (
                <p className="text-xl font-bold uppercase tracking-widest mt-4 opacity-70">
                  {subtitle}
                </p>
              )}
            </div>

            {chartData && (
              <div className="w-full max-w-lg grid grid-cols-1 gap-6 mt-12 bg-black/5 p-8 rounded-3xl">
                {(chartData.vedicMetrics || []).map((m: any, i: number) => (
                  <div key={i} className="w-full">
                    <div className="flex justify-between text-xs font-black mb-1 uppercase tracking-widest">
                      <span>{m.label}</span>
                      <span>{m.value}%</span>
                    </div>
                    <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-600" style={{ width: `${m.value}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-12 text-left w-full">
              {pages[0]?.map((line, i) => renderSegment(line, i))}
            </div>
          </div>
        </div>

        {pages.slice(1).map((pageSegments, pageIdx) => (
          <div
            key={pageIdx}
            className="report-page relative bg-[#fffcf0] shadow-2xl w-[210mm] min-h-[297mm] overflow-hidden"
            style={{ backgroundImage: `url(${bgUrl})`, backgroundSize: 'cover' }}
          >
            <div style={contentStyles} className="relative z-10">
              {pageSegments.map((line, i) => renderSegment(line, i))}
            </div>
            <div className="absolute bottom-10 left-0 w-full text-center text-[10px] font-bold opacity-30 tracking-widest uppercase">
              Decree Manifestation • Page {pageIdx + 2}
            </div>
          </div>
        ))}
      </div>

      {/* ✅ ENHANCED: End of Report Section with better styling */}
      <div className="mt-16 w-full max-w-4xl px-6 no-print">
        <div className="bg-gradient-to-br from-purple-900/40 via-amber-900/40 to-orange-900/40 rounded-2xl p-8 shadow-2xl border border-amber-500/30 backdrop-blur-md">
          <div className="text-center mb-6">
            <h3 className="text-3xl font-cinzel font-bold text-amber-300 mb-2">
              Your Report is Complete
            </h3>
            <p className="text-amber-100/70 font-lora italic text-lg">
              May this wisdom guide you on your journey
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="bg-gradient-to-r from-purple-600 to-pink-700 hover:from-purple-500 hover:to-pink-600 border-purple-500 shadow-lg px-8 py-4 font-cinzel tracking-wider text-base flex items-center gap-2 transition-all"
            >
              <Download className="w-5 h-5" />
              {isDownloading ? 'ENGRAVING...' : '📜 ARCHIVE DECREE (PDF)'}
            </Button>

            <Link to="/home" className="w-full sm:w-auto">
              <Button className="w-full bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600 border-amber-500 shadow-lg px-8 py-4 font-cinzel tracking-wider text-base flex items-center gap-2 justify-center transition-all">
                <Home className="w-5 h-5" />
                RETURN HOME
              </Button>
            </Link>
          </div>

          <div className="mt-8 text-center text-xs text-amber-300/50 font-mono">
            <p>Report generated: {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .sticky {
            position: relative !important;
          }
        }
      `}</style>
    </div>
  );
};

export default FullReport;
