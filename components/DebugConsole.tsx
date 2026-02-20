import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { dbService } from '../services/db';

interface LogEntry {
    id: number;
    timestamp: string;
    type: 'log' | 'warn' | 'error';
    message: string;
}

// ✅ Global buffer OUTSIDE React — no setState during render
const pendingLogs: LogEntry[] = [];
let logIdCounter = 0;

const pushLog = (type: 'log' | 'warn' | 'error', args: any[]) => {
    const message = args
        .map((arg) => {
            if (typeof arg === 'object') {
                try { return JSON.stringify(arg, null, 2); }
                catch { return String(arg); }
            }
            return String(arg);
        })
        .join(' ');

    pendingLogs.push({
        id: logIdCounter++,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        type,
        message,
    });
};

export const DebugConsole: React.FC = () => {
    const { theme } = useTheme();
    const isLight = theme.mode === 'light';

    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMin] = useState(false);
    const [isEnabled, setIsEnabled] = useState(false);
    const consoleRef = useRef<HTMLDivElement>(null);

    // ─── Check admin config ──────────────────────────────────────────────────
    useEffect(() => {
        const check = async () => {
            try {
                const val = await dbService.getConfigValue('debug_console_enabled');
                setIsEnabled(val === 'true' || (val as any) === true);
            } catch {
                setIsEnabled(false);
            }
        };
        check();
        const id = setInterval(check, 5000);
        return () => clearInterval(id);
    }, []);

    // ─── Intercept console (write to buffer only, NO setState here) ──────────
    useEffect(() => {
        if (!isEnabled) return;

        const orig = {
            log: console.log,
            warn: console.warn,
            error: console.error,
        };

        console.log = (...a) => { orig.log.apply(console, a); pushLog('log', a); };
        console.warn = (...a) => { orig.warn.apply(console, a); pushLog('warn', a); };
        console.error = (...a) => { orig.error.apply(console, a); pushLog('error', a); };

        return () => {
            console.log = orig.log;
            console.warn = orig.warn;
            console.error = orig.error;
        };
    }, [isEnabled]);

    // ─── Flush buffer AFTER every render (never DURING render) ───────────────
    useEffect(() => {
        if (pendingLogs.length === 0) return;
        const batch = pendingLogs.splice(0);
        setLogs((prev) => [...prev, ...batch].slice(-100));
    });

    // ─── Auto-scroll ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (consoleRef.current && isOpen && !isMinimized) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [logs, isOpen, isMinimized]);

    if (!isEnabled) return null;

    // ─── Helpers ─────────────────────────────────────────────────────────────
    const typeColor = (t: string) => {
        if (t === 'error') return isLight ? 'text-red-600' : 'text-red-400';
        if (t === 'warn') return isLight ? 'text-yellow-600' : 'text-yellow-400';
        return isLight ? 'text-gray-800' : 'text-gray-200';
    };
    const typeIcon = (t: string) =>
        t === 'error' ? '❌' : t === 'warn' ? '⚠️' : '📝';

    const typeBg = (t: string) => {
        if (t === 'error') return isLight ? 'bg-red-50' : 'bg-red-950/20';
        if (t === 'warn') return isLight ? 'bg-yellow-50' : 'bg-yellow-950/20';
        return '';
    };

    // ─── Derived sizes (responsive) ──────────────────────────────────────────
    // We use inline classes that Tailwind can scan:
    // Mobile  (<640 px) : full-width, 60vh height
    // Tablet  (640-1023): 480 px wide, 400px height
    // Desktop (≥1024px) : 620 px wide, 500px height

    return (
        <>
            {/* ── FAB Toggle Button ───────────────────────────────────────────── */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    title="Open Debug Console"
                    className={`
            fixed bottom-5 right-5 z-[9999]
            w-12 h-12 sm:w-14 sm:h-14
            rounded-full shadow-2xl
            flex items-center justify-center
            transition-all duration-200
            hover:scale-110 active:scale-95
            ${isLight
                            ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white'
                            : 'bg-gradient-to-br from-blue-600 to-blue-800 text-white'}
          `}
                >
                    {/* Console icon */}
                    <svg xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 sm:h-6 sm:w-6" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0
                 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>

                    {/* Badge */}
                    {logs.length > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1
              bg-red-500 text-white text-[10px] font-bold
              rounded-full flex items-center justify-center">
                            {logs.length > 99 ? '99+' : logs.length}
                        </span>
                    )}
                </button>
            )}

            {/* ── Console Window ──────────────────────────────────────────────── */}
            {isOpen && (
                <div className={`
          fixed z-[9999]
          shadow-2xl rounded-xl border
          flex flex-col overflow-hidden
          transition-all duration-200

          /* Mobile: anchored full-width at bottom */
          bottom-0 left-0 right-0
          ${isMinimized ? 'h-auto' : 'h-[60vh]'}

          /* Tablet: anchored bottom-right, fixed width */
          sm:left-auto sm:bottom-5 sm:right-5
          sm:w-[480px]
          ${isMinimized ? 'sm:h-auto' : 'sm:h-[400px]'}

          /* Desktop: wider */
          lg:w-[620px]
          ${isMinimized ? 'lg:h-auto' : 'lg:h-[500px]'}

          ${isLight
                        ? 'bg-white border-gray-300'
                        : 'bg-gray-900 border-gray-700'}
        `}>

                    {/* ── Header ─────────────────────────────────────────────────── */}
                    <div className={`
            flex items-center justify-between
            px-3 py-2 shrink-0
            border-b
            ${isLight
                            ? 'border-gray-300 bg-gray-100'
                            : 'border-gray-700 bg-gray-800'}
          `}>
                        {/* Left: icon + title + count */}
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg"
                                className={`h-4 w-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0
                     00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className={`font-mono font-bold text-xs sm:text-sm
                ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                                Debug Console
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-mono
                ${isLight
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-blue-900/40 text-blue-300'}`}>
                                {logs.length}
                            </span>
                        </div>

                        {/* Right: actions */}
                        <div className="flex items-center gap-1">

                            {/* Clear */}
                            <button onClick={() => setLogs([])}
                                title="Clear logs"
                                className={`p-1.5 rounded transition-colors
                  ${isLight
                                        ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                        : 'text-gray-400 hover:text-red-400 hover:bg-red-900/20'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0
                       01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0
                       00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>

                            {/* Minimize / Restore */}
                            <button onClick={() => setIsMin(!isMinimized)}
                                title={isMinimized ? 'Restore' : 'Minimize'}
                                className={`p-1.5 rounded transition-colors
                  ${isLight
                                        ? 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
                                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d={isMinimized
                                            ? 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4'
                                            : 'M20 12H4'} />
                                </svg>
                            </button>

                            {/* Close */}
                            <button onClick={() => setIsOpen(false)}
                                title="Close"
                                className={`p-1.5 rounded transition-colors
                  ${isLight
                                        ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                                        : 'text-gray-400 hover:text-red-400 hover:bg-red-900/20'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* ── Log List ────────────────────────────────────────────────── */}
                    {!isMinimized && (
                        <div
                            ref={consoleRef}
                            className={`flex-1 overflow-y-auto p-2 font-mono text-[11px]
                leading-relaxed overscroll-contain
                ${isLight ? 'bg-gray-50' : 'bg-black'}`}
                        >
                            {logs.length === 0 ? (
                                <div className={`flex flex-col items-center justify-center
                  h-full gap-2 opacity-40
                  ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg"
                                        className="h-10 w-10" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                                            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0
                         00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>No logs yet</span>
                                </div>
                            ) : (
                                logs.map((log) => (
                                    <div
                                        key={log.id}
                                        className={`mb-1 px-1.5 py-1 rounded
                      border-b last:border-b-0
                      ${typeBg(log.type)}
                      ${isLight ? 'border-gray-200' : 'border-gray-800/60'}`}
                                    >
                                        <div className="flex items-start gap-1.5 min-w-0">
                                            {/* Timestamp */}
                                            <span className={`shrink-0 text-[10px] mt-0.5
                        ${isLight ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {log.timestamp}
                                            </span>
                                            {/* Icon */}
                                            <span className="shrink-0">{typeIcon(log.type)}</span>
                                            {/* Message */}
                                            <span className={`flex-1 break-all whitespace-pre-wrap
                        ${typeColor(log.type)}`}>
                                                {log.message}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* ── Footer (mobile hint) ─────────────────────────────────────── */}
                    {!isMinimized && (
                        <div className={`shrink-0 px-3 py-1 text-[10px] text-center
              border-t sm:hidden
              ${isLight
                                ? 'border-gray-200 text-gray-400 bg-gray-50'
                                : 'border-gray-800 text-gray-600 bg-gray-900'}`}>
                            Swipe or scroll to view logs
                        </div>
                    )}
                </div>
            )}
        </>
    );
};
