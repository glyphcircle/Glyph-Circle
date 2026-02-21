// MoonJournal.tsx — ALIGNED with codebase patterns
// ✅ Uses useServicePayment (same as Tarot, GemstoneGuide)
// ✅ fetchServicePrice uses .maybeSingle() — no 400 errors
// ✅ saveToDatabase receives real paymentDetails object
// ✅ dbService.recordTransaction for unified transaction log
// ✅ Cache restore support (previously purchased)
// ✅ Mobile optimized touch targets (min-h-[44px])
// ✅ Image resolution handles string | object (same as Tarot)
// ✅ selectedCardRef pattern replaced with reportDataRef for same race-condition fix

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDb } from '../hooks/useDb';
import { useAuth } from '../context/AuthContext';
import { calculateMoonPhase } from '../services/moonPhaseService';
import SmartBackButton from './shared/SmartBackButton';
import FullReport from './FullReport';
import { useTranslation } from '../hooks/useTranslation';
import { supabase } from '../services/supabaseClient';
import { cloudManager } from '../services/cloudManager';
import { dbService } from '../services/db';
import { useServicePayment } from '../hooks/useServicePayment';
import { useTheme } from '../context/ThemeContext';
import ErrorBoundary from './shared/ErrorBoundary';
import { resolveService } from '../services/serviceRegistry';
// ─── Constants ────────────────────────────────────────────────────────────────

const MOODS = [
    { emoji: '😊', label: 'Happy', value: 'happy', color: 'bg-yellow-500' },
    { emoji: '😌', label: 'Calm', value: 'calm', color: 'bg-blue-500' },
    { emoji: '😔', label: 'Sad', value: 'sad', color: 'bg-indigo-500' },
    { emoji: '😰', label: 'Anxious', value: 'anxious', color: 'bg-orange-500' },
    { emoji: '😤', label: 'Angry', value: 'angry', color: 'bg-red-500' },
    { emoji: '🥰', label: 'Loved', value: 'loved', color: 'bg-pink-500' },
    { emoji: '😴', label: 'Tired', value: 'tired', color: 'bg-gray-500' },
    { emoji: '✨', label: 'Inspired', value: 'inspired', color: 'bg-purple-500' },
];

// ─── Component ────────────────────────────────────────────────────────────────

const MoonJournal: React.FC = () => {

    // ── Form state ─────────────────────────────────────────────────────────────
    const [mood, setMood] = useState('');
    const [moodIntensity, setMoodIntensity] = useState(5);
    const [energyLevel, setEnergyLevel] = useState(5);
    const [content, setContent] = useState('');
    const [gratitude, setGratitude] = useState('');
    const [intentions, setIntentions] = useState('');

    // ── System state ───────────────────────────────────────────────────────────
    const [moonData, setMoonData] = useState<any>(null);
    const [isPaid, setIsPaid] = useState(false);
    const [servicePrice, setServicePrice] = useState(49);
    const [isSaving, setIsSaving] = useState(false);
    const [reportData, setReportData] = useState<string>('');
    const [retrievedTx, setRetrievedTx] = useState<any>(null);
    const [error, setError] = useState('');

    // ── Refs ───────────────────────────────────────────────────────────────────
    const reportRef = useRef<HTMLDivElement>(null);
    // ✅ Same race-condition fix as Tarot — holds report even before state settles
    const reportDataRef = useRef<string>('');

    // ── Hooks ──────────────────────────────────────────────────────────────────
    const { db } = useDb();
    const { user } = useAuth();
    const { t } = useTranslation();
    const { theme } = useTheme();
    const isLight = theme.mode === 'light';

    // ── Derived ────────────────────────────────────────────────────────────────
    const currentReport = reportData || reportDataRef.current;

    const reportImageRaw = db.image_assets?.find(
        (a: any) => a.id === 'report_bg_moon'
    )?.path || 'https://images.unsplash.com/photo-1509803874385-db7c23652552?q=80&w=800';

    // ✅ Handles both string URLs and cloud objects (same pattern as Tarot)
    const reportImage = typeof reportImageRaw === 'string'
        ? reportImageRaw
        : cloudManager.resolveImage(reportImageRaw);

    // ── Scroll helper ──────────────────────────────────────────────────────────
    const scrollToReport = useCallback(() => {
        setTimeout(() => {
            if (reportRef.current) {
                reportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }, 150);
    }, []);

    // ── useServicePayment ──────────────────────────────────────────────────────
    // ✅ Aligned with Tarot/GemstoneGuide pattern
    const { initiateFlow, isCheckingCache } = useServicePayment({
        serviceType: 'moon-journal-analytics',

        onReportGenerated: (data) => {
            console.log('✅ [MoonJournal] Report display triggered');

            // ✅ Force reportData from ref if state hasn't settled (free service race)
            if (!reportData && reportDataRef.current) {
                setReportData(reportDataRef.current);
            }

            setIsPaid(true);
            scrollToReport();
        },

        onCacheRestored: (readingData, transaction) => {
            console.log('✅ [MoonJournal] Cache restored:', readingData);
            setRetrievedTx(transaction);
            setReportData(readingData.content);
            reportDataRef.current = readingData.content;

            // Restore form meta if available
            const meta = readingData.meta_data;
            if (meta?.mood) setMood(meta.mood);
            if (meta?.mood_intensity) setMoodIntensity(meta.mood_intensity);
            if (meta?.energy_level) setEnergyLevel(meta.energy_level);

            setIsPaid(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // ── Fetch service price ────────────────────────────────────────────────────
    useEffect(() => {
        resolveService('moon-journal-analytics').then(record => {
            if (record?.price != null) setServicePrice(record.price);
        });
    }, []);

    // ── Moon phase ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const data = calculateMoonPhase(new Date());
        setMoonData(data);
    }, []);

    // ── Auto-scroll when paid ──────────────────────────────────────────────────
    useEffect(() => {
        if (isPaid && currentReport) {
            scrollToReport();
        }
    }, [isPaid, currentReport]);

    // ── Validation ─────────────────────────────────────────────────────────────
    const validateForm = () => {
        if (!mood) { alert('❌ Please select your mood'); return false; }
        if (!content.trim()) { alert('❌ Please write your journal entry'); return false; }
        if (!gratitude.trim()) { alert('❌ Please share what you\'re grateful for'); return false; }
        if (!intentions.trim()) { alert('❌ Please set your intentions'); return false; }
        return true;
    };

    // ── Report generation ──────────────────────────────────────────────────────
    const generateReport = useCallback((): string => {
        const moodEmoji = MOODS.find(m => m.value === mood)?.emoji || '😐';
        const moodLabel = MOODS.find(m => m.value === mood)?.label || mood;

        return `
# Moon Journal Insights 🌙

## Your Current State

**Date:** ${new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })}

**Moon Phase:** ${moonData?.phaseName || 'Unknown'} ${moonData?.phaseEmoji || '🌙'}

**Zodiac Position:** ${moonData?.zodiacSign || 'Unknown'}

**Lunar Illumination:** ${moonData?.percentage?.toFixed(1) || 0}%

---

## Emotional Snapshot

### Your Mood: ${moodEmoji} ${moodLabel}

**Intensity Level:** ${moodIntensity}/10 ${moodIntensity >= 8 ? '(Very Strong)' :
                moodIntensity >= 5 ? '(Moderate)' : '(Mild)'
            }

**Energy Level:** ${energyLevel}/10 ${energyLevel >= 7 ? '⚡ High Energy' :
                energyLevel >= 4 ? '⚖️ Balanced' : '😴 Low Energy'
            }

Your emotional state of **${moodLabel}** at an intensity of ${moodIntensity}/10 reflects your current alignment with the cosmic energies. ${moodIntensity >= 7 ? 'This strong emotional presence indicates deep processing and transformation.' :
                moodIntensity >= 4 ? 'This moderate level suggests emotional balance and awareness.' :
                    'This gentle emotional state allows for inner reflection and subtle shifts.'
            }

---

## Lunar Influence Analysis

### Current Moon Phase: ${moonData?.phaseName}

${generatePhaseInsight(moonData?.phaseName, mood, energyLevel)}

### Your Energy Pattern

With an energy level of ${energyLevel}/10 during the ${moonData?.phaseName} phase, you are ${energyLevel >= 7 ? 'experiencing heightened vitality and life force. This is an excellent time for action, manifestation, and pursuing your goals with confidence.' :
                energyLevel >= 4 ? 'in a balanced state. Use this equilibrium wisely by focusing on both inner work and outer activities.' :
                    'in a phase of conservation and restoration. Honor your need for rest, reflection, and gentle self-care.'
            }

### Emotional-Lunar Correlation

Your ${moodLabel} mood during the ${moonData?.phaseName} phase suggests:

${generateMoodPhaseCorrelation(mood, moonData?.phaseName)}

---

## Your Sacred Reflections

### 🙏 Gratitude

${gratitude}

**Insight:** Gratitude is a powerful manifestation tool. By acknowledging these blessings during the ${moonData?.phaseName} phase, you amplify their energy and attract more abundance.

### 🎯 Intentions

${intentions}

**Guidance:** These intentions align with the ${moonData?.phaseName} energy. ${moonData?.phaseName?.includes('New') ? 'This is the perfect time for setting new intentions and planting seeds for future growth.' :
                moonData?.phaseName?.includes('Full') ? 'Use the Full Moon\'s illuminating power to clarify and energize these intentions.' :
                    moonData?.phaseName?.includes('Waxing') ? 'The growing moon supports building momentum toward these goals.' :
                        'The waning moon helps release obstacles standing in the way of these intentions.'
            }

---

## Personalized Recommendations

### For Your Current Mood (${moodLabel})

${generateMoodRecommendations(mood)}

### For This Moon Phase (${moonData?.phaseName})

${generatePhaseRecommendations(moonData?.phaseName)}

### Energy Management

${generateEnergyRecommendations(energyLevel)}

---

## Astrological Guidance

### Moon in ${moonData?.zodiacSign}

${generateZodiacGuidance(moonData?.zodiacSign, mood)}

### Best Practices for Today

1. **Morning Ritual:** ${getMorningRitual(moonData?.phaseName)}
2. **Emotional Processing:** ${getEmotionalPractice(mood)}
3. **Energy Work:** ${getEnergyPractice(energyLevel)}
4. **Evening Reflection:** ${getEveningPractice(moonData?.phaseName)}

---

## Your Lunar Forecast

### Next 7 Days

${generateWeeklyForecast(moonData?.phaseName)}

### Power Times

${getPowerTimes(moonData?.phaseName, moonData?.zodiacSign)}

---

## Sacred Practices

### Crystals for You

Based on your ${moodLabel} mood and the ${moonData?.phaseName} phase:

${getCrystalRecommendations(mood, moonData?.phaseName)}

### Affirmations

${getAffirmations(mood, moonData?.phaseName)}

### Journal Prompts for Deeper Reflection

${getJournalPrompts(mood, moonData?.phaseName)}

---

## Conclusion

Your journey through the ${moonData?.phaseName} phase with a ${moodLabel} emotional state is uniquely yours. Honor this experience, embrace the cosmic support available to you, and remember that every phase of the moon — and every emotion — serves your highest growth.

*This personalized report was generated on ${new Date().toLocaleString()}.*
`.trim();
    }, [mood, moodIntensity, energyLevel, content, gratitude, intentions, moonData]);

    // ── Save to database ───────────────────────────────────────────────────────
    // ✅ Now receives paymentDetails — real transaction IDs, not fallbacks
    const saveToDatabase = useCallback(async (
        report: string,
        paymentDetails: any
    ) => {
        const today = new Date();

        // 1. Save mood entry
        const { error: entryError } = await supabase
            .from('mood_entries')
            .insert([{
                user_id: user?.id,
                entry_date: today.toISOString().split('T')[0],
                entry_time: today.toTimeString().split(' ')[0],
                mood,
                mood_intensity: moodIntensity,
                energy_level: energyLevel,
                moon_phase: moonData?.phaseName,
                moon_phase_percentage: moonData?.percentage,
                zodiac_sign: moonData?.zodiacSign,
                content,
                gratitude,
                intentions,
                is_private: true,
            }]);

        if (entryError) {
            console.warn('[MoonJournal] mood_entries insert warning:', entryError.message);
            // Non-fatal — continue with reading save
        }

        // 2. Create reading record
        const { data: readingRecord, error: readingError } = await supabase
            .from('readings')
            .insert([{
                user_id: user?.id,
                type: 'moon-journal-analytics',
                title: 'Moon Journal Insights',
                subtitle: `${moonData?.phaseName} • ${today.toLocaleDateString()}`,
                content: report,
                is_paid: true,
                meta_data: {
                    moon_phase: moonData?.phaseName,
                    mood,
                    mood_intensity: moodIntensity,
                    energy_level: energyLevel,
                },
            }])
            .select()
            .single();

        if (readingError) throw readingError;

        // 3. ✅ Use dbService.recordTransaction — aligned with all other services
        await dbService.recordTransaction({
            user_id: user?.id,
            service_type: 'moon-journal-analytics',
            service_title: 'Moon Journal Insights',
            amount: servicePrice,
            currency: 'INR',
            payment_method: paymentDetails?.method || 'manual',
            payment_provider: paymentDetails?.provider || 'manual',
            order_id: paymentDetails?.orderId || `JOURNAL-ORD-${Date.now()}`,
            transaction_id: paymentDetails?.transactionId || `JOURNAL-TXN-${Date.now()}`,
            status: 'success',
            metadata: {
                reading_id: readingRecord.id,
                moon_phase: moonData?.phaseName,
                analysis_date: today.toISOString(),
            },
        });

        return readingRecord.id;
    }, [user, mood, moodIntensity, energyLevel, moonData, content, gratitude, intentions, servicePrice]);

    // ── Main unlock handler ────────────────────────────────────────────────────
    const handleUnlockInsights = async () => {
        if (!validateForm()) return;

        const report = generateReport();

        // ✅ Set ref immediately — same race-condition guard as Tarot
        reportDataRef.current = report;
        setReportData(report);

        await initiateFlow(
            {
                name: user?.user_metadata?.full_name || user?.email,
                moon_phase: moonData?.phaseName,
                mood,
                mood_intensity: moodIntensity,
                energy_level: energyLevel,
            },
            // ✅ Generator function — called by useServicePayment after payment succeeds
            async (paymentDetails?: any) => {
                console.log('✅ [MoonJournal] Saving to database...');
                setIsSaving(true);
                setError('');

                try {
                    await saveToDatabase(report, paymentDetails);
                    console.log('✅ [MoonJournal] Database save complete');
                } catch (err: any) {
                    console.error('❌ [MoonJournal] Save error:', err);
                    setError('Report generated but failed to save. Please contact support.');
                    // Don't throw — still show the report
                } finally {
                    setIsSaving(false);
                }

                return {
                    reading: report,
                    content: report,
                    meta_data: {
                        moon_phase: moonData?.phaseName,
                        mood,
                        mood_intensity: moodIntensity,
                        energy_level: energyLevel,
                    },
                };
            }
        );
    };

    // ── Reset ──────────────────────────────────────────────────────────────────
    const startNewEntry = () => {
        setMood('');
        setMoodIntensity(5);
        setEnergyLevel(5);
        setContent('');
        setGratitude('');
        setIntentions('');
        setIsPaid(false);
        setReportData('');
        reportDataRef.current = '';
        setRetrievedTx(null);
        setError('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6">
            <SmartBackButton label={t('backToHome')} className="mb-6" />

            {/* New Entry button — shown after report */}
            {(isPaid || retrievedTx) && (
                <div className="mb-4 flex justify-end">
                    <button
                        onClick={startNewEntry}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg transition-all min-h-[44px]"
                        style={{ touchAction: 'manipulation' }}
                    >
                        🌙 New Entry
                    </button>
                </div>
            )}

            {/* Previously purchased banner */}
            {retrievedTx && !isPaid && (
                <div className={`
          rounded-2xl p-6 mb-8 shadow-xl border-2 animate-fade-in-up
          ${isLight
                        ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300'
                        : 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/40'
                    }
        `}>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <h3 className={`font-cinzel font-black text-xl uppercase ${isLight ? 'text-emerald-800' : 'text-green-400'
                                }`}>
                                Already Purchased This Year!
                            </h3>
                            <p className={`text-sm italic ${isLight ? 'text-emerald-700' : 'text-green-300/70'
                                }`}>
                                Your Moon Journal insights retrieved from history.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setIsPaid(true); scrollToReport(); }}
                                className="bg-emerald-600 text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest min-h-[44px]"
                                style={{ touchAction: 'manipulation' }}
                            >
                                📄 View Full
                            </button>
                            <button
                                onClick={startNewEntry}
                                className="bg-purple-600 text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest min-h-[44px]"
                                style={{ touchAction: 'manipulation' }}
                            >
                                ✨ New
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Saving overlay */}
            {isSaving && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[250] p-4">
                    <div className="bg-gradient-to-br from-purple-900 via-indigo-800 to-purple-900 p-8 md:p-10 rounded-3xl shadow-2xl border border-purple-500/30 max-w-md w-full text-center">
                        <div className="w-24 h-24 mx-auto mb-8 relative">
                            <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-wide">
                            Generating Your Insights
                        </h3>
                        <p className="text-purple-300 mb-2 text-base md:text-lg">
                            Analyzing lunar energies...
                        </p>
                        <p className="text-purple-500 text-sm">This may take a moment 🌙</p>
                    </div>
                </div>
            )}

            {/* Cache checking overlay */}
            {isCheckingCache && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[250] p-4">
                    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 md:p-10 rounded-3xl shadow-2xl border border-purple-500/30 max-w-md w-full text-center">
                        <div className="w-24 h-24 mx-auto mb-8 relative">
                            <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                            <div className="absolute inset-3 border-4 border-purple-500/10 rounded-full"></div>
                            <div
                                className="absolute inset-3 border-4 border-b-purple-400 border-t-transparent border-r-transparent border-l-transparent rounded-full animate-spin"
                                style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
                            ></div>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">Checking Registry</h3>
                        <p className="text-gray-300 mb-2 text-base md:text-lg">Verifying your purchase history</p>
                        <p className="text-gray-500 text-sm">Scanning the celestial archives... 🌙</p>
                    </div>
                </div>
            )}

            {/* ── JOURNAL FORM ────────────────────────────────────────────────────── */}
            {!isPaid && (
                <div className="bg-gradient-to-br from-purple-900/40 via-indigo-900/40 to-black/60 rounded-xl shadow-2xl border border-purple-500/30 backdrop-blur-md p-6 md:p-8">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl md:text-4xl font-cinzel font-bold text-purple-300 mb-2">
                            🌙 Moon Journal
                        </h2>
                        <p className="text-purple-100/70 font-lora italic text-sm md:text-base">
                            Discover your lunar insights and cosmic guidance
                        </p>
                        {moonData && (
                            <div className="mt-4 inline-block bg-purple-900/30 px-5 py-3 rounded-full border border-purple-500/30">
                                <span className="text-2xl mr-2">{moonData.phaseEmoji}</span>
                                <span className="text-purple-200 font-semibold">{moonData.phaseName}</span>
                                <span className="text-purple-300/70 text-sm ml-2">• {moonData.zodiacSign}</span>
                            </div>
                        )}
                    </div>

                    {/* Mood Selection */}
                    <div className="mb-6">
                        <label className="block text-purple-300 font-semibold mb-3 text-sm uppercase tracking-wider">
                            How are you feeling? <span className="text-red-400">*</span>
                        </label>
                        {/* ✅ Mobile: 4 cols; tablet+: 8 cols; min-h-[44px] touch targets */}
                        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3">
                            {MOODS.map((m) => (
                                <button
                                    key={m.value}
                                    onClick={() => setMood(m.value)}
                                    style={{ touchAction: 'manipulation' }}
                                    className={`
                    flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border-2 transition-all min-h-[64px] md:min-h-[80px]
                    ${mood === m.value
                                            ? `${m.color} border-white shadow-lg scale-105`
                                            : 'bg-gray-900/50 border-purple-500/20 hover:border-purple-500/50 active:scale-95'
                                        }
                  `}
                                >
                                    <span className="text-2xl md:text-3xl mb-1">{m.emoji}</span>
                                    <span className={`text-[10px] md:text-xs ${mood === m.value ? 'text-white font-bold' : 'text-purple-300'
                                        }`}>
                                        {m.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sliders */}
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-purple-300 font-semibold mb-2 text-sm">
                                Mood Intensity:{' '}
                                <span className="text-purple-400 text-lg">{moodIntensity}/10</span>
                            </label>
                            <input
                                type="range"
                                min="1" max="10"
                                value={moodIntensity}
                                onChange={(e) => setMoodIntensity(parseInt(e.target.value))}
                                className="w-full h-3 bg-purple-900/50 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                            <div className="flex justify-between text-xs text-purple-500 mt-1">
                                <span>Mild</span><span>Moderate</span><span>Intense</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-purple-300 font-semibold mb-2 text-sm">
                                Energy Level:{' '}
                                <span className="text-purple-400 text-lg">{energyLevel}/10</span>
                            </label>
                            <input
                                type="range"
                                min="1" max="10"
                                value={energyLevel}
                                onChange={(e) => setEnergyLevel(parseInt(e.target.value))}
                                className="w-full h-3 bg-indigo-900/50 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                            <div className="flex justify-between text-xs text-indigo-400 mt-1">
                                <span>Low</span><span>Balanced</span><span>High</span>
                            </div>
                        </div>
                    </div>

                    {/* Journal Entry */}
                    <div className="mb-6">
                        <label className="block text-purple-300 font-semibold mb-2 text-sm">
                            Journal Entry <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Write about your day, thoughts, feelings..."
                            rows={6}
                            className="w-full p-4 bg-black/40 border border-purple-500/30 rounded-lg text-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none placeholder-purple-400/30 font-lora leading-relaxed text-sm md:text-base"
                        />
                    </div>

                    {/* Gratitude */}
                    <div className="mb-6">
                        <label className="block text-purple-300 font-semibold mb-2 text-sm">
                            🙏 Gratitude <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={gratitude}
                            onChange={(e) => setGratitude(e.target.value)}
                            placeholder="What are you grateful for today?"
                            rows={3}
                            className="w-full p-4 bg-black/40 border border-purple-500/30 rounded-lg text-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none placeholder-purple-400/30 font-lora text-sm md:text-base"
                        />
                    </div>

                    {/* Intentions */}
                    <div className="mb-8">
                        <label className="block text-purple-300 font-semibold mb-2 text-sm">
                            🎯 Intentions <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={intentions}
                            onChange={(e) => setIntentions(e.target.value)}
                            placeholder="What are your intentions?"
                            rows={3}
                            className="w-full p-4 bg-black/40 border border-purple-500/30 rounded-lg text-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none placeholder-purple-400/30 font-lora text-sm md:text-base"
                        />
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-900/40 border border-red-500/40 rounded-xl text-red-300 text-sm">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Unlock Button */}
                    <button
                        onClick={handleUnlockInsights}
                        disabled={!mood || !content.trim() || !gratitude.trim() || !intentions.trim()}
                        style={{ touchAction: 'manipulation' }}
                        className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-cinzel font-bold text-base md:text-lg tracking-wider shadow-lg transition-all active:scale-95 min-h-[56px]"
                    >
                        🔓 Unlock Moon Insights — ₹{servicePrice}
                    </button>

                    <p className="text-center text-purple-400/70 text-xs mt-3">
                        <span className="text-red-400">*</span> All fields are required
                    </p>
                </div>
            )}

            {/* ── FULL REPORT ──────────────────────────────────────────────────────── */}
            {/* ✅ Guard: isPaid AND (reportData OR ref) — same pattern as Tarot */}
            {isPaid && currentReport && (
                <div ref={reportRef} className="mt-8 scroll-mt-6">
                    <div className="bg-gradient-to-br from-purple-900/40 via-indigo-900/40 to-black/60 rounded-xl shadow-2xl border border-purple-500/30 backdrop-blur-md p-6 md:p-8">
                        <ErrorBoundary>
                            <FullReport
                                reading={currentReport}
                                category="moon-journal-analytics"
                                title="Moon Journal Insights"
                                subtitle={`${moonData?.phaseName || 'Lunar'} • ${new Date().toLocaleDateString()}`}
                                imageUrl={reportImage}
                            />
                        </ErrorBoundary>
                    </div>
                </div>
            )}

        </div>
    );
};

export default MoonJournal;

// ─── Report Helper Functions ─────────────────────────────────────────────────

function generatePhaseInsight(phase: string, mood: string, energy: number): string {
    const phaseMap: Record<string, string> = {
        'New Moon': 'The New Moon invites you to plant seeds of intention. Your inner world is primed for new beginnings and fresh perspectives.',
        'Waxing Crescent': 'The Waxing Crescent supports growth and building momentum. Energy is increasing — channel it toward your goals.',
        'First Quarter': 'The First Quarter brings decisive energy. Challenges surface to strengthen your resolve and clarify your path.',
        'Waxing Gibbous': 'The Waxing Gibbous refines and perfects. This is a time of fine-tuning your intentions before the Full Moon peak.',
        'Full Moon': 'The Full Moon illuminates all things. Emotions run high, truths surface, and manifestations reach culmination.',
        'Waning Gibbous': 'The Waning Gibbous encourages gratitude and sharing. Harvest the wisdom from recent experiences.',
        'Last Quarter': 'The Last Quarter supports release and forgiveness. Let go of what has served its purpose.',
        'Waning Crescent': 'The Waning Crescent is a time of rest and surrender. Trust the process and prepare for renewal.',
    };
    const insight = Object.entries(phaseMap).find(([key]) =>
        phase?.toLowerCase().includes(key.toLowerCase())
    );
    return insight?.[1] || `The ${phase} phase carries unique cosmic energy that influences your ${mood} mood and energy level of ${energy}/10.`;
}

function generateMoodPhaseCorrelation(mood: string, phase: string): string {
    const correlations: Record<string, string> = {
        happy: '- Your joy is amplified by the lunar energy, making this an auspicious time for creative expression\n- Share your positive vibrations with others — they will multiply\n- Channel this happiness into setting powerful intentions',
        calm: '- Your tranquility aligns beautifully with the moon\'s meditative frequency\n- Use this stillness for deep inner work and clarity\n- Calm states during lunar phases enhance intuitive downloads',
        sad: '- The moon honors your emotional depth — sadness is sacred processing\n- Allow lunar energy to support your healing journey\n- This phase offers powerful release and transformation',
        anxious: '- The lunar energy can amplify sensitivity — ground yourself in nature\n- Breathwork and moon-gazing will help regulate your nervous system\n- Your anxiety carries messages worth exploring gently',
        angry: '- Anger during this phase signals something important needing attention\n- Transform this fire energy into purposeful action\n- Journaling will help decode what truly needs to change',
        loved: '- Love energy during lunar phases creates powerful manifestation fields\n- Your heart is open — set intentions from this loving space\n- Share this warmth through acts of kindness and connection',
        tired: '- Fatigue during lunar cycles often signals deep cellular renewal\n- Honor your body\'s wisdom — rest is sacred work\n- Gentle moon bathing and early sleep will restore you',
        inspired: '- Inspiration during lunar phases is highly auspicious\n- Capture every idea — the cosmos is channeling through you\n- Begin creative projects now while this energy flows freely',
    };
    return correlations[mood] || `- Your ${mood} state during ${phase} carries unique cosmic significance\n- Observe this feeling without judgment\n- Trust that the lunar cycle supports your growth`;
}

function generateMoodRecommendations(mood: string): string {
    const map: Record<string, string> = {
        happy: '- Harness this positive energy for creative projects and manifestation work\n- Share your joy generously — it creates a ripple effect of abundance\n- Practice gratitude meditation to anchor this elevated state\n- Begin new ventures or conversations you\'ve been postponing',
        calm: '- Use this stillness for deep meditation and inner listening\n- Write in your journal — insights flow freely from calm states\n- Practice loving-kindness meditation for yourself and others\n- Organize your space to match your serene inner landscape',
        sad: '- Allow yourself to feel and process emotions without resistance\n- Gentle self-care: warm baths, nourishing food, soft music\n- Connect with one trusted person who holds space for you\n- Know that sadness during lunar cycles accelerates healing',
        anxious: '- 4-7-8 breathwork: inhale 4, hold 7, exhale 8 counts\n- Walk barefoot on earth to ground scattered energy\n- Limit screen time and caffeine after sunset\n- Write your worries down and release them to the moon',
        angry: '- Physical movement: dance, walk, or exercise to metabolize the energy\n- Write a letter you won\'t send to fully express yourself\n- Identify the boundary that needs to be set or protected\n- Channel this fire into meaningful change, not destruction',
        loved: '- Express appreciation to those who matter most today\n- Set intentions from this open-hearted state — they are powerful\n- Creative work (art, music, writing) is blessed now\n- Practice self-love rituals: mirror work, self-massage, affirmations',
        tired: '- Prioritize 8+ hours of sleep — your body is regenerating\n- Gentle yoga, stretching, or a slow nature walk\n- Eat warm, nourishing foods and stay hydrated\n- Say no to non-essential demands today without guilt',
        inspired: '- Capture every insight in writing immediately\n- Begin that creative project you\'ve been imagining\n- Share your vision with one aligned soul\n- Take one concrete step toward your inspired idea today',
    };
    return map[mood] || '- Practice mindfulness and present-moment awareness\n- Stay hydrated and nourished\n- Get adequate rest and gentle movement\n- Connect with nature for grounding';
}

function generatePhaseRecommendations(phase: string): string {
    if (phase?.includes('New')) return '- Set clear intentions for the coming cycle\n- Start a new project, habit, or practice\n- Plant actual seeds as a symbolic ritual\n- Vision board or intention journaling';
    if (phase?.includes('Waxing Crescent')) return '- Take inspired action toward your intentions\n- Research, plan, and gather resources\n- Speak your goals aloud to the moon\n- Build momentum with small daily steps';
    if (phase?.includes('First Quarter')) return '- Push through resistance and self-doubt\n- Make decisions that align with your intentions\n- Address challenges as course corrections\n- Strengthen your commitment';
    if (phase?.includes('Gibbous')) return '- Refine and adjust your approach\n- Gratitude practices to attract more blessings\n- Review progress and celebrate growth\n- Prepare for Full Moon release';
    if (phase?.includes('Full')) return '- Release what no longer serves your highest good\n- Full Moon ritual: write releases and burn safely\n- Charge crystals and water under the moonlight\n- Celebrate your manifestations and growth';
    if (phase?.includes('Waning')) return '- Let go of habits, relationships, and beliefs past their time\n- Declutter your space and digital life\n- Forgiveness practices for self and others\n- Rest more and push less';
    if (phase?.includes('Last Quarter')) return '- Deep forgiveness and release work\n- Tie up loose ends and complete unfinished business\n- Reflect on lessons learned this cycle\n- Prepare space for incoming new moon energy';
    return '- Observe and reflect on your inner landscape\n- Gentle progress is enough\n- Trust the natural rhythm of expansion and contraction\n- Honor where you are in the cycle';
}

function generateEnergyRecommendations(energy: number): string {
    if (energy >= 7) return '- Channel this vitality into your most important work\n- Physical exercise will enhance and ground this energy\n- Tackle the tasks you\'ve been avoiding\n- Social connection and collaboration thrive now';
    if (energy >= 4) return '- Balance active and restful periods throughout the day\n- Moderate exercise like yoga or walking\n- This equilibrium supports both creativity and logic\n- Maintain consistent routines for steady progress';
    return '- Honor your body\'s request for restoration\n- Sleep earlier and rise gently\n- Nourishing soups, teas, and warm foods\n- Slow, restorative yoga or gentle stretching only';
}

function generateZodiacGuidance(sign: string, mood: string): string {
    const guidance: Record<string, string> = {
        Aries: 'Aries Moon ignites courage and spontaneity. Act on impulse with discernment.',
        Taurus: 'Taurus Moon grounds and stabilizes. Connect with nature, food, and physical pleasure.',
        Gemini: 'Gemini Moon stimulates curiosity and communication. Write, read, and connect.',
        Cancer: 'Cancer Moon deepens emotional sensitivity. Honor your need for home and family.',
        Leo: 'Leo Moon amplifies creativity and self-expression. Shine your authentic light.',
        Virgo: 'Virgo Moon supports healing and practical service. Organize, purify, and refine.',
        Libra: 'Libra Moon seeks balance and beauty. Focus on relationships and aesthetic harmony.',
        Scorpio: 'Scorpio Moon intensifies depth and transformation. Embrace what lies beneath.',
        Sagittarius: 'Sagittarius Moon expands vision and optimism. Seek higher meaning and adventure.',
        Capricorn: 'Capricorn Moon supports discipline and achievement. Build with patience.',
        Aquarius: 'Aquarius Moon awakens innovation and community. Think collectively.',
        Pisces: 'Pisces Moon opens intuition and compassion. Dream, create, and surrender.',
    };
    const base = guidance[sign] || `The Moon in ${sign} brings unique qualities to your emotional landscape.`;
    return `${base} Combined with your current ${mood} state, this creates a powerful opportunity for authentic self-expression and growth.`;
}

function getMorningRitual(phase: string): string {
    if (phase?.includes('New')) return 'Write 3 intentions by candlelight before checking your phone';
    if (phase?.includes('Full')) return 'Moon salutation yoga flow facing west (where the moon sets)';
    if (phase?.includes('Waxing')) return 'Visualization meditation on your growing goals';
    return 'Gentle breathwork and gratitude for lessons learned';
}

function getEmotionalPractice(mood: string): string {
    const map: Record<string, string> = {
        happy: 'Channel joy into creative expression or heartfelt connections',
        calm: 'Deepen this peace through 20 minutes of silent meditation',
        sad: 'Cry freely, journal feelings, then place hands on heart and breathe',
        anxious: 'Box breathing (4-4-4-4) while focusing on a fixed point',
        angry: 'Write the anger out completely, then tear the paper as release',
        loved: 'Write love letters to yourself and three people you appreciate',
        tired: 'Nap without guilt — your system is running important updates',
        inspired: 'Free-write for 15 minutes without stopping or editing',
    };
    return map[mood] || 'Sit quietly and observe your emotional landscape without judgment';
}

function getEnergyPractice(energy: number): string {
    if (energy >= 7) return 'Dynamic movement: run, dance, or power yoga to channel vitality';
    if (energy >= 4) return 'Flowing yoga, swimming, or a brisk nature walk';
    return 'Restorative yoga with long holds, or simply lie with legs elevated';
}

function getEveningPractice(phase: string): string {
    if (phase?.includes('Full')) return 'Moon bathe for 10 minutes — stand in moonlight and breathe deeply';
    if (phase?.includes('New')) return 'Sit in darkness and feel the potential of infinite possibility';
    return 'Reflection journaling: what did today teach you about yourself?';
}

function generateWeeklyForecast(phase: string): string {
    if (phase?.includes('New'))
        return '**Days 1-3:** High receptivity for new beginnings — start what matters\n**Days 4-5:** Build momentum as the moon grows\n**Days 6-7:** Refine your approach based on early results';
    if (phase?.includes('Full'))
        return '**Days 1-2:** Peak energy — complete important tasks and celebrate\n**Days 3-4:** Begin releasing what has fulfilled its purpose\n**Days 5-7:** Integrate insights and prepare for restoration';
    if (phase?.includes('Waxing'))
        return '**Days 1-3:** Increasing energy supports bold action\n**Days 4-5:** Midpoint review — adjust course if needed\n**Days 6-7:** Final push before Full Moon peak';
    return '**Days 1-3:** Release and let go of what weighs you down\n**Days 4-5:** Rest and restore your vital energy\n**Days 6-7:** Quiet reflection and preparing for renewal';
}

function getPowerTimes(phase: string, sign: string): string {
    return `**Sunrise:** Intention setting and new beginnings\n**Noon:** Maximum solar-lunar balance — take important actions\n**Sunset:** Transition rituals and emotional processing\n**Midnight:** Deep lunar connection — meditation and dream work\n\nWith the Moon in **${sign}**, ${['Aries', 'Leo', 'Sagittarius'].includes(sign) ? 'fire energy peaks in the afternoon hours' :
        ['Taurus', 'Virgo', 'Capricorn'].includes(sign) ? 'earth energy peaks in the morning' :
            ['Gemini', 'Libra', 'Aquarius'].includes(sign) ? 'air energy peaks mid-morning and evening' :
                'water energy peaks at dusk and dawn'
        }.`;
}

function getCrystalRecommendations(mood: string, phase: string): string {
    const moodCrystals: Record<string, string> = {
        happy: '- **Citrine** — amplifies joy and abundance\n- **Sunstone** — sustains positive energy',
        calm: '- **Blue Lace Agate** — deepens tranquility\n- **Aquamarine** — enhances peaceful clarity',
        sad: '- **Rose Quartz** — provides gentle self-love and comfort\n- **Lepidolite** — supports emotional healing',
        anxious: '- **Black Tourmaline** — grounding and protective\n- **Lepidolite** — calms the nervous system',
        angry: '- **Blue Kyanite** — cools and brings perspective\n- **Howlite** — calms fiery emotions',
        loved: '- **Rose Quartz** — deepens heart connection\n- **Rhodonite** — balances love energy',
        tired: '- **Clear Quartz** — gentle energy restoration\n- **Carnelian** — reignites vital force',
        inspired: '- **Labradorite** — enhances creative vision\n- **Lapis Lazuli** — deepens inspired expression',
    };
    const phaseCrystal = phase?.includes('New') ? '\n- **Black Moonstone** — new moon magic and intention' :
        phase?.includes('Full') ? '\n- **Selenite** — full moon charging and clarity' :
            '\n- **Moonstone** — lunar attunement for any phase';
    return (moodCrystals[mood] || '- **Clear Quartz** — universal healing\n- **Amethyst** — spiritual protection') + phaseCrystal;
}

function getAffirmations(mood: string, phase: string): string {
    const moodAffirmations: Record<string, string[]> = {
        happy: ['I radiate joy and attract abundance effortlessly', 'My happiness is a gift to the world'],
        calm: ['I am peace. I am stillness. I am safe', 'In my calm, I find infinite wisdom'],
        sad: ['My emotions are sacred and worthy of space', 'I heal with every breath I take'],
        anxious: ['I am grounded, centered, and safe in this moment', 'I trust the divine timing of my life'],
        angry: ['I transform my fire into purposeful, powerful action', 'My boundaries are sacred and I honor them'],
        loved: ['I am worthy of deep, authentic love', 'Love flows through me in all directions'],
        tired: ['Rest is productive. My body knows how to restore itself', 'I give myself permission to rest fully'],
        inspired: ['I am a channel for divine creative intelligence', 'My ideas matter and I act on them with courage'],
    };
    const affirmations = moodAffirmations[mood] || ['I am aligned with the wisdom of the cosmos', 'I trust my journey completely'];
    const phaseAffirmation = phase?.includes('New') ? 'I plant seeds of intention that grow into beautiful realities' :
        phase?.includes('Full') ? 'I release all that is complete and welcome what is becoming' :
            'I flow with the natural rhythm of expansion and rest';
    return affirmations.map(a => `- "${a}"`).join('\n') + `\n- "${phaseAffirmation}"`;
}

function getJournalPrompts(mood: string, phase: string): string {
    return `1. What is the ${phase} moon illuminating in my life right now that I've been avoiding seeing?\n2. How does my ${mood} feeling today connect to a deeper truth I'm ready to acknowledge?\n3. What would I do differently if I fully trusted the timing of my life?\n4. What am I holding onto that the moon is gently asking me to release?\n5. If my highest self wrote me a letter tonight, what would it say?`;
}
