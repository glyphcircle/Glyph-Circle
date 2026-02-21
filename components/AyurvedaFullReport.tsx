import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../hooks/useTranslation'; // ✅ Your existing hook for UI
import { dynamicTranslation } from '../services/dynamicTranslationService'; // ✅ New service for AI content
import Card from './shared/Card';
import { Leaf, Sun, Wind, Droplets, Flame, Heart, Brain, Utensils, Dumbbell, Clock, Calendar } from 'lucide-react';

interface AyurvedaFullReportProps {
    dosha: string;
    breakdown: {
        vata: number;
        pitta: number;
        kapha: number;
    };
    diet: string[];
    fullReading: string;
}

const AyurvedaFullReport: React.FC<AyurvedaFullReportProps> = ({
    dosha,
    breakdown,
    diet,
    fullReading
}) => {
    const { theme } = useTheme();
    const { t, language } = useTranslation(); // ✅ For UI text like buttons, headers
    const isLight = theme.mode === 'light';

    // ✅ State for dynamically translated AI-generated content
    const [translatedReading, setTranslatedReading] = useState(fullReading);
    const [translatedDiet, setTranslatedDiet] = useState(diet);
    const [isTranslating, setIsTranslating] = useState(false);

    // ✅ Translate AI-generated content when language changes
    useEffect(() => {
        const translateContent = async () => {
            if (language === 'en') {
                setTranslatedReading(fullReading);
                setTranslatedDiet(diet);
                return;
            }

            setIsTranslating(true);

            try {
                // Translate the AI-generated reading
                const reading = await dynamicTranslation.translate(fullReading, language);
                setTranslatedReading(reading);

                // Translate diet items in batch
                const dietItems = await dynamicTranslation.translateBatch(diet, language);
                setTranslatedDiet(dietItems);
            } catch (error) {
                console.error('Translation error:', error);
                setTranslatedReading(fullReading);
                setTranslatedDiet(diet);
            } finally {
                setIsTranslating(false);
            }
        };

        translateContent();
    }, [language, fullReading, diet]);

    const doshaScores = [
        { name: 'Vata', score: breakdown.vata, icon: Wind, color: 'blue' },
        { name: 'Pitta', score: breakdown.pitta, icon: Flame, color: 'red' },
        { name: 'Kapha', score: breakdown.kapha, icon: Droplets, color: 'yellow' }
    ].sort((a, b) => b.score - a.score);

    const primaryDosha = doshaScores[0];
    const secondaryDosha = doshaScores[1];

    // ✅ Static content from JSON files
    const characteristics = [
        t('ayurveda.fullReport.characteristics.Kapha.0'),
        t('ayurveda.fullReport.characteristics.Kapha.1'),
        t('ayurveda.fullReport.characteristics.Kapha.2'),
        t('ayurveda.fullReport.characteristics.Kapha.3'),
        t('ayurveda.fullReport.characteristics.Kapha.4')
    ];

    return (
        <div className="space-y-6 animate-fade-in-up">

            {/* Header Section */}
            <Card className={`p-5 md:p-8 text-center ${isLight
                ? 'bg-gradient-to-br from-green-100 to-emerald-100 border-green-300'
                : 'bg-gradient-to-br from-green-900/50 to-emerald-900/50 border-green-500/30'
                }`}>
                <div className="flex items-center justify-center gap-3 mb-3">
                    <primaryDosha.icon className={`w-8 h-8 md:w-12 md:h-12 ${primaryDosha.color === 'blue' ? 'text-blue-500' :
                        primaryDosha.color === 'red' ? 'text-red-500' : 'text-yellow-600'
                        }`} />
                    <h2 className={`text-2xl md:text-4xl font-cinzel font-black ${isLight ? 'text-green-900' : 'text-white'
                        }`}>
                        {dosha} {t('ayurveda.fullReport.constitution')}
                    </h2>
                </div>
                <p className={`text-sm md:text-lg font-lora max-w-3xl mx-auto leading-relaxed ${isLight ? 'text-green-800' : 'text-green-200'
                    }`}>
                    {isTranslating ? (
                        <span className="opacity-50 animate-pulse">{t('ayurveda.analyzingMessage')}</span>
                    ) : translatedReading}
                </p>
            </Card>

            {/* Dosha Balance Chart */}
            <Card className={`p-5 md:p-8 ${isLight ? 'bg-white border-green-200' : 'bg-gray-900/50 border-green-500/20'
                }`}>
                <h3 className={`text-xl md:text-2xl font-cinzel font-bold mb-5 flex items-center gap-2 ${isLight ? 'text-gray-900' : 'text-white'
                    }`}>
                    <Brain className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                    {t('ayurveda.fullReport.doshaBalance')}
                </h3>

                {/* 3-col on md+, 1-col on mobile */}
                // Replace the entire doshaScores.map() block with this:
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    {doshaScores.map((d, idx) => (
                        <div key={d.name} className={`text-center p-4 md:p-6 rounded-xl overflow-hidden ${idx === 0
                            ? isLight
                                ? 'bg-green-100 border-2 border-green-500'
                                : 'bg-green-900/30 border-2 border-green-500'
                            : isLight ? 'bg-gray-50' : 'bg-gray-800/50'
                            }`}>
                            {/* Icon */}
                            <d.icon className={`w-10 h-10 sm:w-14 sm:h-14 mx-auto mb-3 ${d.color === 'blue' ? 'text-blue-500' :
                                d.color === 'red' ? 'text-red-500' : 'text-yellow-600'
                                }`} />

                            {/* Name — truncate long text, wrap on small screens */}
                            <h4 className={`text-sm sm:text-base md:text-xl font-bold mb-2 
                truncate w-full px-1 ${isLight ? 'text-gray-900' : 'text-white'
                                }`}>
                                {t(`ayurveda.fullReport.doshaNames.${d.name}`)}
                            </h4>

                            {/* Percentage */}
                            <div className={`text-2xl md:text-4xl font-black mb-1 ${d.color === 'blue' ? 'text-blue-600' :
                                d.color === 'red' ? 'text-red-600' : 'text-yellow-600'
                                }`}>
                                {d.score}%
                            </div>

                            {/* Primary badge */}
                            {idx === 0 && (
                                <span className={`block mt-1 text-xs font-bold uppercase 
                    tracking-wider truncate ${isLight ? 'text-green-700' : 'text-green-400'
                                    }`}>
                                    {t('ayurveda.fullReport.primary')}
                                </span>
                            )}
                        </div>
                    ))}
                </div>

            </Card>

            {/* Key Characteristics */}
            <Card className={`p-5 md:p-8 ${isLight ? 'bg-white border-green-200' : 'bg-gray-900/50 border-green-500/20'
                }`}>
                <h3 className={`text-xl md:text-2xl font-cinzel font-bold mb-5 flex items-center gap-2 ${isLight ? 'text-gray-900' : 'text-white'
                    }`}>
                    <Heart className="w-5 h-5 md:w-6 md:h-6 text-red-500" />

                    {t('ayurveda.fullReport.yourCharacteristics', { dosha: t(`ayurveda.fullReport.doshaNames.${primaryDosha.name}`) })}

                </h3>
                {/* 2-col on md+, 1-col on mobile */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {characteristics.map((char: string, idx: number) => (
                        <div key={idx} className={`flex items-start gap-3 p-3 md:p-4 
            rounded-lg ${isLight ? 'bg-green-50' : 'bg-green-900/20'}`}>
                            <span className="text-green-500 text-lg shrink-0 mt-0.5">✦</span>
                            <p className={`text-sm md:text-base leading-relaxed break-words 
                min-w-0 ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                                {char}
                            </p>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Dietary Recommendations */}
            <Card className={`p-5 md:p-8 ${isLight ? 'bg-white border-green-200' : 'bg-gray-900/50 border-green-500/20'
                }`}>
                <h3 className={`text-xl md:text-2xl font-cinzel font-bold mb-5 flex items-center gap-2 ${isLight ? 'text-gray-900' : 'text-white'
                    }`}>
                    <Utensils className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
                    {t('ayurveda.dietaryRecommendations')}
                </h3>
                <ul className={`space-y-2 text-sm md:text-base ${isLight ? 'text-gray-700' : 'text-gray-300'
                    }`}>
                    {translatedDiet.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <span className={`mt-0.5 shrink-0 ${isLight ? 'text-green-600' : 'text-green-400'
                                }`}>•</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </Card>

            {/* Disclaimer */}
            <Card className={`p-4 md:p-6 ${isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-900/20 border-amber-500/30'
                }`}>
                <p className={`text-xs md:text-sm text-center ${isLight ? 'text-amber-900' : 'text-amber-200'
                    }`}>
                    {t('ayurveda.fullReport.disclaimer')}
                </p>
            </Card>
        </div>
    );

};
export default AyurvedaFullReport;
