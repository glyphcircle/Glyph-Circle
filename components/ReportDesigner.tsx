
import React, { useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Card from './shared/Card';
import Button from './shared/Button';
import { useTranslation } from '../hooks/useTranslation';
import { useDb } from '../hooks/useDb';

const ReportDesigner: React.FC = () => {
  const { t } = useTranslation();
  const { db, createEntry } = useDb();
  
  const [activeEdition, setActiveEdition] = useState('Imperial');
  const [isSaving, setIsSaving] = useState(false);
  const [templateName, setTemplateName] = useState('Imperial Decree V12');
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const LOGO_URL = 'https://lh3.googleusercontent.com/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO';

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!canvasRef.current || window.innerWidth < 1024) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setParallax({ x: x * 12, y: y * 12 });
  };

  const handleArchive = async () => {
      setIsSaving(true);
      try {
          await createEntry('report_formats', {
              name: templateName,
              url: 'https://www.transparenttextures.com/patterns/handmade-paper.png',
              status: 'active'
          });
          alert("Artifact committed to the Cloud Vault.");
      } catch (e) {
          alert("Synchronization Error: Check your SQL permissions.");
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="min-h-screen py-10 px-4 md:px-8 bg-[#010103] font-lora text-amber-50 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        
        {/* DESIGNER CONTROLS - ADMIN ONLY STYLE */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-white/5 pb-10 no-print gap-6">
          <div className="space-y-4">
            <Link to="/admin/dashboard" className="text-amber-500/50 hover:text-amber-200 text-[10px] font-mono uppercase tracking-[0.8em] flex items-center gap-4 transition-all group">
              <span className="group-hover:-translate-x-1 transition-transform text-xl">←</span> Registry Dashboard
            </Link>
            <h1 className="text-5xl md:text-7xl font-cinzel font-black tracking-tighter text-white uppercase leading-none">
                Report <span className="gold-gradient-text">Design</span>
            </h1>
          </div>
          
          <div className="flex flex-wrap gap-4 w-full md:w-auto items-center bg-black/40 p-4 rounded-[2rem] border border-white/10 shadow-2xl">
             <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-amber-500/60 ml-2 font-black">Designator Identity</span>
                <input 
                    value={templateName} 
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="flex-grow md:w-64 bg-black/80 border border-amber-500/20 rounded-xl px-6 py-3 text-sm focus:border-amber-500 outline-none transition-all font-mono text-amber-100"
                />
             </div>
             <Button onClick={handleArchive} disabled={isSaving} className="h-[48px] mt-[13px] bg-amber-800 hover:bg-amber-700 border-none font-black text-[10px] uppercase tracking-widest px-10 rounded-xl shadow-2xl transition-all active:scale-95">
               {isSaving ? 'CHANNELING...' : 'Archive Layout'}
             </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-12 items-start">
          
          {/* SIDEBAR SELECTORS */}
          <div className="lg:col-span-1 space-y-6 no-print">
            <Card className="p-8 bg-gray-900/60 border-amber-500/10 backdrop-blur-xl shadow-2xl rounded-[2.5rem]">
              <h3 className="text-amber-400 font-black uppercase text-[10px] tracking-[0.4em] mb-8 border-b border-white/5 pb-4 text-center">Edition Selection</h3>
              <div className="space-y-4">
                {['Mortal', 'Ancient', 'Imperial'].map(f => (
                  <button 
                    key={f} 
                    onClick={() => setActiveEdition(f)} 
                    className={`w-full py-4 px-6 text-[10px] uppercase font-black rounded-xl border transition-all text-left flex justify-between items-center tracking-[0.3em] ${activeEdition === f ? 'bg-amber-600 border-amber-300 text-white shadow-lg translate-x-2' : 'bg-black/40 border-gray-800 text-gray-500 hover:text-amber-200'}`}
                  >
                    <span>{f} Artifact</span>
                    {activeEdition === f && <span className="text-white animate-pulse">❂</span>}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-black/40 border-amber-500/5 rounded-[2rem] text-center">
                 <p className="text-[9px] text-gray-500 uppercase tracking-widest leading-relaxed">
                    A4 Canvas Rendering. Active DPI: 300. <br/>Boundaries reactive to sacred geometry.
                 </p>
            </Card>
          </div>

          {/* ENHANCED DESIGN CANVAS */}
          <div className="lg:col-span-3 flex justify-center p-2 md:p-10 bg-[#050505] rounded-[4rem] border border-white/5 shadow-[0_80px_160px_rgba(0,0,0,1)] relative overflow-hidden" onMouseMove={handleMouseMove} onMouseLeave={() => setParallax({ x: 0, y: 0 })}>
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.06)_0%,transparent_70%)] pointer-events-none"></div>
             
             {/* THE ACTUAL REPORT SHEET */}
             <div 
                ref={canvasRef} 
                style={{ 
                    transform: `perspective(2000px) rotateX(${parallax.y}deg) rotateY(${parallax.x}deg)`, 
                    transition: 'transform 0.2s cubic-bezier(0.23, 1, 0.32, 1)', 
                    width: '210mm', 
                    minHeight: '297mm' 
                }} 
                className="relative bg-[#fffdf5] shadow-[0_120px_250px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col p-12 md:p-24 report-canvas m-4"
             >
                
                {/* 🛡️ THE SACRED BOUNDARY (Enhanced Triple-Bevel) */}
                <div className="absolute inset-0 z-40 pointer-events-none p-4 md:p-8">
                    {/* Layer 1: Chiseled Double Border */}
                    <div className="w-full h-full border-[14px] md:border-[22px] border-double border-[#d4af37]/90 shadow-[inset_0_0_80px_rgba(139,92,5,0.1)] relative">
                        {/* Layer 2: Beveled Highlight Line */}
                        <div className="absolute inset-[-4px] border-[1px] border-white/30"></div>
                        {/* Layer 3: Nested Pinstripe Border */}
                        <div className="absolute inset-2 border-[2px] border-[#d4af37]/30 m-1"></div>
                        
                        {/* Papyrus Grain Overlay */}
                        <div className="absolute inset-0 opacity-[0.12] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/handmade-paper.png')]"></div>
                    </div>
                    
                    {/* Imperial Corner Sigils */}
                    {['top-4 left-4', 'top-4 right-4 rotate-90', 'bottom-4 left-4 -rotate-90', 'bottom-4 right-4 rotate-180'].map((pos, idx) => (
                        <div key={idx} className={`absolute w-40 h-40 md:w-60 md:h-60 text-[#b38728] ${pos} filter drop-shadow-lg`}>
                            <svg viewBox="0 0 100 100" fill="currentColor">
                                <path d="M0,0 L40,0 L40,4 L4,4 L4,40 L0,40 Z" />
                                <circle cx="10" cy="10" r="3" />
                                <path d="M22,22 L32,22 L32,24 L24,24 L24,32 L22,32 Z" opacity="0.6" />
                                <circle cx="50" cy="2" r="1" opacity="0.3" />
                                <circle cx="2" cy="50" r="1" opacity="0.3" />
                            </svg>
                        </div>
                    ))}
                </div>

                {/* 🌟 ENHANCED CELESTIAL HEADER */}
                <div className="relative z-30 w-full flex flex-col items-center pt-16 mb-24">
                    <div className="relative w-64 h-64 mb-12 flex items-center justify-center">
                        {/* Dynamic Glowing Aura */}
                        <div className="absolute inset-[-40px] bg-[radial-gradient(circle,rgba(212,175,55,0.22)_0%,transparent_70%)] animate-pulse rounded-full blur-3xl"></div>
                        
                        {/* Orbital Glyph Rings */}
                        <div className="absolute inset-0 border-[5px] border-dashed border-[#d4af37]/20 rounded-full animate-[spin_150s_linear_infinite]"></div>
                        <div className="absolute inset-10 border-[1.5px] border-dotted border-[#d4af37]/30 rounded-full animate-[spin_90s_linear_infinite_reverse]"></div>
                        
                        {/* The Imperial Seal */}
                        <div className="w-48 h-48 bg-black rounded-full border-[10px] border-[#d4af37] shadow-[0_0_120px_rgba(212,175,55,0.4)] flex items-center justify-center overflow-hidden">
                             <div className="absolute inset-0 p-10 transform hover:scale-110 transition-transform duration-[8000ms] cursor-pointer">
                                <img src={LOGO_URL} alt="Sacred Emblem" className="w-full h-full object-contain brightness-125" />
                             </div>
                             <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/30 pointer-events-none"></div>
                        </div>
                    </div>

                    <div className="text-center relative px-10">
                        <h2 className="text-7xl md:text-9xl font-cinzel font-black gold-gradient-text tracking-[0.2em] uppercase mb-4 leading-none filter drop-shadow-2xl">
                            Decree
                        </h2>
                        <div className="flex items-center justify-center gap-10">
                           <div className="h-px w-32 bg-gradient-to-r from-transparent via-[#8b4513]/40 to-transparent"></div>
                           <p className="text-[#5c2a0d] text-[18px] md:text-[20px] font-black uppercase tracking-[1.4em] opacity-90 italic pl-[1.4em] font-cinzel">
                             Celestial Archives
                           </p>
                           <div className="h-px w-32 bg-gradient-to-r from-transparent via-[#8b4513]/40 to-transparent"></div>
                        </div>
                    </div>
                </div>

                {/* 📜 CONTENT PLACEHOLDER AREA */}
                <div className="relative z-10 px-16 md:px-32 flex-grow pb-32">
                    <div className="space-y-24">
                        <div className="flex gap-20 items-start">
                            <span className="text-[16rem] text-[#d4af37]/20 font-cinzel leading-none select-none italic transform -translate-y-24 drop-shadow-sm">“</span>
                            <div className="space-y-16 text-[#1a1a1a] text-4xl md:text-5xl font-medium leading-relaxed text-justify font-lora">
                                <p className="first-letter:text-[12rem] first-letter:font-cinzel first-letter:text-[#4a0404] first-letter:mr-10 first-letter:float-left first-letter:font-black first-letter:leading-none">The weave of your destiny has reached a convergence point. As the celestial gears align within your 10th house, a doorway of manifested power stands before your spirit.</p>
                                <p>Every word written here is etched with the vibration of truth. Approach your journey with the heart of a sovereign ruler, for the universe only bows to those who recognize their own divinity.</p>
                            </div>
                        </div>
                    </div>

                    {/* Authenticated Stamp Footer */}
                    <div className="mt-64 pt-24 border-t-2 border-[#d4af37]/15 text-center opacity-80 flex flex-col items-center">
                        <div className="text-8xl text-[#d4af37] mb-12 tracking-[2.5em] pl-[2.5em] font-cinzel filter drop-shadow-xl">❂ ❂ ❂</div>
                        <span className="text-[#2d0a18] text-[16px] font-cinzel font-black tracking-[1.5em] uppercase block mb-8">Official Sovereign Record</span>
                        <div className="bg-[#4a0404] text-[#fffcf0] px-12 py-3 rounded-full text-[14px] font-mono tracking-[0.5em] uppercase shadow-2xl border border-white/10">
                            VAULT_PROTOCOL_V49.0
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
