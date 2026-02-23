// NakshatraSelector.tsx
// Auto-calculates Janma Nakshatra from DOB, allows manual override

import React, { useEffect, useState } from 'react';
import { getMoonNakshatraFromDobTob } from '../Matchmaking';
const NAKSHATRAS = [
    'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
    'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
    'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
    'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
    'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

// ── Vedic Moon Position (Lahiri Ayanamsa) ─────────────────────────────────
// Accurate to ±1 Nakshatra without birth time — sufficient for Guna Milan
const getMoonNakshatraFromDob = (dob: string): string | null => {
    if (!dob) return null;
    try {
        const date = new Date(dob + 'T12:00:00'); // noon assumption
        const JD = date.getTime() / 86400000 + 2440587.5;
        const T = (JD - 2451545.0) / 36525;

        // Mean Moon longitude
        const L = (218.3165 + 481267.8813 * T) % 360;
        // Equation of centre correction
        const M = ((134.963 + 477198.867 * T) % 360) * Math.PI / 180;
        const tropical = (L + 6.289 * Math.sin(M) + 360) % 360;

        // Lahiri Ayanamsa
        const ayanamsa = 23.85 + (T * 100 * 50.29 / 3600);
        const sidereal = (tropical - ayanamsa + 360) % 360;

        const idx = Math.floor(sidereal / (360 / 27)); // 27 Nakshatras × 13.33°
        return NAKSHATRAS[Math.min(idx, 26)];
    } catch {
        return null;
    }
};

// ── Component ──────────────────────────────────────────────────────────────
interface NakshatraSelectorProps {
    dob: string;
    tob?: string;
    value: string;
    onChange: (nak: string) => void;
    accentColor?: 'blue' | 'pink';
    isLight?: boolean;
}


const NakshatraSelector: React.FC<NakshatraSelectorProps> = ({
    dob,
    tob = '',
    value,
    onChange,
    accentColor = 'blue',
    isLight = false,
}) => {

    const [autoNak, setAutoNak] = useState<string | null>(null);
    const [isManual, setIsManual] = useState(false);

    const borderColor = accentColor === 'pink' ? 'border-pink-500/30 focus:border-pink-500' : 'border-blue-500/30 focus:border-blue-500';
    const badgeBg = accentColor === 'pink'
        ? isLight
            ? 'bg-pink-100 text-pink-700 border-pink-300'
            : 'bg-pink-900/40 text-pink-300 border-pink-500/30'
        : isLight
            ? 'bg-blue-100 text-blue-700 border-blue-300'
            : 'bg-blue-900/40 text-blue-300 border-blue-500/30';


    // Auto-calculate whenever DOB changes
    useEffect(() => {
        if (!dob) { setAutoNak(null); return; }
        const calculated = getMoonNakshatraFromDobTob(dob, tob); // ← pass tob
        setAutoNak(calculated);
        if (!isManual && calculated) onChange(calculated);
    }, [dob, tob]); // ← add tob to deps

    const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = e.target.value;
        if (autoNak && selected === autoNak) {
            // User re-selected the auto value — treat as clearing manual override
            setIsManual(false);
        } else {
            setIsManual(true);
        }
        onChange(selected);
    };

    const handleResetToAuto = () => {
        if (autoNak) {
            setIsManual(false);
            onChange(autoNak);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className={`block text-[10px] uppercase font-black tracking-widest ml-1
                    ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                    Birth Star (Nakshatra)
                </label>


                {/* Status badge */}
                {dob && (
                    <div className="flex items-center gap-2">
                        {isManual ? (
                            <>
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 border border-amber-500/30 font-black uppercase tracking-wider">
                                    ✏️ Manual
                                </span>
                                {autoNak && (
                                    <button
                                        type="button"
                                        onClick={handleResetToAuto}
                                        className="text-[9px] text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors"
                                        title={`Reset to calculated: ${autoNak}`}
                                    >
                                        reset to {autoNak}
                                    </button>
                                )}
                            </>
                        ) : autoNak ? (
                            <span className={`text-[9px] px-2 py-0.5 rounded-full border font-black uppercase tracking-wider ${badgeBg}`}>
                                ✨ Auto-detected
                            </span>
                        ) : null}
                    </div>
                )}
            </div>

            <select
                value={value}
                onChange={handleSelect}
                className={`w-full border ${borderColor} rounded-xl p-4 outline-none transition-colors cursor-pointer
                    ${isLight
                        ? 'bg-white text-gray-800'
                        : 'bg-white/5 text-white'
                    }`}
            >

                {/* If no DOB yet, show a hint option */}
                {!dob && (
                    <option value="" disabled>
                        Enter DOB above to auto-detect
                    </option>
                )}
                {NAKSHATRAS.map(n => (
                    <option key={n} value={n}>
                        {n}{autoNak === n && !isManual ? ' ✦ (calculated)' : ''}
                    </option>
                ))}
            </select>

            {/* Helper text */}
            {!dob && (
                <p className={`text-[10px] ml-1 italic ${isLight ? 'text-gray-500' : 'text-gray-600'}`}>
                    Enter date of birth to auto-calculate, or select manually below.
                </p>

            )}
            {dob && autoNak && isManual && (
                <p className="text-[10px] text-amber-600/70 ml-1 italic">
                    Using your selection. Calculated star was {autoNak}.
                </p>
            )}
        </div>
    );
};

export { NAKSHATRAS, getMoonNakshatraFromDob };
export default NakshatraSelector;
