// MuhuratPicker.tsx - FIXED: Back button z-index + Payment button clarity
// Changes:
// 1. Back button: Added z-[70] relative shadow-lg + proper SVG icon (sits ABOVE GamificationHUD z-20)
// 2. Payment button: Uses dynamic servicePrice (not hardcoded 49)
// 3. Payment call: Added console.log for debugging + proper service name 'muhurat'
// 4. Added fallback for result.fullReading
// Status: ✅ READY TO USE

import React, { useState } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import Card from './shared/Card';
import Button from './shared/Button';
import { useTranslation } from '../hooks/useTranslation';
import { getMuhurat } from '../services/aiService';
import { SmartDatePicker } from './SmartAstroInputs';
import FullReport from './FullReport';
import { useAuth } from '../context/AuthContext';
import { useDb } from '../hooks/useDb';
import { usePayment } from '../context/PaymentContext';

const MuhuratPicker: React.FC = () => {
    const { t, language } = useTranslation();
    const { openPayment } = usePayment();
    const { db } = useDb();

    const [activity, setActivity] = useState('');
    const [date, setDate] = useState('');
    const [result, setResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPaid, setIsPaid] = useState(false);

    const handleCalculate = async () => {
        if (!activity || !date) return;
        setIsLoading(true);
        try {
            const res = await getMuhurat(activity, date, language);
            console.log('[MuhuratPicker] getMuhurat result:', res);
            setResult(res);
        } catch (error) {
            console.error('[MuhuratPicker] Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const serviceConfig = db.services?.find((s: any) => s.id === 'muhurat');
    const servicePrice = serviceConfig?.price || 29;

    return (
        <div className="min-h-screen py-8 px-4">
            {/* FIXED: Back button with z-[70] + proper icon */}
            <Link
                to="/home"
                className="inline-flex items-center text-amber-200 hover:text-amber-400 transition-colors mb-6 group relative z-[70] shadow-lg"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 transform group-hover:-translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t('backToHome')}
            </Link>

            <div className="max-w-2xl mx-auto">
                <Card className="p-8 bg-gray-900/90 border-amber-500/30">
                    <h1 className="text-3xl font-cinzel font-bold text-amber-300 text-center mb-6">
                        Shubh Muhurat
                    </h1>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-gray-400 uppercase mb-1 font-bold tracking-wider">
                                Activity
                            </label>
                            <input
                                value={activity}
                                onChange={e => setActivity(e.target.value)}
                                className="w-full bg-black/50 border border-gray-600 rounded p-3 text-white focus:border-amber-500 transition-all placeholder-gray-600"
                                placeholder="e.g. Buying Car, Starting Business"
                            />
                        </div>
                        <div>
                            <SmartDatePicker value={date} onChange={setDate} />
                        </div>
                        <Button
                            onClick={handleCalculate}
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600 shadow-lg py-3"
                        >
                            {isLoading ? 'Calculating...' : '🕉️ Find Best Time'}
                        </Button>
                    </div>
                </Card>

                {result && (
                    <div className="mt-8 animate-fade-in-up">
                        <Card className="p-6 bg-gradient-to-br from-green-900/40 to-black/60 border-green-500/30 text-center backdrop-blur-md">
                            <h3 className="text-xl font-bold text-green-400 mb-2">
                                {result.rating} Time Found
                            </h3>
                            <div className="text-4xl font-cinzel font-black text-white mb-4">
                                {result.bestTime}
                            </div>
                            <p className="text-gray-300 font-lora italic mb-6 leading-relaxed">
                                "{result.reason}"
                            </p>

                            {!isPaid ? (
                                <Button
                                    onClick={() => {
                                        console.log('🕉️ [Muhurat] Buy clicked, price:', servicePrice);
                                        openPayment(
                                            (paymentDetails) => {
                                                console.log('✅ Muhurat payment success:', paymentDetails);
                                                setIsPaid(true);
                                            },
                                            'muhurat',
                                            servicePrice  // ✅ Uses dynamic price (not hardcoded)
                                        );
                                    }}
                                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-4 px-6 rounded-lg shadow-xl transform hover:scale-105 transition-all text-lg"
                                >
                                    🕉️ Buy Muhurat Report - ₹{servicePrice}
                                </Button>
                            ) : (
                                <FullReport
                                    reading={result?.fullReading || result?.reason || 'No detailed report available.'}
                                    title="Muhurat Analysis"
                                    subtitle={`${result.rating} Time: ${result.bestTime}`}
                                />
                            )}
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MuhuratPicker;
