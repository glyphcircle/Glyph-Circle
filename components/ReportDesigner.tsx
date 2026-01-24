
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
            <h1 className="text-4xl font-cinzel font-black text-white mt-3 tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-gold-500">Celestial Blueprint</h1>
          </div>
          <div className="flex gap-4">
             <button onClick={() => window.print()} className="bg-amber-600 border border-amber-400 text-white px-8 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-amber-500 transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)]">
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
                    {selectedFrame === f && <span className="text-lg animate-pulse">✦</span>}
                  </button>
                ))}
              </div>
            </Card>
            
            <div className="p-6 bg-amber-900/10 border border-amber-500/20 rounded-2xl relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 text-6xl opacity-10 rotate-12">❂</div>
                <h4 className="text-amber-400 text-[10px] font-black uppercase tracking-widest mb-3">Symmetry Guide</h4>
                <p className="text-[11px] text-amber-200/60 font-lora italic leading-relaxed relative z-10">
                  "The frame of a destiny must be forged in gold and truth. Every line reflects a cosmic boundary."
                </p>
            </div>
          </div>

          {/* Preview Area */}
          <div className="lg:col-span-3 flex justify-center bg-[#070712] rounded-[4rem] p-16 border border-white/5 overflow-hidden shadow-2xl relative">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0%,transparent_80%)] pointer-events-none"></div>
             
             {/* The Report Canvas */}
             <div className={`relative report-canvas w-[210mm] h-[297mm] min-w-[210mm] overflow-hidden transform scale-[0.4] md:scale-[0.55] lg:scale-[0.65] xl:scale-[0.75] origin-top print:scale-100 print:m-0 print:border-none shadow-[0_80px_150px_rgba(0,0,0,0.8)] transition-all duration-700`}>
                
                {/* 1. ENHANCED BOUNDARY LAYER - Triple Imperial Frame */}
                <div className={`absolute inset-0 z-10 pointer-events-none transition-all duration-500 ${
                  selectedFrame === 'imperial' ? 'border-[56px] border-double border-[#d4af37]/80' :
                  selectedFrame === 'sovereign' ? 'border-[40px] border-[#d4af37]' :
                  'border-12 border-[#d4af37]/40'
                }`}>
                    {/* Intricate Filigree Corner Glyphs (SVG) */}
                    {[
                      { pos: 'top-2 left-2', rotate: '' },
                      { pos: 'top-2 right-2', rotate: 'rotate-90' },
                      { pos: 'bottom-2 left-2', rotate: '-rotate-90' },
                      { pos: 'bottom-2 right-2', rotate: 'rotate-180' }
                    ].map((corner, idx) => (
                      <div key={idx} className={`absolute ${corner.pos} ${corner.rotate} w-80 h-80 pointer-events-none opacity-100 z-30`}>
                        <svg viewBox="0 0 100 100" className="w-full h-full text-[#d4af37]">
                          <path d="M0,0 L40,0 Q10,10 0,40 Z" fill="currentColor" opacity="0.4" />
                          <path d="M2,2 Q25,2 25,25 Q25,48 2,48" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.7" />
                          <path d="M6,6 Q20,6 20,20" fill="none" stroke="currentColor" strokeWidth="0.4" />
                          <circle cx="10" cy="10" r="1.5" fill="currentColor" className="animate-pulse" />
                          <path d="M0,0 L100,0 M0,0 L0,100" stroke="currentColor" strokeWidth="2.5" />
                        </svg>
                      </div>
                    ))}

                    {/* Secondary Fine Internal Frame */}
                    <div className="absolute inset-20 border border-[#d4af37]/50 rounded-sm pointer-events-none shadow-[inset_0_0_40px_rgba(212,175,55,0.1)]"></div>
                    <div className="absolute inset-24 border-2 border-dashed border-[#d4af37]/15 rounded-xs pointer-events-none"></div>
                </div>

                {/* 2. MAJESTIC ENHANCED HEADER - Rotating Mandala Core */}
                <div className="relative z-20 w-full pt-64 pb-32 flex flex-col items-center">
                    <div className="relative mb-24">
                        {/* Glowing Background Pulse */}
                        <div className="absolute inset-[-100px] bg-amber-500/10 rounded-full blur-[120px] animate-[pulse_5s_ease-in-out_infinite]"></div>
                        
                        {/* Rotating Outer Celestial Rings */}
                        <div className="absolute -inset-28 border-[3px] border-dashed border-[#d4af37]/20 rounded-full animate-[spin_100s_linear_infinite]"></div>
                        <div className="absolute -inset-24 border-2 border-[#d4af37]/40 rounded-full animate-[spin_50s_linear_infinite_reverse]"></div>
                        <div className="absolute -inset-20 border border-[#d4af37]/60 rounded-full animate-[spin_25s_linear_infinite]"></div>
                        
                        {/* The Mandala Seal */}
                        <div className="w-96 h-96 bg-[#0d0d0d] rounded-full border-[15px] border-[#d4af37] shadow-[0_0_180px_rgba(212,175,55,0.8)] flex items-center justify-center relative z-10 overflow-hidden ring-[16px] ring-black">
                            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(212,175,55,0.3)_0%,transparent_70%)] animate-pulse"></div>
                            {/* Inner Geometric Pattern */}
                            <div className="absolute inset-8 border-[3px] border-[#d4af37]/30 rounded-full animate-[spin_40s_linear_infinite]">
                               {[...Array(24)].map((_, i) => (
                                 <div key={i} className="absolute top-1/2 left-1/2 w-[1.5px] h-full bg-[#d4af37]/25 origin-top" style={{ transform: `translate(-50%, -50%) rotate(${i * 15}deg)` }}></div>
                               ))}
                            </div>
                            <span className="text-[18rem] text-amber-500 drop-shadow-[0_15px_60px_rgba(0,0,0,1)] select-none z-20 font-cinzel font-black animate-[float_8s_ease-in-out_infinite]">ॐ</span>
                        </div>
                    </div>
                    
                    <div className="text-center px-40">
                      <h2 className="text-[10rem] font-cinzel font-black gold-gradient-text tracking-[0.2em] uppercase leading-none mb-10 drop-shadow-[0_10px_40px_rgba(0,0,0,0.5)]">Destiny Decree</h2>
                      <div className="flex items-center justify-center gap-16">
                        <div className="h-[4px] w-56 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent"></div>
                        <p className="text-[#8b4513] text-4xl uppercase tracking-[2em] font-black opacity-90 italic">Astra Lumina</p>
                        <div className="h-[4px] w-56 bg-gradient-to-l from-transparent via-[#d4af37] to-transparent"></div>
                      </div>
                      <p className="text-[#8b4513]/60 text-[14px] uppercase tracking-[1.5em] mt-16 font-black border-t border-[#d4af37]/20 pt-8">Consecrated by the High Enclave of Glyph Circle</p>
                    </div>
                </div>

                {/* 3. CONTENT REGION */}
                <div className="px-72 relative z-0 flex flex-col gap-40">
                    <div className="relative">
                        <div className="absolute -left-24 -top-24 text-[28rem] text-[#d4af37]/10 font-serif leading-none select-none">“</div>
                        <div className="italic text-[#2a1a1a] text-6xl font-lora leading-[1.9] text-justify px-16 relative z-10 font-semibold drop-shadow-sm">
                            Behold the sacred alignment. As the celestial gears turn and the stars scribe their path across the eternal firmament, we transcribe the divine blueprint of your existence. This decree serves as a beacon, illuminated by the primordial truth of the cosmos.
                        </div>
                    </div>

                    {/* Statistical Mandala Grid */}
                    <div className="grid grid-cols-2 gap-40">
                        {[
                          { label: 'Spiritual Sattva', val: '94%', offset: 30, color: 'text-emerald-900' },
                          { label: 'Karmic Velocity', val: '82%', offset: 90, color: 'text-maroon-900' }
                        ].map((m, i) => (
                          <div key={i} className="bg-white/60 border-t-[12px] border-[#d4af37]/70 rounded-t-[10rem] p-24 shadow-[0_40px_100px_rgba(0,0,0,0.15)] flex flex-col items-center backdrop-blur-md group border-x border-b border-[#d4af37]/20">
                              <span className="text-[18px] uppercase font-black text-[#5c2a0d] tracking-[0.6em] mb-16">{m.label}</span>
                              <div className="relative w-64 h-64 flex items-center justify-center mb-12">
                                  <svg className="w-full h-full transform -rotate-90 drop-shadow-2xl">
                                      <circle cx="128" cy="128" r="114" stroke="currentColor" strokeWidth="24" fill="transparent" className="text-[#d4af37]/20" />
                                      <circle cx="128" cy="128" r="114" stroke="currentColor" strokeWidth="24" fill="transparent" strokeDasharray="716" strokeDashoffset={m.offset} className="text-[#d4af37] animate-[pulse_3s_infinite]" />
                                  </svg>
                                  <span className={`absolute text-8xl font-mono font-black ${m.color}`}>{m.val}</span>
                              </div>
                              <div className="w-40 h-[4px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-60"></div>
                          </div>
                        ))}
                    </div>
                </div>

                {/* 4. IMPERIAL FOOTER */}
                <div className="absolute bottom-48 left-0 w-full flex flex-col items-center">
                    <div className="text-9xl text-[#d4af37] mb-12 font-cinzel tracking-[3.5em] opacity-60">❂ ❂ ❂</div>
                    <div className="flex items-center gap-24 mb-12">
                        <div className="h-[3px] w-80 bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent"></div>
                        <span className="text-[26px] uppercase tracking-[1.5em] font-cinzel font-black text-[#2a1a1a] opacity-100">Master Scribe of the Stars</span>
                        <div className="h-[3px] w-80 bg-gradient-to-l from-transparent via-[#d4af37]/50 to-transparent"></div>
                    </div>
                    <div className="mt-10 flex gap-32 text-[15px] font-mono text-[#8b4513]/70 uppercase tracking-[0.6em] font-black bg-[#d4af37]/10 px-8 py-3 rounded-full border border-[#d4af37]/30">
                        <span>CERT: {Math.random().toString(36).substring(2, 16).toUpperCase()}</span>
                        <span>NODE: SANCTUM_SYNC_CORE_PRIME</span>
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
