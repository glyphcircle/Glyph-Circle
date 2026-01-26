
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
  
  // Design State
  const [activeEdition, setActiveEdition] = useState('Imperial');
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [templateName, setTemplateName] = useState('Sacred Decree V1');
  
  // Parallax / Lighting State
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const LOGO_URL = 'https://lh3.googleusercontent.com/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO';

  useEffect(() => {
    const verify = async () => {
      const status = await dbService.checkIsAdmin();
      setIsAdmin(status);
    };
    if (user) verify();
  }, [user]);

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setParallax({ x: x * 15, y: y * 15 });
  };

  const handleSaveTemplate = async () => {
    setIsSaving(true);
    try {
        await createEntry('report_formats', {
            name: templateName,
            edition: activeEdition,
            status: 'active',
            config: { 
                border: 'chiseled_gold_triple', 
                lighting: 'dynamic_specular',
                header: 'central_orbital'
            }
        });
        alert("Report format archived successfully.");
    } catch (e: any) {
        alert("Error saving: " + e.message);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-6 bg-[#050508] font-lora text-amber-50 overflow-x-hidden">
      {/* 🎭 ADVANCED SVG FILTERS 🎭 */}
      <svg className="hidden">
        <filter id="gold-sheen">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" result="noise" />
          <feSpecularLighting in="noise" surfaceScale="5" specularConstant="1" specularExponent="30" lightingColor="#ffd700" result="spec">
            <fePointLight x="-5000" y="-5000" z="5000" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>

      <div className="max-w-7xl mx-auto">
        {/* DASHBOARD HEADER */}
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
             <Button onClick={handleSaveTemplate} disabled={isSaving} className="bg-amber-800 hover:bg-amber-700 border-none font-black text-[10px] uppercase tracking-widest px-10">
               {isSaving ? 'Saving...' : 'Archive Format'}
             </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-12 items-start">
          {/* CONTROL SIDEBAR */}
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

            <div className="p-6 bg-amber-900/10 rounded-xl border border-amber-500/20">
                <p className="text-[10px] text-amber-200/60 leading-relaxed italic">
                  "The border represents the protective circle of the Sage, while the central orbital header aligns the seeker's prana with the universal flow."
                </p>
            </div>
          </div>

          {/* THE MANUSCRIPT (DESIGN PREVIEW) */}
          <div 
            className="lg:col-span-3 flex justify-center perspective-1000 p-8 md:p-20 bg-[#010103] rounded-[4rem] border border-white/5 shadow-inner min-h-[1200px]"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setParallax({ x: 0, y: 0 })}
          >
             <div 
                ref={canvasRef}
                style={{ 
                    transform: `rotateX(${parallax.y}deg) rotateY(${parallax.x}deg)`,
                    transition: 'transform 0.1s ease-out'
                }}
                className="relative bg-[#fffef7] w-[210mm] h-[297mm] shadow-[0_50px_200px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col p-20"
             >
                {/* 1. ENHANCED BOUNDARY (The Chiseled Frame) */}
                <div className="absolute inset-0 z-40 pointer-events-none p-10">
                    {/* Outer Deep Border */}
                    <div className="w-full h-full border-[16px] border-double border-[#d4af37] shadow-[inset_0_0_60px_rgba(0,0,0,0.1)]"></div>
                    
                    {/* Corner Sigils */}
                    <div className="absolute top-6 left-6 w-24 h-24 text-[#b38728] opacity-80" style={{ filter: 'url(#gold-sheen)' }}>
                        <svg viewBox="0 0 100 100" className="w-full h-full"><path d="M0 0 L100 0 L80 20 L20 20 L20 80 L0 100 Z" fill="currentColor"/></svg>
                    </div>
                    <div className="absolute top-6 right-6 w-24 h-24 text-[#b38728] rotate-90 opacity-80" style={{ filter: 'url(#gold-sheen)' }}>
                        <svg viewBox="0 0 100 100" className="w-full h-full"><path d="M0 0 L100 0 L80 20 L20 20 L20 80 L0 100 Z" fill="currentColor"/></svg>
                    </div>
                    <div className="absolute bottom-6 left-6 w-24 h-24 text-[#b38728] -rotate-90 opacity-80" style={{ filter: 'url(#gold-sheen)' }}>
                        <svg viewBox="0 0 100 100" className="w-full h-full"><path d="M0 0 L100 0 L80 20 L20 20 L20 80 L0 100 Z" fill="currentColor"/></svg>
                    </div>
                    <div className="absolute bottom-6 right-6 w-24 h-24 text-[#b38728] rotate-180 opacity-80" style={{ filter: 'url(#gold-sheen)' }}>
                        <svg viewBox="0 0 100 100" className="w-full h-full"><path d="M0 0 L100 0 L80 20 L20 20 L20 80 L0 100 Z" fill="currentColor"/></svg>
                    </div>
                </div>

                {/* 2. ENHANCED HEADER (The Astral Seal) */}
                <div className="relative z-30 w-full flex flex-col items-center pt-24 mb-16">
                    {/* Central Orbital System */}
                    <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
                        {/* Orbital Rings */}
                        <div className="absolute inset-0 border border-dashed border-[#d4af37]/20 rounded-full animate-[spin_40s_linear_infinite]"></div>
                        <div className="absolute inset-4 border border-dotted border-[#d4af37]/30 rounded-full animate-[spin_25s_linear_infinite_reverse]"></div>
                        <div className="absolute inset-[-12px] border-2 border-[#d4af37]/10 rounded-full"></div>
                        
                        {/* The Core Emblem */}
                        <div className="w-32 h-32 bg-black rounded-full border-4 border-[#d4af37] shadow-[0_0_40px_rgba(212,175,55,0.4)] flex items-center justify-center overflow-hidden relative z-10">
                            <img src={LOGO_URL} alt="Sacred Emblem" className="w-20 h-20 object-contain brightness-125" />
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>
                        </div>
                    </div>

                    <div className="text-center">
                        <h2 className="text-5xl font-cinzel font-black text-[#5c2a0d] tracking-widest uppercase mb-1 drop-shadow-sm">
                            Vedic Summary
                        </h2>
                        <div className="h-px w-64 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mx-auto mb-4"></div>
                        <p className="text-[#8b4513] text-[9px] font-black uppercase tracking-[0.6em] opacity-60">
                            Consecrated {activeEdition} Decree
                        </p>
                    </div>
                </div>

                {/* 3. CONTENT PLACEHOLDER */}
                <div className="relative z-10 px-16 flex-grow overflow-hidden">
                    <div className="space-y-8 opacity-90">
                        <div className="flex gap-6 items-start">
                            <span className="text-4xl text-[#d4af37] font-cinzel leading-none mt-2">“</span>
                            <div className="space-y-6 text-[#1a0f0f] text-lg italic leading-relaxed text-justify">
                                <p>Your celestial path reveals a significant alignment of Jupiter in the 9th house of dharma. This transition marks the beginning of a profound spiritual awakening, where ancient wisdom will guide your modern choices.</p>
                                <p>The lines of your fate intersect with the energies of the sun, promising a period of high vitality and clarity. Meditate on the sacred sounds of the ether to harness this cosmic flux.</p>
                            </div>
                        </div>
                        
                        <div className="pt-12 mt-12 border-t border-[#d4af37]/20 grid grid-cols-2 gap-10">
                            <div className="p-6 bg-[#8b4513]/5 border border-[#d4af37]/20 rounded-xl">
                                <h4 className="font-cinzel font-bold text-xs uppercase mb-3 text-[#5c2a0d]">Karmic Weight</h4>
                                <div className="h-2 w-full bg-[#8b4513]/10 rounded-full">
                                    <div className="h-full w-3/4 bg-gradient-to-r from-[#8b4513] to-[#d4af37] rounded-full"></div>
                                </div>
                            </div>
                            <div className="p-6 bg-[#8b4513]/5 border border-[#d4af37]/20 rounded-xl flex items-center justify-center">
                                <span className="text-3xl filter grayscale opacity-30">❂ ❂ ❂</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. FOOTER SEAL */}
                <div className="relative z-10 pt-10 border-t border-[#d4af37]/20 text-center flex flex-col items-center">
                    <div className="text-[10rem] text-[#d4af37]/30 mb-6 font-cinzel">ॐ</div>
                    <span className="text-[#8b4513] text-[8px] font-black tracking-[0.5em] uppercase">Authenticated by Glyph Circle Enclave</span>
                    <span className="text-[#8b4513]/40 text-[6px] font-mono mt-1">ETHEREAL_ID: GC_{Math.random().toString(36).substring(7).toUpperCase()}</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDesigner;
