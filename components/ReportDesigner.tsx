
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from './shared/Card';
import { useTranslation } from '../hooks/useTranslation';

const ReportDesigner: React.FC = () => {
  const { t } = useTranslation();
  const [selectedFrame, setSelectedFrame] = useState('imperial');

  return (
    <div className="min-h-screen py-8 px-4 bg-[#050510]">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
          <div>
            <Link to="/admin/config" className="text-amber-500 hover:text-amber-400 text-xs font-mono uppercase tracking-[0.3em] transition-colors">
              &larr; Return to Sanctum Config
            </Link>
            <h1 className="text-4xl font-cinzel font-black text-white mt-3 tracking-wider">Celestial Blueprint</h1>
          </div>
          <div className="flex gap-4">
             <button onClick={() => window.print()} className="bg-amber-600 border border-amber-400 text-white px-8 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-amber-500 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]">
               Consecrate Template
             </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-10">
          {/* Controls Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 bg-gray-900/50 border-gray-800 backdrop-blur-xl">
              <h3 className="text-amber-100 font-bold uppercase text-[10px] tracking-[0.3em] mb-6 border-b border-white/5 pb-2">Sacred Architect</h3>
              <div className="grid grid-cols-1 gap-3">
                {['imperial', 'sovereign', 'ancient', 'minimal'].map(f => (
                  <button 
                    key={f}
                    onClick={() => setSelectedFrame(f)}
                    className={`py-3 px-4 text-xs uppercase font-black rounded-lg border transition-all text-left flex justify-between items-center ${selectedFrame === f ? 'bg-amber-600 border-amber-400 text-white shadow-xl scale-[1.02]' : 'bg-black/40 border-gray-700 text-gray-500 hover:border-gray-500'}`}
                  >
                    <span>{f} Edition</span>
                    {selectedFrame === f && <span className="text-lg">✦</span>}
                  </button>
                ))}
              </div>
            </Card>
            
            <div className="p-6 bg-amber-900/10 border border-amber-500/20 rounded-2xl">
                <h4 className="text-amber-400 text-[10px] font-black uppercase tracking-widest mb-3">Symmetry Guide</h4>
                <p className="text-[11px] text-amber-200/60 font-lora italic leading-relaxed">
                  "The frame of a destiny must be forged in gold and truth. Every line reflects a cosmic boundary."
                </p>
            </div>
          </div>

          {/* Preview Area */}
          <div className="lg:col-span-3 flex justify-center bg-[#070712] rounded-[3rem] p-12 border border-white/5 overflow-hidden shadow-2xl relative">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0%,transparent_80%)] pointer-events-none"></div>
             
             {/* The Report Canvas */}
             <div className={`relative report-canvas w-[210mm] h-[297mm] min-w-[210mm] overflow-hidden transform scale-[0.6] md:scale-[0.7] origin-top print:scale-100 print:m-0 print:border-none shadow-[0_60px_120px_rgba(0,0,0,0.6)] transition-all duration-700`}>
                
                {/* 1. ADVANCED BOUNDARY */}
                <div className={`absolute inset-0 z-10 pointer-events-none transition-all duration-500 ${
                  selectedFrame === 'imperial' ? 'border-[32px] border-double border-[#d4af37]/60 shadow-[inset_0_0_80px_rgba(139,92,5,0.15)]' :
                  selectedFrame === 'sovereign' ? 'border-[20px] border-[#d4af37] ring-[12px] ring-inset ring-[#d4af37]/30 shadow-inner' :
                  'border-8 border-[#d4af37]/40'
                }`}>
                    {/* ENHANCED Ornamental Corners */}
                    <div className="absolute top-0 left-0 w-64 h-64 border-t-[12px] border-l-[12px] border-[#d4af37] rounded-tl-[120px] opacity-90 -translate-x-16 -translate-y-16 flex items-center justify-center">
                         <div className="w-16 h-16 border-2 border-[#d4af37] rounded-full absolute top-12 left-12 animate-pulse"></div>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 border-t-[12px] border-r-[12px] border-[#d4af37] rounded-tr-[120px] opacity-90 translate-x-16 -translate-y-16"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 border-b-[12px] border-l-[12px] border-[#d4af37] rounded-bl-[120px] opacity-90 -translate-x-16 translate-y-16"></div>
                    <div className="absolute bottom-0 right-0 w-64 h-64 border-b-[12px] border-r-[12px] border-[#d4af37] rounded-br-[120px] opacity-90 translate-x-16 translate-y-16"></div>

                    {/* Inner Golden Intricate Line */}
                    <div className="absolute inset-10 border-2 border-[#d4af37]/20 rounded-lg pointer-events-none flex items-center justify-center">
                         <div className="absolute inset-2 border border-[#d4af37]/10 rounded-sm"></div>
                    </div>
                </div>

                {/* 2. MAJESTIC ENHANCED HEADER */}
                <div className="relative z-20 w-full pt-40 pb-24 flex flex-col items-center">
                    <div className="flex items-center gap-16 mb-12 w-full justify-center">
                        <div className="h-[3px] w-56 bg-gradient-to-r from-transparent via-[#d4af37]/60 to-[#d4af37]"></div>
                        <div className="relative group">
                            {/* Inner Radiating Glow */}
                            <div className="absolute -inset-12 bg-[radial-gradient(circle,rgba(212,175,55,0.4)_0%,transparent_70%)] rounded-full animate-pulse"></div>
                            
                            <div className="w-48 h-48 bg-[#0d0d0d] rounded-full border-[8px] border-[#d4af37] shadow-[0_0_80px_rgba(212,175,55,0.6)] flex items-center justify-center relative z-10 overflow-hidden">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
                                <span className="text-9xl text-amber-500 drop-shadow-[0_6px_20px_rgba(0,0,0,1)] select-none">ॐ</span>
                                
                                {/* Complex orbiting rings */}
                                <div className="absolute inset-[-15px] border-[2px] border-dashed border-[#d4af37]/40 rounded-full animate-[spin_30s_linear_infinite]"></div>
                                <div className="absolute inset-[-25px] border-[1px] border-[#d4af37]/20 rounded-full animate-[spin_50s_linear_infinite_reverse]"></div>
                            </div>
                        </div>
                        <div className="h-[3px] w-56 bg-gradient-to-l from-transparent via-[#d4af37]/60 to-[#d4af37]"></div>
                    </div>
                    
                    <div className="text-center">
                      <h2 className="text-8xl font-cinzel font-black gold-gradient-text tracking-[0.25em] uppercase leading-none mb-6 drop-shadow-2xl">Destiny Decree</h2>
                      <div className="flex items-center justify-center gap-4">
                        <span className="h-[1px] w-12 bg-[#d4af37]/40"></span>
                        <p className="text-[#8b4513] text-lg uppercase tracking-[1em] font-black opacity-80 italic">Astra Lumina</p>
                        <span className="h-[1px] w-12 bg-[#d4af37]/40"></span>
                      </div>
                      <p className="text-[#8b4513]/60 text-[10px] uppercase tracking-[0.6em] mt-6 py-4 px-20 border-t border-b border-[#d4af37]/10 inline-block">Official Akashic Record Transcript</p>
                    </div>
                </div>

                {/* 3. ENHANCED CONTENT REGION */}
                <div className="px-48 relative z-0 flex flex-col gap-16">
                    <div className="relative">
                        <div className="absolute -left-16 -top-10 text-[12rem] text-[#d4af37]/10 font-serif leading-none">“</div>
                        <div className="italic text-[#2a1a1a] text-3xl font-lora leading-[1.8] text-justify px-6 relative z-10">
                            Behold the sacred alignment. As the celestial gears turn and the stars scribe their path across the eternal firmament, we transcribe the divine blueprint of your existence. This decree serves as a beacon, illuminated by truth and authenticated by the Glyph Circle Enclave.
                        </div>
                    </div>

                    {/* Statistical Mandala Grid */}
                    <div className="grid grid-cols-2 gap-16">
                        <div className="bg-gradient-to-b from-[#8b4513]/10 to-transparent border-t-2 border-[#d4af37]/40 rounded-t-[4rem] p-12 shadow-xl flex flex-col items-center group hover:bg-[#8b4513]/15 transition-all">
                            <span className="text-[14px] uppercase font-black text-[#5c2a0d] tracking-[0.3em] mb-8">Spiritual Resonance</span>
                            <div className="relative w-40 h-40 flex items-center justify-center mb-8">
                                <svg className="w-full h-full transform -rotate-90 filter drop-shadow-lg">
                                    <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-amber-100/50" />
                                    <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray="452" strokeDashoffset="45" className="text-[#d4af37]" />
                                </svg>
                                <span className="absolute text-4xl font-mono font-black text-[#4a0404]">90%</span>
                            </div>
                            <p className="text-xs text-[#8b4513]/70 font-bold uppercase tracking-widest">Sattvic Alignment</p>
                        </div>
                        
                        <div className="bg-gradient-to-b from-[#8b4513]/10 to-transparent border-t-2 border-[#d4af37]/40 rounded-t-[4rem] p-12 shadow-xl flex flex-col items-center group hover:bg-[#8b4513]/15 transition-all">
                            <span className="text-[14px] uppercase font-black text-[#5c2a0d] tracking-[0.3em] mb-8">Karmic Velocity</span>
                            <div className="relative w-40 h-40 flex items-center justify-center mb-8">
                                <svg className="w-full h-full transform -rotate-90 filter drop-shadow-lg">
                                    <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-amber-100/50" />
                                    <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="10" fill="transparent" strokeDasharray="452" strokeDashoffset="100" className="text-[#d4af37]" />
                                </svg>
                                <span className="absolute text-4xl font-mono font-black text-[#4a0404]">78%</span>
                            </div>
                            <p className="text-xs text-[#8b4513]/70 font-bold uppercase tracking-widest">Active Dharma</p>
                        </div>
                    </div>

                    {/* Majestic Scribe Lines */}
                    <div className="space-y-8 pt-12 opacity-40">
                        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#8b4513] to-transparent w-full"></div>
                        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#8b4513] to-transparent w-4/5 mx-auto"></div>
                        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#8b4513] to-transparent w-3/5 mx-auto"></div>
                    </div>
                </div>

                {/* 4. IMPERIAL ENHANCED FOOTER */}
                <div className="absolute bottom-28 left-0 w-full flex flex-col items-center">
                    <div className="text-5xl text-[#d4af37] mb-6 font-cinzel tracking-[1.8em] opacity-50">❂ ❂ ❂</div>
                    <div className="flex items-center gap-8 mb-6">
                        <div className="h-[1px] w-24 bg-[#d4af37]/30"></div>
                        <span className="text-[14px] uppercase tracking-[0.7em] font-cinzel font-black text-[#2a1a1a] opacity-70">Sanctum High Scribe</span>
                        <div className="h-[1px] w-24 bg-[#d4af37]/30"></div>
                    </div>
                    <div className="w-96 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent"></div>
                    <div className="mt-6 flex gap-10 text-[9px] font-mono text-[#8b4513]/40 uppercase tracking-widest">
                        <span>NODE: GLYPH_CENTRAL</span>
                        <span>CERT: {Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
                        <span>TS: {new Date().getTime()}</span>
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
