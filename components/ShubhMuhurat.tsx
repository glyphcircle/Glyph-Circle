import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePayment } from '../context/PaymentContext';
import { useAuth } from '../context/AuthContext';
import {
    createShubhMuhuratReading,
    updateMuhuratPaymentStatus,
    getMuhuratReading,
    ShubhMuhuratInput
} from '../services/shubhMuhuratService';
import { generateCompleteMuhuratReport } from '../services/muhuratReportGenerator';
import { motion } from 'framer-motion';
import SmartBackButton from './shared/SmartBackButton';
import { useTheme } from '../context/ThemeContext';

const ShubhMuhurat: React.FC = () => {
    const navigate = useNavigate();
    const { openPayment } = usePayment();
    const { user } = useAuth();
    const { theme } = useTheme();
    const isLight = theme.mode === 'light';

    const [formData, setFormData] = useState<ShubhMuhuratInput>({
        eventName: '',
        eventType: 'marriage',
        location: '',
        preferredDate: '',
        preferredTimeStart: '',
        preferredTimeEnd: '',
        additionalNotes: ''
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [currentReadingId, setCurrentReadingId] = useState<string | null>(null);
    const [report, setReport] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const REPORT_PRICE = 29;

    const eventTypes = [
        { value: 'marriage', label: 'Marriage / Wedding', icon: '💍' },
        { value: 'business', label: 'Business Launch', icon: '🏢' },
        { value: 'housewarming', label: 'Housewarming (Griha Pravesh)', icon: '🏠' },
        { value: 'travel', label: 'Travel / Journey', icon: '✈️' },
        { value: 'education', label: 'Education / Vidyarambha', icon: '📚' },
        { value: 'vehicle', label: 'Vehicle Purchase', icon: '🚗' },
        { value: 'naming', label: 'Naming Ceremony', icon: '👶' },
        { value: 'thread', label: 'Thread Ceremony (Upanayana)', icon: '🕉️' },
        { value: 'surgery', label: 'Surgery / Medical', icon: '🏥' },
        { value: 'property', label: 'Property Purchase', icon: '🏘️' },
        { value: 'other', label: 'Other Event', icon: '🌟' },
    ];

    const inputClass = `w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-colors min-h-[44px]
        ${isLight
            ? 'bg-white border-2 border-purple-300 text-gray-800 placeholder-gray-400 focus:border-purple-500'
            : 'bg-black/50 border-2 border-purple-500/30 text-white placeholder-gray-500 focus:border-purple-500'
        }`;

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerateReport = async () => {
        if (!formData.eventName.trim()) {
            alert('Please enter event name');
            return;
        }
        if (!user) {
            alert('Please log in to generate Shubh Muhurat report');
            navigate('/login');
            return;
        }

        setError(null);

        const { id, error: createError } = await createShubhMuhuratReading(formData, REPORT_PRICE);
        if (createError || !id) {
            setError(createError || 'Failed to create reading');
            return;
        }

        setCurrentReadingId(id);

        openPayment(
            async (paymentDetails) => {
                await handlePaymentSuccess(id, paymentDetails);
            },
            'Muhurat Report',
            REPORT_PRICE
        );
    };

    const handlePaymentSuccess = async (readingId: string, paymentDetails: any) => {
        setIsGenerating(true);
        setError(null);

        try {
            const { success: paymentUpdateSuccess, error: paymentError } =
                await updateMuhuratPaymentStatus(readingId, paymentDetails);

            if (!paymentUpdateSuccess) {
                throw new Error(paymentError || 'Failed to update payment status');
            }

            const { success, report: generatedReport, error: reportError } =
                await generateCompleteMuhuratReport(readingId, formData);

            if (!success || !generatedReport) {
                throw new Error(reportError || 'Failed to generate report');
            }

            const { data: fullReport, error: fetchError } = await getMuhuratReading(readingId);
            if (fetchError || !fullReport) {
                throw new Error(fetchError || 'Failed to fetch generated report');
            }

            setReport(fullReport);
            setShowReport(true);

        } catch (err: any) {
            console.error('❌ Error generating report:', err);
            setError(err.message || 'Failed to generate report');
            alert('Error generating report: ' + (err.message || 'Unknown error'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleReset = () => {
        setShowReport(false);
        setReport(null);
        setCurrentReadingId(null);
        setError(null);
        setFormData({
            eventName: '',
            eventType: 'marriage',
            location: '',
            preferredDate: '',
            preferredTimeStart: '',
            preferredTimeEnd: '',
            additionalNotes: ''
        });
    };

    // ── LOADING SCREEN ──────────────────────────────────────────────
    if (isGenerating) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 flex items-center justify-center p-4">
                <div className="text-center max-w-sm w-full">
                    <div className="w-20 h-20 md:w-24 md:h-24 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                    <h2 className="text-2xl md:text-3xl font-cinzel font-bold text-white mb-2">
                        🔮 Generating Your Report
                    </h2>
                    <p className="text-purple-300 text-sm mb-6">
                        Analyzing planetary positions and auspicious timings...
                    </p>
                    <div className="space-y-2 text-sm text-gray-400 text-left bg-black/30 rounded-2xl p-4 border border-purple-500/20">
                        {[
                            '✨ Calculating Panchang...',
                            '🌙 Analyzing Nakshatra positions...',
                            '🪐 Determining planetary influences...',
                            '📅 Finding most auspicious dates...',
                        ].map((step, i) => (
                            <p key={i} className="flex items-center gap-2">{step}</p>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ── REPORT SCREEN ────────────────────────────────────────────────
    if (showReport && report) {
        return (
            <div className={`min-h-screen p-4 py-8 ${isLight ? 'bg-gray-50' : 'bg-gradient-to-br from-purple-900 via-black to-indigo-900'}`}>
                <div className="max-w-4xl mx-auto">

                    <SmartBackButton label="Back to Home" className="mb-6" />

                    {/* Title */}
                    <div className="text-center mb-8 px-2">
                        <h1 className="text-2xl md:text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2 leading-tight">
                            {report.report_title}
                        </h1>
                        <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                            Generated on {new Date(report.generated_at).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'long', year: 'numeric'
                            })}
                        </p>
                    </div>

                    <div className="space-y-4 md:space-y-6">

                        {/* Best Muhurat */}
                        <ReportSection title="Best Recommended Muhurat" icon="🌟" isLight={isLight}>
                            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-4 md:p-6 rounded-xl border-2 border-yellow-500/50">
                                <h3 className="text-xl md:text-2xl font-bold text-yellow-300 mb-2">
                                    {report.recommended_muhurat?.date}
                                </h3>
                                <p className="text-lg md:text-xl text-white mb-2">
                                    {report.recommended_muhurat?.startTime} – {report.recommended_muhurat?.endTime}
                                </p>
                                <p className={`text-sm mb-4 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                                    {report.recommended_muhurat?.reasoning}
                                </p>
                                {report.recommended_muhurat?.specialYogas?.length > 0 && (
                                    <div>
                                        <p className="text-xs text-yellow-200 font-semibold mb-2">Special Yogas:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {report.recommended_muhurat.specialYogas.map((yoga: string, idx: number) => (
                                                <span key={idx} className="px-3 py-1 bg-yellow-500/30 rounded-full text-xs text-yellow-100">
                                                    {yoga}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ReportSection>

                        {/* Auspicious Dates */}
                        <ReportSection title="Auspicious Dates & Times" icon="📅" isLight={isLight}>
                            <div className="grid gap-3 md:gap-4">
                                {report.auspicious_dates?.map((date: any, idx: number) => (
                                    <div key={idx} className={`p-4 rounded-xl border ${isLight ? 'bg-purple-50 border-purple-200' : 'bg-black/30 border-purple-500/30'}`}>
                                        <div className="flex justify-between items-start mb-2 gap-2">
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`text-base md:text-lg font-bold truncate ${isLight ? 'text-gray-800' : 'text-white'}`}>
                                                    {date.date}
                                                </h4>
                                                <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {date.dayOfWeek}
                                                </p>
                                            </div>
                                            <span className="px-2 py-1 bg-purple-500/30 rounded-full text-xs text-purple-200 whitespace-nowrap flex-shrink-0">
                                                Rank #{date.rank}
                                            </span>
                                        </div>
                                        <p className="text-purple-300 text-sm mb-2">{date.timeSlot}</p>
                                        <div className={`text-xs space-y-1 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                            <p>🌙 Nakshatra: {date.nakshatra}</p>
                                            <p>📖 Tithi: {date.tithi}</p>
                                        </div>
                                        <p className={`text-sm mt-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                                            {date.reason}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </ReportSection>

                        {/* Inauspicious Periods */}
                        {report.inauspicious_periods?.length > 0 && (
                            <ReportSection title="Periods to Avoid" icon="⚠️" isLight={isLight}>
                                <div className="space-y-3">
                                    {report.inauspicious_periods.map((period: any, idx: number) => (
                                        <div key={idx} className="bg-red-900/20 p-4 rounded-xl border border-red-500/30">
                                            <h4 className="text-red-300 font-bold mb-1 text-sm md:text-base">
                                                {period.type}
                                            </h4>
                                            <p className="text-red-200 text-sm mb-1">
                                                {period.startTime} – {period.endTime}
                                            </p>
                                            <p className="text-gray-400 text-xs">{period.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </ReportSection>
                        )}

                        {/* Nakshatra Info */}
                        {report.nakshatra_info && (
                            <ReportSection title="Nakshatra Analysis" icon="🌙" isLight={isLight}>
                                <div className={`p-4 md:p-6 rounded-xl border ${isLight ? 'bg-blue-50 border-blue-200' : 'bg-black/30 border-blue-500/30'}`}>
                                    <h4 className="text-lg md:text-xl font-bold text-blue-300 mb-1">
                                        {report.nakshatra_info.name}
                                    </h4>
                                    <p className={`text-xs mb-3 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                        Deity: {report.nakshatra_info.deity}
                                    </p>
                                    <p className={`text-sm ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                                        {report.nakshatra_info.characteristics}
                                    </p>
                                </div>
                            </ReportSection>
                        )}

                        {/* Remedies */}
                        {report.remedies?.length > 0 && (
                            <ReportSection title="Remedies & Enhancers" icon="🕉️" isLight={isLight}>
                                <ul className="space-y-2">
                                    {report.remedies.map((remedy: string, idx: number) => (
                                        <li key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${isLight ? 'bg-purple-50' : 'bg-black/30'}`}>
                                            <span className="text-purple-400 mt-0.5 flex-shrink-0">🔱</span>
                                            <span className={`text-sm ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>{remedy}</span>
                                        </li>
                                    ))}
                                </ul>
                            </ReportSection>
                        )}

                        {/* Do's and Don'ts */}
                        {report.do_and_donts?.length > 0 && (
                            <ReportSection title="Do's and Don'ts" icon="✅" isLight={isLight}>
                                <ul className="space-y-2">
                                    {report.do_and_donts.map((item: string, idx: number) => {
                                        const isNegative = item.toLowerCase().includes("don't") ||
                                            item.toLowerCase().includes("dont") ||
                                            item.toLowerCase().includes('avoid');
                                        return (
                                            <li key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${isLight ? 'bg-gray-50' : 'bg-black/30'}`}>
                                                <span className={`flex-shrink-0 mt-0.5 ${isNegative ? 'text-red-400' : 'text-green-400'}`}>
                                                    {isNegative ? '❌' : '✅'}
                                                </span>
                                                <span className={`text-sm ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>{item}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </ReportSection>
                        )}

                        {/* Lucky Elements */}
                        <ReportSection title="Lucky Elements" icon="🍀" isLight={isLight}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {report.lucky_colors?.length > 0 && (
                                    <div className={`p-4 rounded-xl ${isLight ? 'bg-purple-50' : 'bg-black/30'}`}>
                                        <h4 className="text-sm font-bold text-purple-300 mb-3">Lucky Colors</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {report.lucky_colors.map((color: string, idx: number) => (
                                                <span key={idx} className="px-3 py-1 bg-purple-500/20 rounded-full text-xs text-purple-200">
                                                    {color}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {report.lucky_numbers?.length > 0 && (
                                    <div className={`p-4 rounded-xl ${isLight ? 'bg-pink-50' : 'bg-black/30'}`}>
                                        <h4 className="text-sm font-bold text-purple-300 mb-3">Lucky Numbers</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {report.lucky_numbers.map((num: number, idx: number) => (
                                                <span key={idx} className="px-3 py-2 bg-pink-500/20 rounded-lg text-sm font-bold text-pink-200">
                                                    {num}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ReportSection>

                        {/* Full Analysis — collapsible */}
                        <details className={`rounded-xl border overflow-hidden ${isLight ? 'bg-white border-purple-200' : 'bg-black/40 border-purple-500/30'}`}>
                            <summary className={`px-4 md:px-6 py-4 cursor-pointer font-bold text-sm md:text-base transition-colors select-none min-h-[44px] flex items-center ${isLight ? 'text-gray-800 hover:bg-purple-50' : 'text-white hover:bg-purple-500/10'}`}>
                                📜 View Complete Analysis
                            </summary>
                            <div className={`px-4 md:px-6 py-4 text-xs md:text-sm whitespace-pre-wrap leading-relaxed ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                                {report.full_analysis}
                            </div>
                        </details>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => window.print()}
                            style={{ touchAction: 'manipulation' }}
                            className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl font-semibold transition-all min-h-[44px] text-sm"
                        >
                            🖨️ Print Report
                        </button>
                        <button
                            onClick={handleReset}
                            style={{ touchAction: 'manipulation' }}
                            className="w-full sm:w-auto px-6 py-3 bg-gray-700 hover:bg-gray-600 active:scale-95 text-white rounded-xl font-semibold transition-all min-h-[44px] text-sm"
                        >
                            ← Generate New Report
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── INPUT FORM ───────────────────────────────────────────────────
    return (
        <div className={`min-h-screen p-4 py-8 ${isLight ? 'bg-gray-50' : 'bg-gradient-to-br from-purple-900 via-black to-indigo-900'}`}>
            <div className="max-w-2xl mx-auto">

                <SmartBackButton label="Back to Home" className="mb-6" />

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8 px-2"
                >
                    <h1 className="text-3xl md:text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
                        🕉️ Shubh Muhurat
                    </h1>
                    <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                        Find the most auspicious timing for your important events
                    </p>
                </motion.div>

                {/* Form Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`rounded-3xl p-5 md:p-8 border-2 shadow-2xl ${isLight
                        ? 'bg-white border-purple-200'
                        : 'bg-gradient-to-br from-purple-900/50 to-black/50 backdrop-blur-lg border-purple-500/30'
                        }`}
                >
                    <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>

                        {/* Event Name */}
                        <div>
                            <label className={`block text-sm font-semibold mb-2 ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>
                                Event Name <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                name="eventName"
                                value={formData.eventName}
                                onChange={handleInputChange}
                                placeholder="e.g., Wedding of Priya & Rahul"
                                className={inputClass}
                                autoComplete="off"
                            />
                        </div>

                        {/* Event Type */}
                        <div>
                            <label className={`block text-sm font-semibold mb-2 ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>
                                Event Type <span className="text-red-400">*</span>
                            </label>
                            <select
                                name="eventType"
                                value={formData.eventType}
                                onChange={handleInputChange}
                                className={inputClass}
                            >
                                {eventTypes.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.icon} {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Location */}
                        <div>
                            <label className={`block text-sm font-semibold mb-2 ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>
                                Location
                            </label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                placeholder="e.g., Mumbai, Maharashtra"
                                className={inputClass}
                                autoComplete="off"
                            />
                        </div>

                        {/* Preferred Date */}
                        <div>
                            <label className={`block text-sm font-semibold mb-2 ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>
                                Preferred Date
                                <span className={`ml-2 text-xs font-normal ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>(Optional)</span>
                            </label>
                            <input
                                type="date"
                                name="preferredDate"
                                value={formData.preferredDate}
                                onChange={handleInputChange}
                                min={new Date().toISOString().split('T')[0]}
                                className={inputClass}
                            />
                        </div>

                        {/* Time Range — stacked on mobile, side-by-side on md+ */}
                        <div>
                            <label className={`block text-sm font-semibold mb-2 ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>
                                Preferred Time Range
                                <span className={`ml-2 text-xs font-normal ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>(Optional)</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className={`text-xs mb-1 ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>Start Time</p>
                                    <input
                                        type="time"
                                        name="preferredTimeStart"
                                        value={formData.preferredTimeStart}
                                        onChange={handleInputChange}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <p className={`text-xs mb-1 ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>End Time</p>
                                    <input
                                        type="time"
                                        name="preferredTimeEnd"
                                        value={formData.preferredTimeEnd}
                                        onChange={handleInputChange}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Additional Notes */}
                        <div>
                            <label className={`block text-sm font-semibold mb-2 ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>
                                Additional Notes
                            </label>
                            <textarea
                                name="additionalNotes"
                                value={formData.additionalNotes}
                                onChange={handleInputChange}
                                placeholder="Any specific requirements or considerations..."
                                rows={3}
                                className={`${inputClass} resize-none`}
                            />
                        </div>

                        {/* Price Card */}
                        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-4 rounded-xl border-2 border-yellow-500/50">
                            <div className="flex justify-between items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-yellow-200 font-semibold">Premium Muhurat Report</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Detailed analysis with remedies & recommendations
                                    </p>
                                </div>
                                <p className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 flex-shrink-0">
                                    ₹{REPORT_PRICE}
                                </p>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-900/30 border border-red-500 rounded-xl p-4">
                                <p className="text-red-300 text-sm">❌ {error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="button"
                            onClick={handleGenerateReport}
                            disabled={isGenerating || !formData.eventName.trim()}
                            style={{ touchAction: 'manipulation' }}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700
                                disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed
                                text-white font-bold text-base rounded-full shadow-lg
                                hover:shadow-2xl active:scale-95 transition-all uppercase tracking-wider min-h-[56px]"
                        >
                            🔮 Generate Shubh Muhurat — ₹{REPORT_PRICE}
                        </button>

                        <p className={`text-xs text-center ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                            🔒 Secure payment • Instant report • Authentic Vedic principles
                        </p>
                    </form>
                </motion.div>
            </div>
        </div>
    );
};

// ── ReportSection ────────────────────────────────────────────────────
const ReportSection: React.FC<{
    title: string;
    icon: string;
    children: React.ReactNode;
    isLight: boolean;
}> = ({ title, icon, children, isLight }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-4 md:p-6 border ${isLight
            ? 'bg-white border-purple-200 shadow-sm'
            : 'bg-black/40 backdrop-blur-sm border-purple-500/30'
            }`}
    >
        <h2 className={`text-lg md:text-2xl font-cinzel font-bold mb-4 flex items-center gap-2 ${isLight ? 'text-gray-800' : 'text-white'}`}>
            <span>{icon}</span>
            <span>{title}</span>
        </h2>
        {children}
    </motion.div>
);

export default ShubhMuhurat;
