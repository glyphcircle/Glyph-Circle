// GamificationHUD.tsx
// Changes applied:
// 1. ✅ Reduced opacity to 40% — fades to full on hover
// 2. ✅ top-32 / z-20 preserved (below Back buttons)

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
    const progressPercent = Math.min(
        100,
        Math.max(0, ((karma - currentLevel.minKarma) / (nextLevel.minKarma - currentLevel.minKarma)) * 100)
    );

    const handleViewGallery = () => {
        setShowModal(false);
        navigate('/achievements');
    };

    return (
        <>
            {/* ✅ HUD — opacity-40 at rest, full opacity on hover, smooth transition */}
            <div className="fixed top-32 left-4 sm:left-6 z-20 flex flex-col gap-2 pointer-events-auto opacity-40 hover:opacity-100 transition-opacity duration-300">

                {/* Level Badge */}
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-amber-500/30 rounded-full px-3 py-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:border-amber-400 transition-all group"
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-purple-800 flex items-center justify-center text-xs font-bold border border-amber-300">
                        {currentLevel.level}
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] text-amber-100 font-cinzel uppercase tracking-wider group-hover:text-amber-300">
                            {currentLevel.title}
                        </span>
                        <div className="w-20 h-1 bg-gray-700 rounded-full overflow-hidden mt-0.5">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 to-purple-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                </button>

                {/* Streak Flame */}
                <div
                    className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-red-500/30 rounded-full px-3 py-1.5 shadow-lg w-max"
                    title="Daily Login Streak"
                >
                    <span className="text-lg animate-pulse">🔥</span>
                    <span className="text-xs font-bold text-red-200 font-mono">
                        {streak} Day{streak !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Sigil Unlock Toast — center screen */}
            {showSigilToast && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] animate-fade-in-up">
                    <div className="bg-gradient-to-b from-purple-900 to-black p-6 rounded-xl border-2 border-amber-400 shadow-[0_0_50px_rgba(217,70,239,0.6)] text-center">
                        <div className="text-4xl mb-2 animate-bounce">✨</div>
                        <h3 className="text-2xl font-cinzel font-bold text-amber-200 mb-1">Sigil Unlocked!</h3>
                        <p className="text-purple-300 font-bold text-lg">{newSigilUnlocked}</p>
                    </div>
                </div>
            )}

            {/* Level Detail Modal */}
            <Modal isVisible={showModal} onClose={() => setShowModal(false)}>
                <div className="p-6 bg-[#0F0F23] text-amber-50 max-h-[80vh] overflow-y-auto">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-purple-800 flex items-center justify-center text-2xl font-bold border-2 border-amber-300 mx-auto mb-3">
                            {currentLevel.level}
                        </div>
                        <h2 className="text-2xl font-cinzel font-bold text-amber-200">{currentLevel.title}</h2>
                        <p className="text-purple-300 text-sm mt-1">{karma} Karma Points</p>
                    </div>

                    {/* Progress to next level */}
                    <div className="mb-6">
                        <div className="flex justify-between text-xs text-amber-300/70 mb-1">
                            <span>{currentLevel.minKarma} XP</span>
                            <span>{nextLevel.minKarma} XP</span>
                        </div>
                        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 to-purple-500 transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <p className="text-center text-xs text-amber-300/60 mt-1">
                            {nextLevel.minKarma - karma} XP until <span className="text-amber-300">{nextLevel.title}</span>
                        </p>
                    </div>

                    {/* Streak */}
                    <div className="flex items-center justify-center gap-3 bg-black/30 rounded-xl p-4 mb-6">
                        <span className="text-3xl">🔥</span>
                        <div>
                            <p className="text-lg font-bold text-red-300">{streak} Day Streak</p>
                            <p className="text-xs text-gray-400">Keep logging in daily!</p>
                        </div>
                    </div>

                    {/* Unlocked Sigils */}
                    {unlockedSigils && unlockedSigils.length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-sm font-cinzel text-amber-300 mb-3 text-center uppercase tracking-widest">
                                Sigils Earned ({unlockedSigils.length})
                            </h3>
                            <div className="grid grid-cols-4 gap-2">
                                {unlockedSigils.slice(0, 8).map((sigilId: string) => {
                                    const sigil = SIGILS.find(s => s.id === sigilId);
                                    return sigil ? (
                                        <div key={sigil.id} className="flex flex-col items-center gap-1 bg-black/30 rounded-lg p-2" title={sigil.name}>
                                            <span className="text-2xl">{sigil.icon}</span>
                                            <span className="text-[9px] text-amber-300/60 text-center leading-tight">{sigil.name}</span>
                                        </div>
                                    ) : null;
                                })}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleViewGallery}
                        className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-purple-700 rounded-xl font-cinzel text-sm font-bold hover:from-amber-500 hover:to-purple-600 transition-all"
                    >
                        View Full Sigil Gallery ✨
                    </button>
                </div>
            </Modal>
        </>
    );
};

export default GamificationHUD;
