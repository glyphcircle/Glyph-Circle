
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from './shared/Card';
import Button from './shared/Button';
import { useTranslation } from '../hooks/useTranslation';

const ReportDesigner: React.FC = () => {
  const { t } = useTranslation();
  const [activeEdition, setActiveEdition] = useState('Imperial');

  return (
    <div className="min-h-screen py-10 px-6 bg-[#030308] font-lora text-amber-50">
      <div className="max-w-7xl mx-auto">
        
        {/* Navigation / Control Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 border-b border-amber-500/10 pb-10 gap-8 no-print">
          <div>
            <Link to="/admin/config" className="text-amber-500 hover:text-amber-400 text-[10px] font-mono uppercase tracking-[0.6em] flex items-center gap-3 mb-4 group">
              <span className="group-hover:-translate-x-2 transition-transform">←</span> Return to Enclave
            </Link>
            <h1 className="text-5xl font-cinzel font-black tracking-widest uppercase gold-gradient-text drop-shadow-2xl">
              Celestial Architect
            </h1>
            <p className="text-amber-200/30 text-[10px] uppercase tracking-[0.5em] mt-2 font-bold italic">Scribing Eternal Manifestations</p>
          </div>
          <div className="flex gap-6">
             <Button onClick={() => window.print()} className="bg-gradient-to-r from-amber-700 via-amber-500 to-amber-800 border-amber-300/50 px-12 py-5 rounded-full font-black text-[11px] uppercase tracking-[0.4em] hover:scale-105 transition-all shadow-[0_0_50px_rgba(245,158,11,0.25)] ring-2 ring-amber-500/20">
               Consecrate & Print ✥
             </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-16">
          {/* Enhanced Controls Sidebar */}
          <div className="lg:col-span-1 space-y-10 no-print">
            <Card className="p-8 bg-black/40 border-amber-500/10 backdrop-blur-3xl shadow-2xl">
              <h3 className="text-amber-400 font-black uppercase text-[10px] tracking-[0.5em] mb-10 border-b border-white/5 pb-4">Frame Geometry</h3>
              <div className="space-y-5">
                {['Imperial', 'Sovereign', 'Ethereal'].map(f => (
                  <button 
                    key={f}
                    onClick={() => setActiveEdition(f)}
                    className={`w-full py-6 px-8 text-[11px] uppercase font-black rounded-3xl border transition-all text-left flex justify-between items-center tracking-[0.3em] ${activeEdition === f ? 'bg-amber-600 border-amber-300 text-white shadow-[0_15px_40px_rgba(217,119,6,0.3)] scale-[1.05] z-10' : 'bg-black/60 border-gray-800 text-gray-500 hover:border-amber-500/40 hover:text-amber-200'}`}
                  >
                    <span>{f} Edition</span>
                    {activeEdition === f && <span className="text-xl animate-pulse">✦</span>}
                  </button>
                ))}
              </div>
            </Card>

            <div className="p-10 bg-gradient-to-br from-amber-950/30 to-black/80 border border-amber-500/20 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
                <div className="absolute -right-16 -bottom-16 text-[15rem] opacity-5 rotate-12 group-hover:rotate-45 transition-transform duration-[5000ms] pointer-events-none select-none">❂</div>
                <h4 className="text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] mb-6">Sacred Geometry</h4>
                <p className="text-xs text-amber-100/60 font-lora italic leading-loose relative z-10">
                  "The boundary creates the sanctuary. An imperial frame acts as a psychic filter, ensuring only pure frequencies resonate through the report."
                </p>
            </div>
          </div>

          {/* Report Preview Surface */}
          <div className="lg:col-span-3 flex justify-center bg-[#05050a] rounded-[5rem] p-12 md:p-32 border border-white/5 overflow-hidden shadow-[inset_0_0_150px_rgba(0,0,0,1)] relative">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0%,transparent_70%)] pointer-events-none"></div>
             
             {/* The Report Canvas (A4) */}
             <div className="relative report-canvas w-[210mm] h-[297mm] min-w-[210mm] overflow-hidden transform scale-[0.4] sm:scale-[0.5] md:scale-[0.7] lg:scale-[0.8] origin-top shadow-[0_120px_250px_rgba(0,0,0,1)] text-[#1a0f0f] print:scale-100 print:m-0 print:border-none transition-all duration-1000 bg-[#fffcf5]">
                
                {/* 1. IMPERIAL BOUNDARY SYSTEM (TRIPLE LAYER) */}
                <div className="absolute inset-0 z-30 pointer-events-none">
                    {/* Layer 1: Outer Filigree Etch */}
                    <div className="absolute inset-8 border border-[#d4af37]/30"></div>
                    {/* Layer 2: Main Heavy Sovereign Border */}
                    <div className="absolute inset-12 border-2 border-[#d4af37]/50"></div>
                    <div className="absolute inset-16 border-[16px] border-double border-[#d4af37] shadow-[inset_0_0_40px_rgba(139,92,5,0.1)]"></div>
                    {/* Layer 3: Inner Prana Line */}
                    <div className="absolute inset-[84px] border border-[#d4af37]/20 shadow-[0_0_20px_rgba(212,175,55,0.15)]"></div>
                    
                    {/* SVG Corner Mandalas */}
                    {[
                      { pos: 'top-12 left-12', rot: '' },
                      { pos: 'top-12 right-12', rot: 'rotate-90' },
                      { pos: 'bottom-12 left-12', rot: '-rotate-90' },
                      { pos: 'bottom-12 right-12', rot: 'rotate-180' }
                    ].map((c, i) => (
                      <div key={i} className={`absolute ${c.pos} ${c.rot} w-80 h-80 opacity-95 z-40`}>
                        <svg viewBox="0 0 100 100" className="w-full h-full text-[#b38728] drop-shadow-md">
                           <path d="M0,0 L50,0 Q30,30 0,50 Z" fill="currentColor" opacity="0.25" />
                           <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="0.3" strokeDasharray="1 1" />
                           <path d="M8,8 Q60,8 60,60" fill="none" stroke="currentColor" strokeWidth="1.5" />
                           <path d="M16,16 Q45,16 45,45" fill="none" stroke="currentColor" strokeWidth="0.8" />
                           <circle cx="16" cy="16" r="4" fill="currentColor" />
                           <rect x="0" y="0" width="100" height="6" fill="currentColor" />
                           <rect x="0" y="0" width="6" height="100" fill="currentColor" />
                        </svg>
                      </div>
                    ))}
                </div>

                {/* 2. ENHANCED CELESTIAL HEADER */}
                <div className="relative z-20 w-full pt-64 pb-24 flex flex-col items-center">
                    <div className="relative mb-32">
                        {/* Radiant Background Aura */}
                        <div className="absolute inset-[-150px] bg-amber-500/10 rounded-full blur-[150px] animate-pulse"></div>
                        
                        {/* Triple Orbit System */}
                        <div className="absolute -inset-48 border border-dashed border-[#d4af37]/20 rounded-full animate-[spin_240s_linear_infinite]"></div>
                        <div className="absolute -inset-40 border-2 border-dotted border-[#d4af37]/30 rounded-full animate-[spin_180s_linear_infinite_reverse]"></div>
                        <div className="absolute -inset-32 border-2 border-double border-[#d4af37]/50 rounded-full animate-[spin_120s_linear_infinite]"></div>
                        
                        {/* CORE SEAL */}
                        <div className="w-[450px] h-[450px] bg-[#0a0a0a] rounded-full border-[12px] border-[#d4af37] shadow-[0_0_120px_rgba(212,175,55,0.7)] flex items-center justify-center relative z-10 overflow-hidden ring-[20px] ring-black/40">
                            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,175,55,0.4)_0%,transparent_80%)]"></div>
                            <span className="text-[22rem] text-amber-500 drop-shadow-[0_20px_60px_rgba(0,0,0,1)] z-20 font-cinzel font-black animate-float-gentle select-none">ॐ</span>
                        </div>
                    </div>
                    
                    <div className="text-center px-64">
                      <h2 className="text-[9rem] font-cinzel font-black gold-gradient-text tracking-[0.3em] uppercase leading-none mb-16 drop-shadow-2xl">
                        DIVINE DECREE
                      </h2>
                      <div className="flex items-center justify-center gap-24 mb-20">
                        <div className="h-[3px] w-80 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent"></div>
                        <p className="text-[#4a230a] text-5xl uppercase tracking-[1.8em] font-black italic opacity-95">Samsara</p>
                        <div className="h-[3px] w-80 bg-gradient-to-l from-transparent via-[#d4af37] to-transparent"></div>
                      </div>
                      <p className="text-[#8b4513]/40 text-2xl uppercase tracking-[1.5em] font-black border-t-4 border-[#d4af37]/10 pt-12">Sanctified by Glyph Circle Enclave</p>
                    </div>
                </div>

                {/* 3. REPORT BODY */}
                <div className="px-80 relative z-10 flex flex-col gap-48 mb-64">
                    <div className="relative">
                        <div className="italic text-[#221414] text-7xl font-lora leading-[2] text-justify px-24 relative z-10 font-medium drop-shadow-sm">
                            The cosmic lattice has resonated with your unique frequency. This document serves as a material reflection of your eternal journey, scribed with absolute precision to honor the laws of the ancient Vedas.
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-56">
                        {[
                          { label: 'Sattva Alignment', val: '98%', color: 'text-emerald-950', desc: 'Purity level' },
                          { label: 'Karmic Velocity', val: '86%', color: 'text-maroon-950', desc: 'Current Momentum' }
                        ].map((m, i) => (
                          <div key={i} className="bg-[#fffef7]/50 border-t-[12px] border-[#d4af37] p-28 rounded-t-[12rem] flex flex-col items-center backdrop-blur-md shadow-2xl">
                              <span className="text-2xl uppercase font-black text-[#5c2a0d] tracking-[0.8em] mb-6">{m.label}</span>
                              <div className={`text-[10rem] font-mono font-black ${m.color} drop-shadow-sm`}>{m.val}</div>
                              <p className="text-sm uppercase tracking-[0.4em] text-[#8b4513]/50 mt-10 font-bold">{m.desc}</p>
                          </div>
                        ))}
                    </div>
                </div>

                {/* 4. FOOTER REGALIA */}
                <div className="absolute bottom-56 left-0 w-full flex flex-col items-center z-50">
                    <div className="text-[12rem] text-[#d4af37] mb-16 font-cinzel tracking-[2.5em] opacity-30 select-none">❂ ❂ ❂</div>
                    <div className="text-xl font-mono text-[#8b4513]/60 uppercase tracking-[0.8em] font-black px-16 py-6 bg-[#d4af37]/5 rounded-full border border-[#d4af37]/15 backdrop-blur-sm">
                        MANIFEST_ID: {Math.random().toString(36).substring(2, 14).toUpperCase()} • PRIME NODE
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
