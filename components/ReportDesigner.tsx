
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
                  selectedFrame === 'imperial' ? 'border-[32px] border-double border-[#d4af37]/40 shadow-[inset_0_0_60px_rgba(139,92,5,0.1)]' :
                  selectedFrame === 'sovereign' ? 'border-[16px] border-[#d4af37] ring-[8px] ring-inset ring-[#d4af37]/20' :
                  'border-8 border-[#d4af37]/20'
                }`}>
                    {/* Ornamental Corners */}
                    <div className="absolute top-0 left-0 w-48 h-48 border-t-8 border-l-8 border-[#d4af37] rounded-tl-[100px] opacity-80 -translate-x-12 -translate-y-12"></div>
                    <div className="absolute top-0 right-0 w-48 h-48 border-t-8 border-r-8 border-[#d4af37] rounded-tr-[100px] opacity-80 translate-x-12 -translate-y-12"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 border-b-8 border-l-8 border-[#d4af37] rounded-bl-[100px] opacity-80 -translate-x-12 translate-y-12"></div>
                    <div className="absolute bottom-0 right-0 w-48 h-48 border-b-8 border-r-8 border-[#d4af37] rounded-br-[100px] opacity-80 translate-x-12 translate-y-12"></div>

                    {/* Inner Golden Line */}
                    <div className="absolute inset-8 border border-[#d4af37]/30 rounded-sm"></div>
                </div>

                {/* 2. MAJESTIC HEADER */}
                <div className="relative z-20 w-full pt-32 pb-20 flex flex-col items-center">
                    <div className="flex items-center gap-12 mb-10 w-full justify-center">
                        <div className="h-[2px] w-48 bg-gradient-to-r from-transparent to-[#d4af37]"></div>
                        <div className="relative group">
                            <div className="absolute -inset-4 bg-[#d4af37]/20 rounded-full blur-xl group-hover:bg-[#d4af37]/30 transition-all"></div>
                            <div className="w-40 h-40 bg-[#0d0d0d] rounded-full border-[6px] border-[#d4af37] shadow-[0_0_50px_rgba(212,175,55,0.5)] flex items-center justify-center relative z-10">
                                <span className="text-8xl text-amber-500 drop-shadow-[0_4px_15px_rgba(0,0,0,1)]">ॐ</span>
                                {/* Orbiting rings */}
                                <div className="absolute inset-[-10px] border border-[#d4af37]/40 rounded-full animate-[spin_20s_linear_infinite]"></div>
                            </div>
                        </div>
                        <div className="h-[2px] w-48 bg-gradient-to-l from-transparent to-[#d4af37]"></div>
                    </div>
                    
                    <h2 className="text-7xl font-cinzel font-black gold-gradient-text tracking-[0.2em] uppercase leading-none text-center">Imperial Decree</h2>
                    <p className="text-[#8b4513] text-sm uppercase tracking-[0.8em] mt-8 font-black opacity-70 italic border-t border-b border-[#d4af37]/20 py-4 px-12">Universal Akashic Records</p>
                </div>

                {/* 3. ENHANCED CONTENT REGION */}
                <div className="px-40 relative z-0 flex flex-col gap-12">
                    <div className="relative">
                        <div className="absolute -left-12 top-0 text-8xl text-[#d4af37]/10 font-serif">“</div>
                        <div className="italic text-[#2a1a1a] text-2xl font-lora leading-relaxed text-justify px-4">
                            Behold the sacred alignment. As the stars scribe their path across the firmament, so do we transcribe the divine blueprint of your existence. This decree is authenticated by the Glyph Circle Enclave.
                        </div>
                    </div>

                    {/* Statistical Mandala */}
                    <div className="grid grid-cols-2 gap-12">
                        <div className="bg-[#8b4513]/5 border-2 border-[#d4af37]/30 rounded-[2rem] p-10 shadow-inner flex flex-col items-center">
                            <span className="text-[12px] uppercase font-black text-[#8b4513] tracking-widest mb-6">Spiritual Vibrance</span>
                            <div className="relative w-32 h-32 flex items-center justify-center mb-6">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-amber-100" />
                                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="364.4" strokeDashoffset="36.4" className="text-[#d4af37]" />
                                </svg>
                                <span className="absolute text-2xl font-mono font-bold text-[#8b4513]">90%</span>
                            </div>
                            <p className="text-[10px] text-[#8b4513]/60 italic">Resonant with Ether</p>
                        </div>
                        <div className="bg-[#8b4513]/5 border-2 border-[#d4af37]/30 rounded-[2rem] p-10 shadow-inner flex flex-col items-center">
                            <span className="text-[12px] uppercase font-black text-[#8b4513] tracking-widest mb-6">Karma Quotient</span>
                            <div className="relative w-32 h-32 flex items-center justify-center mb-6">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-amber-100" />
                                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="364.4" strokeDashoffset="80" className="text-[#d4af37]" />
                                </svg>
                                <span className="absolute text-2xl font-mono font-bold text-[#8b4513]">78%</span>
                            </div>
                            <p className="text-[10px] text-[#8b4513]/60 italic">Active Dharma</p>
                        </div>
                    </div>

                    {/* Scribe Lines */}
                    <div className="space-y-6 pt-10 opacity-30">
                        <div className="h-[1px] bg-[#8b4513] w-full"></div>
                        <div className="h-[1px] bg-[#8b4513] w-full"></div>
                        <div className="h-[1px] bg-[#8b4513] w-11/12 mx-auto"></div>
                    </div>
                </div>

                {/* 4. IMPERIAL FOOTER */}
                <div className="absolute bottom-24 left-0 w-full flex flex-col items-center">
                    <div className="text-4xl text-[#d4af37] mb-4 font-cinzel tracking-[1.5em] opacity-40">❂ ❂ ❂</div>
                    <span className="text-[11px] uppercase tracking-[0.6em] font-cinzel font-black text-[#2a1a1a] opacity-60">Sacred Sanctum Scribe</span>
                    <div className="mt-6 w-80 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent"></div>
                    <span className="mt-4 text-[8px] font-mono text-[#8b4513]/40">ETHEREAL_HASH: {Math.random().toString(36).substring(2, 18).toUpperCase()}</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDesigner;
