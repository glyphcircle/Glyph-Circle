import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { dbService } from '../services/db';

interface LogEntry {
    id: number;
    timestamp: string;
    type: 'log' | 'warn' | 'error';
    message: string;
    data?: any;
}

export const DebugConsole: React.FC = () => {
    const { theme } = useTheme();
    const isLight = theme.mode === 'light';
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isEnabled, setIsEnabled] = useState(false); // ✅ NEW: Check if enabled
    const logIdCounter = useRef(0);
    const consoleRef = useRef<HTMLDivElement>(null);

    // ✅ Check if debug console is enabled in admin config
    useEffect(() => {
        const checkEnabled = async () => {
            try {
                const enabled = await dbService.getConfigValue('debug_console_enabled');
                setIsEnabled(enabled === 'true' || enabled === true);
            } catch (err) {
                console.debug('Debug console config not set, defaulting to disabled');
                setIsEnabled(false);
            }
        };

        checkEnabled();

        // Poll every 5 seconds to check if admin changed the setting
        const interval = setInterval(checkEnabled, 5000);
        return () => clearInterval(interval);
    }, []);

    // Intercept console methods
    useEffect(() => {
        if (!isEnabled) return; // ✅ Don't intercept if disabled

        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        const addLog = (type: 'log' | 'warn' | 'error', args: any[]) => {
            const message = args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' ');

            setLogs(prev => {
                const newLog: LogEntry = {
                    id: logIdCounter.current++,
                    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
                    type,
                    message,
                    data: args.length > 1 ? args : undefined
                };
                return [...prev.slice(-99), newLog]; // Keep last 100 logs
            });
        };

        console.log = (...args: any[]) => {
            originalLog.apply(console, args);
            addLog('log', args);
        };

        console.warn = (...args: any[]) => {
            originalWarn.apply(console, args);
            addLog('warn', args);
        };

        console.error = (...args: any[]) => {
            originalError.apply(console, args);
            addLog('error', args);
        };

        return () => {
            console.log = originalLog;
            console.warn = originalWarn;
            console.error = originalError;
        };
    }, [isEnabled]);

    // Scroll to bottom when new logs arrive
    useEffect(() => {
        if (consoleRef.current && isOpen && !isMinimized) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [logs, isOpen, isMinimized]);

    // ✅ Don't render anything if disabled
    if (!isEnabled) return null;

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'error': return isLight ? 'text-red-600' : 'text-red-400';
            case 'warn': return isLight ? 'text-yellow-600' : 'text-yellow-400';
            default: return isLight ? 'text-gray-800' : 'text-gray-200';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'error': return '❌';
            case 'warn': return '⚠️';
            default: return '📝';
        }
    };

    return (
        <>
            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 ${isLight
                            ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white'
                            : 'bg-gradient-to-br from-blue-600 to-blue-800 text-white'
                        }`}
                    title="Open Debug Console"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {logs.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                            {logs.length > 99 ? '99+' : logs.length}
                        </span>
                    )}
                </button>
            )}

            {/* Console Window */}
            {isOpen && (
                <div
                    className={`fixed bottom-6 right-6 z-[9999] rounded-lg shadow-2xl border-2 transition-all ${isLight
                            ? 'bg-white border-gray-300'
                            : 'bg-gray-900 border-gray-700'
                        } ${isMinimized ? 'w-80' : 'w-[600px] h-[500px]'}`}
                >
                    {/* Header */}
                    <div className={`flex items-center justify-between p-3 border-b ${isLight ? 'border-gray-300 bg-gray-100' : 'border-gray-700 bg-gray-800'
                        }`}>
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className={`font-mono font-bold text-sm ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                                Debug Console
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-300'
                                }`}>
                                {logs.length}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setLogs([])}
                                className={`p-1 rounded hover:bg-opacity-10 hover:bg-black transition-colors ${isLight ? 'text-gray-600 hover:text-gray-800' : 'text-gray-400 hover:text-gray-200'
                                    }`}
                                title="Clear logs"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                className={`p-1 rounded hover:bg-opacity-10 hover:bg-black transition-colors ${isLight ? 'text-gray-600 hover:text-gray-800' : 'text-gray-400 hover:text-gray-200'
                                    }`}
                                title={isMinimized ? 'Maximize' : 'Minimize'}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMinimized ? "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" : "M20 12H4"} />
                                </svg>
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className={`p-1 rounded hover:bg-red-100 transition-colors ${isLight ? 'text-gray-600 hover:text-red-600' : 'text-gray-400 hover:text-red-400'
                                    }`}
                                title="Close"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Logs */}
                    {!isMinimized && (
                        <div
                            ref={consoleRef}
                            className={`p-3 overflow-y-auto font-mono text-xs ${isLight ? 'bg-gray-50' : 'bg-black'
                                }`}
                            style={{ height: 'calc(500px - 52px)' }}
                        >
                            {logs.length === 0 ? (
                                <div className={`text-center py-20 ${isLight ? 'text-gray-400' : 'text-gray-600'}`}>
                                    No logs yet. Console output will appear here.
                                </div>
                            ) : (
                                logs.map(log => (
                                    <div key={log.id} className={`mb-2 pb-2 border-b ${isLight ? 'border-gray-200' : 'border-gray-800'
                                        }`}>
                                        <div className="flex items-start gap-2">
                                            <span className="text-xs opacity-50">{log.timestamp}</span>
                                            <span>{getTypeIcon(log.type)}</span>
                                            <span className={`flex-1 whitespace-pre-wrap break-words ${getTypeColor(log.type)}`}>
                                                {log.message}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </>
    );
};
