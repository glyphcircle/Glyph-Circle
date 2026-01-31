import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLevel, getNextLevel, SIGILS } from '../services/gamificationConfig';
import Card from './shared/Card';
import Modal from './shared/Modal';
import { useNavigate } from 'react-router-dom';

const GamificationHUD: React.FC = () => {
  const { user, newSigilUnlocked, clearSigilNotification } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showSigilToast, setShowSigilToast] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
      if (newSigilUnlocked) {
          setShowSigilToast(true);
          const timer = setTimeout(() => {
              setShowSigilToast(false);
              clearSigilNotification();
          }, 4000);
          return () => clearTimeout(timer);
      }
  }, [newSigilUnlocked, clearSigilNotification]);

  if (!user || !user.gamification) return null;

  const { karma, streak, unlockedSigils } = user.gamification;
  const currentLevel = getLevel(karma);
  const nextLevel = getNextLevel(karma);
  const progressPercent = Math.min(100, Math.max(0, ((karma - currentLevel.minKarma) / (nextLevel.minKarma - currentLevel.minKarma)) * 100));

  const handleViewGallery = () => {
    setShowModal(false);
    navigate('/achievements');
  };

  return (
    <>
      {/* HUD HEADER BAR (Top Left Position as per Screenshot) */}
      <div className="fixed top-20 left-4 z-40 md:top-24 flex flex-col gap-2 pointer-events-auto">
          {/* Level Badge */}
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-3 bg-black/80 backdrop-blur-xl border border-amber-500/40 rounded-full px-4 py-2 shadow-2xl hover:border-amber-400 transition-all group"
          >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 via-amber-600 to-amber-900 flex items-center justify-center text-[10px] font-black border-2 border-white/20 shadow-lg text-black">
                  {currentLevel.level}
              </div>
              <div className="flex flex-col items-start pr-2">
                  <span className="text-[10px] text-amber-100 font-cinzel font-black uppercase tracking-widest group-hover:text-amber-400 transition-colors">{currentLevel.title}</span>
                  <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden mt-1 border border-white/5">
                      <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: `${progressPercent}%` }}></div>
                  </div>
              </div>
          </button>

          {/* Streak Indicator */}
          <div className="flex items-center gap-2 bg-black/80 backdrop-blur-xl border border-red-500/40 rounded-full px-4 py-1.5 shadow-2xl w-max ml-1">
              <span className="text-sm animate-pulse">🔥</span>
              <span className="text-[10px] font-black text-red-100 font-mono tracking-widest uppercase">{streak} Days</span>
          </div>
      </div>

      {/* TOAST NOTIFICATION */}
      {showSigilToast && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] animate-fade-in-up">
              <div className="bg-gradient-to-b from-amber-900 to-black p-8 rounded-3xl border-2 border-amber-400 shadow-[0_0_80px_rgba(245,158,11,0.4)] text-center">
                  <div className="text-5xl mb-4 animate-bounce">✨</div>
                  <h3 className="text-2xl font-cinzel font-black text-white mb-2 uppercase tracking-widest">Sigil Unlocked!</h3>
                  <p className="text-amber-400 font-bold text-xl">{newSigilUnlocked}</p>
              </div>
          </div>
      )}

      {/* GRIMOIRE MODAL */}
      <Modal isVisible={showModal} onClose={() => setShowModal(false)}>
          <div className="p-8 bg-[#0F0F23] text-amber-50 max-h-[85vh] overflow-y-auto rounded-3xl border border-amber-500/20 shadow-2xl">
              <div className="text-center mb-8">
                  <h2 className="text-3xl font-cinzel font-black text-amber-300 tracking-widest uppercase">Your Path</h2>
                  <p className="text-amber-200/40 text-[10px] uppercase tracking-[0.4em] mt-2 font-bold">Spiritual Progression Records</p>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-3 gap-4 mb-10">
                  <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center shadow-inner">
                      <div className="text-2xl font-black text-amber-400">{karma}</div>
                      <div className="text-[8px] uppercase tracking-widest text-gray-500 font-bold">Karma</div>
                  </div>
                  <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center shadow-inner">
                      <div className="text-2xl font-black text-red-500">{streak}</div>
                      <div className="text-[8px] uppercase tracking-widest text-gray-500 font-bold">Streak</div>
                  </div>
                  <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center shadow-inner">
                      <div className="text-2xl font-black text-blue-500">{user.gamification.readingsCount}</div>
                      <div className="text-[8px] uppercase tracking-widest text-gray-500 font-bold">Readings</div>
                  </div>
              </div>

              <div className="mb-10">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/60 mb-3">
                      <span>{currentLevel.title}</span>
                      <span className="text-amber-400">{progressPercent.toFixed(0)}% to {nextLevel.title}</span>
                  </div>
                  <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/5 p-[1px]">
                      <div className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 transition-all duration-1000 shadow-[0_0_15px_rgba(245,158,11,0.3)]" style={{ width: `${progressPercent}%` }}></div>
                  </div>
              </div>

              <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-2">
                <h3 className="text-xs font-black text-amber-400 uppercase tracking-[0.3em]">
                    Sigils ({unlockedSigils.length}/{SIGILS.length})
                </h3>
                <button 
                  onClick={handleViewGallery}
                  className="text-[9px] text-amber-200/50 hover:text-white uppercase font-black tracking-widest transition-colors"
                >
                  Full Archive →
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                  {SIGILS.slice(0, 6).map(sigil => {
                      const isUnlocked = unlockedSigils.includes(sigil.id);
                      return (
                          <div 
                            key={sigil.id} 
                            className={`flex flex-col items-center p-4 rounded-2xl border transition-all ${isUnlocked ? 'bg-amber-900/10 border-amber-500/30' : 'bg-black/40 border-white/5 opacity-30 grayscale'}`}
                          >
                              <div className={`text-3xl mb-3 ${isUnlocked ? 'animate-float' : ''}`}>{sigil.icon}</div>
                              <div className="text-[9px] font-black text-center text-amber-100 uppercase tracking-tighter">{sigil.name}</div>
                          </div>
                      )
                  })}
              </div>

              <button 
                onClick={() => setShowModal(false)}
                className="w-full mt-10 py-4 bg-gray-900 hover:bg-gray-800 text-amber-500/60 hover:text-white rounded-xl text-[10px] uppercase font-black tracking-[0.4em] transition-all border border-white/5"
              >
                  Close Grimoire
              </button>
          </div>
      </Modal>
    </>
  );
};

export default GamificationHUD;