
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
  const [templateName, setTemplateName] = useState('Imperial Decree V5');
  
  // Parallax State
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
      setParallax({ x: x * 10, y: y * 10 });
  };

  const handleSaveTemplate = async () => {
    setIsSaving(true);
    try {
        await createEntry('report_formats', {
            name: templateName,
            edition: activeEdition,
            status: 'active',
            config: { 
                border: 'double_chisel_v1', 
                lighting: 'specular_gold_hd',
                canvas_parallax: true
            }
        });
        alert("The Decree Format has been etched into the Eternal Cloud.");
    } catch (e: any) {
        alert("Scribing Interrupted: " + (e.message || "Permissions check failed."));
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen py-10 px-6 bg-[#020205] font-lora text-amber-50 overflow-x-hidden">
      {/* 🏛️ HIGH-RELIEF SPECULAR FILTERS 🏛️ */}
      <svg className="hidden">
        <filter id="chisel-heavy">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4" result="noise" />
          <feSpecularLighting in="noise" surfaceScale="12" specularConstant="1.5" specularExponent="45" lightingColor="#ffd700" result="spec">
            <fePointLight x="-10000" y="-10000" z="20000" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" />
        </filter>
        
        <filter id="metal-sheen">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feSpecularLighting in="blur" surfaceScale="5" specularConstant="1" specularExponent="20" lightingColor="#ffffff">
            <fePointLight x="-5000" y="-5000" z="10000" />
          </feSpecularLighting>
          <feComposite in2="SourceAlpha" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>

      <div className="max-w-7xl mx-auto">
        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 border-b border-amber-500/10 pb-12 gap-8 no-print">
          <div>
            <Link to="/admin/dashboard" className="text-amber-500/40 hover:text-amber-200 text-[10px] font-mono uppercase tracking-[0.8em] flex items-center gap-4 mb-4 group transition-all">
              <span className="group-hover:-translate-x-2 transition-transform">←</span> Return to Sanctum
            </Link>
            <div className="flex flex-wrap items-center gap-6">
               <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="bg-transparent text-4xl md:text-6xl font-cinzel font-black tracking-widest uppercase gold-gradient-text outline-none focus:border-b-2 border-amber-500/20 w-full md:w-auto" />
               {isAdmin && (
                 <div className="bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.1)] flex items-center gap-3">
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
                    <span className="text-amber-500 text-[9px] font-black tracking-[0.3em] uppercase">Sovereign Clearance</span>
                 </div>
               )}
            </div>
          </div>
          <div className="flex gap-4">
             <Button onClick={handleSaveTemplate} disabled={isSaving} className="bg-transparent border-amber-500/20 px-10 py-5 rounded-full font-bold text-[11px] uppercase tracking-[0.5em] hover:bg-amber-500/5 transition-all">
               {isSaving ? 'Scribing...' : 'Archive Format'}
             </Button>
             <Button onClick={() => window.print()} className="bg-amber-800 hover:bg-amber-700 border-none px-14 py-5 rounded-full font-black text-[11px] uppercase tracking-[0.6em] shadow-[0_0_100px_rgba(245,158,11,0.2)]">
               Consecrate ✥
             </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-16">
          {/* TOOLBOX */}
          <div className="lg:col-span-1 space-y-8 no-print">
            <Card className="p-8 bg-black/80 border-amber-500/10 backdrop-blur-3xl shadow-2xl sticky top-32">
              <h3 className="text-amber-400 font-black uppercase text-[10px] tracking-[0.7em] mb-10 border-b border-white/5 pb-4">Artifact Grade</h3>
              <div className="space-y-4">
                {['Standard', 'Imperial', 'Celestial'].map(f => (
                  <button key={f} onClick={() => setActiveEdition(f)} className={`w-full py-6 px-8 text-[11px] uppercase font-black rounded-2xl border transition-all text-left flex justify-between items-center tracking-[0.5em] ${activeEdition === f ? 'bg-amber-700 border-amber-100 text-white shadow-2xl scale-[1.08] z-10' : 'bg-black/40 border-gray-900 text-gray-500 hover:border-amber-500/40'}`}>
                    <span>{f} Vessel</span>
                    {activeEdition === f && <span className="text-xl animate-pulse">✦</span>}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* THE MANUSCRIPT CANVAS */}
          <div 
            className="lg:col-span-3 flex justify-center bg-[#010102] rounded-[20rem] p-12 md:p-48 border border-white/5 overflow-hidden shadow-[inset_0_0_1000px_rgba(0,0,0,1)] relative min-h-[1800px]"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setParallax({ x: 0, y: 0 })}
          >
             {/* THE ACTUAL DOCUMENT */}
             <div 
                ref={canvasRef}
                style={{ transform: `scale(${window.innerWidth < 1024 ? 0.4 : 1.0}) rotateX(${parallax.y}deg) rotateY(${parallax.x}deg)` }}
                className="relative report-canvas w-[210mm] h-[297mm] min-w-[210mm] overflow-hidden shadow-[0_300px_1500px_rgba(0,0,0,1)] text-[#1a0f0f] print:scale-100 print:m-0 print:border-none transition-all duration-300 bg-[#fffef5] z-10"
             >
                
                {/* 1. DOUBLE-CHISELED BOUNDARY */}
                <div className="absolute inset-0 z-40 pointer-events-none p-[40px]">
                    {/* Primary Outer Frame */}
                    <div 
                        className="w-full h-full border-[100px] border-double border-[#d4af37] shadow-[inset_0_0_400px_rgba(0,0,0,0.4)]" 
                        style={{ filter: 'url(#chisel-heavy)' }}
                    ></div>
                    
                    {/* Inner Decorative Groove */}
                    <div className="absolute inset-[155px] border-[12px] border-[#b38728] shadow-inner flex items-center justify-center overflow-hidden">
                        <div className="w-full h-full border-[2px] border-[#d4af37]/30"></div>
                    </div>
                    
                    {/* Corner Sigil Bosses */}
                    {[ 'top-0 left-0', 'top-0 right-0 rotate-90', 'bottom-0 left-0 -rotate-90', 'bottom-0 right-0 rotate-180' ].map((c, i) => (
                      <div key={i} className={`absolute ${c} w-[500px] h-[500px] z-50 p-10`}>
                        <svg viewBox="0 0 200 200" className="w-full h-full text-[#b38728] drop-shadow-4xl">
                           <path 
                              d="M0 0 L200 0 L150 50 L50 50 L50 150 L0 200 Z" 
                              fill="currentColor" 
                              style={{ filter: 'url(#chisel-heavy)' }} 
                           />
                           <circle cx="50" cy="50" r="25" fill="#000" opacity="0.1" />
                           <path d="M50 35 L50 65 M35 50 L65 50" stroke="white" strokeWidth="2" opacity="0.2" />
                        </svg>
                      </div>
                    ))}
                </div>

                {/* 2. THE CELESTIAL ORRERY HEADER */}
                <div className="relative z-30 w-full pt-220 pb-120 flex flex-col items-center">
                    <div className="relative mb-140 scale-[2.5]">
                        {/* Radiant Background */}
                        <div className="absolute inset-[-1000px] bg-[radial-gradient(circle,rgba(212,175,55,0.4)_0%,transparent_75%)] animate-pulse"></div>
                        
                        {/* 7 Orbital Rings */}
                        {[2200, 1800, 1400, 1000, 600, 300, 150].map((s, i) => (
                          <div 
                            key={i} 
                            className={`absolute -inset-${100 + i*35} border-[${i%2===0?1:2}px] ${i%3===0?'border-dashed':i%3===1?'border-dotted':'border-double'} border-[#d4af37]/15 rounded-full animate-[spin_${s}s_linear_infinite${i%2===0?'':'_reverse'}]`}
                          ></div>
                        ))}
                        
                        {/* Chiseled Core Seal */}
                        <div 
                           className="w-[500px] h-[500px] bg-[#000] rounded-full border-[60px] border-[#d4af37] shadow-[0_0_3000px_rgba(212,175,55,0.7)] flex items-center justify-center relative z-10 overflow-hidden ring-[120px] ring-black/95" 
                           style={{ filter: 'url(#chisel-heavy)' }}
                        >
                            <img src={LOGO_URL} alt="Divine Seal" className="w-[80%] h-[80%] object-contain drop-shadow-3xl z-20 animate-float-gentle brightness-200" style={{ filter: 'url(#metal-sheen)' }} />
                        </div>
                    </div>
                    
                    <div className="text-center px-100 mt-100">
                      <h2 className="text-[380rem] font-cinzel font-black gold-gradient-text tracking-[0.25em] uppercase mb-40 drop-shadow-4xl leading-none">Astra Decree</h2>
                      <div className="px-180 py-60 bg-gradient-to-r from-[#d4af37]/20 via-[#d4af37]/50 to-[#d4af37]/20 rounded-full border-[10px] border-[#d4af37]/80 inline-block backdrop-blur-5xl shadow-2xl">
                          <p className="text-[#4a230a] text-[40rem] uppercase tracking-[6em] font-black leading-none ml-[6em]">GRADE {activeEdition.toUpperCase()}</p>
                      </div>
                    </div>
                </div>

                {/* 3. THE BODY CONTENT */}
                <div className="px-300 relative z-10 flex flex-col gap-400 mb-600 mt-150">
                    <div className="relative">
                        {/* Massive Decorative Drop Cap Block */}
                        <div className="absolute -left-120 top-0 w-120 h-120 bg-[#d4af37] flex items-center justify-center font-cinzel font-black text-white text-[90rem] shadow-2xl" style={{ filter: 'url(#chisel-heavy)' }}>T</div>
                        
                        <div className="italic text-[#140a0a] text-[68rem] font-lora leading-[5] text-justify px-260 relative z-10 font-black border-l-[140px] border-[#d4af37] pl-380 bg-white/40 backdrop-blur-6xl rounded-r-[120rem] shadow-[inset_0_0_100px_rgba(0,0,0,0.05)]">
                           his artifact has been extracted from the holographic akashic records and forged into this Material Decree. It serves as the physical anchor for your spiritual karma, consecrated under the highest celestial aspects.
                        </div>
                    </div>
                </div>

                {/* 4. FOOTER SEAL */}
                <div className="absolute bottom-400 left-0 w-full flex flex-col items-center z-50">
                    <div className="text-[44rem] font-mono text-[#4a230a] uppercase tracking-[9em] font-black px-800 py-240 bg-[#d4af37]/50 rounded-full border-[100px] border-[#d4af37] backdrop-blur-4xl shadow-2xl border-double ml-[9em] hover:scale-105 transition-transform duration-1000">
                        SANCTUM PRIME ARTIFACT
                    </div>
                </div>

                {/* Watermark */}
                <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 opacity-[0.01] scale-[20.0] pointer-events-none select-none z-0">
                    <h1 className="font-cinzel font-black">GLYPH</h1>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDesigner;
