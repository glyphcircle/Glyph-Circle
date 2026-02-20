// src/components/reports/MobileReport.tsx
// Mobile-specific report with full-width responsive design

import React, { useRef, useState, useEffect, useMemo } from 'react';
import Button from '../shared/Button';
import { useTranslation } from '../../hooks/useTranslation';
import SageChat from '../SageChat';
import { Link } from 'react-router-dom';
import { dbService, ReportTemplate } from '../../services/db';
import { cloudManager } from '../../services/cloudManager';
import { generatePDF } from '../../utils/pdfGenerator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download, Home, Share2 } from 'lucide-react';

interface MobileReportProps {
    reading: string;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    chartData?: any;
    category?: string;
}

const DEFAULT_BRAND_LOGO = 'https://lh3.googleusercontent.com/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO';

const MobileReport: React.FC<MobileReportProps> = ({
    reading,
    title,
    subtitle,
    chartData,
    category = 'general'
}) => {
    const { t } = useTranslation();
    const reportRef = useRef<HTMLDivElement>(null);

    const [isDownloading, setIsDownloading] = useState(false);
    const [template, setTemplate] = useState<ReportTemplate | null>(null);
    const [sections, setSections] = useState<string[][]>([]);
    const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);

    // Mobile-specific container ID
    const containerId = useMemo(() => {
        return `${category}-mobile-report`;
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

    // --- MOBILE SECTIONING (No strict pagination) ---
    useEffect(() => {
        if (!segments.length) return;

        // Group content into logical sections instead of rigid pages
        const sectionGroups: string[][] = [[]];
        let currentSection = 0;
        let charCount = 0;
        const MAX_CHARS_PER_SECTION = 3500; // Larger sections for mobile scrolling

        segments.forEach(seg => {
            // Start new section on headers or when limit reached
            const isHeader = seg.trim().startsWith('###') || seg.trim().startsWith('#');

            if ((charCount + seg.length > MAX_CHARS_PER_SECTION && sectionGroups[currentSection].length > 0) ||
                (isHeader && charCount > 1000)) {
                currentSection++;
                sectionGroups[currentSection] = [];
                charCount = 0;
            }

            sectionGroups[currentSection].push(seg);
            charCount += seg.length;
        });

        setSections(sectionGroups);
    }, [segments]);

    // Custom markdown components (Mobile optimized)
    const markdownComponents = useMemo(() => ({
        img: ({ node, src, alt, ...props }: any) => {
            const resolvedSrc = cloudManager.resolveImage(src || '');
            return (
                <div className="my-4 flex justify-center">
                    <img
                        src={resolvedSrc}
                        alt={alt || 'Image'}
                        className="rounded-lg shadow-lg w-full max-w-sm h-auto object-cover border-2 border-purple-500/30"
                        onError={(e) => {
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
            <h1 className="text-2xl font-cinzel font-black uppercase tracking-tight mt-6 mb-3"
                style={{ color: template?.content_area_config.textColor || '#4a0404' }} {...props}>
                {children}
            </h1>
        ),
        h2: ({ node, children, ...props }: any) => (
            <h2 className="text-xl font-cinzel font-black uppercase tracking-tight mt-5 mb-2"
                style={{ color: template?.content_area_config.textColor || '#4a0404' }} {...props}>
                {children}
            </h2>
        ),
        h3: ({ node, children, ...props }: any) => (
            <h3 className="text-lg font-cinzel font-bold uppercase tracking-tight mt-4 mb-2"
                style={{ color: template?.content_area_config.textColor || '#4a0404' }} {...props}>
                {children}
            </h3>
        ),
        p: ({ node, children, ...props }: any) => (
            <p className="leading-relaxed text-base mb-3"
                style={{ color: template?.content_area_config.textColor || '#1a1a1a' }} {...props}>
                {children}
            </p>
        ),
        ul: ({ node, children, ...props }: any) => (
            <ul className="list-disc list-inside mb-3 space-y-1.5" {...props}>
                {children}
            </ul>
        ),
        ol: ({ node, children, ...props }: any) => (
            <ol className="list-decimal list-inside mb-3 space-y-1.5" {...props}>
                {children}
            </ol>
        ),
        li: ({ node, children, ...props }: any) => (
            <li className="leading-relaxed text-base"
                style={{ color: template?.content_area_config.textColor || '#1a1a1a' }} {...props}>
                {children}
            </li>
        ),
        strong: ({ node, children, ...props }: any) => (
            <strong className="font-black"
                style={{ color: template?.content_area_config.textColor || '#3a0000' }} {...props}>
                {children}
            </strong>
        ),
        em: ({ node, children, ...props }: any) => (
            <em className="italic opacity-90" {...props}>
                {children}
            </em>
        ),
        hr: ({ node, ...props }: any) => (
            <hr className="my-4 border-t-2 border-amber-500/20" {...props} />
        ),
        blockquote: ({ node, children, ...props }: any) => (
            <blockquote className="border-l-4 border-purple-500 pl-3 italic my-3 bg-purple-50/50 py-2 rounded text-sm" {...props}>
                {children}
            </blockquote>
        ),
    }), [template]);

    const renderSegment = (line: string, index: number) => {
        const trimmed = line.trim();

        // Handle markdown content
        if (trimmed.includes('![') || trimmed.includes('[') && trimmed.includes('](') || trimmed.startsWith('#')) {
            return (
                <div key={index} className="w-full">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {trimmed}
                    </ReactMarkdown>
                </div>
            );
        }

        const isPositive = trimmed.includes('[POSITIVE]');
        const isNegative = trimmed.includes('[NEGATIVE]');

        const cleanLine = trimmed
            .replace(/\[POSITIVE\]/g, '').replace(/\[\/POSITIVE\]/g, '')
            .replace(/\[NEGATIVE\]/g, '').replace(/\[\/NEGATIVE\]/g, '');

        const isHeader = cleanLine.startsWith('###') || cleanLine.startsWith('#') ||
            (cleanLine.startsWith('**') && cleanLine.endsWith('**') && cleanLine.length < 80);

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
                <div key={index} className="w-full mt-8 mb-4">
                    <h4 className="text-xl font-cinzel font-black text-center uppercase tracking-tight"
                        style={{ color: template?.content_area_config.textColor || '#4a0404' }}>
                        {parsedContent}
                    </h4>
                    <div className="mx-auto w-16 h-0.5 bg-amber-500/20 mt-2"></div>
                </div>
            );
        }

        return (
            <div
                key={index}
                className={`relative flex items-start mb-3 p-3 rounded-lg transition-all ${isPositive ? 'bg-green-600/5' : isNegative ? 'bg-red-600/5' : ''
                    }`}
            >
                <div className="leading-relaxed text-base"
                    style={{ color: template?.content_area_config.textColor || '#1a1a1a' }}>
                    {parsedContent}
                </div>
            </div>
        );
    };

    const handleDownloadPDF = async () => {
        if (isDownloading) return;
        setIsDownloading(true);

        try {
            const safeTitle = title?.trim().replace(/\s+/g, '_') || 'Decree';
            await generatePDF(containerId, {
                filename: `Decree_${safeTitle}.pdf`,
                quality: 0.85,
                marginSide: 2,
            });
        } catch (err) {
            console.error('PDF Export Error:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: `Check out my ${title} report from Glyph Circle`,
                    url: window.location.href,
                });
            } catch (err) {
                console.log('Share cancelled or failed:', err);
            }
        }
    };

    // Mobile-optimized content styles
    const contentStyles = template ? {
        paddingTop: '1.5rem',
        paddingBottom: '1.5rem',
        paddingLeft: '1rem',
        paddingRight: '1rem',
        color: template.content_area_config.textColor,
        fontFamily: template.content_area_config.fontFamily || 'Lora, serif',
        backgroundColor: template.content_area_config.backgroundColor || 'transparent'
    } : {
        padding: '1.5rem 1rem'
    };

    const bgUrl = template ? cloudManager.resolveImage(template.template_image_url) :
        "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E";

    if (isLoadingTemplate) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up w-full flex flex-col items-center min-h-screen pb-20">
            <SageChat context={reading} type={title} />

            {/* Mobile Report Container - Full Width, Continuous Scroll */}
            <div
                id={containerId}
                ref={reportRef}
                className="w-full max-w-full"
            >
                {/* Header Section */}
                <div
                    className="relative bg-[#fffcf0] w-full"
                    style={{
                        backgroundImage: `url(${bgUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                >
                    <div style={contentStyles} className="relative z-10 flex flex-col items-center py-8">
                        {/* Logo */}
                        <div className="w-20 h-20 mb-4 bg-black rounded-full border-4 border-amber-500 flex items-center justify-center shadow-xl overflow-hidden">
                            <img src={DEFAULT_BRAND_LOGO} alt="Seal" className="w-[60%] h-[60%] object-contain" />
                        </div>

                        {/* Title */}
                        <div className="text-center px-4">
                            <h1 className="text-2xl font-cinzel font-black uppercase tracking-tight leading-tight"
                                style={{ color: template?.content_area_config.textColor || '#2d0a18' }}>
                                {title}
                            </h1>
                            {subtitle && (
                                <p className="text-sm font-bold uppercase tracking-widest mt-2 opacity-70">
                                    {subtitle}
                                </p>
                            )}
                        </div>

                        {/* Chart Data */}
                        {chartData && (
                            <div className="w-full grid grid-cols-1 gap-3 mt-6 bg-black/5 p-4 rounded-2xl">
                                {(chartData.vedicMetrics || []).map((m: any, i: number) => (
                                    <div key={i} className="w-full">
                                        <div className="flex justify-between text-[10px] font-black mb-1 uppercase tracking-widest">
                                            <span className="truncate mr-2">{m.label}</span>
                                            <span className="flex-shrink-0">{m.value}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-600 transition-all duration-500"
                                                style={{ width: `${m.value}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Sections - Continuous Scroll */}
                {sections.map((sectionSegments, sectionIdx) => (
                    <div
                        key={sectionIdx}
                        className="relative bg-[#fffcf0] w-full border-t border-amber-500/10"
                        style={{
                            backgroundImage: `url(${bgUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}
                    >
                        <div style={contentStyles} className="relative z-10">
                            {sectionSegments.map((line, i) => renderSegment(line, i))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Mobile Footer Actions */}
            <div className="mt-8 w-full px-4 no-print">
                <div className="bg-gradient-to-br from-purple-900/40 via-amber-900/40 to-orange-900/40 rounded-2xl p-4 shadow-2xl border border-amber-500/30 backdrop-blur-md">
                    <div className="text-center mb-4">
                        <h3 className="text-xl font-cinzel font-bold text-amber-300 mb-1">
                            Report Complete
                        </h3>
                        <p className="text-amber-100/70 font-lora italic text-sm">
                            May this wisdom guide your journey
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={handleDownloadPDF}
                            disabled={isDownloading}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-700 hover:from-purple-500 hover:to-pink-600 border-purple-500 shadow-lg px-4 py-3 text-sm font-cinzel tracking-wider flex items-center gap-2 justify-center transition-all"
                        >
                            <Download className="w-4 h-4" />
                            {isDownloading ? 'SAVING...' : 'SAVE AS PDF'}
                        </Button>

                        {navigator.share && (
                            <Button
                                onClick={handleShare}
                                className="w-full bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-500 hover:to-cyan-600 border-blue-500 shadow-lg px-4 py-3 text-sm font-cinzel tracking-wider flex items-center gap-2 justify-center transition-all"
                            >
                                <Share2 className="w-4 h-4" />
                                SHARE REPORT
                            </Button>
                        )}

                        <Link to="/home" className="w-full">
                            <Button className="w-full bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-500 hover:to-orange-600 border-amber-500 shadow-lg px-4 py-3 text-sm font-cinzel tracking-wider flex items-center gap-2 justify-center transition-all">
                                <Home className="w-4 h-4" />
                                RETURN HOME
                            </Button>
                        </Link>
                    </div>

                    <div className="mt-4 text-center text-[10px] text-amber-300/50 font-mono">
                        <p>{new Date().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</p>
                    </div>
                </div>
            </div>

            <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
        </div>
    );
};

export default MobileReport;
