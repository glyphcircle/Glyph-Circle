import React, { useState, useEffect } from 'react';
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

const ShubhMuhurat: React.FC = () => {
    const navigate = useNavigate();
    const { openPayment } = usePayment();
    const { user } = useAuth();

    // Form state
    const [formData, setFormData] = useState<ShubhMuhuratInput>({
        eventName: '',
        eventType: 'marriage',
        location: '',
        preferredDate: '',
        preferredTimeStart: '',
        preferredTimeEnd: '',
        additionalNotes: ''
    });

    // UI state
    const [isGenerating, setIsGenerating] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [currentReadingId, setCurrentReadingId] = useState<string | null>(null);
    const [report, setReport] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const REPORT_PRICE = 29;

    // Event type options
    const eventTypes = [
        { value: 'marriage', label: 'Marriage/Wedding', icon: '💍' },
        { value: 'business', label: 'Business Launch', icon: '🏢' },
        { value: 'housewarming', label: 'Housewarming (Griha Pravesh)', icon: '🏠' },
        { value: 'travel', label: 'Travel/Journey', icon: '✈️' },
        { value: 'education', label: 'Education/Vidyarambha', icon: '📚' },
        { value: 'vehicle', label: 'Vehicle Purchase', icon: '🚗' },
        { value: 'naming', label: 'Naming Ceremony', icon: '👶' },
        { value: 'thread', label: 'Thread Ceremony (Upanayana)', icon: '🕉️' },
        { value: 'surgery', label: 'Surgery/Medical', icon: '🏥' },
        { value: 'property', label: 'Property Purchase', icon: '🏘️' },
        { value: 'other', label: 'Other Event', icon: '🌟' }
    ];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerateReport = async () => {
        // Validation
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

        // Create initial reading in database
        const { id, error: createError } = await createShubhMuhuratReading(formData, REPORT_PRICE);

        if (createError || !id) {
            setError(createError || 'Failed to create reading');
            alert('Error: ' + (createError || 'Failed to create reading'));
            return;
        }

        setCurrentReadingId(id);

        // Open payment modal
        openPayment(
            async (paymentDetails) => {
                console.log('💳 Payment confirmed, generating report...', paymentDetails);
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
            // Update payment status
            const { success: paymentUpdateSuccess, error: paymentError } = await updateMuhuratPaymentStatus(
                readingId,
                paymentDetails
            );

            if (!paymentUpdateSuccess) {
                throw new Error(paymentError || 'Failed to update payment status');
            }

            // Generate complete report using AI
            console.log('🔮 Generating AI-powered Shubh Muhurat report...');
            const { success, report: generatedReport, error: reportError } = await generateCompleteMuhuratReport(
                readingId,
                formData
            );

            if (!success || !generatedReport) {
                throw new Error(reportError || 'Failed to generate report');
            }

            // Fetch the complete report from database
            const { data: fullReport, error: fetchError } = await getMuhuratReading(readingId);

            if (fetchError || !fullReport) {
                throw new Error(fetchError || 'Failed to fetch generated report');
            }

            console.log('✅ Report generated successfully!', fullReport);
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

    // Loading/Generating Screen
    if (isGenerating) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <div className="w-24 h-24 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                    <h2 className="text-3xl font-cinzel font-bold text-white mb-2">
                        🔮 Generating Your Shubh Muhurat Report
                    </h2>
                    <p className="text-purple-300 mb-4">
                        Analyzing planetary positions and auspicious timings...
                    </p>
                    <div className="space-y-2 text-sm text-gray-400">
                        <p>✨ Calculating Panchang...</p>
                        <p>🌙 Analyzing Nakshatra positions...</p>
                        <p>🪐 Determining planetary influences...</p>
                        <p>📅 Finding most auspicious dates...</p>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Report Display Screen
    if (showReport && report) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 p-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-8"
                    >
                        <h1 className="text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
                            {report.report_title}
                        </h1>
                        <p className="text-gray-400">
                            Generated on {new Date(report.generated_at).toLocaleDateString()}
                        </p>
                    </motion.div>

                    {/* Report Content */}
                    <div className="space-y-6">
                        {/* Recommended Muhurat */}
                        <ReportSection title="🌟 Best Recommended Muhurat" icon="⭐">
                            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-6 rounded-xl border-2 border-yellow-500/50">
                                <h3 className="text-2xl font-bold text-yellow-300 mb-3">
                                    {report.recommended_muhurat?.date}
                                </h3>
                                <p className="text-xl text-white mb-2">
                                    {report.recommended_muhurat?.startTime} - {report.recommended_muhurat?.endTime}
                                </p>
                                <p className="text-gray-300 mb-4">
                                    {report.recommended_muhurat?.reasoning}
                                </p>
                                {report.recommended_muhurat?.specialYogas?.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-sm text-yellow-200 font-semibold mb-2">Special Yogas:</p>
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
                        <ReportSection title="📅 Auspicious Dates & Times" icon="🗓️">
                            <div className="grid gap-4">
                                {report.auspicious_dates?.map((date: any, idx: number) => (
                                    <div key={idx} className="bg-black/30 p-4 rounded-xl border border-purple-500/30">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="text-lg font-bold text-white">{date.date}</h4>
                                                <p className="text-sm text-gray-400">{date.dayOfWeek}</p>
                                            </div>
                                            <span className="px-3 py-1 bg-purple-500/30 rounded-full text-xs text-purple-200">
                                                Rank #{date.rank}
                                            </span>
                                        </div>
                                        <p className="text-purple-300 text-sm mb-2">{date.timeSlot}</p>
                                        <div className="text-xs text-gray-400 space-y-1">
                                            <p>🌙 Nakshatra: {date.nakshatra}</p>
                                            <p>📖 Tithi: {date.tithi}</p>
                                        </div>
                                        <p className="text-sm text-gray-300 mt-2">{date.reason}</p>
                                    </div>
                                ))}
                            </div>
                        </ReportSection>

                        {/* Inauspicious Periods */}
                        {report.inauspicious_periods?.length > 0 && (
                            <ReportSection title="⚠️ Periods to Avoid" icon="🚫">
                                <div className="space-y-3">
                                    {report.inauspicious_periods.map((period: any, idx: number) => (
                                        <div key={idx} className="bg-red-900/20 p-4 rounded-xl border border-red-500/30">
                                            <h4 className="text-red-300 font-bold mb-1">{period.type}</h4>
                                            <p className="text-red-200 text-sm mb-2">
                                                {period.startTime} - {period.endTime}
                                            </p>
                                            <p className="text-gray-400 text-xs">{period.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </ReportSection>
                        )}

                        {/* Nakshatra Info */}
                        {report.nakshatra_info && (
                            <ReportSection title="🌙 Nakshatra Analysis" icon="⭐">
                                <div className="bg-black/30 p-6 rounded-xl border border-blue-500/30">
                                    <h4 className="text-xl font-bold text-blue-300 mb-2">{report.nakshatra_info.name}</h4>
                                    <p className="text-sm text-gray-400 mb-3">Deity: {report.nakshatra_info.deity}</p>
                                    <p className="text-gray-300">{report.nakshatra_info.characteristics}</p>
                                </div>
                            </ReportSection>
                        )}

                        {/* Remedies */}
                        {report.remedies?.length > 0 && (
                            <ReportSection title="🕉️ Remedies & Enhancers" icon="✨">
                                <ul className="space-y-2">
                                    {report.remedies.map((remedy: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-3 bg-black/30 p-3 rounded-lg">
                                            <span className="text-purple-400 mt-1">🔱</span>
                                            <span className="text-gray-300 text-sm">{remedy}</span>
                                        </li>
                                    ))}
                                </ul>
                            </ReportSection>
                        )}

                        {/* Do's and Don'ts */}
                        {report.do_and_donts?.length > 0 && (
                            <ReportSection title="✅ Do's and Don'ts" icon="📋">
                                <ul className="space-y-2">
                                    {report.do_and_donts.map((item: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-3 bg-black/30 p-3 rounded-lg">
                                            <span className={`mt-1 ${item.toLowerCase().includes('don') || item.toLowerCase().includes('avoid') ? 'text-red-400' : 'text-green-400'}`}>
                                                {item.toLowerCase().includes('don') || item.toLowerCase().includes('avoid') ? '❌' : '✅'}
                                            </span>
                                            <span className="text-gray-300 text-sm">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </ReportSection>
                        )}

                        {/* Lucky Elements */}
                        <ReportSection title="🍀 Lucky Elements" icon="💫">
                            <div className="grid md:grid-cols-2 gap-4">
                                {report.lucky_colors?.length > 0 && (
                                    <div className="bg-black/30 p-4 rounded-xl">
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
                                    <div className="bg-black/30 p-4 rounded-xl">
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

                        {/* Full Analysis (Collapsible) */}
                        <details className="bg-black/40 rounded-xl border border-purple-500/30 overflow-hidden">
                            <summary className="px-6 py-4 cursor-pointer font-bold text-white hover:bg-purple-500/10 transition-colors">
                                📜 View Complete Analysis
                            </summary>
                            <div className="px-6 py-4 text-sm text-gray-300 whitespace-pre-wrap">
                                {report.full_analysis}
                            </div>
                        </details>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 flex gap-4 justify-center">
                        <button
                            onClick={() => window.print()}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                        >
                            🖨️ Print Report
                        </button>
                        <button
                            onClick={() => {
                                setShowReport(false);
                                setReport(null);
                                setCurrentReadingId(null);
                                setFormData({
                                    eventName: '',
                                    eventType: 'marriage',
                                    location: '',
                                    preferredDate: '',
                                    preferredTimeStart: '',
                                    preferredTimeEnd: '',
                                    additionalNotes: ''
                                });
                            }}
                            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                        >
                            ← Generate New Report
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Input Form Screen
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 p-4 py-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
                        🕉️ Shubh Muhurat
                    </h1>
                    <p className="text-gray-400 text-sm">
                        Find the most auspicious timing for your important events
                    </p>
                </motion.div>

                {/* Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-purple-900/50 to-black/50 backdrop-blur-lg rounded-3xl p-6 border-2 border-purple-500/30 shadow-2xl"
                >
                    <form className="space-y-6">
                        {/* Event Name */}
                        <div>
                            <label className="block text-sm font-semibold text-purple-300 mb-2">
                                Event Name *
                            </label>
                            <input
                                type="text"
                                name="eventName"
                                value={formData.eventName}
                                onChange={handleInputChange}
                                placeholder="e.g., Wedding of Priya & Rahul"
                                className="w-full px-4 py-3 bg-black/50 border-2 border-purple-500/30 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                                required
                            />
                        </div>

                        {/* Event Type */}
                        <div>
                            <label className="block text-sm font-semibold text-purple-300 mb-2">
                                Event Type *
                            </label>
                            <select
                                name="eventType"
                                value={formData.eventType}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 bg-black/50 border-2 border-purple-500/30 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors"
                                required
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
                            <label className="block text-sm font-semibold text-purple-300 mb-2">
                                Location
                            </label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                placeholder="e.g., Mumbai, Maharashtra"
                                className="w-full px-4 py-3 bg-black/50 border-2 border-purple-500/30 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                            />
                        </div>

                        {/* Preferred Date */}
                        <div>
                            <label className="block text-sm font-semibold text-purple-300 mb-2">
                                Preferred Date (Optional)
                            </label>
                            <input
                                type="date"
                                name="preferredDate"
                                value={formData.preferredDate}
                                onChange={handleInputChange}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 bg-black/50 border-2 border-purple-500/30 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors"
                            />
                        </div>

                        {/* Preferred Time Range */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-purple-300 mb-2">
                                    Preferred Start Time
                                </label>
                                <input
                                    type="time"
                                    name="preferredTimeStart"
                                    value={formData.preferredTimeStart}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-black/50 border-2 border-purple-500/30 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-purple-300 mb-2">
                                    Preferred End Time
                                </label>
                                <input
                                    type="time"
                                    name="preferredTimeEnd"
                                    value={formData.preferredTimeEnd}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-black/50 border-2 border-purple-500/30 rounded-xl text-white focus:border-purple-500 focus:outline-none transition-colors"
                                />
                            </div>
                        </div>

                        {/* Additional Notes */}
                        <div>
                            <label className="block text-sm font-semibold text-purple-300 mb-2">
                                Additional Notes
                            </label>
                            <textarea
                                name="additionalNotes"
                                value={formData.additionalNotes}
                                onChange={handleInputChange}
                                placeholder="Any specific requirements or considerations..."
                                rows={4}
                                className="w-full px-4 py-3 bg-black/50 border-2 border-purple-500/30 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors resize-none"
                            />
                        </div>

                        {/* Price Info */}
                        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-4 rounded-xl border-2 border-yellow-500/50">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-yellow-200 font-semibold">Premium Muhurat Report</p>
                                    <p className="text-xs text-gray-400">Detailed analysis with remedies & recommendations</p>
                                </div>
                                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                                    ₹{REPORT_PRICE}
                                </p>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-900/30 border border-red-500 rounded-xl p-4">
                                <p className="text-red-300 text-sm">❌ {error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="button"
                            onClick={handleGenerateReport}
                            disabled={isGenerating}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold text-lg rounded-full shadow-lg hover:shadow-2xl transform hover:scale-105 disabled:transform-none transition-all uppercase tracking-wider"
                        >
                            {isGenerating ? (
                                <span className="flex items-center justify-center gap-3">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Generating...
                                </span>
                            ) : (
                                <>🔮 Generate Shubh Muhurat Report - ₹{REPORT_PRICE}</>
                            )}
                        </button>

                        <p className="text-xs text-center text-gray-500">
                            🔒 Secure payment • Instant report generation • Based on authentic Vedic principles
                        </p>
                    </form>
                </motion.div>
            </div>
        </div>
    );
};

// Report Section Component
const ReportSection: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30"
    >
        <h2 className="text-2xl font-cinzel font-bold text-white mb-4 flex items-center gap-2">
            <span>{icon}</span>
            <span>{title}</span>
        </h2>
        {children}
    </motion.div>
);

export default ShubhMuhurat;
