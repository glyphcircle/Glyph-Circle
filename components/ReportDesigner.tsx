
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from './shared/Card';
import Button from './shared/Button';
import { useTranslation } from '../hooks/useTranslation';
import { useDb } from '../hooks/useDb';

const ReportDesigner: React.FC = () => {
  const { t } = useTranslation();
  const { db, createEntry } = useDb();
  
  const [reportTitle, setReportTitle] = useState('SOVEREIGN DECREE');
  const [reportSubtext, setReportSubtext] = useState('AUTHENTICATED BY SACRED REGISTRY');
  const [reportContent, setReportContent] = useState('The weave of your prana is aligning with the celestial mandate. As the shadows recede before the coming dawn of your manifestation, a throne of destiny awaits your claim. This record is authenticated via the Sacred Registry.');
  const [isSaving, setIsSaving] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [reportId, setReportId] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);

  const LOGO_URL = 'https://lh3.googleusercontent.com/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO';

  useEffect(() => {
    setReportId(`NODE_SYNC_${Math.random().toString(36).substring(2, 10).toUpperCase()}`);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!canvasRef.current || window.innerWidth < 1024) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setParallax({ x: x * 10, y: y * 10 });
  };

  const handleArchive = async () => {
      setIsSaving(true);
      try {
          await createEntry('report_formats', {
              id: `fmt_${Date.now()}`,
              name: `Imperial - ${reportTitle}`,
              url: 'https://www.transparenttextures.com/patterns/handmade-paper.png',
              status: 'active'
          });
          alert("Artifact committed to the Cloud Vault.");
      } catch (e) {
          alert("Synchronization Error: Check SQL permissions.");
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="min-h-screen py-10 px-4 md:px-8 bg-[#010103] font-lora text-amber-50 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        
        {/* DESIGNER HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-white/5 pb-12 no-print gap-10">
          <div className="space-y-4">
            <Link to="/admin/dashboard" className="text-amber-500/50 hover:text-amber-200 text-[11px] font-mono uppercase tracking-[0.8em] flex items-center gap-6 transition-all group">
              <span className="group-hover:-translate-x-3 transition-transform text-3xl">←</span> Admin Dashboard
            </Link>
            <h1 className="text-6xl md:text-8xl font-cinzel font-black tracking-tighter text-white uppercase leading-none">
                Imperial <span className="gold-gradient-text">Studio</span>
            </h1>
          </div>
          
          <div className="flex flex-wrap gap-6 w-full md:w-auto items-center bg-black/50 p-10 rounded-[3rem] border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
             <Button onClick={handleArchive} disabled={isSaving} className="h-[70px] bg-amber-800 hover:bg-amber-700 border-none font-black text-[13px] uppercase tracking-[0.4em] px-14 rounded-3xl shadow-2xl transition-all active:scale-95">
               {isSaving ? 'ARCHIVING...' : 'COMMIT DESIGN'}
             </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-20 items-start">
          
          {/* EDITOR INPUTS */}
          <div className="lg:col-span-1 space-y-10 no-print">
            <Card className="p-12 bg-gray-900/60 border-amber-500/10 backdrop-blur-3xl shadow-2xl rounded-[4rem]">
              <h3 className="text-amber-400 font-black uppercase text-[12px] tracking-[0.6em] mb-12 border-b border-white/5 pb-6 text-center">Manuscript Specs</h3>
              <div className="space-y-10">
                 <div>
                    <label className="block text-[10px] uppercase text-gray-500 font-black mb-3 ml-1 tracking-[0.3em]">Imperial Title</label>
                    <input value={reportTitle} onChange={e => setReportTitle(e.target.value.toUpperCase())} className="w-full bg-black/70 border border-gray-800 rounded-2xl p-5 text-sm text-white focus:border-amber-500 outline-none font-cinzel tracking-[0.2em] shadow-inner" />
                 </div>
                 <div>
                    <label className="block text-[10px] uppercase text-gray-500 font-black mb-3 ml-1 tracking-[0.3em]">Validation Seal</label>
                    <input value={reportSubtext} onChange={e => setReportSubtext(e.target.value.toUpperCase())} className="w-full bg-black/70 border border-gray-800 rounded-2xl p-5 text-sm text-white focus:border-amber-500 outline-none font-cinzel tracking-tighter shadow-inner" />
                 </div>
                 <div>
                    <label className="block text-[10px] uppercase text-gray-500 font-black mb-3 ml-1 tracking-[0.3em]">Decree Content</label>
                    <textarea value={reportContent} onChange={e => setReportContent(e.target.value)} className="w-full bg-black/70 border border-gray-800 rounded-3xl p-6 text-sm text-white focus:border-amber-500 outline-none h-80 resize-none font-lora leading-relaxed shadow-inner" />
                 </div>
              </div>
            </Card>
          </div>

          {/* THE PREVIEW (WYSIWYG) */}
          <div className="lg:col-span-3 flex justify-center p-4 md:p-24 bg-[#020204] rounded-[6rem] border border-white/5 shadow-inner relative overflow-hidden" onMouseMove={handleMouseMove} onMouseLeave={() => setParallax({ x: 0, y: 0 })}>
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.15)_0%,transparent_85%)] pointer-events-none z-0"></div>
             
             <div 
                ref={canvasRef} 
                style={{ 
                    transform: `perspective(3000px) rotateX(${parallax.y}deg) rotateY(${parallax.x}deg)`, 
                    transition: 'transform 0.2s cubic-bezier(0.23, 1, 0.32, 1)', 
                    width: '210mm', 
                    minHeight: '297mm' 
                }} 
                className="relative bg-[#fffcf0] shadow-[0_200px_400px_rgba(0,0,0,0.98)] overflow-hidden flex flex-col p-20 md:p-28 report-canvas rounded-sm z-10"
             >
                {/* Background Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
                    <svg className="w-[90%] h-[90%] text-amber-900" viewBox="0 0 100 100" fill="currentColor">
                        <path d="M50 0 L55 35 L90 20 L65 45 L100 50 L65 55 L90 80 L55 65 L50 100 L45 65 L10 80 L35 55 L0 50 L35 45 L10 20 L45 35 Z" />
                    </svg>
                </div>

                {/* 🛡️ IMPERIAL ETCHED BOUNDARY */}
                <div className="absolute inset-0 z-40 pointer-events-none p-6 md:p-12">
                    <div className="w-full h-full border-[18px] border-double border-[#d4af37]/90 relative shadow-[inset_0_0_80px_rgba(139,92,5,0.1)]">
                        {/* Precision Framing Line */}
                        <div className="absolute inset-[-12px] border-[2px] border-[#d4af37]/50 rounded-sm"></div>
                        {/* Interior Guard Line */}
                        <div className="absolute inset-6 border-[1px] border-[#d4af37]/30"></div>
                        {/* Micro-detail Inner Frame */}
                        <div className="absolute inset-12 border-[5px] border-double border-[#d4af37]/20"></div>
                    </div>
                    
                    {/* Elaborate Corner Flourishes */}
                    {['top-6 left-6', 'top-6 right-6 rotate-90', 'bottom-6 left-6 -rotate-90', 'bottom-6 right-6 rotate-180'].map((pos, idx) => (
                        <div key={idx} className={`absolute w-48 h-48 md:w-72 md:h-72 text-[#b38728] ${pos} filter drop-shadow-[0_4px_25px_rgba(212,175,55,0.5)]`}>
                            <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full opacity-100">
                                <path d="M0,0 L45,0 L45,2.5 L2.5,2.5 L2.5,45 L0,45 Z" />
                                <circle cx="7" cy="7" r="4.5" />
                                <path d="M18,18 Q18,40 40,40" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M40,18 Q40,40 18,40" fill="none" stroke="currentColor" strokeWidth="1.5" />
                            </svg>
                        </div>
                    ))}
                </div>

                {/* 🌟 RADIANT HEADER SYSTEM */}
                <div className="relative z-30 w-full flex flex-col items-center pt-14 mb-24">
                    <div className="relative w-56 h-56 mb-14 flex items-center justify-center">
                        {/* Triple Aura Layer */}
                        <div className="absolute inset-0 border-[4px] border-dashed border-[#d4af37]/50 rounded-full animate-[spin_300s_linear_infinite]"></div>
                        <div className="absolute inset-[-30px] bg-[radial-gradient(circle,rgba(212,175,55,0.22)_0%,transparent_85%)] animate-pulse rounded-full blur-3xl"></div>

                        {/* Sovereign Seal Case */}
                        <div className="w-40 h-40 bg-[#020202] rounded-full border-[8px] border-[#d4af37] shadow-[0_0_100px_rgba(212,175,55,0.6)] flex items-center justify-center overflow-hidden">
                             <div className="p-9">
                                <img src={LOGO_URL} alt="Seal" className="w-full h-full object-contain brightness-150 transition-all duration-2000 hover:scale-125" />
                             </div>
                        </div>
                    </div>

                    <div className="text-center px-12">
                        <h2 className="text-6xl md:text-7xl font-cinzel font-black gold-gradient-text tracking-[0.25em] uppercase mb-6 leading-tight drop-shadow-2xl">
                            {reportTitle}
                        </h2>
                        <div className="flex items-center justify-center gap-10">
                           <div className="h-px w-28 bg-gradient-to-r from-transparent via-[#8b4513]/60 to-transparent"></div>
                           <p className="text-[#4a0404] text-[13px] font-black uppercase tracking-[0.7em] font-cinzel opacity-100 italic">
                             {reportSubtext}
                           </p>
                           <div className="h-px w-28 bg-gradient-to-l from-transparent via-[#8b4513]/60 to-transparent"></div>
                        </div>
                    </div>
                </div>

                {/* 📜 SACRED DECREE CONTENT */}
                <div className="relative z-10 px-20 md:px-32 flex-grow pb-40">
                    <div className="text-[#1a1a1a] text-2xl md:text-3xl font-medium leading-[1.9] text-justify font-lora">
                        <p className="first-letter:text-[10rem] first-letter:font-cinzel first-letter:text-[#4a0404] first-letter:mr-8 first-letter:float-left first-letter:leading-none first-letter:font-black first-letter:drop-shadow-2xl">
                          {reportContent}
                        </p>
                    </div>

                    {/* Authenticated Stamp Section */}
                    <div className="mt-60 pt-24 border-t-4 border-double border-[#d4af37]/40 text-center relative">
                        <div className="text-5xl text-[#d4af37]/40 mb-16 tracking-[2.5em] pl-[2.5em] font-cinzel">❂ ❂ ❂</div>
                        <span className="text-[#4a0404] text-[12px] font-cinzel font-black tracking-[0.6em] uppercase block mb-10 opacity-90">Universal Registry Seal Validated</span>
                        
                        <div className="inline-flex items-center gap-6 bg-[#0a0a0a] text-[#d4af37] px-14 py-4 rounded-full text-[13px] font-mono tracking-widest uppercase border border-[#d4af37]/70 shadow-2xl shadow-black/80">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                            {reportId}
                        </div>
                    </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDesigner;
