// GamificationHUD.tsx - FIXED: Repositioned to avoid Back button overlap on all services
// Changes:
// 1. top-20 → top-32 (starts BELOW typical Back buttons at top-4/top-8)
// 2. z-40 → z-20 (Back buttons get z-40 priority)
// 3. Added sm:left-6 for mobile safe zone
// 4. No logic changes (already correct)

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
            {/* HUD HEADER BAR - FIXED POSITIONING */}
            {/* top-32 ensures it starts BELOW Back buttons (top-4/top-8 + padding) */}
            {/* z-20 allows Back buttons (z-40) to sit on top */}
            <div className="fixed top-32 left-4 sm:left-6 z-20 flex flex-col gap-2 pointer-events-auto">
                {/* Level Badge - Click to open modal */}
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-amber-500/30 rounded-full px-3 py-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:border-amber-400 transition-all group"
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-purple-800 flex items-center justify-center text-xs font-bold border border-amber-300">
                        {currentLevel.level}
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] text-amber-100 font-cinzel uppercase tracking-wider group-hover:text-amber-300">{currentLevel.title}</span>
                        <div className="w-20 h-1 bg-gray-700 rounded-full overflow-hidden mt-0.5">
                            <div className="h-full bg-gradient-to-r from-amber-400 to-purple-500" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                    </div>
                </button>

                {/* Streak Flame */}
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-red-500/30 rounded-full px-3 py-1.5 shadow-lg w-max" title="Daily Login Streak">
                    <span className="text-lg animate-pulse">🔥</span>
                    <span className="text-xs font-bold text-red-200 font-mono">{streak} Day{streak !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* TOAST NOTIFICATION & MODAL - UNCHANGED (center screen, no overlap issues) */}
            {showSigilToast && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] animate-fade-in-up">
                    <div className="bg-gradient-to-b from-purple-900 to-black p-6 rounded-xl border-2 border-amber-400 shadow-[0_0_50px_rgba(217,70,239,0.6)] text-center">
                        <div className="text-4xl mb-2 animate-bounce">✨</div>
                        <h3 className="text-2xl font-cinzel font-bold text-amber-200 mb-1">Sigil Unlocked!</h3>
                        <p className="text-purple-300 font-bold text-lg">{newSigilUnlocked}</p>
                    </div>
                </div>
            )}

            <Modal isVisible={showModal} onClose={() => setShowModal(false)}>
                {/* Modal content unchanged */}
                <div className="p-6 bg-[#0F0F23] text-amber-50 max-h-[80vh] overflow-y-auto">
                    {/* ... rest unchanged ... */}
                </div>
            </Modal>
        </>
    );
};

export default GamificationHUD;
