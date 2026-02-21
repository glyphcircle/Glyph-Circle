import React, { useState, useEffect, useRef } from 'react';
import Button from './shared/Button';
import ProgressBar from './shared/ProgressBar';
import { useTranslation } from '../hooks/useTranslation';
import { analyzeDream, DreamAnalysisResponse } from '../services/aiService';
import { usePayment } from '../context/PaymentContext';
import FullReport from './FullReport';
import VoiceInput from './VoiceInput';
import { useDb } from '../hooks/useDb';
import { cloudManager } from '../services/cloudManager';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import SmartBackButton from './shared/SmartBackButton';

const generateDreamKey = (text: string): string => {
    return `dream_${text.toLowerCase().trim().split('').reduce((acc, char) => {
        return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0)}`;
};

const DreamAnalysis: React.FC = () => {
    const [dreamText, setDreamText] = useState('');
    const [result, setResult] = useState<DreamAnalysisResponse | null>(null);
    const [chartData, setChartData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [isPaid, setIsPaid] = useState(false);
    const [servicePrice, setServicePrice] = useState(49);
    const [readingId, setReadingId] = useState<string | null>(null);

    const { t, language } = useTranslation();
    const { openPayment } = usePayment();
    const { db } = useDb();
    const { user } = useAuth();
    const { theme } = useTheme();
    const isLight = theme.mode === 'light';
    const reportRef = useRef<HTMLDivElement>(null);
    const readingIdRef = useRef<string | null>(null);

    const reportImage = db.image_assets?.find((a: any) => a.id === 'report_bg_dream')?.path ||
        "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?q=80&w=800";

    useEffect(() => { fetchServicePrice(); }, []);

    const fetchServicePrice = async () => {
        try {
            const { data, error } = await supabase
                .from('services')
                .select('price')
                .eq('name', 'Dream Analysis')
                .eq('status', 'active')
                .single();
            if (!error && data) setServicePrice(data.price);
        } catch (err) {
            console.error('Error fetching price:', err);
        }
    };

    const saveToDatabase = async (dreamData: DreamAnalysisResponse) => {
        try {
            if (!supabase) return null;
            const dreamKey = generateDreamKey(dreamText);
            const { data: reading, error: readingError } = await supabase
                .from('readings')
                .insert([{
                    user_id: user?.id || null,
                    type: 'dream-analysis',
                    title: 'Dream Interpretation',
                    subtitle: `Symbols: ${dreamData.symbols.slice(0, 3).join(', ')}`,
                    content: dreamData.meaning,
                    is_paid: false,
                    meta_data: {
                        dream_key: dreamKey,
                        symbols: dreamData.symbols,
                        lucky_numbers: dreamData.luckyNumbers
                    }
                }])
                .select()
                .single();

            if (readingError) { console.error('❌ Reading save error:', readingError); return null; }

            await supabase.from('dream_analysis_cache').upsert([{
                dream_key: dreamKey,
                dream_text: dreamText,
                symbols: dreamData.symbols,
                emotions: dreamData.emotions || [],
                archetypes: dreamData.archetypes || [],
                lucky_numbers: dreamData.luckyNumbers,
                interpretation: dreamData.meaning,
                guidance: dreamData.guidance || '',
                reading_id: reading.id,
                user_id: user?.id || null,
                is_paid: false,
                language: language
            }], { onConflict: 'dream_key' });

            setReadingId(reading.id);
            readingIdRef.current = reading.id;
            console.log('✅ Dream reading saved:', reading.id);
            return reading.id;
        } catch (error) {
            console.error('❌ Database save error:', error);
            return null;
        }
    };

    const savePaymentRecord = async (readId: string) => {
        try {
            const { data: txn, error: txnError } = await supabase
                .from('transactions')
                .insert([{
                    user_id: user?.id || null,
                    service_type: 'dream-analysis',
                    service_title: 'Dream Interpretation',
                    amount: servicePrice,
                    currency: 'INR',
                    status: 'success',
                    payment_method: 'upi',
                    payment_provider: 'manual',
                    reading_id: readId,
                    order_id: `DREAM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    metadata: { dream_preview: dreamText.substring(0, 100), symbols: result?.symbols || [] }
                }])
                .select().single();

            if (!txnError) {
                await supabase.from('readings').update({ is_paid: true }).eq('id', readId);
                console.log('✅ Transaction saved:', txn);
            }
        } catch (error) {
            console.error('❌ Payment save error:', error);
        }
    };

    useEffect(() => {
        if (isPaid && reportRef.current) {
            setTimeout(() => {
                reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }
    }, [isPaid]);

    const handleAnalyze = async () => {
        if (!dreamText.trim() || dreamText.length < 5) {
            setError('Please describe your dream in more detail.');
            return;
        }

        setIsLoading(true);
        setProgress(0);
        setError('');
        setResult(null);
        setChartData(null);
        setIsPaid(false);
        setReadingId(null);
        readingIdRef.current = null;

        const timer = setInterval(() => setProgress(p => (p >= 90 ? p : p + 5)), 200);

        try {
            const response = await analyzeDream(dreamText, language);
            clearInterval(timer);
            setProgress(100);

            // ✅ Validate response before setting
            if (!response || !response.meaning) {
                throw new Error('Invalid response from dream analyzer');
            }

            setResult(response);
            setChartData({
                luckyNumbers: response.luckyNumbers,
                vedicMetrics: [
                    { label: 'Sattva (Purity)', sub: 'Clarity', value: Math.floor(Math.random() * 30 + 60) },
                    { label: 'Rajas (Passion)', sub: 'Action', value: Math.floor(Math.random() * 40 + 30) },
                    { label: 'Tamas (Inertia)', sub: 'Subconscious', value: Math.floor(Math.random() * 40 + 20) },
                ],
                elementalBalance: [
                    { element: 'Ether', sanskrit: 'Akasha', score: Math.floor(Math.random() * 50 + 50) },
                    { element: 'Water', sanskrit: 'Jala', score: Math.floor(Math.random() * 50 + 30) },
                    { element: 'Fire', sanskrit: 'Agni', score: Math.floor(Math.random() * 50 + 20) },
                    { element: 'Air', sanskrit: 'Vayu', score: Math.floor(Math.random() * 50 + 40) },
                ]
            });

            await saveToDatabase(response);

        } catch (err: any) {
            clearInterval(timer);
            setProgress(0); // ✅ Reset so loading overlay hides
            console.error('Dream analysis error:', err);
            setError('Failed to interpret dream. The mists are too thick — please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReadMore = () => {
        console.log('🌙 [DreamAnalysis] Buy clicked, price:', servicePrice);
        openPayment(
            async (paymentDetails) => {
                console.log('✅ Dream payment success:', paymentDetails);
                // ✅ Use ref — always has latest value
                let currentReadingId = readingIdRef.current;
                if (!currentReadingId) {
                    currentReadingId = await saveToDatabase(result!);
                    if (currentReadingId) readingIdRef.current = currentReadingId;
                }
                if (currentReadingId) {
                    await savePaymentRecord(currentReadingId);
                }
                // ✅ Always unlock even if DB fails
                setIsPaid(true);
                console.log('✅ Payment completed');
            },
            'dream-analysis',
            servicePrice
        );
    };

    return (
        <div className={`min-h-screen py-6 px-4 transition-colors duration-500 ${isLight
                ? 'bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50'
                : 'bg-gradient-to-br from-gray-950 via-indigo-950 to-black'
            }`}>
            {/* ✅ SmartBackButton — theme-aware, correct z-index */}
            <SmartBackButton className="mb-4" />

            <div className="max-w-4xl mx-auto">
                {/* MAIN INPUT CONTAINER */}
                <div className={`p-5 md:p-8 rounded-xl shadow-2xl border backdrop-blur-md mb-6 ${isLight
                        ? 'bg-white/80 border-indigo-200'
                        : 'bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-black/60 border-indigo-500/30'
                    }`}>
                    <div className="text-center mb-6 md:mb-8">
                        <h2 className={`text-2xl md:text-4xl font-cinzel font-bold mb-2 drop-shadow-lg ${isLight ? 'text-indigo-800' : 'text-indigo-300'
                            }`}>
                            Dream Interpreter
                        </h2>
                        <p className={`font-lora italic text-sm md:text-base ${isLight ? 'text-indigo-600' : 'text-indigo-100/70'
                            }`}>
                            Unlock the messages of your subconscious mind.
                        </p>
                    </div>

                    {/* INPUT + RESULT — stacked on mobile, side-by-side on md+ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 items-start">

                        {/* LEFT: Input */}
                        <div className="space-y-4">
                            <div className="relative">
                                <textarea
                                    value={dreamText}
                                    onChange={(e) => setDreamText(e.target.value)}
                                    placeholder="I was flying over a golden ocean..."
                                    className={`w-full h-48 md:h-64 p-4 rounded-lg focus:outline-none focus:ring-2 
                                        resize-none font-lora text-base leading-relaxed shadow-inner ${isLight
                                            ? 'bg-indigo-50 border-2 border-indigo-200 focus:ring-indigo-400 text-gray-800 placeholder-indigo-300'
                                            : 'bg-black/40 border border-indigo-500/30 focus:ring-indigo-400 text-indigo-100 placeholder-indigo-400/30'
                                        }`}
                                />
                                <div className="absolute bottom-4 right-4">
                                    <VoiceInput onResult={(text) => setDreamText(prev => prev + ' ' + text)} />
                                </div>
                            </div>
                            <Button
                                onClick={handleAnalyze}
                                disabled={isLoading}
                                className={`w-full py-3 md:py-4 font-cinzel font-bold tracking-widest shadow-lg 
                                    text-sm md:text-base ${isLight
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white'
                                        : 'bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600'
                                    }`}
                            >
                                {isLoading ? 'Consulting the Oracle...' : 'Interpret Dream'}
                            </Button>
                            {error && (
                                <p className="text-red-400 text-center text-sm bg-red-900/20 p-3 rounded-lg border border-red-500/20">
                                    {error}
                                </p>
                            )}
                        </div>

                        {/* RIGHT: Result Preview */}
                        <div className={`min-h-[16rem] md:min-h-[20rem] rounded-lg border p-4 md:p-6 
                            relative overflow-hidden flex flex-col ${isLight
                                ? 'bg-indigo-50/50 border-indigo-200'
                                : 'bg-black/20 border-indigo-500/20'
                            }`}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl -z-10" />

                            {/* Loading overlay */}
                            {isLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20 rounded-lg">
                                    <ProgressBar progress={progress} message="Decoding Symbols..." />
                                </div>
                            )}

                            {/* Empty state */}
                            {!result && !isLoading && (
                                <div className="flex-grow flex flex-col items-center justify-center text-center">
                                    <span className="text-5xl md:text-7xl mb-4 animate-float opacity-50">🌙</span>
                                    <p className={`font-lora italic text-sm md:text-base ${isLight ? 'text-indigo-400' : 'text-indigo-300/40'
                                        }`}>
                                        Describe your dream to reveal its hidden meaning.
                                    </p>
                                </div>
                            )}

                            {/* Result */}
                            {result && !isLoading && (
                                <div className="space-y-4 md:space-y-6 animate-fade-in-up">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                        {/* Symbols */}
                                        <div className={`p-3 rounded-xl border shadow-lg ${isLight
                                                ? 'bg-indigo-100 border-indigo-300'
                                                : 'bg-indigo-900/30 border-indigo-500/30'
                                            }`}>
                                            <h4 className={`text-[10px] uppercase tracking-widest mb-2 font-bold ${isLight ? 'text-indigo-700' : 'text-indigo-300'
                                                }`}>
                                                Key Symbols
                                            </h4>
                                            <div className="flex flex-wrap gap-1.5">
                                                {result.symbols.map((s, i) => (
                                                    <span key={i} className={`text-[10px] px-2 py-1 rounded-full border ${isLight
                                                            ? 'bg-white text-indigo-700 border-indigo-200'
                                                            : 'bg-black/40 text-indigo-200 border-indigo-500/20'
                                                        }`}>{s}</span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Lucky Numbers */}
                                        <div className={`p-3 rounded-xl border text-center shadow-lg ${isLight
                                                ? 'bg-amber-50 border-amber-300'
                                                : 'bg-amber-900/20 border-amber-500/30'
                                            }`}>
                                            <h4 className={`text-[10px] uppercase tracking-widest mb-2 font-bold ${isLight ? 'text-amber-700' : 'text-amber-300'
                                                }`}>
                                                Luck Frequencies
                                            </h4>
                                            <div className="flex justify-center gap-1.5 flex-wrap">
                                                {result.luckyNumbers.map((n, i) => (
                                                    <div key={i} className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center bg-gradient-to-br from-amber-600 to-amber-900 rounded-full text-white font-cinzel font-black text-xs border border-amber-400 shadow-md">
                                                        {n}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Preview / Buy button */}
                                    {!isPaid ? (
                                        <div className="relative">
                                            <div className={`p-4 rounded-xl border font-lora italic leading-relaxed 
                                                text-sm relative overflow-hidden min-h-[120px] ${isLight
                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                                                    : 'bg-black/40 border-indigo-500/20 text-indigo-100'
                                                }`}>
                                                <span className="text-3xl text-indigo-500/30 absolute top-0 left-2">"</span>
                                                {result.meaning.substring(0, 160)}...
                                                <div className={`absolute bottom-0 left-0 w-full h-14 bg-gradient-to-t ${isLight ? 'from-indigo-50' : 'from-gray-900/90'
                                                    } to-transparent`} />
                                            </div>
                                            <Button
                                                onClick={handleReadMore}
                                                className="w-full mt-3 py-3 md:py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border-purple-500 shadow-xl font-cinzel font-bold tracking-widest text-sm md:text-base text-white transition-all"
                                            >
                                                🌙 Buy Dream Report - ₹{servicePrice}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className={`text-center p-4 rounded-xl border ${isLight
                                                ? 'bg-green-100 border-green-300'
                                                : 'bg-green-900/30 border-green-500/30'
                                            }`}>
                                            <p className={`font-bold ${isLight ? 'text-green-700' : 'text-green-400'}`}>
                                                ✅ Full Report Unlocked!
                                            </p>
                                            <p className={`text-xs mt-1 ${isLight ? 'text-green-600' : 'text-green-300'}`}>
                                                Scroll down to read
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* FULL REPORT SECTION */}
                {result && isPaid && (
                    <div ref={reportRef} className="animate-fade-in-up scroll-mt-24">
                        <div className={`p-5 md:p-8 rounded-xl shadow-2xl border backdrop-blur-md ${isLight
                                ? 'bg-white/80 border-indigo-200'
                                : 'bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-black/60 border-indigo-500/30'
                            }`}>
                            {/* Report Header */}
                            <div className="text-center mb-6 md:mb-8">
                                <div className="w-20 h-20 md:w-32 md:h-32 mx-auto mb-4 md:mb-6 rounded-full border-4 border-indigo-500 shadow-2xl overflow-hidden">
                                    <img
                                        src={cloudManager.resolveImage(reportImage)}
                                        alt="Dream Analysis"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <h1 className={`text-2xl md:text-5xl font-cinzel font-black mb-2 uppercase tracking-wider ${isLight ? 'text-indigo-900' : 'text-white'
                                    }`}>
                                    Dream Interpretation
                                </h1>
                                <p className={`text-base md:text-xl font-lora italic ${isLight ? 'text-indigo-600' : 'text-indigo-300'
                                    }`}>
                                    Subconscious Wisdom
                                </p>
                            </div>

                            {/* Lucky Numbers */}
                            {chartData?.luckyNumbers && (
                                <div className={`mb-6 md:mb-8 p-4 md:p-6 rounded-2xl border text-center ${isLight
                                        ? 'bg-amber-50 border-amber-300'
                                        : 'bg-amber-900/30 border-amber-500/30'
                                    }`}>
                                    <h3 className={`text-xs md:text-sm font-bold uppercase tracking-widest mb-3 md:mb-4 ${isLight ? 'text-amber-700' : 'text-amber-300'
                                        }`}>
                                        Your Lucky Numbers
                                    </h3>
                                    <div className="flex justify-center gap-3 flex-wrap">
                                        {chartData.luckyNumbers.map((n: number, i: number) => (
                                            <div key={i} className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center bg-gradient-to-br from-amber-600 to-amber-900 rounded-full text-white font-cinzel font-black text-base md:text-2xl border-2 border-amber-400 shadow-lg">
                                                {n}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Symbols */}
                            {result.symbols?.length > 0 && (
                                <div className={`mb-6 md:mb-8 p-4 md:p-6 rounded-2xl border ${isLight
                                        ? 'bg-indigo-50 border-indigo-200'
                                        : 'bg-indigo-900/30 border-indigo-500/30'
                                    }`}>
                                    <h3 className={`text-xs md:text-sm font-bold uppercase tracking-widest mb-3 md:mb-4 text-center ${isLight ? 'text-indigo-700' : 'text-indigo-300'
                                        }`}>
                                        Key Symbols in Your Dream
                                    </h3>
                                    <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                                        {result.symbols.map((s, i) => (
                                            <span key={i} className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold border ${isLight
                                                    ? 'bg-white text-indigo-700 border-indigo-200'
                                                    : 'bg-black/40 text-indigo-200 border-indigo-500/20'
                                                }`}>{s}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Emotions + Archetypes */}
                            {((result.emotions?.length > 0) || (result.archetypes?.length > 0)) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
                                    {result.emotions?.length > 0 && (
                                        <div className={`p-4 md:p-6 rounded-2xl border ${isLight ? 'bg-purple-50 border-purple-200' : 'bg-purple-900/30 border-purple-500/30'
                                            }`}>
                                            <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isLight ? 'text-purple-700' : 'text-purple-300'
                                                }`}>Emotional Themes</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {result.emotions.map((e, i) => (
                                                    <span key={i} className={`px-2.5 py-1 rounded-full text-xs border ${isLight
                                                            ? 'bg-white text-purple-700 border-purple-200'
                                                            : 'bg-black/40 text-purple-200 border-purple-500/20'
                                                        }`}>{e}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {result.archetypes?.length > 0 && (
                                        <div className={`p-4 md:p-6 rounded-2xl border ${isLight ? 'bg-pink-50 border-pink-200' : 'bg-pink-900/30 border-pink-500/30'
                                            }`}>
                                            <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isLight ? 'text-pink-700' : 'text-pink-300'
                                                }`}>Archetypal Energies</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {result.archetypes.map((a, i) => (
                                                    <span key={i} className={`px-2.5 py-1 rounded-full text-xs border ${isLight
                                                            ? 'bg-white text-pink-700 border-pink-200'
                                                            : 'bg-black/40 text-pink-200 border-pink-500/20'
                                                        }`}>{a}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Full Report */}
                            <div className={`rounded-2xl p-5 md:p-8 border ${isLight ? 'bg-indigo-50 border-indigo-200' : 'bg-black/20 border-indigo-500/20'
                                }`}>
                                <FullReport
                                    reading={result.meaning}
                                    category="dream-analysis"
                                    title="Dream Interpretation"
                                    subtitle="Subconscious Wisdom"
                                    imageUrl={cloudManager.resolveImage(reportImage)}
                                    chartData={chartData}
                                />
                            </div>

                            {/* Guidance */}
                            {result.guidance && (
                                <div className={`mt-6 md:mt-8 p-5 md:p-8 rounded-2xl border-2 ${isLight
                                        ? 'bg-purple-50 border-purple-300'
                                        : 'bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border-purple-500/30'
                                    }`}>
                                    <h3 className={`text-lg md:text-2xl font-cinzel font-black mb-3 md:mb-4 text-center ${isLight ? 'text-purple-800' : 'text-purple-300'
                                        }`}>
                                        ✨ Practical Guidance
                                    </h3>
                                    <p className={`font-lora leading-relaxed text-center text-sm md:text-lg ${isLight ? 'text-purple-900' : 'text-purple-100'
                                        }`}>
                                        {result.guidance}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DreamAnalysis;
