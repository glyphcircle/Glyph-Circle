// Matchmaking.tsx — Theme-aware + Time of Birth + Accurate Moon Nakshatra

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from './shared/Card';
import Button from './shared/Button';
import ProgressBar from './shared/ProgressBar';
import { useTheme } from '../context/ThemeContext';
import { SmartDatePicker } from './SmartAstroInputs';
import NakshatraSelector, { NAKSHATRAS } from './shared/NakshatraSelector';
import MatchmakingResult from './shared/MatchmakingResult';

// ── Ashta Koota Tables ──────────────────────────────────────────────────────
const VARNA = [3, 0, 3, 2, 0, 1, 2, 3, 0, 0, 1, 3, 2, 1, 1, 2, 3, 0, 0, 1, 3, 2, 1, 1, 2, 3, 2];
const YONI = [0, 1, 2, 3, 4, 5, 0, 6, 7, 8, 9, 10, 11, 12, 9, 13, 6, 7, 8, 1, 2, 12, 3, 4, 5, 10, 11];
const YONI_GENDER = [0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 1];
const GANA = [0, 2, 0, 0, 0, 2, 0, 0, 2, 2, 1, 0, 0, 2, 0, 1, 0, 2, 2, 1, 0, 0, 2, 1, 1, 0, 0];
const RASI_LORD = ['Mars', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jup', 'Sat', 'Merc', 'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jup', 'Sat', 'Merc', 'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jup', 'Sat', 'Merc'];
const NADI = [0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2];

const FRIEND: Record<string, string[]> = {
    Sun: ['Moon', 'Mars', 'Jup'],
    Moon: ['Sun', 'Merc'],
    Mars: ['Sun', 'Moon', 'Jup'],
    Merc: ['Sun', 'Venus'],
    Jup: ['Sun', 'Moon', 'Mars'],
    Venus: ['Merc', 'Sat'],
    Sat: ['Merc', 'Venus'],
    Rahu: ['Venus', 'Sat'],
    Ketu: ['Mars', 'Venus'],
};
const isNeutral = (a: string, b: string) =>
    !FRIEND[a]?.includes(b) && !FRIEND[b]?.includes(a);

interface KutaBreakdown {
    varna: number; yoni: number; gana: number;
    maitri: number; bhakoot: number; nadi: number;
    total: number;
}

// ── Precise Moon Nakshatra using DOB + TOB ─────────────────────────────────
export const getMoonNakshatraFromDobTob = (dob: string, tob?: string): string | null => {
    if (!dob) return null;
    try {
        const timeStr = tob && tob.length >= 4 ? tob : '12:00';
        const date = new Date(`${dob}T${timeStr}:00`);
        const JD = date.getTime() / 86400000 + 2440587.5;
        const T = (JD - 2451545.0) / 36525;

        // Moon mean longitude + equation of centre
        const L = (218.3165 + 481267.8813 * T);
        const M = ((134.963 + 477198.867 * T) % 360) * Math.PI / 180;
        const tropical = (L + 6.289 * Math.sin(M) + 3600) % 360;

        // Lahiri Ayanamsa
        const ayanamsa = 23.85 + (T * 100 * 50.29 / 3600);
        const sidereal = ((tropical - ayanamsa) % 360 + 360) % 360;

        const idx = Math.floor(sidereal / (360 / 27));
        return NAKSHATRAS[Math.min(idx, 26)];
    } catch { return null; }
};

// ── Kutas Calculation ──────────────────────────────────────────────────────
const calculateKutas = (boyIdx: number, girlIdx: number): KutaBreakdown => {
    const varna = VARNA[boyIdx] >= VARNA[girlIdx] ? 1 : 0;

    let yoni = 0;
    if (YONI[boyIdx] === YONI[girlIdx]) {
        yoni = YONI_GENDER[boyIdx] !== YONI_GENDER[girlIdx] ? 4 : 2;
    } else { yoni = 1; }

    const gana_table = [[6, 5, 1], [5, 6, 0], [1, 0, 6]];
    const gana = gana_table[GANA[boyIdx]][GANA[girlIdx]];

    const bL = RASI_LORD[boyIdx];
    const gL = RASI_LORD[girlIdx];
    let maitri = 0;
    if (bL === gL) maitri = 5;
    else if (FRIEND[bL]?.includes(gL) && FRIEND[gL]?.includes(bL)) maitri = 5;
    else if (FRIEND[bL]?.includes(gL) || FRIEND[gL]?.includes(bL)) maitri = 4;
    else if (isNeutral(bL, gL)) maitri = 3;
    else maitri = 1;

    const boyRasi = Math.floor(boyIdx / 2.25);
    const girlRasi = Math.floor(girlIdx / 2.25);
    const dist1 = ((boyRasi - girlRasi + 12) % 12) + 1;
    const dist2 = ((girlRasi - boyRasi + 12) % 12) + 1;
    const badDist = [6, 8, 5, 9, 2, 12];
    const bhakoot = (badDist.includes(dist1) || badDist.includes(dist2)) ? 0 : 7;

    const nadi = NADI[boyIdx] !== NADI[girlIdx] ? 8 : 0;
    const total = varna + yoni + gana + maitri + bhakoot + nadi;
    return { varna, yoni, gana, maitri, bhakoot, nadi, total };
};

// ── Theme-aware input class helper ────────────────────────────────────────
const useInputClass = (isLight: boolean, accent: 'blue' | 'pink') => {
    const focusRing = accent === 'blue'
        ? 'focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30'
        : 'focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30';
    const border = accent === 'blue' ? 'border-blue-500/30' : 'border-pink-500/30';

    return isLight
        ? `w-full border ${border} rounded-xl p-4 outline-none transition-colors ${focusRing}
       bg-white text-gray-800 placeholder-gray-400`
        : `w-full border ${border} rounded-xl p-4 outline-none transition-colors ${focusRing}
       bg-white/5 text-white placeholder-gray-500`;
};

// ── Component ──────────────────────────────────────────────────────────────
const Matchmaking: React.FC = () => {
    const { theme } = useTheme();
    const isLight = theme.mode === 'light';

    const [boyName, setBoyName] = useState('');
    const [girlName, setGirlName] = useState('');
    const [boyNak, setBoyNak] = useState(NAKSHATRAS[0]);
    const [girlNak, setGirlNak] = useState(NAKSHATRAS[0]);
    const [boyDob, setBoyDob] = useState('');
    const [girlDob, setGirlDob] = useState('');
    const [boyTob, setBoyTob] = useState('');  // ← NEW
    const [girlTob, setGirlTob] = useState('');  // ← NEW

    const [result, setResult] = useState<KutaBreakdown | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    // Theme-aware styles
    const pageBg = isLight
        ? 'bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50'
        : 'bg-[#050510]';

    const cardBgAlpha = isLight
        ? 'bg-white/80 border border-blue-200 shadow-blue-100/50'
        : 'bg-white/5 border border-blue-500/20';

    const cardBgOmega = isLight
        ? 'bg-white/80 border border-pink-200 shadow-pink-100/50'
        : 'bg-white/5 border border-pink-500/20';

    const labelClass = isLight
        ? 'block text-[10px] text-gray-500 uppercase font-black tracking-widest mb-2 ml-1'
        : 'block text-[10px] text-gray-400 uppercase font-black tracking-widest mb-2 ml-1';

    const headingAlpha = isLight ? 'text-blue-700' : 'text-blue-300';
    const headingOmega = isLight ? 'text-pink-700' : 'text-pink-300';
    const divider = isLight ? 'border-gray-200' : 'border-white/5';

    const inputBlue = useInputClass(isLight, 'blue');
    const inputPink = useInputClass(isLight, 'pink');

    // Select needs extra styling for native arrow
    const selectBlue = inputBlue + ' cursor-pointer';
    const selectPink = inputPink + ' cursor-pointer';

    const calculateCompatibility = () => {
        setIsLoading(true);
        setProgress(0);
        setResult(null);

        const timer = setInterval(() =>
            setProgress(prev => prev >= 90 ? prev : prev + 10), 300);

        setTimeout(() => {
            clearInterval(timer);
            setProgress(100);
            const boyIdx = NAKSHATRAS.indexOf(boyNak);
            const girlIdx = NAKSHATRAS.indexOf(girlNak);
            setResult(calculateKutas(boyIdx, girlIdx));
            setIsLoading(false);
        }, 3000);
    };

    const isValid = boyName.trim() && girlName.trim() && boyDob && girlDob;

    return (
        <div className={`relative min-h-screen ${pageBg} pt-12 pb-24 overflow-x-hidden transition-colors duration-300`}>

            {/* Subtle decorative background — dark mode only */}
            {!isLight && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-10  w-1 h-1 bg-white/20 rounded-full animate-pulse" />
                    <div className="absolute top-40 right-20 w-1 h-1 bg-blue-300/30 rounded-full animate-pulse delay-300" />
                    <div className="absolute top-60 left-1/3 w-0.5 h-0.5 bg-pink-300/20 rounded-full animate-pulse delay-700" />
                    <div className="absolute top-80 right-1/3 w-1 h-1 bg-white/10 rounded-full animate-pulse delay-1000" />
                </div>
            )}

            <div className="max-w-6xl mx-auto px-4 relative z-10">

                {/* Back */}
                <Link
                    to="/home"
                    className={`inline-flex items-center transition-all mb-12 group relative z-[70]
            ${isLight ? 'text-amber-700 hover:text-amber-900' : 'text-amber-200 hover:text-amber-400'}`}
                >
                    <span className="text-2xl mr-3 group-hover:-translate-x-2 transition-transform">←</span>
                    <span className="font-cinzel font-black uppercase tracking-widest text-xs">Exit Sanctuary</span>
                </Link>

                {/* Header */}
                <div className="flex flex-col items-center text-center mb-16">
                    <div className="relative w-32 h-32 mb-10 flex items-center justify-center">
                        <div className="absolute inset-0 bg-red-500/20 rounded-full blur-2xl animate-pulse" />
                        <div className="w-32 h-32 bg-black/10 rounded-full border-4 border-red-500/50 flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.4)]">
                            <span className="text-6xl animate-pulse">❤️</span>
                        </div>
                    </div>
                    <h1 className={`text-4xl sm:text-5xl md:text-6xl font-cinzel font-black uppercase tracking-widest mb-4
            ${isLight ? 'text-gray-800' : 'text-white'}`}>
                        Vedic <span className="text-red-500">Matchmaking</span>
                    </h1>
                    <p className={`font-lora italic text-lg max-w-xl mx-auto
            ${isLight ? 'text-gray-600' : 'text-amber-100/60'}`}>
                        Ashta Koota Guna Milan — The Ancient Science of Relational Alignment.
                    </p>
                </div>

                {/* Input Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* ── SEEKER ALPHA ── */}
                    <Card className={`imperial-card p-8 sm:p-10 border-l-4 border-blue-500 rounded-[2.5rem] shadow-xl ${cardBgAlpha}`}>
                        <h3 className={`text-xl sm:text-2xl font-cinzel font-black mb-8 uppercase tracking-widest border-b pb-4 ${headingAlpha} ${divider}`}>
                            Seeker Alpha
                        </h3>
                        <div className="space-y-5">

                            {/* Name */}
                            <div>
                                <label className={labelClass}>Name</label>
                                <input
                                    value={boyName}
                                    onChange={e => setBoyName(e.target.value)}
                                    className={inputBlue}
                                    placeholder="Enter full name"
                                />
                            </div>

                            {/* DOB */}
                            <div>
                                <label className={labelClass}>Date of Birth</label>
                                <SmartDatePicker value={boyDob} onChange={setBoyDob} />
                            </div>

                            {/* TOB — NEW */}
                            <div>
                                <label className={labelClass}>
                                    Time of Birth
                                    <span className={`ml-2 font-normal normal-case tracking-normal text-[9px] italic
                    ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                                        (optional — improves accuracy)
                                    </span>
                                </label>
                                <input
                                    type="time"
                                    value={boyTob}
                                    onChange={e => setBoyTob(e.target.value)}
                                    className={inputBlue}
                                />
                            </div>

                            {/* Nakshatra */}
                            <NakshatraSelector
                                dob={boyDob}
                                tob={boyTob}
                                value={boyNak}
                                onChange={setBoyNak}
                                accentColor="blue"
                                isLight={isLight}
                            />
                        </div>
                    </Card>

                    {/* ── SEEKER OMEGA ── */}
                    <Card className={`imperial-card p-8 sm:p-10 border-r-4 border-pink-500 rounded-[2.5rem] shadow-xl ${cardBgOmega}`}>
                        <h3 className={`text-xl sm:text-2xl font-cinzel font-black mb-8 uppercase tracking-widest border-b pb-4 ${headingOmega} ${divider}`}>
                            Seeker Omega
                        </h3>
                        <div className="space-y-5">

                            {/* Name */}
                            <div>
                                <label className={labelClass}>Name</label>
                                <input
                                    value={girlName}
                                    onChange={e => setGirlName(e.target.value)}
                                    className={inputPink}
                                    placeholder="Enter full name"
                                />
                            </div>

                            {/* DOB */}
                            <div>
                                <label className={labelClass}>Date of Birth</label>
                                <SmartDatePicker value={girlDob} onChange={setGirlDob} />
                            </div>

                            {/* TOB — NEW */}
                            <div>
                                <label className={labelClass}>
                                    Time of Birth
                                    <span className={`ml-2 font-normal normal-case tracking-normal text-[9px] italic
                    ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                                        (optional — improves accuracy)
                                    </span>
                                </label>
                                <input
                                    type="time"
                                    value={girlTob}
                                    onChange={e => setGirlTob(e.target.value)}
                                    className={inputPink}
                                />
                            </div>

                            {/* Nakshatra */}
                            <NakshatraSelector
                                dob={girlDob}
                                tob={girlTob}
                                value={girlNak}
                                onChange={setGirlNak}
                                accentColor="pink"
                                isLight={isLight}
                            />
                        </div>
                    </Card>
                </div>

                {/* CTA */}
                <div className="mt-16 text-center">
                    <Button
                        onClick={calculateCompatibility}
                        disabled={isLoading || !isValid}
                        className="px-10 sm:px-16 py-5 sm:py-6 bg-gradient-to-r from-blue-600 via-red-600 to-pink-600 rounded-full text-base sm:text-lg font-cinzel font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30 text-white"
                    >
                        {isLoading ? 'Merging Astral Charts...' : 'Execute Alignment Check'}
                    </Button>
                </div>

                {isLoading && <ProgressBar progress={progress} message="Calculating Ashta Koota Gunas..." />}

                {/* Result */}
                {result !== null && !isLoading && (
                    <MatchmakingResult
                        result={result}
                        boyName={boyName}
                        girlName={girlName}
                        boyNak={boyNak}
                        girlNak={girlNak}
                        isLight={isLight}
                    />
                )}

            </div>
        </div>
    );
};

export default Matchmaking;
