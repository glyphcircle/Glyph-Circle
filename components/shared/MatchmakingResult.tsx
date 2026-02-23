// MatchmakingResult.tsx — Rich Ashta Koota Result Display

import React, { useState } from 'react';

interface KutaBreakdown {
    varna: number; yoni: number; gana: number;
    maitri: number; bhakoot: number; nadi: number;
    total: number;
}

interface MatchmakingResultProps {
    result: KutaBreakdown;
    boyName: string;
    girlName: string;
    boyNak: string;
    girlNak: string;
}

// ── Kuta metadata: description + what score means ─────────────────────────
const KUTA_INFO: Record<string, {
    icon: string;
    fullName: string;
    desc: string;
    goodMsg: string;
    badMsg: string;
}> = {
    varna: {
        icon: '🔱',
        fullName: 'Varna Koota (Spiritual Compatibility)',
        desc: 'Reflects the spiritual and ego compatibility between the two souls. Determines if both partners support each other\'s dharmic growth.',
        goodMsg: 'Both partners share aligned spiritual purpose and mutual respect.',
        badMsg: 'One partner may feel spiritually unsupported or undervalued by the other.',
    },
    yoni: {
        icon: '🦁',
        fullName: 'Yoni Koota (Instinctual & Physical Compatibility)',
        desc: 'Represents physical attraction, sexual compatibility, and instinctual nature. Derived from the animal symbols of each Nakshatra.',
        goodMsg: 'Strong physical chemistry and natural instinctual harmony.',
        badMsg: 'Physical temperaments may differ, requiring conscious effort for intimacy.',
    },
    gana: {
        icon: '🌿',
        fullName: 'Gana Koota (Temperament Compatibility)',
        desc: 'Classifies each person as Deva (divine), Manushya (human), or Rakshasa (fierce). Mismatched Ganas can lead to clashes in daily temperament.',
        goodMsg: 'Both share the same temperamental nature — daily life flows harmoniously.',
        badMsg: 'Temperaments differ significantly. Patience and understanding are essential.',
    },
    maitri: {
        icon: '🤝',
        fullName: 'Maitri Koota (Mental & Friendship Compatibility)',
        desc: 'Based on the friendship between the ruling planets of both Moon signs. Determines mental understanding, communication, and friendship.',
        goodMsg: 'A deep natural friendship and mental understanding underlies this bond.',
        badMsg: 'Mental wavelengths may not align naturally — communication will need nurturing.',
    },
    bhakoot: {
        icon: '🌙',
        fullName: 'Bhakoot Koota (Destiny & Wealth Compatibility)',
        desc: 'Examines the Rasi distance between partners. Certain distances (6-8, 5-9, 2-12) are traditionally considered inauspicious for health and wealth.',
        goodMsg: 'The cosmic distance between your signs supports shared growth and prosperity.',
        badMsg: 'The 6-8 or 2-12 Rasi distance may create karmic friction. Remedies are advised.',
    },
    nadi: {
        icon: '⚡',
        fullName: 'Nadi Koota (Health & Genetic Compatibility)',
        desc: 'The most critical Koota (worth 8 points). Same Nadi indicates similar physiological nature, which Vedic tradition links to health challenges in offspring.',
        goodMsg: 'Different Nadis — the highest health and genetic compatibility. Most auspicious.',
        badMsg: 'Same Nadi detected (Nadi Dosha). Traditional remedies and consultation with a Jyotishi is strongly advised.',
    },
};

const getVerdict = (total: number) => {
    if (total >= 28) return {
        emoji: '💫', label: 'Excellent Union', sanskrit: 'Uttam Milan',
        color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200',
        gauge: 'bg-green-500',
        message: 'A rare and blessed cosmic alignment. The stars wholeheartedly support this union. Proceed with joy and confidence — this bond carries the blessings of both dharma and love.',
    };
    if (total >= 24) return {
        emoji: '✨', label: 'Very Good Match', sanskrit: 'Ati Uttam',
        color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200',
        gauge: 'bg-blue-500',
        message: 'A strong and auspicious match. Minor areas of friction exist but the overall cosmic harmony is highly favorable. With mutual respect and love, this union will flourish.',
    };
    if (total >= 18) return {
        emoji: '🌤️', label: 'Good Compatibility', sanskrit: 'Madhyam Milan',
        color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200',
        gauge: 'bg-amber-500',
        message: 'A workable and sincere match. Some Kutas indicate areas needing conscious effort. With understanding, communication, and perhaps Vedic remedies, this partnership holds meaningful potential.',
    };
    if (total >= 12) return {
        emoji: '⚠️', label: 'Moderate Match', sanskrit: 'Sadharan Milan',
        color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200',
        gauge: 'bg-orange-400',
        message: 'Significant differences in cosmic temperament. This does not mean the relationship is impossible — love transcends numbers. However, consulting a qualified Jyotishi for remedies and guidance is strongly recommended.',
    };
    return {
        emoji: '🔴', label: 'Incompatible', sanskrit: 'Adham Milan',
        color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200',
        gauge: 'bg-red-500',
        message: 'The Ashta Koota analysis indicates significant cosmic incompatibility. Vedic tradition recommends specific remedies (Puja, Mantra, Nadi Dosha Nivarana) before proceeding. Please consult a learned Jyotishi.',
    };
};

// ── Component ──────────────────────────────────────────────────────────────
const MatchmakingResult: React.FC<MatchmakingResultProps> = ({
    result, boyName, girlName, boyNak, girlNak
}) => {
    const [expandedKuta, setExpandedKuta] = useState<string | null>(null);
    const verdict = getVerdict(result.total);
    const percentage = Math.round((result.total / 36) * 100);

    const kutas = [
        { key: 'varna', score: result.varna, max: 1 },
        { key: 'yoni', score: result.yoni, max: 4 },
        { key: 'gana', score: result.gana, max: 6 },
        { key: 'maitri', score: result.maitri, max: 5 },
        { key: 'bhakoot', score: result.bhakoot, max: 7 },
        { key: 'nadi', score: result.nadi, max: 8 },
    ];

    return (
        <div className="mt-20 animate-fade-in-up px-2 space-y-6 max-w-2xl mx-auto">

            {/* ── MAIN SCORE CARD ── */}
            <div className={`rounded-[2.5rem] shadow-2xl border-2 ${verdict.border} ${verdict.bg} p-8 sm:p-12 text-center relative overflow-hidden`}>
                {/* Decorative corners */}
                <span className="absolute top-4 left-5 text-2xl opacity-20">❂</span>
                <span className="absolute top-4 right-5 text-2xl opacity-20">❂</span>

                <p className="text-gray-500 text-[10px] font-cinzel font-black uppercase tracking-[0.4em] mb-3">
                    Total Karmic Resonance
                </p>

                {/* Score */}
                <div className="flex items-end justify-center gap-3 mb-4">
                    <span className="text-7xl sm:text-8xl font-black text-[#2d0a18] font-cinzel leading-none">
                        {result.total}
                    </span>
                    <span className="text-2xl text-gray-400 mb-2 font-cinzel">/ 36</span>
                </div>

                {/* Gauge Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-6 overflow-hidden">
                    <div
                        className={`h-3 rounded-full transition-all duration-1000 ${verdict.gauge}`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>

                <div className="text-4xl mb-2">{verdict.emoji}</div>
                <h3 className={`text-2xl sm:text-3xl font-cinzel font-black uppercase tracking-widest mb-1 ${verdict.color}`}>
                    {verdict.label}
                </h3>
                <p className="text-sm text-gray-500 font-lora italic mb-6">{verdict.sanskrit}</p>

                {/* Verdict message */}
                <p className="text-sm sm:text-base font-lora italic leading-relaxed text-gray-700 max-w-lg mx-auto border-t border-black/10 pt-6">
                    "{verdict.message}"
                </p>

                {/* Names */}
                <p className="text-[10px] font-cinzel font-black text-gray-400 mt-6 uppercase tracking-widest">
                    {boyName} × {girlName}
                </p>
                <p className="text-[9px] font-cinzel text-gray-400 tracking-wider mt-1">
                    {boyNak} ✦ {girlNak}
                </p>
            </div>

            {/* ── KUTA BREAKDOWN — Expandable ── */}
            <div className="bg-[#fffcf0] rounded-[2rem] shadow-xl border border-amber-200 overflow-hidden">
                <div className="p-6 border-b border-amber-100">
                    <h4 className="text-center font-cinzel font-black uppercase tracking-widest text-[#4a0404] text-lg">
                        Ashta Koota Breakdown
                    </h4>
                    <p className="text-center text-[10px] text-gray-400 font-lora italic mt-1">
                        Tap any Koota to learn more
                    </p>
                </div>

                <div className="divide-y divide-amber-100">
                    {kutas.map(({ key, score, max }) => {
                        const info = KUTA_INFO[key];
                        const isExpanded = expandedKuta === key;
                        const isFull = score === max;
                        const isZero = score === 0;
                        const scoreColor = isZero ? 'text-red-600' : isFull ? 'text-green-700' : 'text-amber-600';
                        const barColor = isZero ? 'bg-red-400' : isFull ? 'bg-green-500' : 'bg-amber-400';

                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setExpandedKuta(isExpanded ? null : key)}
                                className="w-full text-left px-6 py-4 hover:bg-amber-50 transition-colors"
                            >
                                {/* Row */}
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className="text-xl flex-shrink-0">{info.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-cinzel font-black uppercase tracking-wider text-gray-700 truncate">
                                                {info.fullName.split('(')[0].trim()}
                                            </p>
                                            {/* Mini progress bar */}
                                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                                                <div
                                                    className={`h-1.5 rounded-full ${barColor} transition-all duration-700`}
                                                    style={{ width: max > 0 ? `${(score / max) * 100}%` : '0%' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className={`font-cinzel font-black text-base ${scoreColor}`}>
                                            {score} / {max}
                                        </span>
                                        <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                                    </div>
                                </div>

                                {/* Expanded detail */}
                                {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-amber-100 text-left space-y-3 animate-fade-in-up">
                                        <p className="text-[11px] font-cinzel font-black text-amber-700 uppercase tracking-widest">
                                            {info.fullName}
                                        </p>
                                        <p className="text-sm font-lora text-gray-600 leading-relaxed italic">
                                            {info.desc}
                                        </p>
                                        <div className={`flex items-start gap-2 p-3 rounded-xl ${isZero ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
                                            <span className="text-base flex-shrink-0">{isZero ? '⚠️' : '✅'}</span>
                                            <p className={`text-xs font-lora leading-relaxed ${isZero ? 'text-red-700' : 'text-green-700'}`}>
                                                {isZero ? info.badMsg : info.goodMsg}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── REMEDY CARD (shows only if score < 18 or Nadi Dosha) ── */}
            {(result.total < 18 || result.nadi === 0) && (
                <div className="bg-gradient-to-br from-[#2d0a18] to-[#4a0404] rounded-[2rem] p-8 shadow-2xl border border-amber-600/20 text-center">
                    <p className="text-amber-300 font-cinzel font-black uppercase tracking-widest text-sm mb-3">
                        🕉️ Vedic Remedies Advised
                    </p>
                    <p className="text-amber-100/80 font-lora italic text-sm leading-relaxed mb-6">
                        {result.nadi === 0
                            ? 'Nadi Dosha is present. Tradition prescribes Nadi Dosha Nivarana Puja, chanting of Maha Mrityunjaya Mantra, and Swarna (gold) daan before marriage.'
                            : 'Some Kutas show friction. A qualified Jyotishi can prescribe personalized remedies including gemstone recommendations, mantras, and auspicious timing.'
                        }
                    </p>
                    <p className="text-[10px] font-cinzel text-amber-300/50 uppercase tracking-[0.3em]">
                        Consult a Learned Jyotishi for Personalized Guidance
                    </p>
                </div>
            )}

            {/* ── DISCLAIMER ── */}
            <p className="text-center text-[9px] text-gray-600 font-lora italic px-4 pb-4">
                This analysis is based on Ashta Koota Guna Milan using Janma Nakshatra.
                A complete Vedic compatibility assessment also includes Mangal Dosha,
                Dasama Bhava analysis, and individual chart examination.
            </p>

        </div>
    );
};

export default MatchmakingResult;
