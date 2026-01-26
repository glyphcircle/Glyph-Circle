
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from './shared/Card';
import Button from './shared/Button';
import { useTranslation } from '../hooks/useTranslation';

const ReportDesigner: React.FC = () => {
  const { t } = useTranslation();
  const [activeEdition, setActiveEdition] = useState('Imperial');
  const LOGO_URL = 'https://lh3.googleusercontent.com/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO';

  return (
    <div className="min-h-screen py-10 px-6 bg-[#000004] font-lora text-amber-50 overflow-x-hidden">
      {/* 🏛️ CHISELED METALLIC RELIEF FILTERS 🏛️ */}
      <svg className="hidden">
        <filter id="metallic-relief-gold">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" />
          <feSpecularLighting in="noise" surfaceScale="14" specularConstant="1.8" specularExponent="35" lightingColor="#ffd700" result="metal">
            <fePointLight x="-5000" y="-5000" z="30000" />
          </feSpecularLighting>
          <feComposite in="metal" in2="SourceAlpha" operator="in" />
          <feColorMatrix type="matrix" values="1.1 0 0 0 0.1, 0 1.0 0 0 0.05, 0 0 0.8 0 0, 0 0 0 1 0" />
        </filter>
        <filter id="sacred-vellum-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" result="noise" />
          <feDiffuseLighting in="noise" lightingColor="#fffef2" surfaceScale="3">
            <feDistantLight azimuth="45" elevation="55" />
          </feDiffuseLighting>
        </filter>
        <filter id="corona-glow">
          <feGaussianBlur stdDeviation="20" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0.8, 0 1 0 0 0.6, 0 0 1 0 0.2, 0 0 0 2.5 -1" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>

      <div className="max-w-7xl mx-auto">
        
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 border-b border-amber-500/10 pb-10 gap-8 no-print">
          <div>
            <Link to="/admin/dashboard" className="text-amber-500 hover:text-amber-400 text-[10px] font-mono uppercase tracking-[0.6em] flex items-center gap-3 mb-4 group">
              <span className="group-hover:-translate-x-2 transition-transform">←</span> Administrative Sanctum
            </Link>
            <h1 className="text-5xl font-cinzel font-black tracking-widest uppercase gold-gradient-text drop-shadow-2xl">
              Imperial Scribe
            </h1>
            <p className="text-amber-200/30 text-[10px] uppercase tracking-[0.6em] mt-2 font-bold italic underline underline-offset-8 decoration-amber-500/20">Relic Design Laboratory</p>
          </div>
          <div className="flex gap-6">
             <Button onClick={() => window.print()} className="bg-gradient-to-r from-amber-700 via-amber-500 to-amber-800 border-amber-300/50 px-12 py-5 rounded-full font-black text-[11px] uppercase tracking-[0.4em] hover:scale-105 transition-all shadow-[0_0_60px_rgba(245,158,11,0.4)] ring-2 ring-amber-500/20">
               Consecrate Manuscript ✥
             </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-16">
          {/* Controls Sidebar */}
          <div className="lg:col-span-1 space-y-10 no-print">
            <Card className="p-8 bg-black/40 border-amber-500/10 backdrop-blur-3xl shadow-2xl">
              <h3 className="text-amber-400 font-black uppercase text-[10px] tracking-[0.5em] mb-10 border-b border-white/5 pb-4 text-center">Relief Intensity</h3>
              <div className="space-y-5">
                {['Standard', 'Imperial', 'Celestial'].map(f => (
                  <button 
                    key={f}
                    onClick={() => setActiveEdition(f)}
                    className={`w-full py-6 px-8 text-[11px] uppercase font-black rounded-3xl border transition-all text-left flex justify-between items-center tracking-[0.3em] ${activeEdition === f ? 'bg-amber-600 border-amber-300 text-white shadow-[0_15px_40px_rgba(217,119,6,0.3)] scale-[1.05] z-10' : 'bg-black/60 border-gray-800 text-gray-500 hover:border-amber-500/40 hover:text-amber-200'}`}
                  >
                    <span>{f} Grade</span>
                    {activeEdition === f && <span className="text-xl animate-pulse">✦</span>}
                  </button>
                ))}
              </div>
            </Card>

            <div className="p-10 bg-gradient-to-br from-amber-950/30 to-black/80 border border-amber-500/20 rounded-[2.5rem] relative overflow-hidden group shadow-2xl text-center">
                <div className="absolute -right-16 -bottom-16 text-[15rem] opacity-5 rotate-12 transition-transform duration-[5000ms] pointer-events-none select-none">❂</div>
                <span className="text-4xl mb-6 block">📜</span>
                <h4 className="text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] mb-6">Chiseled Relief</h4>
                <p className="text-xs text-amber-100/60 font-lora italic leading-loose relative z-10">
                  "The heavy metallic frame ensures vibrational anchoring during the transition from digital to material form."
                </p>
            </div>
          </div>

          {/* Report Preview Surface */}
          <div className="lg:col-span-3 flex justify-center bg-[#010101] rounded-[6rem] p-12 md:p-32 border border-white/5 overflow-hidden shadow-[inset_0_0_200px_rgba(0,0,0,1)] relative min-h-[1400px]">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.15)_0%,transparent_90%)] pointer-events-none"></div>
             
             {/* THE MANUSCRIPT (A4 Ratio) */}
             <div className="relative report-canvas w-[210mm] h-[297mm] min-w-[210mm] overflow-hidden transform scale-[0.35] sm:scale-[0.5] md:scale-[0.85] lg:scale-[0.98] xl:scale-[1.0] origin-top shadow-[0_120px_350px_rgba(0,0,0,0.98)] text-[#1a0f0f] print:scale-100 print:m-0 print:border-none transition-all duration-1000 bg-[#fffdf0] z-10">
                
                {/* Parchment Texture Layer */}
                <div className="absolute inset-0 z-0 opacity-[0.35] pointer-events-none" style={{ filter: 'url(#sacred-vellum-grain)' }}></div>

                {/* 1. CHISELED METALLIC RELIEF BOUNDARY */}
                <div className="absolute inset-0 z-30 pointer-events-none">
                    {/* Outer Radiance Edge */}
                    <div className="absolute inset-4 border-[6px] border-[#d4af37]/50 shadow-[0_0_60px_rgba(212,175,55,0.3)]"></div>
                    
                    {/* The Primary Embossed Frame */}
                    <div 
                      className="absolute inset-12 border-[75px] border-double border-[#d4af37] shadow-[inset_0_0_150px_rgba(0,0,0,0.5)] overflow-hidden"
                      style={{ filter: 'url(#metallic-relief-gold)' }}
                    ></div>
                    
                    {/* Inner Sacred Geometrical Line */}
                    <div className="absolute inset-[185px] border-[4px] border-dashed border-[#d4af37]/50 shadow-[0_0_50px_rgba(212,175,55,0.15)]"></div>
                    
                    {/* Corner Mandala Symbols (Heavily Embossed) */}
                    {[
                      { pos: 'top-16 left-16', rot: '' },
                      { pos: 'top-16 right-16', rot: 'rotate-90' },
                      { pos: 'bottom-16 left-16', rot: '-rotate-90' },
                      { pos: 'bottom-16 right-16', rot: 'rotate-180' }
                    ].map((c, i) => (
                      <div key={i} className={`absolute ${c.pos} ${c.rot} w-[550px] h-[550px] opacity-100 z-40`}>
                        <svg viewBox="0 0 200 200" className="w-full h-full text-[#b38728] drop-shadow-[0_25px_60px_rgba(0,0,0,0.95)]">
                           <path d="M0 0 L160 0 L0 160 Z" fill="currentColor" opacity="0.98" />
                           <circle cx="55" cy="55" r="45" fill="none" stroke="white" strokeWidth="2.5" opacity="0.4" />
                           <path d="M55 20 L55 90 M20 55 L90 55" stroke="white" strokeWidth="1.5" opacity="0.3" />
                           <rect x="0" y="0" width="200" height="45" fill="currentColor" />
                           <rect x="0" y="0" width="45" height="200" fill="currentColor" />
                           <circle cx="75" cy="75" r="18" fill="white" opacity="0.15" />
                        </svg>
                      </div>
                    ))}
                </div>

                {/* 2. SOLAR CORONA HEADER (LUMINOUS SUPERNOVA) */}
                <div className="relative z-20 w-full pt-100 pb-64 flex flex-col items-center">
                    <div className="relative mb-100 scale-[1.45]">
                        {/* High-Intensity Supernova Halo */}
                        <div className="absolute inset-[-800px] bg-[radial-gradient(circle,rgba(212,175,55,0.6)_0%,transparent_75%)] animate-pulse opacity-90" style={{ filter: 'url(#corona-glow)' }}></div>
                        
                        {/* ROTATING MANDALA RINGS (Triple Layer) */}
                        <div className="absolute -inset-200 border-[4px] border-dashed border-[#d4af37]/25 rounded-full animate-[spin_400s_linear_infinite]"></div>
                        <div className="absolute -inset-180 border-[10px] border-dotted border-[#d4af37]/35 rounded-full animate-[spin_300s_linear_infinite_reverse]"></div>
                        <div className="absolute -inset-160 border-[18px] border-double border-[#d4af37]/45 rounded-full animate-[spin_200s_linear_infinite]"></div>
                        
                        {/* THE SACRED SEAL CORE */}
                        <div 
                          className="w-[900px] h-[900px] bg-[#000] rounded-full border-[60px] border-[#d4af37] shadow-[0_0_1800px_rgba(212,175,55,1)] flex items-center justify-center relative z-10 overflow-hidden ring-[140px] ring-black/95"
                        >
                            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,175,55,1)_0%,transparent_85%)] animate-pulse opacity-70"></div>
                            {/* Central Sacred Lotus Logo */}
                            <img src={LOGO_URL} alt="Divine Seal" className="w-[88%] h-[88%] object-contain drop-shadow-[0_30px_120px_rgba(212,175,55,1)] z-20 animate-float-gentle brightness-150 contrast-125" />
                        </div>
                    </div>
                    
                    <div className="text-center px-64 relative">
                      <div className="absolute -top-32 left-1/2 -translate-x-1/2 text-12xl text-amber-500 opacity-20 font-cinzel font-black tracking-[4em] w-[200%] uppercase pointer-events-none select-none">Celestial Harmony</div>
                      <h2 className="text-[28rem] font-cinzel font-black gold-gradient-text tracking-[0.08em] uppercase leading-none mb-40 drop-shadow-2xl">
                        DIVINE DECREE
                      </h2>
                      <div className="flex items-center justify-center gap-48 mb-48">
                        <div className="h-[35px] w-[80rem] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent shadow-[0_0_100px_rgba(212,175,55,1)]"></div>
                        <p className="text-[#3b1c08] text-[24rem] uppercase tracking-[3.2em] font-black italic opacity-95">Masa Chakra</p>
                        <div className="h-[35px] w-[80rem] bg-gradient-to-l from-transparent via-[#d4af37] to-transparent shadow-[0_0_100px_rgba(212,175,55,1)]"></div>
                      </div>
                      <div className="px-64 py-28 bg-[#d4af37]/25 rounded-full border-8 border-[#d4af37]/60 inline-block backdrop-blur-4xl shadow-[0_40px_120px_rgba(212,175,55,0.4)]">
                          <p className="text-[#8b4513] text-[15rem] uppercase tracking-[3.2em] font-black leading-none">VALIDATED MANUSCRIPT • ENCLAVE PRIME</p>
                      </div>
                    </div>
                </div>

                {/* 3. REPORT BODY CONTENT */}
                <div className="px-140 relative z-10 flex flex-col gap-200 mb-280">
                    <div className="relative">
                        <div className="italic text-[#140a0a] text-[24rem] font-lora leading-[4.4] text-justify px-100 relative z-10 font-black drop-shadow-sm border-l-[65px] border-[#d4af37] pl-180 bg-white/50 backdrop-blur-3xl rounded-r-[15rem] shadow-lg">
                            Your vibrational signature has been permanently anchored within the celestial records of the enclave. This decree serves as a physical record of your cosmic orientation, scribed with absolute precision.
                        </div>
                    </div>

                    {/* Alignment Metrics Section */}
                    <div className="grid grid-cols-2 gap-200">
                        {[
                          { label: 'Sattva Index', val: '98%', color: 'text-emerald-950', desc: 'Spiritual Purity' },
                          { label: 'Karmic Force', val: '86%', color: 'text-maroon-950', desc: 'Manifestation Power' }
                        ].map((m, i) => (
                          <div key={i} className="bg-[#fffefd]/98 border-t-[160px] border-[#d4af37] p-200 rounded-t-[90rem] flex flex-col items-center backdrop-blur-8xl shadow-[0_350px_900px_rgba(0,0,0,0.4)] border border-[#d4af37]/75 relative group overflow-hidden">
                              <div className="absolute inset-0 opacity-[0.2] pointer-events-none" style={{ filter: 'url(#metallic-relief-gold)' }}></div>
                              <div className="absolute -top-50 left-1/2 -translate-x-1/2 w-95 h-95 bg-[#d4af37] rounded-full flex items-center justify-center text-[15rem] shadow-2xl ring-32 ring-black/10 animate-pulse text-white font-black">✦</div>
                              <span className="text-[16rem] uppercase font-black text-[#4a230a] tracking-[4.5em] mb-64">{m.label}</span>
                              <div className={`text-[75rem] font-mono font-black ${m.color} drop-shadow-2xl tracking-tighter`}>{m.val}</div>
                              <p className="text-[15rem] uppercase tracking-[3.5em] text-[#8b4513] mt-72 font-black border-t-2 border-[#d4af37]/60 pt-32">{m.desc}</p>
                          </div>
                        ))}
                    </div>
                </div>

                {/* 4. FOOTER REGALIA */}
                <div className="absolute bottom-240 left-0 w-full flex flex-col items-center z-50">
                    <div className="text-[100rem] text-[#d4af37] mb-140 font-cinzel tracking-[10em] opacity-40 select-none drop-shadow-2xl">❂ ❂ ❂</div>
                    <div className="text-[18rem] font-mono text-[#8b4513] uppercase tracking-[4.5em] font-black px-300 py-80 bg-[#d4af37]/40 rounded-full border-[75px] border-[#d4af37]/70 backdrop-blur-10xl shadow-[inset_0_0_200px_rgba(0,0,0,0.5)] border-double">
                        ID: {Math.random().toString(36).substring(2, 14).toUpperCase()} • SANCTUM_CERTIFIED
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
