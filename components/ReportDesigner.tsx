
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Card from './shared/Card';
import Button from './shared/Button';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../context/AuthContext';
import { useDb } from '../hooks/useDb';
import { dbService } from '../services/db';

const ReportDesigner: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { createEntry } = useDb();
  
  const [activeEdition, setActiveEdition] = useState('Imperial');
  const [isSaving, setIsSaving] = useState(false);
  const [templateName, setTemplateName] = useState('Sacred Decree V1');
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const LOGO_URL = 'https://lh3.googleusercontent.com/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO';

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setParallax({ x: x * 10, y: y * 10 });
  };

  return (
    <div className="min-h-screen py-10 px-6 bg-[#050508] font-lora text-amber-50 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-amber-500/10 pb-10 no-print">
          <div className="space-y-4">
            <Link to="/admin/dashboard" className="text-amber-500/50 hover:text-amber-200 text-[9px] font-mono uppercase tracking-[0.6em] flex items-center gap-3 transition-all group">
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Return to Sanctum
            </Link>
            <h1 className="text-5xl font-cinzel font-black tracking-tight text-white uppercase">
                Decree <span className="text-amber-500">Stylist</span>
            </h1>
          </div>
          <div className="flex gap-4 mt-6 md:mt-0">
             <input 
                value={templateName} 
                onChange={(e) => setTemplateName(e.target.value)}
                className="bg-black/40 border border-amber-500/20 rounded-lg px-6 py-3 text-sm focus:border-amber-500 outline-none w-64"
                placeholder="Template Title"
             />
             <Button className="bg-amber-800 hover:bg-amber-700 border-none font-black text-[10px] uppercase tracking-widest px-10">
               Archive Format
             </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-12 items-start">
          <div className="lg:col-span-1 space-y-6 no-print">
            <Card className="p-6 bg-gray-900/50 border-amber-500/10 backdrop-blur-xl">
              <h3 className="text-amber-400 font-black uppercase text-[10px] tracking-widest mb-6">Visual Presets</h3>
              <div className="space-y-3">
                {['Standard', 'Imperial', 'Celestial'].map(f => (
                  <button 
                    key={f} 
                    onClick={() => setActiveEdition(f)} 
                    className={`w-full py-4 px-6 text-[10px] uppercase font-bold rounded-xl border transition-all text-left flex justify-between items-center tracking-widest ${activeEdition === f ? 'bg-amber-600 border-amber-300 text-white shadow-xl' : 'bg-black/30 border-gray-800 text-gray-500 hover:border-amber-500/30'}`}
                  >
                    <span>{f} Vessel</span>
                    {activeEdition === f && <span className="animate-pulse">✦</span>}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <div 
            className="lg:col-span-3 flex justify-center perspective-1000 p-4 md:p-10 bg-[#010103] rounded-[3rem] border border-white/5 shadow-inner"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setParallax({ x: 0, y: 0 })}
          >
             <div 
                ref={canvasRef}
                style={{ 
                    transform: `rotateX(${parallax.y}deg) rotateY(${parallax.x}deg)`,
                    transition: 'transform 0.1s ease-out'
                }}
                className="relative bg-[#fffef7] w-full max-w-[800px] aspect-[1/1.41] shadow-[0_50px_150px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col p-12 md:p-20 report-canvas"
             >
                {/* 🛡️ 1. ENHANCED BOUNDARY (The Chiseled Frame) */}
                <div className="absolute inset-0 z-40 pointer-events-none p-6 md:p-10">
                    <div className="w-full h-full border-[10px] md:border-[15px] border-double border-[#d4af37] shadow-[inset_0_0_60px_rgba(0,0,0,0.1)] relative">
                        <div className="absolute inset-1 border border-[#d4af37]/30"></div>
                    </div>
                    
                    {/* Corner Sigils */}
                    <div className="absolute top-4 left-4 w-12 h-12 md:w-20 md:h-20 text-[#b38728] opacity-80">
                        <svg viewBox="0 0 100 100" className="w-full h-full"><path d="M10 10 L90 10 L90 20 L20 20 L20 90 L10 90 Z" fill="currentColor"/></svg>
                    </div>
                    <div className="absolute top-4 right-4 w-12 h-12 md:w-20 md:h-20 text-[#b38728] rotate-90 opacity-80">
                        <svg viewBox="0 0 100 100" className="w-full h-full"><path d="M10 10 L90 10 L90 20 L20 20 L20 90 L10 90 Z" fill="currentColor"/></svg>
                    </div>
                    <div className="absolute bottom-4 left-4 w-12 h-12 md:w-20 md:h-20 text-[#b38728] -rotate-90 opacity-80">
                        <svg viewBox="0 0 100 100" className="w-full h-full"><path d="M10 10 L90 10 L90 20 L20 20 L20 90 L10 90 Z" fill="currentColor"/></svg>
                    </div>
                    <div className="absolute bottom-4 right-4 w-12 h-12 md:w-20 md:h-20 text-[#b38728] rotate-180 opacity-80">
                        <svg viewBox="0 0 100 100" className="w-full h-full"><path d="M10 10 L90 10 L90 20 L20 20 L20 90 L10 90 Z" fill="currentColor"/></svg>
                    </div>
                </div>

                {/* 🌟 2. ENHANCED HEADER (The Astral Seal) */}
                <div className="relative z-30 w-full flex flex-col items-center pt-12 md:pt-20 mb-12">
                    <div className="relative w-32 h-32 md:w-48 md:h-48 mb-8 flex items-center justify-center">
                        <div className="absolute inset-0 border-2 border-dashed border-[#d4af37]/20 rounded-full animate-[spin_60s_linear_infinite]"></div>
                        <div className="absolute inset-4 border border-dotted border-[#d4af37]/40 rounded-full animate-[spin_40s_linear_infinite_reverse]"></div>
                        
                        <div className="w-20 h-20 md:w-28 md:h-28 bg-[#0d0d0d] rounded-full border-[3px] md:border-4 border-[#d4af37] shadow-[0_0_50px_rgba(212,175,55,0.4)] flex items-center justify-center overflow-hidden">
                             <img src={LOGO_URL} alt="Sacred Emblem" className="w-12 h-12 md:w-16 md:h-16 object-contain brightness-125" />
                        </div>
                    </div>

                    <div className="text-center">
                        <h2 className="text-3xl md:text-5xl font-cinzel font-black gold-gradient-text tracking-[0.2em] uppercase mb-1 leading-tight">
                            Sacred Insight
                        </h2>
                        <p className="text-[#8b4513] text-[9px] md:text-[11px] font-black uppercase tracking-[0.6em] opacity-70 italic">
                            Consecrated {activeEdition} Decree
                        </p>
                    </div>
                </div>

                {/* 📜 3. CONTENT AREA */}
                <div className="relative z-10 px-8 md:px-20 flex-grow overflow-hidden">
                    <div className="space-y-6 md:space-y-10 opacity-95">
                        <div className="flex gap-4 md:gap-8 items-start">
                            <span className="text-4xl md:text-6xl text-[#d4af37]/40 font-cinzel leading-none select-none">“</span>
                            <div className="space-y-4 md:space-y-8 text-[#2a1a1a] text-base md:text-xl font-medium leading-relaxed text-justify font-lora">
                                <p>Your celestial path reveals a significant alignment of Jupiter in the 9th house of dharma. This transition marks the beginning of a profound spiritual awakening, where ancient wisdom will guide your modern choices.</p>
                                <p>The lines of your fate intersect with the energies of the sun, promising a period of high vitality and clarity. Meditate on the sacred sounds of the ether to harness this cosmic flux.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🕉️ 4. FOOTER SEAL */}
                <div className="relative z-10 pt-8 border-t border-[#d4af37]/20 text-center flex flex-col items-center">
                    <span className="text-[#8b4513] text-[8px] md:text-[10px] font-black tracking-[0.5em] uppercase">Authenticated by Glyph Circle Enclave</span>
                    <span className="text-[#8b4513]/40 text-[6px] md:text-[8px] font-mono mt-2">CERT_ID: {Math.random().toString(36).substring(2, 12).toUpperCase()}</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDesigner;
