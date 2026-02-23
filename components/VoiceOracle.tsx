// VoiceOracle.tsx — Fixed: broken toast JSX, full clean version

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import VoiceInput from './VoiceInput';
import { createSageSession } from '../services/aiService';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../context/AuthContext';
import { ACTION_POINTS } from '../services/gamificationConfig';

const WISDOM_CATEGORIES = [
    { id: 'karma', label: 'Karmic Debt', icon: '🌀', prompt: 'Focus on my past actions and future consequences.' },
    { id: 'wealth', label: 'Artha (Wealth)', icon: '🪙', prompt: 'Focus on my material prosperity and career path.' },
    { id: 'vitality', label: 'Prana (Health)', icon: '🌿', prompt: 'Focus on my physical energy and ayurvedic balance.' },
    { id: 'love', label: 'Kama (Desire)', icon: '❤️', prompt: 'Focus on my emotional bonds and heart-center.' },
];

const DEFAULT_LOGO = 'https://lh3.googleusercontent.com/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO';

const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }

const VoiceOracle: React.FC = () => {
    const { t } = useTranslation();
    const { awardKarma, saveReading, user } = useAuth();
    const navigate = useNavigate();

    const [history, setHistory] = useState<{ sender: 'user' | 'oracle'; text: string }[]>([]);
    const [session, setSession] = useState<any>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const nodeId = useRef(Math.random().toString(36).substring(2, 12).toUpperCase());

    // ── Toast helper ──────────────────────────────────────────────────────
    const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    // ── Session init ──────────────────────────────────────────────────────
    useEffect(() => { initSession(); }, []);

    const initSession = (categoryPrompt = '') => {
        try {
            const systemInstruction = `You are Sage Vashishtha, an ancient Vedic master.
Your tone is profound, mystical, yet compassionate. Use metaphors of stars, prana, and dharma.
Keep responses concise (under 60 words). ${categoryPrompt}`;
            setSession(createSageSession(systemInstruction, 'Voice'));
        } catch (e) {
            console.error('Sage connection failed:', e);
        }
    };

    // ── Auto scroll ───────────────────────────────────────────────────────
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [history, isProcessing]);

    // ── Speech synthesis ──────────────────────────────────────────────────
    const speak = useCallback((text: string) => {
        if (!canSpeak()) return;
        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.pitch = 0.7;
            utterance.rate = 0.85;
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
        } catch {
            setIsSpeaking(false);
        }
    }, []);

    // ── iOS audio unlock ──────────────────────────────────────────────────
    const unlockAudio = () => {
        if (canSpeak()) {
            const u = new SpeechSynthesisUtterance('');
            window.speechSynthesis.speak(u);
        }
    };

    // ── Handle voice input ────────────────────────────────────────────────
    const handleInput = async (text: string) => {
        if (!text.trim()) return;
        setHistory(prev => [...prev, { sender: 'user', text }]);
        setIsProcessing(true);
        try {
            if (session) {
                const res = await session.sendMessage({ message: text });

                console.log('[VoiceOracle] Raw response:', JSON.stringify(res));

                // ── DEFENSIVE: ensure reply is always a plain string ──
                let reply = res?.text;
                if (typeof reply !== 'string') {
                    console.warn('[VoiceOracle] Unexpected response type:', typeof reply, reply);
                    reply = 'The mists of time obscure my vision. Ask again, Seeker.';
                }
                reply = reply.trim() || 'The mists of time obscure my vision. Ask again, Seeker.';

                setHistory(prev => [...prev, { sender: 'oracle', text: reply }]);
                speak(reply);
                if (user) awardKarma(ACTION_POINTS.READING_COMPLETE / 4);
            }
        } catch {
            setHistory(prev => [...prev, {
                sender: 'oracle',
                text: 'The cosmic link is unstable. Recenter your energy.',
            }]);
        } finally {
            setIsProcessing(false);
        }
    };


    // ── Category select ───────────────────────────────────────────────────
    const selectCategory = (cat: typeof WISDOM_CATEGORIES[0]) => {
        unlockAudio();
        setActiveCategory(cat.id);
        setHistory([{ sender: 'oracle', text: `Energy redirected to ${cat.label}. How may I guide your journey?` }]);
        initSession(cat.prompt);
    };

    // ── Save transcript ───────────────────────────────────────────────────
    const handleManifestDecree = () => {
        if (history.length < 2) return;
        const fullTranscript = history.map(m => `${m.sender.toUpperCase()}: ${m.text}`).join('\n\n');
        if (user) {
            saveReading({
                type: 'remedy',
                title: 'Voice Oracle Transcript',
                subtitle: activeCategory ? `${activeCategory.toUpperCase()} Focus` : 'General Guidance',
                content: fullTranscript,
                image_url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=800',
            });
        }
        showToast('Decree manifested in your History.', 'success');
        setTimeout(() => navigate('/history'), 1500);
    };

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div className="relative min-h-screen bg-skin-base pb-24 overflow-x-hidden transition-colors duration-500">

            {/* Atmospheric background */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.15)_0%,transparent_50%)]" />
                <div className="absolute top-1/4 right-0 w-72 h-72 bg-purple-900/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-1/4 left-0 w-72 h-72 bg-blue-900/10 rounded-full blur-[100px]" />
            </div>

            {/* ── FIXED: React Toasts — proper JSX structure ── */}
            <div className="fixed top-20 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className={`px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold max-w-[260px] pointer-events-auto
                            ${t.type === 'success' ? 'bg-green-600 text-white'
                                : t.type === 'error' ? 'bg-red-600 text-white'
                                    : 'bg-blue-600 text-white'}`}
                    >
                        {t.type === 'success' ? '✅ ' : t.type === 'error' ? '❌ ' : 'ℹ️ '}
                        {t.message}
                    </div>
                ))}
            </div>

            <div className="max-w-4xl mx-auto px-4 relative z-10 pt-10">

                {/* Back button */}
                <Link
                    to="/home"
                    className="inline-flex items-center text-skin-text opacity-40 hover:opacity-100 hover:text-skin-accent transition-all mb-6 group relative z-[70]"
                >
                    <span className="text-xl mr-2 group-hover:-translate-x-2 transition-transform">←</span>
                    <span className="font-cinzel font-black uppercase tracking-widest text-[10px]">Exit Sanctuary</span>
                </Link>

                {/* Header */}
                <header className="flex flex-col items-center text-center mb-6 md:mb-10">

                    {/* Seal */}
                    <div className="relative w-32 h-32 sm:w-48 sm:h-48 md:w-56 md:h-56 mb-6 flex items-center justify-center flex-shrink-0">
                        <div className="absolute inset-0 border-[2px] border-dashed border-skin-accent/20 rounded-full animate-[spin_120s_linear_infinite]" />
                        <div className="absolute inset-3 border border-skin-accent/10 rounded-full animate-[spin_80s_linear_infinite_reverse]" />
                        <div className={`absolute inset-0 rounded-full blur-2xl transition-all duration-1000
                            ${isSpeaking ? 'bg-skin-accent/25 scale-105 opacity-80' : 'bg-blue-500/10 opacity-40'}`}
                        />
                        <div className={`w-24 h-24 sm:w-36 sm:h-36 md:w-40 md:h-40 bg-black rounded-full border-[4px] border-skin-accent
                            shadow-[0_0_40px_rgba(245,158,11,0.4)] flex items-center justify-center overflow-hidden
                            transition-transform duration-700 ${isSpeaking ? 'scale-105' : 'hover:scale-105'}`}
                        >
                            <div className="p-4 relative w-full h-full flex items-center justify-center">
                                {isSpeaking && (
                                    <div className="absolute inset-0 bg-skin-accent/10 animate-ping rounded-full" />
                                )}
                                <img
                                    src={DEFAULT_LOGO}
                                    alt="Sage Seal"
                                    className={`w-full h-full object-contain brightness-125 ${isSpeaking ? 'animate-pulse' : ''}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl sm:text-5xl md:text-6xl font-cinzel font-black text-skin-text uppercase tracking-tighter mb-3 drop-shadow-2xl">
                        Voice <span className="gold-gradient-text">Oracle</span>
                    </h1>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-px w-10 bg-gradient-to-r from-transparent to-skin-accent/40" />
                        <p className="text-skin-text opacity-60 font-lora italic text-sm uppercase tracking-[0.15em]">
                            The Sage is Listening
                        </p>
                        <div className="h-px w-10 bg-gradient-to-l from-transparent to-skin-accent/40" />
                    </div>

                    {/* Category buttons */}
                    <div className="flex flex-wrap justify-center gap-2 mb-6 max-w-lg mx-auto">
                        {WISDOM_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => selectCategory(cat)}
                                className={`px-3 sm:px-5 py-2 rounded-full border transition-all flex items-center gap-2
                                    active:scale-95 text-[10px] font-black uppercase tracking-wider min-h-[36px]
                                    ${activeCategory === cat.id
                                        ? 'bg-skin-accent border-skin-accent text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                                        : 'bg-skin-surface/40 border-skin-border/20 text-skin-text opacity-60 hover:opacity-100 hover:border-skin-accent/50'
                                    }`}
                            >
                                <span className="text-base">{cat.icon}</span>
                                <span className="hidden sm:inline">{cat.label}</span>
                                <span className="sm:hidden">{cat.label.split(' ')[0]}</span>
                            </button>
                        ))}
                    </div>
                </header>

                {/* Chat Container */}
                <div
                    className="sacred-boundary rounded-2xl md:rounded-[3rem] bg-skin-surface/40 backdrop-blur-2xl shadow-2xl relative overflow-hidden flex flex-col"
                    style={{ minHeight: 'clamp(400px, 55vh, 600px)' }}
                >
                    {/* ॐ decoration */}
                    <div className="absolute top-3 right-4 pointer-events-none opacity-10 select-none">
                        <span className="text-4xl font-cinzel">ॐ</span>
                    </div>

                    {/* Messages */}
                    <div
                        ref={scrollRef}
                        className="flex-grow overflow-y-auto p-4 sm:p-6 md:p-10 space-y-5 custom-scrollbar"
                    >
                        {/* Empty state */}
                        {history.length === 0 && !isProcessing && (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-20 py-12">
                                <div className="text-6xl mb-6 animate-float">🐚</div>
                                <h3 className="text-xl font-cinzel font-bold text-skin-text uppercase tracking-widest">
                                    Invoke the Oracle
                                </h3>
                                <p className="max-w-xs mt-3 text-sm font-lora italic">
                                    "Speak your query into the cosmic void."
                                </p>
                            </div>
                        )}

                        {/* Chat history */}
                        {history.map((msg, i) => {
                            const isUser = msg.sender === 'user';
                            return (
                                <div
                                    key={i}
                                    className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                                >
                                    <div className={`relative max-w-[88%] sm:max-w-[75%] md:max-w-[70%] p-4 sm:p-5
                                        rounded-2xl shadow-xl border
                                        ${isUser
                                            ? 'bg-gradient-to-br from-amber-600 to-amber-900 border-skin-accent/50 text-white rounded-tr-none'
                                            : 'bg-[#fffcf0] text-[#2d0a18] border-amber-900/10 rounded-tl-none font-lora italic'
                                        }`}
                                    >
                                        {!isUser && (
                                            <div className="absolute -top-3 -left-3 w-7 h-7 bg-black rounded-full border border-skin-accent/30 flex items-center justify-center text-[10px]">
                                                🕉️
                                            </div>
                                        )}
                                        <p className={`text-sm sm:text-base leading-relaxed ${isUser ? 'font-bold' : 'font-medium'}`}>
                                            {msg.text}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Processing indicator */}
                        {isProcessing && (
                            <div className="flex justify-start">
                                <div className="bg-skin-surface/20 border border-skin-border/10 p-4 rounded-2xl rounded-tl-none flex gap-3 items-center">
                                    <div className="flex gap-1.5">
                                        <div className="w-2 h-2 bg-skin-accent rounded-full animate-bounce" />
                                        <div className="w-2 h-2 bg-skin-accent rounded-full animate-bounce [animation-delay:0.2s]" />
                                        <div className="w-2 h-2 bg-skin-accent rounded-full animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                    <span className="text-[10px] uppercase font-black tracking-widest text-skin-accent opacity-60">
                                        Consulting Akasha
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Interaction Dock */}
                    <div className="p-4 sm:p-6 border-t border-skin-border/10 bg-skin-surface/60 backdrop-blur-md flex-shrink-0">
                        <div className="flex flex-col items-center gap-4">

                            {/* Mic button container */}
                            <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24">
                                <div className={`absolute inset-0 rounded-full blur-xl transition-all duration-500
                                    ${isSpeaking ? 'bg-red-500/30' : 'bg-skin-accent/20'}`}
                                />
                                <div className="relative z-10 w-full h-full flex items-center justify-center">
                                    <VoiceInput onResult={handleInput} />
                                </div>
                            </div>

                            <p className="text-[9px] text-skin-accent opacity-40 font-black uppercase tracking-[0.4em] animate-pulse">
                                {isSpeaking ? 'The Sage is Speaking' : 'Touch to Transmit'}
                            </p>

                            {/* Save transcript button */}
                            {history.length >= 2 && (
                                <div className="pt-3 border-t border-skin-border/10 w-full flex justify-center">
                                    <button
                                        onClick={handleManifestDecree}
                                        className="px-6 py-2.5 bg-skin-surface border border-skin-border text-skin-accent text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-skin-accent hover:text-black transition-all active:scale-95 min-h-[40px]"
                                    >
                                        📜 Manifest Imperial Decree
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-[8px] font-mono text-gray-600 uppercase tracking-[0.5em]">
                        End-to-End Spiritual Encryption • Node: {nodeId.current}
                    </p>
                </div>

            </div>
        </div>
    );
};

export default VoiceOracle;
