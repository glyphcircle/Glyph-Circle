import React, { useState, useRef, useEffect } from 'react';
import Card from './shared/Card';
import Button from './shared/Button';
import { getCosmicSync } from '../services/aiService';
import { SmartDatePicker, SmartTimePicker, SmartCitySearch } from './SmartAstroInputs';
import FullReport from './FullReport';
import { usePayment } from '../context/PaymentContext';
import { useDb } from '../hooks/useDb';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import SmartBackButton from './shared/SmartBackButton';
import { Heart, Sparkles, TrendingUp, AlertTriangle, Lock, CheckCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const CosmicSync: React.FC = () => {
    const { openPayment } = usePayment();
    const { db } = useDb();
    const { theme } = useTheme();
    const { user } = useAuth();
    const isLight = theme.mode === 'light';
    const resultRef = useRef<HTMLDivElement>(null);
    const readingIdRef = useRef<string | null>(null);
    const isPaymentOpenRef = useRef(false);
    const [p1, setP1] = useState({ name: '', dob: '', tob: '', pob: '' });
    const [p2, setP2] = useState({ name: '', dob: '', tob: '', pob: '' });
    const [result, setResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPaid, setIsPaid] = useState(false);
    const [cachedReportKey, setCachedReportKey] = useState<string | null>(null);
    const [readingId, setReadingId] = useState<string | null>(null);
    const [servicePrice, setServicePrice] = useState(69);

    // ... all your useEffect hooks and functions stay exactly the same ...
    // Fetch service price on mount
    useEffect(() => {
        fetchServicePrice();
    }, []);

    // Check if user has paid for this report
    useEffect(() => {
        if (result && cachedReportKey) {
            checkPreviousPayment(cachedReportKey);
        }
    }, [result, cachedReportKey]);

    const fetchServicePrice = async () => {
        try {
            if (supabase) {
                const { data, error } = await supabase.rpc('get_cosmic_sync_price');
                if (!error && data) {
                    setServicePrice(data);
                    console.log('✅ Service price loaded:', data);
                }
            }
        } catch (error) {
            console.error('Error fetching price:', error);
        }
    };

    const generateReportKey = (person1: any, person2: any) => {
        const key = `cosmic_sync_${person1.name}_${person1.dob}_${person2.name}_${person2.dob}`;
        return key.toLowerCase().replace(/\s/g, '');
    };

    const checkPreviousPayment = async (reportKey: string) => {
        try {
            console.log('🔍 Checking previous payment for:', reportKey);

            // Check using database function
            if (supabase) {
                const { data, error } = await supabase.rpc('check_cosmic_sync_paid', {
                    p_report_key: reportKey,
                    p_user_id: user?.id || null
                });

                if (!error && data === true) {
                    console.log('✅ Previous payment found');
                    setIsPaid(true);

                    // Load the full report from cache
                    const { data: cacheData } = await supabase
                        .from('cosmic_sync_cache')
                        .select('*')
                        .eq('report_key', reportKey)
                        .single();

                    if (cacheData && cacheData.reading_id) {
                        setReadingId(cacheData.reading_id);
                    }
                    return;
                }
            }

            // Fallback: Check local storage
            const localPayments = JSON.parse(localStorage.getItem('cosmic_sync_payments') || '[]');
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            const existingPayment = localPayments.find((p: any) =>
                p.reportKey === reportKey &&
                new Date(p.timestamp) > oneYearAgo &&
                p.status === 'completed'
            );

            if (existingPayment) {
                console.log('✅ Previous payment found in local storage');
                setIsPaid(true);
            }
        } catch (error) {
            console.error('Error checking previous payment:', error);
        }
    };

    const saveToDatabase = async (reportKey: string, reportData: any, readId?: string) => {
        try {
            if (!supabase) {
                console.warn('⚠️ No database connection');
                return null;
            }

            let currentReadingId = readId;

            // 1. Create/Update reading
            if (!currentReadingId) {
                const { data: reading, error: readingError } = await supabase
                    .from('readings')
                    .insert([{
                        user_id: user?.id || null,
                        type: 'cosmic-sync',
                        title: `${p1.name} & ${p2.name} - Cosmic Sync`,
                        subtitle: `Compatibility: ${reportData.compatibilityScore}%`,
                        content: reportData.fullReading,
                        is_paid: isPaid,
                        meta_data: {
                            report_key: reportKey,
                            compatibility_score: reportData.compatibilityScore,
                            relationship_type: reportData.relationshipType
                        }
                    }])
                    .select()
                    .single();

                if (readingError) {
                    console.error('❌ Reading save error:', readingError);
                } else {
                    currentReadingId = reading.id;
                    setReadingId(reading.id);
                    readingIdRef.current = reading.id;
                    console.log('✅ Reading saved:', reading.id);
                }
            }

            // 2. Save to cosmic_sync_cache
            const { data: cache, error: cacheError } = await supabase
                .from('cosmic_sync_cache')
                .upsert([{
                    report_key: reportKey,
                    person1_name: p1.name,
                    person1_dob: p1.dob,
                    person1_tob: p1.tob || null,
                    person1_pob: p1.pob || null,
                    person2_name: p2.name,
                    person2_dob: p2.dob,
                    person2_tob: p2.tob || null,
                    person2_pob: p2.pob || null,
                    compatibility_score: reportData.compatibilityScore,
                    relationship_type: reportData.relationshipType,
                    strengths: reportData.strengths,
                    challenges: reportData.challenges,
                    full_reading: reportData.fullReading,
                    reading_id: currentReadingId,
                    user_id: user?.id || null,
                    is_paid: isPaid
                }], { onConflict: 'report_key' })
                .select()
                .single();

            if (cacheError) {
                console.error('❌ Cache save error:', cacheError);
            } else {
                console.log('✅ Cache saved:', cache);
            }

            return currentReadingId;

        } catch (error) {
            console.error('❌ Database save error:', error);
            return null;
        }
    };

    const savePaymentRecord = async (reportKey: string, readId: string) => {
        try {
            if (!supabase) return;

            const { data: txn, error: txnError } = await supabase
                .from('transactions')
                .insert([{
                    user_id: user?.id || null,
                    service_type: 'cosmic-sync',
                    service_title: `${p1.name} & ${p2.name} Compatibility`,
                    amount: servicePrice,
                    currency: 'INR',
                    status: 'success',
                    payment_method: 'puter',
                    payment_provider: 'puter.ai',
                    reading_id: readId,
                    order_id: `CS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    metadata: {
                        report_key: reportKey,
                        persons: {
                            person1: { name: p1.name, dob: p1.dob, tob: p1.tob, pob: p1.pob },
                            person2: { name: p2.name, dob: p2.dob, tob: p2.tob, pob: p2.pob }
                        }
                    }
                }])
                .select()
                .single();

            if (txnError) {
                console.error('❌ Transaction save error:', txnError);
            } else {
                console.log('✅ Transaction saved:', txn);

                // Update reading to mark as paid
                await supabase
                    .from('readings')
                    .update({ is_paid: true })
                    .eq('id', readId);

                // Update cache to mark as paid
                await supabase
                    .from('cosmic_sync_cache')
                    .update({ is_paid: true })
                    .eq('report_key', reportKey);
            }

            // Also save to local storage as backup
            const localPayments = JSON.parse(localStorage.getItem('cosmic_sync_payments') || '[]');
            localPayments.push({
                reportKey: reportKey,
                service: 'Cosmic Sync',
                amount: servicePrice,
                timestamp: new Date().toISOString(),
                status: 'completed',
                persons: {
                    person1: { name: p1.name, dob: p1.dob },
                    person2: { name: p2.name, dob: p2.dob }
                }
            });
            localStorage.setItem('cosmic_sync_payments', JSON.stringify(localPayments));

        } catch (error) {
            console.error('❌ Payment save error:', error);
        }
    };

    const handleSync = async () => {
        if (!p1.name || !p1.dob || !p2.name || !p2.dob) {
            alert('Please fill in at least names and dates of birth for both persons');
            return;
        }

        setIsLoading(true);
        setResult(null);
        setIsPaid(false);

        try {
            const res = await getCosmicSync(p1, p2);

            console.log('🌌 Cosmic Sync Response:', res);

            const normalizedResult = {
                compatibilityScore: res?.compatibilityScore || res?.score || 0,
                relationshipType: res?.relationshipType || res?.type || 'Analyzing...',
                strengths: Array.isArray(res?.strengths) ? res.strengths :
                    (res?.positives ? res.positives : ['Cosmic analysis in progress']),
                challenges: Array.isArray(res?.challenges) ? res.challenges :
                    (res?.negatives ? res.negatives : ['Further insights being calculated']),
                fullReading: res?.fullReading || res?.reading || res?.report ||
                    'Your detailed cosmic compatibility report is being prepared.',
            };

            setResult(normalizedResult);

            const reportKey = generateReportKey(p1, p2);
            setCachedReportKey(reportKey);

            // Save to database (creates reading if not paid yet)
            const savedReadingId = await saveToDatabase(reportKey, normalizedResult);
            if (savedReadingId) {
                setReadingId(savedReadingId);
                readingIdRef.current = savedReadingId;
            }

            // Check if already paid
            await checkPreviousPayment(reportKey);

            setTimeout(() => {
                resultRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 300);

        } catch (error) {
            console.error('❌ Cosmic Sync error:', error);
            setResult({
                compatibilityScore: 0,
                relationshipType: 'Analysis Unavailable',
                strengths: ['Unable to analyze cosmic compatibility at this time'],
                challenges: ['Please try again in a few moments'],
                fullReading: 'We encountered a cosmic disturbance. Please try again.'
            });

            setTimeout(() => {
                resultRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 300);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePayment = () => {
        if (isPaymentOpenRef.current) {
            console.warn('⚠️ Payment already open');
            return;
        }
        isPaymentOpenRef.current = true;

        const reportKey = cachedReportKey || generateReportKey(p1, p2);

        openPayment(
            async () => {
                isPaymentOpenRef.current = false; // reset on success

                let currentReadingId = readingIdRef.current;
                if (!currentReadingId) {
                    currentReadingId = await saveToDatabase(reportKey, result);
                    if (currentReadingId) {
                        readingIdRef.current = currentReadingId;
                        setReadingId(currentReadingId);
                    }
                }

                if (currentReadingId) {
                    await savePaymentRecord(reportKey, currentReadingId);
                }
                setIsPaid(true);
                console.log('✅ Payment completed');
            },
            `Cosmic Sync: ${p1.name} & ${p2.name}`,
            servicePrice
        );

        // Reset if user cancels payment popup
        setTimeout(() => {
            isPaymentOpenRef.current = false;
        }, 30000); // 30s timeout fallback
    };

    const getCompatibilityColor = (score: number) => {
        if (score >= 80) return isLight ? 'text-green-600' : 'text-green-400';
        if (score >= 60) return isLight ? 'text-blue-600' : 'text-blue-400';
        if (score >= 40) return isLight ? 'text-yellow-600' : 'text-yellow-400';
        return isLight ? 'text-red-600' : 'text-red-400';
    };

    const getScoreGradient = (score: number) => {
        if (score >= 80) return 'from-green-500 to-emerald-500';
        if (score >= 60) return 'from-blue-500 to-cyan-500';
        if (score >= 40) return 'from-yellow-500 to-orange-500';
        return 'from-red-500 to-pink-500';
    };

    return (
        <div className={`min-h-screen py-6 px-4 ${isLight
            ? 'bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50'
            : 'bg-gradient-to-br from-gray-900 via-purple-950 to-black'
            }`}>
            <SmartBackButton className="mb-4" />

            <div className="max-w-5xl mx-auto">

                {/* ── HEADER ── */}
                <div className="text-center mb-6 md:mb-8">
                    <div className="inline-flex items-center justify-center gap-2 mb-3 flex-wrap">
                        <Heart className={`w-6 h-6 md:w-8 md:h-8 ${isLight ? 'text-pink-600' : 'text-pink-400'
                            }`} />
                        <h1 className={`text-2xl md:text-4xl font-cinzel font-bold ${isLight
                            ? 'text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600'
                            : 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400'
                            }`}>
                            Cosmic Sync
                        </h1>
                        <Sparkles className={`w-6 h-6 md:w-8 md:h-8 ${isLight ? 'text-purple-600' : 'text-purple-400'
                            }`} />
                    </div>
                    <p className={`text-sm md:text-lg ${isLight ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                        Discover Your Soul Connection Through The Stars
                    </p>
                </div>

                {/* ── INPUT CARDS ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6 md:mb-8">

                    {/* Person A */}
                    <Card className={`p-4 md:p-6 border-l-4 ${isLight
                        ? 'border-pink-500 bg-white shadow-lg'
                        : 'border-pink-500 bg-gray-900/80'
                        }`}>
                        <h3 className={`font-bold mb-4 flex items-center gap-2 text-sm md:text-base ${isLight ? 'text-pink-600' : 'text-pink-400'
                            }`}>
                            <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shrink-0" />
                            Person A
                        </h3>
                        <div className="space-y-3 md:space-y-4">
                            <input
                                value={p1.name}
                                onChange={e => setP1({ ...p1, name: e.target.value })}
                                placeholder="Name *"
                                className={`w-full p-3 rounded border-2 focus:outline-none transition-colors text-sm md:text-base ${isLight
                                    ? 'bg-white border-pink-200 focus:border-pink-500 text-gray-900 placeholder-gray-400'
                                    : 'bg-gray-800 border-pink-500/30 focus:border-pink-500 text-white placeholder-gray-500'
                                    }`}
                            />
                            <SmartDatePicker value={p1.dob} onChange={d => setP1({ ...p1, dob: d })} />
                            <SmartTimePicker value={p1.tob} date={p1.dob} onChange={t => setP1({ ...p1, tob: t })} />
                            <SmartCitySearch value={p1.pob} onChange={c => setP1({ ...p1, pob: c })} />
                        </div>
                    </Card>

                    {/* Person B — border-l-4 on mobile, border-r-4 on md+ */}
                    <Card className={`p-4 md:p-6 border-l-4 md:border-l-0 md:border-r-4 ${isLight
                        ? 'border-purple-500 bg-white shadow-lg'
                        : 'border-purple-500 bg-gray-900/80'
                        }`}>
                        <h3 className={`font-bold mb-4 flex items-center justify-start md:justify-end gap-2 text-sm md:text-base ${isLight ? 'text-purple-600' : 'text-purple-400'
                            }`}>
                            Person B
                            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shrink-0" />
                        </h3>
                        <div className="space-y-3 md:space-y-4">
                            <input
                                value={p2.name}
                                onChange={e => setP2({ ...p2, name: e.target.value })}
                                placeholder="Name *"
                                className={`w-full p-3 rounded border-2 focus:outline-none transition-colors text-sm md:text-base
                                md:text-right ${isLight
                                        ? 'bg-white border-purple-200 focus:border-purple-500 text-gray-900 placeholder-gray-400'
                                        : 'bg-gray-800 border-purple-500/30 focus:border-purple-500 text-white placeholder-gray-500'
                                    }`}
                            />
                            <SmartDatePicker value={p2.dob} onChange={d => setP2({ ...p2, dob: d })} />
                            <SmartTimePicker value={p2.tob} date={p2.dob} onChange={t => setP2({ ...p2, tob: t })} />
                            <SmartCitySearch value={p2.pob} onChange={c => setP2({ ...p2, pob: c })} />
                        </div>
                    </Card>
                </div>

                {/* ── ANALYZE BUTTON ── */}
                <div className="text-center mb-8 md:mb-12">
                    <Button
                        onClick={handleSync}
                        disabled={isLoading || !p1.name || !p1.dob || !p2.name || !p2.dob}
                        className={`w-full md:w-auto px-8 md:px-12 py-4 text-base md:text-lg 
                        rounded-full transition-all transform hover:scale-105 ${isLight
                                ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700'
                                : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600'
                            } text-white font-semibold shadow-lg ${(isLoading || !p1.name || !p1.dob || !p2.name || !p2.dob)
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:shadow-xl'
                            }`}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-3">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Aligning Stars...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <Sparkles className="w-5 h-5" />
                                Analyze Synergy
                                <Sparkles className="w-5 h-5" />
                            </span>
                        )}
                    </Button>
                </div>

                {/* ── RESULTS ── */}
                {result && (
                    <div ref={resultRef} className="animate-fade-in-up scroll-mt-24">
                        <Card className={`p-5 md:p-8 ${isLight
                            ? 'bg-white shadow-2xl border-2 border-purple-200'
                            : 'bg-black/80 border-2 border-purple-500/30'
                            }`}>

                            {/* Compatibility Score */}
                            <div className="text-center mb-6 md:mb-8">
                                <div className={`text-6xl md:text-8xl font-black mb-3 ${getCompatibilityColor(result.compatibilityScore)
                                    }`}>
                                    {result.compatibilityScore}%
                                </div>
                                <div className={`text-lg md:text-2xl font-semibold mb-4 ${isLight ? 'text-gray-800' : 'text-gray-200'
                                    }`}>
                                    {result.relationshipType}
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 md:h-4 mb-4 md:mb-6">
                                    <div
                                        className={`h-full rounded-full bg-gradient-to-r ${getScoreGradient(result.compatibilityScore)
                                            } transition-all duration-1000`}
                                        style={{ width: `${result.compatibilityScore}%` }}
                                    />
                                </div>
                            </div>

                            {/* Strengths & Challenges */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">

                                {/* Strengths */}
                                <div className={`p-4 md:p-6 rounded-lg ${isLight
                                    ? 'bg-green-50 border-2 border-green-200'
                                    : 'bg-green-900/20 border-2 border-green-500/30'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-3 md:mb-4">
                                        <TrendingUp className={`w-5 h-5 md:w-6 md:h-6 shrink-0 ${isLight ? 'text-green-600' : 'text-green-400'
                                            }`} />
                                        <h3 className={`text-base md:text-xl font-bold ${isLight ? 'text-green-800' : 'text-green-300'
                                            }`}>
                                            Strengths
                                        </h3>
                                    </div>
                                    <ul className="space-y-2">
                                        {result.strengths.slice(0, 3).map((strength: string, idx: number) => (
                                            <li key={idx} className={`flex items-start gap-2 text-sm md:text-base ${isLight ? 'text-green-700' : 'text-green-300'
                                                }`}>
                                                <CheckCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0 mt-0.5" />
                                                <span>{strength}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Challenges */}
                                <div className={`p-4 md:p-6 rounded-lg ${isLight
                                    ? 'bg-orange-50 border-2 border-orange-200'
                                    : 'bg-orange-900/20 border-2 border-orange-500/30'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-3 md:mb-4">
                                        <AlertTriangle className={`w-5 h-5 md:w-6 md:h-6 shrink-0 ${isLight ? 'text-orange-600' : 'text-orange-400'
                                            }`} />
                                        <h3 className={`text-base md:text-xl font-bold ${isLight ? 'text-orange-800' : 'text-orange-300'
                                            }`}>
                                            Challenges
                                        </h3>
                                    </div>
                                    <ul className="space-y-2">
                                        {result.challenges.slice(0, 3).map((challenge: string, idx: number) => (
                                            <li key={idx} className={`flex items-start gap-2 text-sm md:text-base ${isLight ? 'text-orange-700' : 'text-orange-300'
                                                }`}>
                                                <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 shrink-0 mt-0.5" />
                                                <span>{challenge}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Unlock / Full Report */}
                            {!isPaid ? (
                                <div className={`text-center p-5 md:p-8 rounded-lg ${isLight
                                    ? 'bg-gradient-to-r from-purple-100 to-pink-100'
                                    : 'bg-gradient-to-r from-purple-900/30 to-pink-900/30'
                                    }`}>
                                    <Lock className={`w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 ${isLight ? 'text-purple-600' : 'text-purple-400'
                                        }`} />
                                    <h3 className={`text-lg md:text-2xl font-bold mb-2 ${isLight ? 'text-gray-800' : 'text-white'
                                        }`}>
                                        Unlock Your Complete Cosmic Analysis
                                    </h3>
                                    <p className={`text-sm md:text-base mb-5 md:mb-6 ${isLight ? 'text-gray-600' : 'text-gray-300'
                                        }`}>
                                        Get detailed insights, personalized guidance, and the full compatibility report
                                    </p>
                                    <Button
                                        onClick={handlePayment}
                                        className={`w-full md:w-auto px-8 md:px-12 py-4 text-base md:text-lg 
                                        font-semibold rounded-full ${isLight
                                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                                                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                                            } text-white shadow-xl hover:shadow-2xl transition-all transform hover:scale-105`}
                                    >
                                        <span className="flex items-center justify-center gap-2">
                                            <Sparkles className="w-5 h-5" />
                                            Unlock Full Report - ₹{servicePrice}
                                        </span>
                                    </Button>
                                </div>
                            ) : (
                                <div>
                                    <div className={`flex items-center justify-center gap-2 mb-5 md:mb-6 p-3 md:p-4 rounded-lg ${isLight ? 'bg-green-100' : 'bg-green-900/30'
                                        }`}>
                                        <CheckCircle className={`w-5 h-5 md:w-6 md:h-6 ${isLight ? 'text-green-600' : 'text-green-400'
                                            }`} />
                                        <span className={`font-semibold text-sm md:text-base ${isLight ? 'text-green-800' : 'text-green-300'
                                            }`}>
                                            Full Report Unlocked
                                        </span>
                                    </div>
                                    <FullReport
                                        reading={result.fullReading}
                                        title={`Cosmic Synergy: ${p1.name} & ${p2.name}`}
                                        category="cosmic-sync"
                                    />
                                </div>
                            )}
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
};
export default CosmicSync;
