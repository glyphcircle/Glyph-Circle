import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from './shared/Card';
import { useTranslation } from '../hooks/useTranslation';

const ReportDesigner: React.FC = () => {
  const { t } = useTranslation();
  const [selectedFrame, setSelectedFrame] = useState('sacred');

  return (
    <div className="min-h-screen py-8 px-4 bg-[#050510]">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
          <div>
            <Link to="/admin/config" className="text-amber-500 hover:text-amber-400 text-xs font-mono uppercase tracking-[0.3em] transition-colors">
              &larr; Return to Sanctum Config
            </Link>
            <h1 className="text-4xl font-cinzel font-black text-white mt-3 tracking-wider">Template Scribe</h1>
          </div>
          <div className="flex gap-4">
             <button onClick={() => window.print()} className="bg-transparent border border-amber-500/50 text-amber-200 px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-amber-500/10 transition-all shadow-lg">
               Scribe (Print)
             </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-10">
          {/* Controls Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 bg-gray-900/50 border-gray-800 backdrop-blur-xl">
              <h3 className="text-amber-100 font-bold uppercase text-[10px] tracking-[0.3em] mb-6 border-b border-white/5 pb-2">Sacred Boundary</h3>
              <div className="grid grid-cols-1 gap-3">
                {['sacred', 'minimal', 'royal', 'ancient'].map(f => (
                  <button 
                    key={f}
                    onClick={() => setSelectedFrame(f)}
                    className={`py-3 px-4 text-xs uppercase font-black rounded-lg border transition-all text-left flex justify-between items-center ${selectedFrame === f ? 'bg-amber-600 border-amber-400 text-white shadow-xl scale-[1.02]' : 'bg-black/40 border-gray-700 text-gray-500 hover:border-gray-500'}`}
                  >
                    <span>{f}</span>
                    {selectedFrame === f && <span className="text-lg">✦</span>}
                  </button>
                ))}
              </div>
            </Card>
            
            <div className="p-4 bg-amber-900/10 border border-amber-500/20 rounded-xl">
                <p className="text-[10px] text-amber-200/60 font-lora italic leading-relaxed">
                  "A report's frame is a container for destiny. Let the boundaries be as beautiful as the truths they hold."
                </p>
            </div>
          </div>

          {/* Preview Area */}
          <div className="lg:col-span-3 flex justify-center bg-black/60 rounded-3xl p-12 border border-white/5 overflow-hidden shadow-inner relative">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)] pointer-events-none"></div>
             
             {/* The Report Canvas */}
             <div className={`relative report-canvas sacred-boundary w-[210mm] h-[297mm] min-w-[210mm] overflow-hidden transform scale-[0.65] md:scale-[0.75] origin-top print:scale-100 print:m-0 print:border-none shadow-[0_50px_100px_rgba(0,0,0,0.5)] transition-all duration-700`}>
                
                {/* 1. CORNER ASSETS */}
                <div className="absolute inset-0 z-10 pointer-events-none p-12">
                    {/* Inner thin border */}
                    <div className="absolute inset-10 border border-amber-900/10 rounded-sm"></div>

                    {/* SVG Corner Ornaments */}
                    {selectedFrame === 'sacred' && (
                        <>
                            <div className="absolute top-8 left-8 w-24 h-24 text-[#d4af37] opacity-60">
                                <svg viewBox="0 0 100 100" fill="currentColor">
                                    <path d="M0 0 L100 0 L100 2 L2 2 L2 100 L0 100 Z" />
                                    <circle cx="20" cy="20" r="4" />
                                    <path d="M30 5 L70 5 M5 30 L5 70" stroke="currentColor" strokeWidth="0.5" />
                                </svg>
                            </div>
                            <div className="absolute top-8 right-8 w-24 h-24 text-[#d4af37] opacity-60 rotate-90">
                                <svg viewBox="0 0 100 100" fill="currentColor">
                                    <path d="M0 0 L100 0 L100 2 L2 2 L2 100 L0 100 Z" />
                                    <circle cx="20" cy="20" r="4" />
                                </svg>
                            </div>
                            <div className="absolute bottom-8 left-8 w-24 h-24 text-[#d4af37] opacity-60 -rotate-90">
                                <svg viewBox="0 0 100 100" fill="currentColor">
                                    <path d="M0 0 L100 0 L100 2 L2 2 L2 100 L0 100 Z" />
                                    <circle cx="20" cy="20" r="4" />
                                </svg>
                            </div>
                            <div className="absolute bottom-8 right-8 w-24 h-24 text-[#d4af37] opacity-60 rotate-180">
                                <svg viewBox="0 0 100 100" fill="currentColor">
                                    <path d="M0 0 L100 0 L100 2 L2 2 L2 100 L0 100 Z" />
                                    <circle cx="20" cy="20" r="4" />
                                </svg>
                            </div>
                        </>
                    )}
                </div>

                {/* 2. DIVINE SEAL HEADER */}
                <div className="relative z-20 w-full pt-24 pb-16 flex flex-col items-center">
                    <div className="relative mb-10 group">
                        {/* Seal Outer Glow */}
                        <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-2xl animate-pulse"></div>
                        <div className="w-32 h-32 bg-[#1a0b12] rounded-full border-4 border-[#d4af37] shadow-[0_0_40px_rgba(212,175,55,0.4)] flex items-center justify-center relative z-10 transition-transform group-hover:scale-110 duration-700">
                            {/* Central Sacred Symbol */}
                            <span className="text-6xl text-amber-500 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">ॐ</span>
                        </div>
                    </div>
                    
                    <h2 className="text-5xl font-cinzel font-black text-[#2d0a18] tracking-[0.25em] uppercase leading-none drop-shadow-sm">Sacred Decree</h2>
                    <div className="w-64 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mt-6 opacity-60"></div>
                    <p className="text-[#8b4513] text-[10px] uppercase tracking-[0.6em] mt-6 font-black opacity-80 italic">Chronicles of the Ethereal Plane</p>
                </div>

                {/* 3. CONTENT PLACEHOLDER */}
                <div className="px-32 relative z-0 flex flex-col gap-10">
                    <div className="border-l-4 border-[#d4af37]/40 pl-8 italic text-[#5c2a0d]/80 text-xl font-lora leading-relaxed">
                        "Behold the alignment of the heavens upon this day. Within these sacred boundaries, we transcribe the vibrational frequency of your being."
                    </div>

                    {/* Dummy Analysis Grid */}
                    <div className="grid grid-cols-2 gap-8 mt-4">
                        <div className="bg-[#8b4513]/5 border border-[#d4af37]/20 rounded-2xl p-6 shadow-inner">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-[10px] uppercase font-bold text-[#8b4513]">Spiritual Alignment</span>
                                <span className="text-xs font-mono font-bold text-amber-700">98%</span>
                            </div>
                            <div className="h-1.5 w-full bg-[#8b4513]/10 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 w-[98%]"></div>
                            </div>
                        </div>
                        <div className="bg-[#8b4513]/5 border border-[#d4af37]/20 rounded-2xl p-6 shadow-inner">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-[10px] uppercase font-bold text-[#8b4513]">Karmic Resonance</span>
                                <span className="text-xs font-mono font-bold text-amber-700">84%</span>
                            </div>
                            <div className="h-1.5 w-full bg-[#8b4513]/10 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 w-[84%]"></div>
                            </div>
                        </div>
                    </div>

                    {/* Text Placeholder lines */}
                    <div className="space-y-4 opacity-40">
                        <div className="h-3 bg-[#8b4513]/20 w-full rounded-full"></div>
                        <div className="h-3 bg-[#8b4513]/20 w-11/12 rounded-full"></div>
                        <div className="h-3 bg-[#8b4513]/20 w-full rounded-full"></div>
                        <div className="h-3 bg-[#8b4513]/20 w-10/12 rounded-full"></div>
                    </div>
                </div>

                {/* 4. FOOTER SEAL */}
                <div className="absolute bottom-20 left-0 w-full flex flex-col items-center opacity-40">
                    <div className="text-3xl text-amber-900 mb-2 font-cinzel">❖</div>
                    <span className="text-[10px] uppercase tracking-[0.4em] font-cinzel font-black text-amber-950">Glyph Circle Sanctuary</span>
                    <div className="mt-4 w-40 h-px bg-gradient-to-r from-transparent via-[#d4af37] to-transparent"></div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDesigner;