// PersonalGuidance.tsx — FIXED & ALIGNED
// ✅ useServicePayment + initiateFlow (same as Tarot, MoonJournal)
// ✅ resolveService for dynamic price (no .single() 400 errors)
// ✅ saveReading + dbService.recordTransaction inside generator
// ✅ reportDataRef race-condition guard
// ✅ Cache restore banner (Already Purchased This Year)
// ✅ useTheme for light/dark support
// ✅ reportImage handles string | cloud object
// ✅ Mobile touch targets (min-h-[44px])
// ✅ Removed usePayment

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDb } from '../hooks/useDb';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Button from './shared/Button';
import SmartBackButton from './shared/SmartBackButton';
import FullReport from './FullReport';
import { useTranslation } from '../hooks/useTranslation';
import { useServicePayment } from '../hooks/useServicePayment';
import { resolveService } from '../services/serviceRegistry';
import { cloudManager } from '../services/cloudManager';
import { dbService } from '../services/db';
import { findProductInStore } from '../services/productMatcher';
import { generatePersonalizedGuidance } from '../services/personalGuidanceAI';
import ErrorBoundary from './shared/ErrorBoundary';

// ─── Constants ────────────────────────────────────────────────────────────────

const CONCERN_TYPES = [
    { value: 'health', label: 'Health & Wellness', emoji: '🏥', color: 'bg-green-500' },
    { value: 'wealth', label: 'Wealth & Finance', emoji: '💰', color: 'bg-yellow-500' },
    { value: 'relationships', label: 'Love & Relationships', emoji: '❤️', color: 'bg-pink-500' },
    { value: 'career', label: 'Career & Success', emoji: '💼', color: 'bg-blue-500' },
    { value: 'spiritual', label: 'Spiritual Growth', emoji: '🕉️', color: 'bg-purple-500' },
    { value: 'general', label: 'General Guidance', emoji: '✨', color: 'bg-indigo-500' },
];

// ─── Component ────────────────────────────────────────────────────────────────

const PersonalGuidance: React.FC = () => {

    // ── Form state ─────────────────────────────────────────────────────────────
    const [concernType, setConcernType] = useState('');
    const [concernDescription, setConcernDescription] = useState('');
    const [currentChallenges, setCurrentChallenges] = useState('');
    const [goals, setGoals] = useState('');

    // ── System state ───────────────────────────────────────────────────────────
    const [isPaid, setIsPaid] = useState(false);
    const [servicePrice, setServicePrice] = useState(49);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportData, setReportData] = useState<string>('');
    const [retrievedTx, setRetrievedTx] = useState<any>(null);
    const [error, setError] = useState('');

    // ── Refs ───────────────────────────────────────────────────────────────────
    const reportRef = useRef<HTMLDivElement>(null);
    // ✅ Race-condition guard — same as Tarot / MoonJournal
    const reportDataRef = useRef<string>('');

    // ── Hooks ──────────────────────────────────────────────────────────────────
    const { db } = useDb();
    const { user } = useAuth();
    const { t } = useTranslation();
    const { theme } = useTheme();
    const isLight = theme.mode === 'light';

    // ── Derived ────────────────────────────────────────────────────────────────
    const currentReport = reportData || reportDataRef.current;

    const reportImageRaw =
        db?.image_assets?.find((a: any) => a.id === 'report_bg_guidance')?.path ||
        'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?q=80&w=800';

    // ✅ Handle both string and cloud object
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

    // ── Dynamic price from serviceRegistry ────────────────────────────────────
    useEffect(() => {
        resolveService('personal-guidance').then(record => {
            if (record?.price != null) setServicePrice(record.price);
        });
    }, []);

    // ── Auto-scroll when paid ──────────────────────────────────────────────────
    useEffect(() => {
        if (isPaid && currentReport) scrollToReport();
    }, [isPaid, currentReport]);

    // ── useServicePayment ──────────────────────────────────────────────────────
    const { initiateFlow, isCheckingCache } = useServicePayment({
        serviceType: 'personal-guidance',

        onReportGenerated: () => {
            console.log('✅ [PersonalGuidance] Report display triggered');

            // ✅ Restore from ref if state hasn't settled (free service race)
            if (!reportData && reportDataRef.current) {
                setReportData(reportDataRef.current);
            }
            setIsPaid(true);
            scrollToReport();
        },

        onCacheRestored: (readingData, transaction) => {
            console.log('✅ [PersonalGuidance] Cache restored:', readingData);
            setRetrievedTx(transaction);

            const content = readingData.content || '';
            setReportData(content);
            reportDataRef.current = content;

            // Restore concern type from meta if available
            const meta = readingData.meta_data;
            if (meta?.concern_type) setConcernType(meta.concern_type);

            setIsPaid(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
    });

    // ── Validation ─────────────────────────────────────────────────────────────
    const validateForm = (): boolean => {
        if (!concernType) {
            alert('❌ Please select a concern type');
            return false;
        }
        if (concernDescription.trim().length < 50) {
            alert('❌ Please describe your concern in detail (minimum 50 characters)');
            return false;
        }
        if (currentChallenges.trim().length < 30) {
            alert('❌ Please describe your current challenges (minimum 30 characters)');
            return false;
        }
        if (goals.trim().length < 30) {
            alert('❌ Please share your goals in detail (minimum 30 characters)');
            return false;
        }
        return true;
    };

    // ── Report generation ──────────────────────────────────────────────────────
    // ✅ Called INSIDE initiateFlow generator — only runs after payment succeeds
    const buildReport = useCallback(async (): Promise<string> => {
        const concernEmoji = CONCERN_TYPES.find(c => c.value === concernType)?.emoji || '✨';
        const concernLabel = CONCERN_TYPES.find(c => c.value === concernType)?.label || concernType;

        console.log('🤖 Generating personalized guidance...');
        const aiGuidance = await generatePersonalizedGuidance(
            concernType,
            concernDescription,
            currentChallenges,
            goals
        );

        console.log('✅ Matching products from store...');
        const productsWithDetails = await Promise.all(
            aiGuidance.recommended_products.map(async (product: any) => {
                const match = await findProductInStore(product.name, concernType);
                return {
                    name: match?.name || product.name,
                    price: match?.price || 499,
                    image_url: match?.image_url || 'https://images.unsplash.com/photo-1615529182904-14819d19f5d4?w=400',
                    store_id: match?.id,
                    reason: product.reason,
                    confidence: match?.confidence || 0,
                    available: match !== null && (match.confidence ?? 0) >= 50,
                };
            })
        );

        return `# Personal Guidance & Remedies ${concernEmoji}

**Report Generated:** ${new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })}

**Concern Area:** ${concernLabel}

---

## 🔍 Understanding Your Challenge

Based on your detailed description, you are experiencing significant challenges in **${concernLabel.toLowerCase()}**.

### Your Current Situation
${concernDescription}

### Challenges You're Facing
${currentChallenges}

### Your Desired Outcomes
${goals}

---

## 💎 Your Personalized Healing Path

${aiGuidance.healing_approach}

---

## 🛍️ Sacred Tools for Your Journey

${productsWithDetails.map((product: any, i: number) => `### ${i + 1}. ${product.name} ${product.available ? '✅' : '⏳'}

![${product.name}](${product.image_url})

**Why This Helps You:**
${product.reason}

**Price:** ₹${product.price} ${product.available ? '' : '*(Being added to our collection)*'}

${product.store_id
                ? `**[🛒 Shop Now](/store/item/${product.store_id})**`
                : '**[📱 Contact Us for This Item](/contact)**'
            }`).join('\n\n---\n\n')}

### 🎁 Exclusive Offer
*Use code **GUIDANCE10** for 10% off your first purchase*

---

## 🕉️ Your Daily Spiritual Practice

${aiGuidance.daily_practices.map((p: any, i: number) => `### ${i + 1}. ${p.title}

${p.description}

**⏰ Best Time:** ${p.timing}`).join('\n\n')}

---

## ✨ Powerful Affirmations for ${concernLabel}

${aiGuidance.affirmations.map((aff: string, i: number) => `${i + 1}. _"${aff}"_`).join('\n\n')}

---

## 📅 Your 30-Day Sacred Transformation Journey

### Week 1: Foundation & Preparation (Days 1-7)
- Acquire your recommended spiritual tools
- Set up a dedicated sacred space in your home
- Begin 10-minute daily meditation practice
- Start using affirmations every morning

### Week 2: Building Sacred Energy (Days 8-14)
- Increase meditation to 15-20 minutes daily
- Work with your crystals/tools consistently
- Notice and journal subtle positive shifts

### Week 3: Deep Integration & Healing (Days 15-21)
- Full practice routine becomes natural habit
- Observe significant behavioral/emotional changes
- Deepen spiritual connection through devotion

### Week 4: Manifestation & Mastery (Days 22-30)
- Witness clear manifestation of your goals
- Create sustainable long-term practice plan
- Consider sharing your journey to inspire others

---

## 🙏 Important Guidance Notes

For detailed predictions based on your exact birth chart, please book a personal consultation with our expert Vedic astrologers.

**[📅 Book One-on-One Consultation →](/book-consultation)**

**[🛒 Browse All Products →](/store)**

---

**⚠️ Disclaimer:** This guidance combines ancient Vedic spiritual wisdom with modern insights. It is intended for spiritual growth and is not a substitute for professional medical, legal, or financial advice.

---

May divine grace, peace, and abundance flow into your life. 🙏✨

*~ With Blessings from the Glyph Circle Team*

---

*Report ID: ${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5).toUpperCase()}*`.trim();
    }, [concernType, concernDescription, currentChallenges, goals]);

    // ── Main handler ───────────────────────────────────────────────────────────
    const handleGetGuidance = async () => {
        if (!validateForm()) return;

        setError('');

        await initiateFlow(
            {
                name: user?.user_metadata?.full_name || user?.email,
                concern_type: concernType,
            },
            // ✅ Generator — called AFTER payment succeeds
            async (paymentDetails?: any) => {
                console.log('✅ [PersonalGuidance] Payment success, generating report...');
                setIsGenerating(true);
                setIsSaving(true);

                try {
                    // 1. Generate report (after payment — no wasted AI calls)
                    const report = await buildReport();

                    // ✅ Set both state and ref immediately
                    reportDataRef.current = report;
                    setReportData(report);

                    // 2. Save reading
                    const savedReading = await dbService.saveReading({
                        user_id: user?.id,
                        type: 'personal-guidance',
                        title: `Personal Guidance — ${CONCERN_TYPES.find(c => c.value === concernType)?.label}`,
                        subtitle: new Date().toLocaleDateString(),
                        content: report,
                        is_paid: true,
                        meta_data: {
                            concern_type: concernType,
                            concern_description: concernDescription,
                            current_challenges: currentChallenges,
                            goals,
                        },
                    });

                    // 3. Record transaction via dbService (aligned with all services)
                    if (savedReading?.data?.id) {
                        await dbService.recordTransaction({
                            user_id: user?.id,
                            service_type: 'personal-guidance',
                            service_title: 'Personal Guidance & Remedies',
                            amount: servicePrice,
                            currency: 'INR',
                            payment_method: paymentDetails?.method || 'manual',
                            payment_provider: paymentDetails?.provider || 'manual',
                            order_id: paymentDetails?.orderId || `GUIDANCE-ORD-${Date.now()}`,
                            transaction_id: paymentDetails?.transactionId || `GUIDANCE-TXN-${Date.now()}`,
                            reading_id: savedReading.data.id,
                            status: 'success',
                            metadata: {
                                concern_type: concernType,
                                analysis_date: new Date().toISOString(),
                            },
                        });
                    }

                    console.log('✅ [PersonalGuidance] All data saved');

                    return {
                        reading: report,
                        content: report,
                        meta_data: {
                            concern_type: concernType,
                            concern_description: concernDescription,
                            goals,
                        },
                    };

                } catch (err: any) {
                    console.error('❌ [PersonalGuidance] Save error:', err);
                    setError('Report generated but failed to save. Please contact support.');
                    // Don't throw — still show the report if generation succeeded
                    return {
                        reading: reportDataRef.current,
                        content: reportDataRef.current,
                        meta_data: { concern_type: concernType },
                    };
                } finally {
                    setIsGenerating(false);
                    setIsSaving(false);
                }
            }
        );
    };

    // ── Reset ──────────────────────────────────────────────────────────────────
    const startNewGuidance = () => {
        setConcernType('');
        setConcernDescription('');
        setCurrentChallenges('');
        setGoals('');
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

    const isFormValid =
        !!concernType &&
        concernDescription.length >= 50 &&
        currentChallenges.length >= 30 &&
        goals.length >= 30;

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6">
            <SmartBackButton label={t('backToHome')} className="mb-6" />

            {/* ── New Guidance button ── */}
            {(isPaid || retrievedTx) && (
                <div className="mb-4 flex justify-end">
                    <button
                        onClick={startNewGuidance}
                        style={{ touchAction: 'manipulation' }}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg transition-all min-h-[44px]"
                    >
                        ✨ New Guidance
                    </button>
                </div>
            )}

            {/* ── Already Purchased banner ── */}
            {retrievedTx && !isPaid && (
                <div className={`
          rounded-2xl p-6 mb-8 shadow-xl border-2 animate-fade-in-up
          ${isLight
                        ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300'
                        : 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/40'
                    }
        `}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h3 className={`font-cinzel font-black text-xl uppercase ${isLight ? 'text-emerald-800' : 'text-green-400'
                                }`}>
                                Already Purchased This Year!
                            </h3>
                            <p className={`text-sm italic ${isLight ? 'text-emerald-700' : 'text-green-300/70'
                                }`}>
                                Your guidance report retrieved from history.
                            </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => { setIsPaid(true); scrollToReport(); }}
                                style={{ touchAction: 'manipulation' }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest min-h-[44px] transition-all"
                            >
                                📄 View Report
                            </button>
                            <button
                                onClick={startNewGuidance}
                                style={{ touchAction: 'manipulation' }}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest min-h-[44px] transition-all"
                            >
                                ✨ New
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Generating overlay ── */}
            {isGenerating && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[250] p-4">
                    <div className="bg-gradient-to-br from-purple-900 via-indigo-800 to-purple-900 p-8 md:p-10 rounded-3xl shadow-2xl border border-purple-500/30 max-w-md w-full text-center">
                        <div className="w-24 h-24 mx-auto mb-8 relative">
                            <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                            <div className="absolute inset-3 border-4 border-purple-400/10 rounded-full"></div>
                            <div
                                className="absolute inset-3 border-4 border-b-purple-400 border-t-transparent border-r-transparent border-l-transparent rounded-full animate-spin"
                                style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
                            ></div>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                            🔮 Consulting Divine Wisdom
                        </h3>
                        <p className="text-purple-300 mb-2 text-base md:text-lg">
                            Analyzing your situation...
                        </p>
                        <p className="text-purple-400 text-sm">
                            Matching sacred tools from our collection...
                        </p>
                        <p className="text-purple-500 text-sm mt-2">
                            This may take 10-15 seconds 🕉️
                        </p>
                    </div>
                </div>
            )}

            {/* ── Saving overlay ── */}
            {isSaving && !isGenerating && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[250] p-4">
                    <div className="bg-gradient-to-br from-purple-900 via-indigo-800 to-purple-900 p-8 md:p-10 rounded-3xl shadow-2xl border border-purple-500/30 max-w-md w-full text-center">
                        <div className="w-24 h-24 mx-auto mb-8 relative">
                            <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                            Processing Payment
                        </h3>
                        <p className="text-purple-300 mb-2 text-base md:text-lg">
                            Saving your data...
                        </p>
                        <p className="text-purple-500 text-sm">This may take a moment 🕉️</p>
                    </div>
                </div>
            )}

            {/* ── isCheckingCache overlay ── */}
            {isCheckingCache && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[250] p-4">
                    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 md:p-10 rounded-3xl shadow-2xl border border-purple-500/30 max-w-md w-full text-center">
                        <div className="w-24 h-24 mx-auto mb-8 relative">
                            <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                            <div className="absolute inset-3 border-4 border-purple-400/10 rounded-full"></div>
                            <div
                                className="absolute inset-3 border-4 border-b-purple-400 border-t-transparent border-r-transparent border-l-transparent rounded-full animate-spin"
                                style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
                            ></div>
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
                            Checking Registry
                        </h3>
                        <p className="text-gray-300 mb-2 text-base md:text-lg">
                            Verifying your purchase history
                        </p>
                        <p className="text-gray-500 text-sm">
                            Consulting the akashic records...
                        </p>
                    </div>
                </div>
            )}

            {/* ── Form (hidden once paid) ── */}
            {!isPaid && (
                <div className={`
          rounded-xl shadow-2xl border backdrop-blur-md p-6 md:p-8
          ${isLight
                        ? 'bg-white/80 border-purple-200'
                        : 'bg-gradient-to-br from-purple-900/40 via-indigo-900/40 to-black/60 border-purple-500/30'
                    }
        `}>
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h2 className={`text-3xl md:text-4xl font-cinzel font-bold mb-2 ${isLight ? 'text-purple-700' : 'text-purple-300'
                            }`}>
                            ✨ Personal Guidance
                        </h2>
                        <p className={`font-lora italic text-sm md:text-base ${isLight ? 'text-purple-500' : 'text-purple-100/70'
                            }`}>
                            Receive personalized spiritual guidance and practical remedies
                        </p>
                    </div>

                    {/* Concern type grid */}
                    <div className="mb-6">
                        <label className={`block font-semibold mb-3 text-sm uppercase tracking-wider ${isLight ? 'text-purple-700' : 'text-purple-300'
                            }`}>
                            What area needs guidance? <span className="text-red-400">*</span>
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {CONCERN_TYPES.map((concern) => (
                                <button
                                    key={concern.value}
                                    onClick={() => setConcernType(concern.value)}
                                    style={{ touchAction: 'manipulation' }}
                                    className={`
                    flex flex-col items-center justify-center p-3 md:p-4
                    rounded-xl border-2 transition-all min-h-[80px] active:scale-95
                    ${concernType === concern.value
                                            ? `${concern.color} border-white shadow-lg scale-105`
                                            : isLight
                                                ? 'bg-white border-purple-200 hover:border-purple-400'
                                                : 'bg-gray-900/50 border-purple-500/20 hover:border-purple-500/50'
                                        }
                  `}
                                >
                                    <span className="text-2xl md:text-3xl mb-1">{concern.emoji}</span>
                                    <span className={`text-xs text-center leading-tight ${concernType === concern.value
                                            ? 'text-white font-bold'
                                            : isLight ? 'text-purple-600' : 'text-purple-300'
                                        }`}>
                                        {concern.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Concern description */}
                    <div className="mb-6">
                        <label className={`block font-semibold mb-2 text-sm ${isLight ? 'text-purple-700' : 'text-purple-300'
                            }`}>
                            Describe your situation in detail <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={concernDescription}
                            onChange={(e) => setConcernDescription(e.target.value)}
                            placeholder="Please share your situation in detail... What is troubling you? When did it start? How is it affecting your life?"
                            rows={6}
                            className={`
                w-full p-4 border rounded-lg focus:outline-none focus:ring-2
                focus:ring-purple-400 resize-none font-lora leading-relaxed text-sm md:text-base
                ${isLight
                                    ? 'bg-white border-purple-200 text-gray-800 placeholder-gray-400'
                                    : 'bg-black/40 border-purple-500/30 text-purple-100 placeholder-purple-400/30'
                                }
              `}
                        />
                        <p className={`text-xs mt-1 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                            Min 50 chars • Current: {concernDescription.length}
                            {concernDescription.length >= 50 && (
                                <span className="text-green-500 ml-2 font-semibold">✓ Good detail</span>
                            )}
                        </p>
                    </div>

                    {/* Current challenges */}
                    <div className="mb-6">
                        <label className={`block font-semibold mb-2 text-sm ${isLight ? 'text-purple-700' : 'text-purple-300'
                            }`}>
                            What specific challenges are you facing? <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={currentChallenges}
                            onChange={(e) => setCurrentChallenges(e.target.value)}
                            placeholder="What obstacles are blocking you? What have you already tried? What patterns do you notice?"
                            rows={4}
                            className={`
                w-full p-4 border rounded-lg focus:outline-none focus:ring-2
                focus:ring-purple-400 resize-none font-lora text-sm md:text-base
                ${isLight
                                    ? 'bg-white border-purple-200 text-gray-800 placeholder-gray-400'
                                    : 'bg-black/40 border-purple-500/30 text-purple-100 placeholder-purple-400/30'
                                }
              `}
                        />
                        <p className={`text-xs mt-1 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                            Min 30 chars • Current: {currentChallenges.length}
                            {currentChallenges.length >= 30 && (
                                <span className="text-green-500 ml-2 font-semibold">✓</span>
                            )}
                        </p>
                    </div>

                    {/* Goals */}
                    <div className="mb-8">
                        <label className={`block font-semibold mb-2 text-sm ${isLight ? 'text-purple-700' : 'text-purple-300'
                            }`}>
                            What are your goals and desired outcomes? <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={goals}
                            onChange={(e) => setGoals(e.target.value)}
                            placeholder="What would you like to achieve? How would you like your life to look? What would success mean to you?"
                            rows={4}
                            className={`
                w-full p-4 border rounded-lg focus:outline-none focus:ring-2
                focus:ring-purple-400 resize-none font-lora text-sm md:text-base
                ${isLight
                                    ? 'bg-white border-purple-200 text-gray-800 placeholder-gray-400'
                                    : 'bg-black/40 border-purple-500/30 text-purple-100 placeholder-purple-400/30'
                                }
              `}
                        />
                        <p className={`text-xs mt-1 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                            Min 30 chars • Current: {goals.length}
                            {goals.length >= 30 && (
                                <span className="text-green-500 ml-2 font-semibold">✓</span>
                            )}
                        </p>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-900/30 border border-red-500/40 rounded-xl text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Submit button */}
                    <Button
                        onClick={handleGetGuidance}
                        disabled={!isFormValid || isGenerating}
                        style={{ touchAction: 'manipulation' }}
                        className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 border-pink-400/50 shadow-lg py-4 text-base md:text-lg font-cinzel tracking-wider disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
                    >
                        {isGenerating
                            ? '🔮 Generating Guidance...'
                            : `🔮 Get Divine Guidance — ₹${servicePrice}`
                        }
                    </Button>

                    <p className={`text-center text-xs mt-3 ${isLight ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        <span className="text-red-500">*</span> All fields required •
                        Detailed responses ensure better guidance
                    </p>

                    {/* Info note */}
                    <div className={`
            mt-4 p-4 rounded-lg border text-xs text-center
            ${isLight
                            ? 'bg-purple-50 border-purple-200 text-gray-700'
                            : 'bg-purple-900/20 border-purple-500/20 text-purple-300'
                        }
          `}>
                        💡 <strong>Note:</strong> For personalized astrological predictions based on your
                        birth chart, book a one-on-one consultation with our expert Vedic astrologers.
                    </div>
                </div>
            )}

            {/* ── Full Report ── */}
            {currentReport && isPaid && (
                <div ref={reportRef} className="mt-8 scroll-mt-6">
                    <div className={`
            rounded-xl shadow-2xl border backdrop-blur-md p-6 md:p-8
            ${isLight
                            ? 'bg-white/80 border-purple-200'
                            : 'bg-gradient-to-br from-purple-900/40 via-indigo-900/40 to-black/60 border-purple-500/30'
                        }
          `}>
                        <ErrorBoundary>
                            <FullReport
                                reading={currentReport}
                                category="personal-guidance"
                                title="Personal Guidance & Remedies"
                                subtitle={
                                    CONCERN_TYPES.find(c => c.value === concernType)?.label ||
                                    'Guidance Report'
                                }
                                imageUrl={reportImage}
                            />
                        </ErrorBoundary>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonalGuidance;
