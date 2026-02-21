// GemstoneGuide.tsx
// ✅ Changes:
// 1. Stone Library tab now shows LIVE store products (crystals category from Supabase)
//    with FALLBACK_GEMSTONES when DB is empty — never blank
// 2. fetchServicePrice uses .maybeSingle() — fixes the 400 Bad Request
// 3. Full theme support (isLight)
// 4. SmartBackButton
// 5. isPaymentOpenRef guard
// 6. Planet filter on library/fallback data
// 7. Add-to-cart integrated when store has products
// 8. Modal shows full gem detail (fallback) OR store product detail (live)

import React, { useState, useRef, useEffect } from 'react';
import Card from './shared/Card';
import Button from './shared/Button';
import ProgressBar from './shared/ProgressBar';
import Modal from './shared/Modal';
import SmartBackButton from './shared/SmartBackButton';
import OptimizedImage from './shared/OptimizedImage';
import FullReport from './FullReport';
import { useDb } from '../hooks/useDb';
import { useTranslation } from '../hooks/useTranslation';
import { usePayment } from '../context/PaymentContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { supabase } from '../services/supabaseClient';
import { getGemstoneGuidance, generateMantraAudio } from '../services/aiService';
import { SmartDatePicker } from './SmartAstroInputs';
import { ShoppingCart, Plus, Minus, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ============================================================
// 💎 FALLBACK GEMSTONE DATA
// Used when Supabase store is empty OR user is on library tab
// without store data. NEVER leaves the library blank.
// ============================================================
const FALLBACK_GEMSTONES = [
    { id: 'ruby', name: 'Ruby', sanskrit: 'Manikya', planet: 'Sun', chakra: 'Root', day: 'Sunday', color: 'from-red-500 to-rose-700', benefits: 'Leadership, confidence, vitality, authority, career success, father relationships.', mantra: 'ॐ सूर्याय नमः (Om Suryaya Namaha)', image: 'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?q=80&w=400' },
    { id: 'pearl', name: 'Pearl', sanskrit: 'Moti', planet: 'Moon', chakra: 'Sacral', day: 'Monday', color: 'from-gray-100 to-blue-200', benefits: 'Emotional balance, intuition, mother relationships, mental peace, sleep quality.', mantra: 'ॐ चंद्राय नमः (Om Chandraya Namaha)', image: 'https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?q=80&w=400' },
    { id: 'coral', name: 'Red Coral', sanskrit: 'Moonga', planet: 'Mars', chakra: 'Solar Plexus', day: 'Tuesday', color: 'from-orange-500 to-red-600', benefits: 'Courage, physical strength, determination, protection, property matters.', mantra: 'ॐ मंगलाय नमः (Om Mangalaya Namaha)', image: 'https://images.unsplash.com/photo-1621155346337-1d19476ba7d6?q=80&w=400' },
    { id: 'emerald', name: 'Emerald', sanskrit: 'Panna', planet: 'Mercury', chakra: 'Heart', day: 'Wednesday', color: 'from-emerald-400 to-green-700', benefits: 'Intelligence, communication, business acumen, memory, analytical skills.', mantra: 'ॐ बुधाय नमः (Om Budhaya Namaha)', image: 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?q=80&w=400' },
    { id: 'yellow-sapphire', name: 'Yellow Sapphire', sanskrit: 'Pukhraj', planet: 'Jupiter', chakra: 'Crown', day: 'Thursday', color: 'from-yellow-400 to-amber-600', benefits: 'Wisdom, wealth, marriage, children, spiritual growth, higher education, luck.', mantra: 'ॐ बृहस्पतये नमः (Om Brihaspataye Namaha)', image: 'https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?q=80&w=400' },
    { id: 'diamond', name: 'Diamond', sanskrit: 'Heera', planet: 'Venus', chakra: 'Heart', day: 'Friday', color: 'from-blue-100 to-purple-200', benefits: 'Love, luxury, artistic talent, relationships, beauty, harmony.', mantra: 'ॐ शुक्राय नमः (Om Shukraya Namaha)', image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=400' },
    { id: 'blue-sapphire', name: 'Blue Sapphire', sanskrit: 'Neelam', planet: 'Saturn', chakra: 'Third Eye', day: 'Saturday', color: 'from-blue-600 to-indigo-800', benefits: 'Discipline, career, protection, longevity, justice, overcoming hardships.', mantra: 'ॐ शनैश्चराय नमः (Om Shanaischaraya Namaha)', image: 'https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?q=80&w=400' },
    { id: 'hessonite', name: 'Hessonite', sanskrit: 'Gomed', planet: 'Rahu', chakra: 'Throat', day: 'Saturday', color: 'from-amber-700 to-orange-900', benefits: 'Confusion removal, ambition, transformation, foreign connections, sudden gains.', mantra: 'ॐ राहवे नमः (Om Rahave Namaha)', image: 'https://images.unsplash.com/photo-1611244419377-b0a760c19719?q=80&w=400' },
    { id: 'cats-eye', name: "Cat's Eye", sanskrit: 'Lehsunia', planet: 'Ketu', chakra: 'Crown', day: 'Thursday', color: 'from-green-700 to-teal-900', benefits: 'Spiritual liberation, psychic abilities, past life healing, sudden wealth, moksha.', mantra: 'ॐ केतवे नमः (Om Ketave Namaha)', image: 'https://images.unsplash.com/photo-1611244419377-b0a760c19719?q=80&w=400' },
];

const PLANET_FILTERS = ['All', 'Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

// ============================================================
// COMPONENT
// ============================================================

const GemstoneGuide: React.FC = () => {
    const { db } = useDb();
    const { t, language, getRegionalPrice } = useTranslation();
    const { openPayment } = usePayment();
    const { theme } = useTheme();
    const { saveReading, user } = useAuth();
    const { cart, cartCount, totalPrice, addToCart, removeFromCart, updateQuantity, clearCart } = useCart();
    const navigate = useNavigate();
    const isLight = theme.mode === 'light';

    // ── Tab & Library ────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'oracle' | 'library'>('oracle');
    const [planetFilter, setPlanetFilter] = useState('All');
    const [selectedGem, setSelectedGem] = useState<any | null>(null);
    const [servicePrice, setServicePrice] = useState(49);

    // ── Store (Library tab) ──────────────────────────────────
    const [storeItems, setStoreItems] = useState<any[]>([]);
    const [storeLoading, setStoreLoading] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [storeMode, setStoreMode] = useState<'library' | 'store'>('library');

    // ── Oracle Form ──────────────────────────────────────────
    const [formData, setFormData] = useState({ name: '', dob: '', intent: '' });

    // ── Oracle Result ────────────────────────────────────────
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<any>(null);
    const [isPaid, setIsPaid] = useState(false);
    const [error, setError] = useState('');

    // ── Audio ────────────────────────────────────────────────
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    // ── Guards ───────────────────────────────────────────────
    const resultRef = useRef<HTMLDivElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const isPaymentOpenRef = useRef(false);

    const isAdmin = user && ['master@glyphcircle.com', 'admin@glyphcircle.com'].includes(user.email);

    // ── Derived ──────────────────────────────────────────────
    // When store has products → show store items; else show fallback knowledge library
    const libraryGems: any[] = (db.gemstones && db.gemstones.length > 0)
        ? db.gemstones
        : FALLBACK_GEMSTONES;

    const filteredLibraryGems = planetFilter === 'All'
        ? libraryGems
        : libraryGems.filter((g: any) => g.planet === planetFilter);

    const filteredStoreItems = planetFilter === 'All'
        ? storeItems
        : storeItems.filter((i: any) =>
            i.name?.toLowerCase().includes(planetFilter.toLowerCase()) ||
            i.description?.toLowerCase().includes(planetFilter.toLowerCase())
        );

    // ── Effects ──────────────────────────────────────────────

    useEffect(() => {
        fetchServicePrice();
        const cached = localStorage.getItem('glyph_user_details');
        if (cached) {
            try {
                const p = JSON.parse(cached);
                setFormData(prev => ({ ...prev, name: p.name || '', dob: p.dob || '' }));
            } catch { /* ignore */ }
        }
    }, []);

    // Fetch store items when library tab opens
    useEffect(() => {
        if (activeTab === 'library') fetchStoreItems();
    }, [activeTab]);

    useEffect(() => {
        return () => {
            if (audioSourceRef.current) audioSourceRef.current.stop();
            if (audioCtxRef.current) audioCtxRef.current.close();
        };
    }, []);

    // ── Fetchers ─────────────────────────────────────────────

    const fetchServicePrice = async () => {
        try {
            // ✅ Fixed: use .maybeSingle() — no 400 errors
            const { data } = await supabase
                .from('services')
                .select('price')
                .eq('name', 'Gemstone Guide')
                .eq('status', 'active')
                .maybeSingle();

            if (data?.price) { setServicePrice(data.price); return; }

            // Fallback: try by id
            const { data: d2 } = await supabase
                .from('services')
                .select('price')
                .eq('id', 'gemstones')
                .maybeSingle();

            if (d2?.price) setServicePrice(d2.price);
        } catch { /* use default ₹49 */ }

        // Also check in-memory db
        const fromDb = db.services?.find((s: any) =>
            s.id === 'gemstones' || s.name === 'Gemstone Guide'
        );
        if (fromDb?.price) setServicePrice(fromDb.price);
    };

    const fetchStoreItems = async () => {
        setStoreLoading(true);
        try {
            const { data, error } = await supabase
                .from('v_store_items_with_stock')
                .select('*')
                .eq('category', 'crystals')
                .order('name');

            if (!error && data && data.length > 0) {
                setStoreItems(data);
                setStoreMode('store');  // ✅ Switch to store view when products exist
                console.log(`✅ Loaded ${data.length} crystal store items`);
            } else {
                setStoreMode('library'); // ✅ Fall back to knowledge library
                console.log('ℹ️ No store crystals found, showing knowledge library');
            }
        } catch (err) {
            console.error('⚠️ Store fetch failed, using knowledge library:', err);
            setStoreMode('library');
        } finally {
            setStoreLoading(false);
        }
    };

    // ── Audio ─────────────────────────────────────────────────

    const handleListenMantra = async () => {
        if (!result?.mantra?.sanskrit || isSpeaking || isAudioLoading) return;
        setIsAudioLoading(true);
        setError('');
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            if (audioCtxRef.current.state === 'suspended') await audioCtxRef.current.resume();
            const buf = await generateMantraAudio(result.mantra.sanskrit);
            const src = audioCtxRef.current.createBufferSource();
            src.buffer = buf;
            src.connect(audioCtxRef.current.destination);
            src.onended = () => { setIsSpeaking(false); audioSourceRef.current = null; };
            src.start();
            audioSourceRef.current = src;
            setIsSpeaking(true);
        } catch { setError("The Oracle's voice is distant. Please try again."); }
        finally { setIsAudioLoading(false); }
    };

    const stopMantra = () => {
        audioSourceRef.current?.stop();
        audioSourceRef.current = null;
        setIsSpeaking(false);
    };

    // ── Cart helpers ──────────────────────────────────────────

    const showToast = (msg: string) => {
        const el = document.createElement('div');
        el.className = 'fixed top-20 right-4 z-[200] bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-bold';
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    };

    const handleAddToCart = (item: any) => {
        if (item.stock_status === 'out_of_stock') return;
        const inCart = cart.find(c => c.id === item.id);
        if (inCart && inCart.quantity >= item.available_stock) {
            alert(`Only ${item.available_stock} units available.`); return;
        }
        addToCart({
            id: item.id,
            name: item.name,
            price: item.price,
            image: item.image_url,
            category: item.category,
            sku: item.sku,
            maxStock: item.available_stock,
        });
        showToast(`✅ ${item.name} added to cart!`);
    };

    // ── Oracle ────────────────────────────────────────────────

    const handleConsultOracle = async () => {
        if (!formData.name || !formData.dob || !formData.intent) {
            setError('Please complete all fields.'); return;
        }
        localStorage.setItem('glyph_user_details', JSON.stringify({ name: formData.name, dob: formData.dob }));
        setIsLoading(true);
        setProgress(0);
        setResult(null);
        setError('');
        setIsPaid(false);

        const timer = setInterval(() => setProgress(p => p >= 90 ? p : p + 5), 250);
        try {
            const apiResult = await getGemstoneGuidance(
                formData.name, formData.dob, formData.intent,
                language === 'hi' ? 'Hindi' : 'English'
            );
            clearInterval(timer);
            setProgress(100);
            setResult(apiResult);
            saveReading({
                type: 'astrology', title: `Gemstone for ${formData.intent}`,
                content: apiResult.fullReading, subtitle: apiResult.primaryGem?.name || 'Gemstone',
                image_url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=400',
            });
            setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 500);
        } catch (err: any) {
            clearInterval(timer);
            setProgress(0);
            setError(err.message || 'The oracle is silent. Please try again.');
        } finally { setIsLoading(false); }
    };

    const handleUnlockReport = () => {
        if (isPaymentOpenRef.current) return;
        isPaymentOpenRef.current = true;
        openPayment(
            () => {
                isPaymentOpenRef.current = false;
                setIsPaid(true);
                saveReading({
                    type: 'gemstone', title: `Gemstone Guide: ${result?.primaryGem?.name}`,
                    content: result?.fullReading || '', subtitle: result?.primaryGem?.name || 'Gemstone',
                    image_url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5',
                });
            },
            'Gemstone Guide',
            servicePrice
        );
        setTimeout(() => { isPaymentOpenRef.current = false; }, 30000);
    };

    // ── Theme shortcuts ───────────────────────────────────────

    const pageBg = isLight ? 'bg-gradient-to-br from-emerald-50 via-teal-50 to-amber-50' : 'bg-gradient-to-br from-gray-950 via-emerald-950/20 to-black';
    const cardBg = isLight ? 'bg-white/90 border-amber-200' : 'bg-gray-900/80 border-gray-700';
    const inputCls = `w-full rounded-lg p-3 text-sm border focus:ring-1 focus:ring-emerald-500 outline-none min-h-[44px] transition-all ${isLight ? 'bg-amber-50 border-amber-300 text-amber-900 placeholder-amber-400' : 'bg-black/50 border-gray-600 text-white placeholder-gray-600'}`;
    const labelCls = `block text-xs uppercase mb-1 font-bold tracking-wider ${isLight ? 'text-amber-700' : 'text-gray-400'}`;

    // ─────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────

    return (
        <div className={`min-h-screen py-6 px-4 transition-colors duration-300 ${pageBg}`}>
            <div className="max-w-6xl mx-auto">

                {/* ✅ Floating Cart — only visible in library/store mode */}
                {activeTab === 'library' && storeMode === 'store' && cartCount > 0 && (
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="fixed top-20 right-4 z-50 bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-full shadow-2xl transition-all active:scale-95"
                        aria-label="Open cart"
                    >
                        <ShoppingCart size={20} />
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                            {cartCount}
                        </span>
                    </button>
                )}

                <SmartBackButton label={t('backToHome')} className="mb-4 md:mb-6" />

                {/* Header */}
                <div className="text-center mb-6 md:mb-8">
                    <h1 className={`text-2xl md:text-4xl font-cinzel font-bold mb-2 ${isLight ? 'text-emerald-800' : 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200'
                        }`}>
                        Crystal Oracle & Mantra Guide
                    </h1>
                    <p className={`text-sm md:text-base font-lora ${isLight ? 'text-emerald-700' : 'text-amber-100/60'}`}>
                        Discover your power stone and sacred sound vibration.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex justify-center mb-6 md:mb-10">
                    <div className={`p-1 rounded-full border flex ${isLight ? 'bg-amber-100 border-amber-300' : 'bg-gray-900/80 border-amber-500/30'}`}>
                        {(['oracle', 'library'] as const).map(tab => (
                            <button key={tab} onClick={() => { setActiveTab(tab); setPlanetFilter('All'); }}
                                className={`px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold transition-all min-h-[40px] ${activeTab === tab
                                        ? 'bg-amber-600 text-white shadow-lg'
                                        : isLight ? 'text-amber-700 hover:text-amber-900' : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {tab === 'oracle' ? '🔮 Personal Reading' : '📚 Stone Library'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ══════════════════════════════════════
                    ORACLE TAB
                ══════════════════════════════════════ */}
                {activeTab === 'oracle' && (
                    <div className="flex flex-col gap-8 items-center">
                        {!result && !isLoading && (
                            <div className="w-full max-w-xl">
                                <Card className={`p-6 md:p-8 border-l-4 border-emerald-500 shadow-xl ${cardBg}`}>
                                    <h3 className={`text-lg md:text-xl font-bold mb-6 font-cinzel text-center border-b pb-4 ${isLight ? 'text-emerald-700 border-amber-200' : 'text-emerald-300 border-gray-700'}`}>
                                        Consult the Oracle
                                    </h3>
                                    <div className="space-y-5">
                                        <div>
                                            <label className={labelCls}>Your Name</label>
                                            <input ref={nameInputRef} value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className={inputCls} placeholder="Enter full name" />
                                        </div>
                                        <SmartDatePicker value={formData.dob} onChange={d => setFormData({ ...formData, dob: d })} />
                                        <div>
                                            <label className={labelCls}>What do you seek?</label>
                                            <textarea value={formData.intent}
                                                onChange={e => setFormData({ ...formData, intent: e.target.value })}
                                                className={`${inputCls} h-24 resize-none`}
                                                placeholder="e.g. Wealth, Health, Harmony, Love..." />
                                        </div>
                                        <Button onClick={handleConsultOracle} disabled={isLoading}
                                            className="w-full py-3 md:py-4 text-base md:text-lg bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-600 font-cinzel">
                                            Reveal My Gemstone
                                        </Button>
                                        {error && <p className={`text-sm text-center p-2 rounded border ${isLight ? 'text-red-700 bg-red-50 border-red-200' : 'text-red-400 bg-red-900/20 border-red-500/20'}`}>{error}</p>}
                                    </div>
                                </Card>
                            </div>
                        )}

                        {isLoading && (
                            <div className="w-full max-w-md mt-4">
                                <ProgressBar progress={progress} message="Analyzing Planetary Alignments..." />
                            </div>
                        )}

                        <div ref={resultRef} className="w-full max-w-5xl">
                            {result && !isLoading && (
                                <div className="space-y-6 md:space-y-8 animate-fade-in-up">
                                    <div className="flex justify-center">
                                        <button onClick={() => { setResult(null); setIsPaid(false); setError(''); }}
                                            className={`text-xs px-4 py-2 rounded-full border transition-all min-h-[36px] ${isLight ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' : 'border-gray-600 text-gray-400 hover:text-white'}`}>
                                            ← New Consultation
                                        </button>
                                    </div>

                                    {/* Gem + Mantra cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                        {/* Gemstone Card */}
                                        <div className={`rounded-2xl p-5 md:p-6 relative overflow-hidden shadow-2xl border ${isLight ? 'bg-white border-emerald-200' : 'bg-gradient-to-br from-gray-900 to-black border-emerald-500/40'}`}>
                                            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
                                            <div className="flex justify-between items-start mb-4">
                                                <h4 className={`text-xs uppercase tracking-[0.2em] font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Recommended Gemstone</h4>
                                                <span className="text-3xl md:text-4xl">💍</span>
                                            </div>
                                            <div className="flex items-center gap-4 mb-5">
                                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-700 shadow-[0_0_20px_rgba(16,185,129,0.4)] border-2 border-white/20 flex-shrink-0 animate-pulse-glow" />
                                                <div>
                                                    <h2 className={`text-2xl md:text-3xl font-cinzel font-black leading-tight ${isLight ? 'text-emerald-900' : 'text-white'}`}>{result.primaryGem?.name}</h2>
                                                    <p className={`text-base italic font-serif ${isLight ? 'text-emerald-600' : 'text-emerald-200'}`}>{result.primaryGem?.sanskritName}</p>
                                                </div>
                                            </div>
                                            <div className={`text-sm rounded-xl border p-4 space-y-3 font-lora ${isLight ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-white/5 border-white/10 text-gray-300'}`}>
                                                <p><strong className={`block text-xs uppercase mb-1 tracking-wider ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>Why this stone?</strong>{result.primaryGem?.reason}</p>
                                                <p><strong className={`block text-xs uppercase mb-1 tracking-wider ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>Wearing Method</strong>{result.primaryGem?.wearingMethod}</p>
                                            </div>
                                        </div>

                                        {/* Mantra Card */}
                                        <div className={`rounded-2xl p-5 md:p-6 relative overflow-hidden shadow-2xl border flex flex-col justify-between ${isLight ? 'bg-white border-purple-200' : 'bg-gradient-to-br from-gray-900 to-black border-purple-500/40'}`}>
                                            <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
                                            <div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <h4 className={`text-xs uppercase tracking-[0.2em] font-bold ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>Sacred Mantra</h4>
                                                    <span className="text-3xl md:text-4xl">🕉️</span>
                                                </div>
                                                <div className="text-center my-6">
                                                    <p className={`text-2xl md:text-4xl font-bold font-cinzel drop-shadow-md leading-relaxed py-2 ${isLight ? 'text-amber-800' : 'text-amber-100'}`}>{result.mantra?.sanskrit}</p>
                                                    <p className={`text-sm mt-2 italic font-lora ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>"{result.mantra?.pronunciation}"</p>
                                                    <p className={`text-xs mt-1 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>{result.mantra?.meaning}</p>
                                                </div>
                                            </div>
                                            <div className="flex justify-center">
                                                <button onClick={isSpeaking ? stopMantra : handleListenMantra} disabled={isAudioLoading}
                                                    className={`px-5 py-2 rounded-lg text-sm flex items-center gap-2 transition-all border min-h-[44px] ${isSpeaking ? 'bg-red-900/40 border-red-500/50 text-red-200' :
                                                            isLight ? 'bg-purple-100 border-purple-300 text-purple-700 hover:bg-purple-200' :
                                                                'bg-purple-900/30 hover:bg-purple-800/50 border-purple-500/30 text-purple-200'}`}>
                                                    {isAudioLoading ? <><span className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> Connecting...</> : isSpeaking ? '⏹️ Stop' : '🔊 Listen'}
                                                </button>
                                            </div>
                                            {error && <p className="text-[10px] text-red-400 text-center mt-2 font-mono">{error}</p>}
                                        </div>
                                    </div>

                                    {/* Payment / Report */}
                                    <div className="w-full">
                                        {!isPaid ? (
                                            <Card className={`p-6 md:p-8 text-center shadow-2xl border ${isLight ? 'bg-gradient-to-r from-emerald-100 to-teal-100 border-emerald-300' : 'bg-gradient-to-r from-emerald-900/80 to-teal-900/80 backdrop-blur-xl border-emerald-500/40'}`}>
                                                <h3 className={`text-xl md:text-2xl font-cinzel font-bold mb-3 ${isLight ? 'text-emerald-800' : 'text-emerald-200'}`}>Unlock Full Gemstone Report</h3>
                                                <div className={`text-base font-bold px-6 py-3 rounded-full inline-block mb-5 ${isLight ? 'bg-emerald-200 text-emerald-900' : 'bg-emerald-500/20 text-emerald-100'}`}>Just ₹{servicePrice}</div>
                                                <Button onClick={handleUnlockReport}
                                                    className="w-full py-4 md:py-5 text-base md:text-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 font-cinzel font-bold uppercase tracking-wide text-white hover:scale-[1.02] transition-all">
                                                    💎 Buy Gemstone Guide — ₹{servicePrice}
                                                </Button>
                                                {isAdmin && (
                                                    <button onClick={() => setIsPaid(true)}
                                                        className={`block mx-auto mt-4 px-4 py-2 text-xs rounded-full font-bold ${isLight ? 'bg-gray-200 text-amber-700' : 'bg-gray-800 text-amber-400'}`}>
                                                        🔓 Admin Bypass
                                                    </button>
                                                )}
                                            </Card>
                                        ) : (
                                            <div className={`rounded-2xl p-5 md:p-8 border ${isLight ? 'bg-white border-emerald-200' : 'bg-black/20 border-emerald-500/20'}`}>
                                                <FullReport reading={result.fullReading} title="Complete Gemstone & Mantra Guide" subtitle={result.primaryGem?.name || 'Gemstone'} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════
                    LIBRARY TAB
                ══════════════════════════════════════ */}
                {activeTab === 'library' && (
                    <div className="animate-fade-in-up">

                        {/* Sub-mode toggle — only shown when store has products */}
                        {storeMode === 'store' && !storeLoading && (
                            <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
                                <div className={`flex rounded-full p-1 border ${isLight ? 'bg-amber-100 border-amber-300' : 'bg-gray-900 border-gray-700'}`}>
                                    {(['library', 'store'] as const).map(m => (
                                        <button key={m} onClick={() => setStoreMode(m)}
                                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all min-h-[36px] ${storeMode === m
                                                    ? 'bg-emerald-600 text-white shadow'
                                                    : isLight ? 'text-amber-700' : 'text-gray-400 hover:text-white'
                                                }`}>
                                            {m === 'library' ? '📖 Knowledge' : '🛒 Buy Crystals'}
                                        </button>
                                    ))}
                                </div>
                                {/* Link to full store */}
                                <button onClick={() => navigate('/store')}
                                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full border transition-all ${isLight ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' : 'border-emerald-700 text-emerald-400 hover:bg-emerald-900/30'}`}>
                                    View Full Mystic Bazaar <ExternalLink size={12} />
                                </button>
                            </div>
                        )}

                        {/* Planet filter pills — shown in both modes */}
                        <div className="flex flex-wrap gap-2 mb-5">
                            {PLANET_FILTERS.map(p => (
                                <button key={p} onClick={() => setPlanetFilter(p)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all min-h-[36px] ${planetFilter === p
                                            ? 'bg-amber-600 text-white border-amber-500 shadow'
                                            : isLight ? 'bg-white border-amber-300 text-amber-700 hover:bg-amber-50' : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-amber-500'
                                        }`}>
                                    {p}
                                </button>
                            ))}
                        </div>

                        {/* ── LOADING ─────────────────────────────── */}
                        {storeLoading && (
                            <div className="flex justify-center py-20">
                                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}

                        {/* ── STORE MODE: Live Supabase products ──── */}
                        {!storeLoading && storeMode === 'store' && (
                            <>
                                {filteredStoreItems.length === 0 ? (
                                    <div className={`text-center py-16 ${isLight ? 'text-amber-500' : 'text-gray-500'}`}>
                                        <p className="text-4xl mb-3">💎</p>
                                        <p className="font-lora">No crystals found for this filter.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                                        {filteredStoreItems.map((item: any) => (
                                            <div key={item.id}
                                                className={`rounded-xl overflow-hidden border shadow-md transition-all hover:-translate-y-1 group flex flex-col ${isLight ? 'bg-white border-amber-200 hover:border-emerald-400' : 'bg-gray-900 border-gray-700 hover:border-emerald-500/50'}`}>
                                                {/* Image */}
                                                <div className="h-36 md:h-44 relative">
                                                    {item.image_url ? (
                                                        <OptimizedImage src={item.image_url} alt={item.name}
                                                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                                            containerClassName="w-full h-full" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center">
                                                            <span className="text-4xl">💎</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                                    {/* Stock badge */}
                                                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${item.stock_status === 'out_of_stock' ? 'bg-red-600 text-white' :
                                                            item.stock_status === 'low_stock' ? 'bg-amber-500 text-black' : 'bg-green-600 text-white'}`}>
                                                        {item.stock_status === 'out_of_stock' ? 'Sold Out' :
                                                            item.stock_status === 'low_stock' ? `Only ${item.available_stock} left` : 'In Stock'}
                                                    </div>
                                                    <div className="absolute bottom-2 left-3">
                                                        <span className="text-white font-bold font-cinzel text-sm block leading-tight">{item.name}</span>
                                                    </div>
                                                </div>
                                                {/* Info */}
                                                <div className="p-3 flex flex-col flex-grow">
                                                    <p className={`text-xs font-lora italic line-clamp-2 mb-3 flex-grow ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{item.description}</p>
                                                    <div className="flex items-center justify-between gap-2 mt-auto">
                                                        <span className={`text-base font-black font-mono ${isLight ? 'text-emerald-800' : 'text-white'}`}>
                                                            {getRegionalPrice ? getRegionalPrice(item.price).display : `₹${item.price}`}
                                                        </span>
                                                        <button onClick={() => handleAddToCart(item)}
                                                            disabled={item.stock_status === 'out_of_stock'}
                                                            className={`px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-wide transition-all active:scale-95 min-h-[36px] ${item.stock_status === 'out_of_stock'
                                                                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                                                }`}>
                                                            {item.stock_status === 'out_of_stock' ? 'Sold Out' : '+ Cart'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Cart summary bar */}
                                {cartCount > 0 && (
                                    <div className={`fixed bottom-0 left-0 right-0 z-40 p-4 border-t shadow-2xl flex items-center justify-between gap-4 ${isLight ? 'bg-white border-emerald-200' : 'bg-gray-900 border-emerald-700'}`}>
                                        <div>
                                            <p className={`text-xs font-bold ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{cartCount} item{cartCount > 1 ? 's' : ''} in cart</p>
                                            <p className={`text-lg font-black font-mono ${isLight ? 'text-emerald-800' : 'text-white'}`}>₹{totalPrice}</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={() => setIsCartOpen(true)}
                                                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold min-h-[44px]">
                                                View Cart
                                            </button>
                                            <button onClick={() => navigate('/store')}
                                                className={`px-4 py-2.5 rounded-xl border text-sm font-bold min-h-[44px] ${isLight ? 'border-emerald-300 text-emerald-700' : 'border-emerald-700 text-emerald-400'}`}>
                                                Checkout
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* ── LIBRARY MODE: Fallback knowledge cards ── */}
                        {!storeLoading && storeMode === 'library' && (
                            <>
                                {filteredLibraryGems.length === 0 ? (
                                    <div className={`text-center py-16 ${isLight ? 'text-amber-500' : 'text-gray-500'}`}>
                                        <p className="text-4xl mb-3">💎</p>
                                        <p className="font-lora">No gemstones found for this filter.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                                        {filteredLibraryGems.map((gem: any) => (
                                            <div key={gem.id} onClick={() => setSelectedGem(gem)}
                                                className={`rounded-xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1 shadow-md border group ${isLight ? 'bg-white border-amber-200 hover:border-emerald-400' : 'bg-gray-900 border-gray-700 hover:border-amber-500/50'}`}>
                                                <div className="h-36 md:h-40 relative">
                                                    {gem.image ? (
                                                        <OptimizedImage src={gem.image} alt={gem.name}
                                                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                                            containerClassName="w-full h-full" />
                                                    ) : (
                                                        <div className={`w-full h-full bg-gradient-to-br ${gem.color || 'from-amber-500 to-orange-700'} flex items-center justify-center`}>
                                                            <span className="text-4xl">💎</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                                    <div className="absolute bottom-2 left-3 right-3">
                                                        <span className="text-white font-bold font-cinzel text-sm block leading-tight">{gem.name}</span>
                                                        <span className="text-amber-400 text-[10px] uppercase font-bold tracking-widest">{gem.planet}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {/* ── GEM DETAIL MODAL (knowledge library) ── */}
                        {selectedGem && storeMode === 'library' && (
                            <Modal isVisible={!!selectedGem} onClose={() => setSelectedGem(null)}>
                                <div className={`p-5 md:p-6 ${isLight ? 'bg-white text-amber-900' : 'bg-gray-900 text-amber-50'}`}>
                                    {selectedGem.image ? (
                                        <div className="h-40 md:h-48 rounded-xl overflow-hidden mb-5 -mx-1">
                                            <OptimizedImage src={selectedGem.image} alt={selectedGem.name}
                                                className="w-full h-full object-cover" containerClassName="w-full h-full" />
                                        </div>
                                    ) : (
                                        <div className={`h-32 rounded-xl mb-5 bg-gradient-to-br ${selectedGem.color || 'from-amber-500 to-orange-700'} flex items-center justify-center`}>
                                            <span className="text-5xl">💎</span>
                                        </div>
                                    )}
                                    <h2 className={`text-2xl md:text-3xl font-bold font-cinzel mb-1 ${isLight ? 'text-emerald-900' : 'text-white'}`}>{selectedGem.name}</h2>
                                    <p className="text-amber-500 font-bold uppercase text-xs mb-4 tracking-widest">
                                        {selectedGem.planet}{selectedGem.chakra ? ` · ${selectedGem.chakra}` : ''}{selectedGem.day ? ` · Best day: ${selectedGem.day}` : ''}
                                    </p>
                                    <div className="space-y-4 text-sm font-lora">
                                        <div>
                                            <span className={`font-bold text-xs uppercase tracking-wider ${isLight ? 'text-emerald-700' : 'text-amber-500'}`}>Sanskrit</span>
                                            <p className={`mt-0.5 ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>{selectedGem.sanskrit}</p>
                                        </div>
                                        <div>
                                            <span className={`font-bold text-xs uppercase tracking-wider ${isLight ? 'text-emerald-700' : 'text-amber-500'}`}>Benefits</span>
                                            <p className={`mt-0.5 ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>{selectedGem.benefits}</p>
                                        </div>
                                        <div className={`p-4 rounded-xl border ${isLight ? 'bg-purple-50 border-purple-200' : 'bg-black/40 border-purple-500/30'}`}>
                                            <p className={`font-bold text-xs uppercase tracking-wider mb-2 ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>Sacred Mantra</p>
                                            <p className={`text-base md:text-lg font-cinzel ${isLight ? 'text-purple-900' : 'text-white'}`}>{selectedGem.mantra}</p>
                                        </div>
                                        {/* CTA to oracle */}
                                        <button onClick={() => { setSelectedGem(null); setActiveTab('oracle'); }}
                                            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold font-cinzel text-sm tracking-wide mt-2">
                                            🔮 Get My Personal {selectedGem.name} Reading
                                        </button>
                                    </div>
                                </div>
                            </Modal>
                        )}
                    </div>
                )}

                {/* ══════════════════════════════════════
                    MINI CART MODAL (for in-page purchases)
                ══════════════════════════════════════ */}
                {isCartOpen && (
                    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center p-0 md:p-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
                        <div className={`relative rounded-t-2xl md:rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-hidden border ${isLight ? 'bg-white border-emerald-200' : 'bg-gray-900 border-emerald-700/50'}`}>
                            {/* Header */}
                            <div className={`flex items-center justify-between p-4 border-b ${isLight ? 'border-emerald-100' : 'border-emerald-700/30'}`}>
                                <div className="flex items-center gap-2">
                                    <ShoppingCart className="text-emerald-400" size={20} />
                                    <h2 className={`text-lg font-bold font-cinzel ${isLight ? 'text-emerald-900' : 'text-white'}`}>Cart ({cartCount})</h2>
                                </div>
                                <button onClick={() => setIsCartOpen(false)}
                                    className="p-2 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100/10">
                                    ✕
                                </button>
                            </div>
                            {/* Items */}
                            <div className="overflow-y-auto max-h-[45vh] p-4 space-y-3">
                                {cart.map(item => (
                                    <div key={item.id} className={`flex gap-3 p-3 rounded-xl border ${isLight ? 'bg-emerald-50 border-emerald-100' : 'bg-black/40 border-emerald-700/30'}`}>
                                        {item.image && (
                                            <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden">
                                                <OptimizedImage src={item.image} alt={item.name} className="w-full h-full object-cover" containerClassName="w-full h-full" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-semibold text-sm truncate ${isLight ? 'text-gray-800' : 'text-white'}`}>{item.name}</p>
                                            <p className={`text-xs ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>₹{item.price}</p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="p-1.5 bg-emerald-600 rounded text-white min-w-[32px] min-h-[32px] flex items-center justify-center">
                                                    <Minus size={12} />
                                                </button>
                                                <span className={`font-bold text-sm w-6 text-center ${isLight ? 'text-gray-800' : 'text-white'}`}>{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="p-1.5 bg-emerald-600 rounded text-white min-w-[32px] min-h-[32px] flex items-center justify-center">
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-300 p-1 self-start">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {/* Footer */}
                            <div className={`p-4 border-t ${isLight ? 'border-emerald-100' : 'border-emerald-700/30'}`}>
                                <div className={`flex justify-between font-bold mb-4 ${isLight ? 'text-gray-800' : 'text-white'}`}>
                                    <span>Total:</span>
                                    <span>₹{totalPrice}</span>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={clearCart}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm min-h-[44px]">
                                        Clear
                                    </button>
                                    <button onClick={() => { setIsCartOpen(false); navigate('/store'); }}
                                        className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-sm min-h-[44px]">
                                        Checkout →
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default GemstoneGuide;
