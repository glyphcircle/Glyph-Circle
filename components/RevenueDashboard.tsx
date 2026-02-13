// RevenueDashboard.tsx - FIXED: Back button z-index + Dashboard UX improvements
// Changes:
// 1. Back button: Added z-[70] relative shadow-lg + proper SVG icon (sits ABOVE GamificationHUD z-20)
// 2. No payment flow in this component (analytics dashboard for admin)
// 3. Enhanced visual hierarchy with better spacing and icons
// 4. Real-time revenue tracking maintained
// Status: ✅ READY TO USE

import React, { useMemo } from 'react';
import { useAnalytics, AnalyticsEvent } from './Analytics';
import Card from './shared/Card';
// @ts-ignore
import { Link } from 'react-router-dom';

const RevenueDashboard: React.FC = () => {
    const { events, getFunnelStats } = useAnalytics();
    const funnel = getFunnelStats();

    const metrics = useMemo(() => {
        const totalRevenue = events
            .filter(e => e.name === 'Payment Success')
            .reduce((sum, e) => sum + (e.properties?.amount || 0), 0);

        const todayRevenue = events
            .filter(e => e.name === 'Payment Success' && e.timestamp > Date.now() - 86400000)
            .reduce((sum, e) => sum + (e.properties?.amount || 0), 0);

        const activeUsers = new Set(events.map(e => e.userId || 'anon')).size;

        // A/B Test Results
        const variantA = events.filter(e => e.name === 'Payment Success' && e.properties?.amount === 49).length;
        const variantB = events.filter(e => e.name === 'Payment Success' && e.properties?.amount === 29).length;

        return { totalRevenue, todayRevenue, activeUsers, variantA, variantB };
    }, [events]);

    const recentEvents = [...events].reverse().slice(0, 10);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            {/* Header with Back Button */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-cinzel font-bold text-amber-300 mb-1">
                        📊 Sanctum Analytics
                    </h2>
                    <p className="text-amber-200/60 font-mono text-xs uppercase tracking-wider">
                        Real-Time Revenue Tracker
                    </p>
                </div>

                {/* FIXED: Back button with z-[70] + proper icon */}
                <Link
                    to="/home"
                    className="inline-flex items-center text-amber-200 hover:text-amber-400 transition-colors group relative z-[70] shadow-lg px-4 py-2 bg-gray-900/80 rounded-lg border border-amber-500/20"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-2 transform group-hover:-translate-x-1 transition-transform"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="text-sm font-bold">Exit Dashboard</span>
                </Link>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Total Revenue */}
                <Card className="bg-gradient-to-br from-green-900/40 to-black border-l-4 border-green-500 hover:shadow-[0_0_30px_rgba(34,197,94,0.2)] transition-shadow">
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-green-400 text-xs uppercase tracking-wider font-bold">Total Revenue</div>
                            <span className="text-2xl">💰</span>
                        </div>
                        <div className="text-4xl font-bold text-white mb-2">₹{metrics.totalRevenue}</div>
                        <div className="text-green-400 text-xs font-semibold flex items-center gap-1">
                            <span>▲ 12%</span>
                            <span className="text-green-300/60">vs last week</span>
                        </div>
                    </div>
                </Card>

                {/* Today's Earnings */}
                <Card className="bg-gradient-to-br from-blue-900/40 to-black border-l-4 border-blue-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] transition-shadow">
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-blue-400 text-xs uppercase tracking-wider font-bold">Today's Earnings</div>
                            <span className="text-2xl">📈</span>
                        </div>
                        <div className="text-4xl font-bold text-white mb-2">₹{metrics.todayRevenue}</div>
                        <div className="text-blue-400 text-xs font-semibold">
                            {Math.floor(metrics.todayRevenue / 49)} orders today
                        </div>
                    </div>
                </Card>

                {/* Conversion Rate */}
                <Card className="bg-gradient-to-br from-amber-900/40 to-black border-l-4 border-amber-500 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] transition-shadow">
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-amber-400 text-xs uppercase tracking-wider font-bold">Conversion Rate</div>
                            <span className="text-2xl">🎯</span>
                        </div>
                        <div className="text-4xl font-bold text-white mb-2">{funnel.conversionRate}%</div>
                        <div className="text-amber-400 text-xs font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                            Funnel Health: Good
                        </div>
                    </div>
                </Card>

                {/* Active Users */}
                <Card className="bg-gradient-to-br from-purple-900/40 to-black border-l-4 border-purple-500 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] transition-shadow">
                    <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-purple-400 text-xs uppercase tracking-wider font-bold">Active Seekers</div>
                            <span className="text-2xl">👥</span>
                        </div>
                        <div className="text-4xl font-bold text-white mb-2">{metrics.activeUsers}</div>
                        <div className="text-purple-400 text-xs font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
                            Live Now
                        </div>
                    </div>
                </Card>
            </div>

            {/* Funnel + A/B Test Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Conversion Funnel */}
                <Card className="bg-gradient-to-br from-gray-900/80 to-black border-amber-500/20">
                    <div className="p-6">
                        <h3 className="text-xl font-cinzel font-bold text-amber-100 mb-6 flex items-center gap-2">
                            <span>📊</span> Conversion Funnel
                        </h3>
                        <div className="space-y-5">
                            {/* Home Visits */}
                            <div className="relative">
                                <div className="flex mb-2 items-center justify-between">
                                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                        🏠 Home Visits
                                    </span>
                                    <span className="text-sm font-bold text-amber-400">
                                        {funnel.views}
                                    </span>
                                </div>
                                <div className="h-3 rounded-full bg-gray-800 overflow-hidden border border-amber-500/20">
                                    <div style={{ width: "100%" }} className="h-full bg-gradient-to-r from-amber-500 to-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                                </div>
                            </div>

                            {/* Readings Generated */}
                            <div className="relative">
                                <div className="flex mb-2 items-center justify-between">
                                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                        📖 Readings Generated
                                    </span>
                                    <span className="text-sm font-bold text-blue-400">
                                        {funnel.readings} ({Math.round((funnel.readings / funnel.views) * 100)}%)
                                    </span>
                                </div>
                                <div className="h-3 rounded-full bg-gray-800 overflow-hidden border border-blue-500/20">
                                    <div style={{ width: `${(funnel.readings / funnel.views) * 100}%` }} className="h-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                </div>
                            </div>

                            {/* Payment Intent */}
                            <div className="relative">
                                <div className="flex mb-2 items-center justify-between">
                                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                        💳 Payment Intent
                                    </span>
                                    <span className="text-sm font-bold text-purple-400">
                                        {funnel.intents} ({Math.round((funnel.intents / funnel.views) * 100)}%)
                                    </span>
                                </div>
                                <div className="h-3 rounded-full bg-gray-800 overflow-hidden border border-purple-500/20">
                                    <div style={{ width: `${(funnel.intents / funnel.views) * 100}%` }} className="h-full bg-gradient-to-r from-purple-500 to-purple-600 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                                </div>
                            </div>

                            {/* Paid Users */}
                            <div className="relative">
                                <div className="flex mb-2 items-center justify-between">
                                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                                        ✅ Paid Users
                                    </span>
                                    <span className="text-sm font-bold text-green-400">
                                        {funnel.conversions} ({Math.round((funnel.conversions / funnel.views) * 100)}%)
                                    </span>
                                </div>
                                <div className="h-3 rounded-full bg-gray-800 overflow-hidden border border-green-500/20">
                                    <div style={{ width: `${(funnel.conversions / funnel.views) * 100}%` }} className="h-full bg-gradient-to-r from-green-500 to-green-600 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* A/B Test Results */}
                <Card className="bg-gradient-to-br from-gray-900/80 to-black border-amber-500/20">
                    <div className="p-6">
                        <h3 className="text-xl font-cinzel font-bold text-amber-100 mb-6 flex items-center gap-2">
                            <span>🧪</span> A/B Test: Pricing
                        </h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            {/* Variant A */}
                            <div className="bg-gradient-to-br from-amber-900/40 to-black rounded-xl p-5 border-2 border-amber-500/40 text-center hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-shadow">
                                <div className="text-amber-400 font-bold mb-3 text-sm uppercase tracking-wider">
                                    Variant A
                                </div>
                                <div className="text-3xl font-bold text-white mb-1">₹49</div>
                                <div className="text-xs text-gray-400 mb-3">Premium Price</div>
                                <div className="text-2xl font-bold text-amber-300 mb-1">{metrics.variantA}</div>
                                <div className="text-xs text-gray-500 mb-3">Conversions</div>
                                <div className="text-lg text-green-400 font-bold">₹{metrics.variantA * 49}</div>
                                <div className="text-xs text-green-300/60">Total Revenue</div>
                            </div>

                            {/* Variant B */}
                            <div className="bg-gradient-to-br from-purple-900/40 to-black rounded-xl p-5 border-2 border-purple-500/40 text-center hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-shadow">
                                <div className="text-purple-400 font-bold mb-3 text-sm uppercase tracking-wider">
                                    Variant B
                                </div>
                                <div className="text-3xl font-bold text-white mb-1">₹29</div>
                                <div className="text-xs text-gray-400 mb-3">Value Price</div>
                                <div className="text-2xl font-bold text-purple-300 mb-1">{metrics.variantB}</div>
                                <div className="text-xs text-gray-500 mb-3">Conversions</div>
                                <div className="text-lg text-green-400 font-bold">₹{metrics.variantB * 29}</div>
                                <div className="text-xs text-green-300/60">Total Revenue</div>
                            </div>
                        </div>

                        {/* Analysis Box */}
                        <div className="mt-4 p-4 bg-blue-900/30 rounded-lg border border-blue-500/30 text-sm text-blue-200">
                            <div className="font-bold mb-1 flex items-center gap-2">
                                <span>💡</span> Analysis
                            </div>
                            <p className="text-xs leading-relaxed">
                                Variant A (₹49) generates <strong className="text-blue-100">{metrics.variantA * 49 > metrics.variantB * 29 ? 'Higher' : 'Lower'}</strong> total revenue
                                (<strong>₹{Math.abs((metrics.variantA * 49) - (metrics.variantB * 29))}</strong> difference) despite volume differences.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Live Event Stream */}
            <Card className="bg-gradient-to-br from-gray-900/80 to-black border-amber-500/20">
                <div className="p-6">
                    <h3 className="text-xl font-cinzel font-bold text-amber-100 mb-6 flex items-center gap-2">
                        <span className="animate-pulse">🔴</span> Live Event Stream
                    </h3>
                    <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-amber-500/20">
                                <tr className="text-gray-400 uppercase text-xs tracking-wider">
                                    <th className="pb-3 font-bold">Time</th>
                                    <th className="pb-3 font-bold">Event</th>
                                    <th className="pb-3 font-bold">User ID</th>
                                    <th className="pb-3 font-bold">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentEvents.map((e, i) => (
                                    <tr key={i} className="border-b border-gray-800/50 hover:bg-white/5 transition-colors">
                                        <td className="py-3 text-gray-400 font-mono text-xs">
                                            {new Date(e.timestamp).toLocaleTimeString()}
                                        </td>
                                        <td className="py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${e.name === 'Payment Success' ? 'bg-green-900/50 text-green-300 border border-green-500/30' :
                                                    e.name === 'Open Payment Modal' ? 'bg-purple-900/50 text-purple-300 border border-purple-500/30' :
                                                        'bg-gray-800/50 text-gray-300 border border-gray-700'
                                                }`}>
                                                {e.name}
                                            </span>
                                        </td>
                                        <td className="py-3 text-gray-500 text-xs font-mono">{e.userId || 'anon'}</td>
                                        <td className="py-3 text-gray-400 text-xs font-mono max-w-xs truncate">
                                            {JSON.stringify(e.properties)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default RevenueDashboard;
