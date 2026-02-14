import React, { useState, useEffect, useRef } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface LogEntry {
    id: number;
    type: 'log' | 'error' | 'warn' | 'info';
    message: string;
    timestamp: string;
}

export const DebugConsole: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isVisible, setIsVisible] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);

    // Dragging state
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 300 });

    // Resizing state
    const [isResizing, setIsResizing] = useState(false);
    const [size, setSize] = useState({ width: 400, height: 280 });

    const consoleRef = useRef<HTMLDivElement>(null);
    const logIdRef = useRef(0); // ✅ Use ref instead of let variable

    useEffect(() => {
        // Intercept console methods
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        const originalInfo = console.info;

        const addLog = (type: LogEntry['type'], args: any[]) => {
            const message = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');

            const timestamp = new Date().toLocaleTimeString();

            // ✅ Use setTimeout to avoid state update during render
            setTimeout(() => {
                setLogs(prev => [...prev.slice(-49), {
                    id: logIdRef.current++,
                    type,
                    message,
                    timestamp
                }]);
            }, 0);
        };

        console.log = (...args) => {
            originalLog(...args);
            addLog('log', args);
        };

        console.error = (...args) => {
            originalError(...args);
            addLog('error', args);
        };

        console.warn = (...args) => {
            originalWarn(...args);
            addLog('warn', args);
        };

        console.info = (...args) => {
            originalInfo(...args);
            addLog('info', args);
        };

        // Catch unhandled errors
        const handleError = (event: ErrorEvent) => {
            addLog('error', [`Uncaught Error: ${event.message} at ${event.filename}:${event.lineno}`]);
        };

        const handleRejection = (event: PromiseRejectionEvent) => {
            addLog('error', [`Unhandled Promise Rejection: ${event.reason}`]);
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;
            console.info = originalInfo;
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, []);

    // ... rest of the component stays the same (dragging, resizing, etc.) ...

    // Handle dragging
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            setPosition({
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    // Handle resizing
    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!consoleRef.current) return;

            const rect = consoleRef.current.getBoundingClientRect();
            const newWidth = Math.max(300, e.clientX - rect.left);
            const newHeight = Math.max(200, e.clientY - rect.top);

            setSize({ width: newWidth, height: newHeight });
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    const handleHeaderMouseDown = (e: React.MouseEvent) => {
        if (isMaximized) return;
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing(true);
    };

    const toggleMaximize = () => {
        setIsMaximized(!isMaximized);
    };

    if (!isVisible) {
        return (
            <button
                onClick={() => setIsVisible(true)}
                className="fixed bottom-4 right-4 bg-purple-600 text-white p-3 rounded-full shadow-lg z-50 hover:bg-purple-700 transition-colors"
                title="Show Debug Console"
            >
                📱 Console
            </button>
        );
    }

    if (isMinimized) {
        return (
            <div
                className="fixed bottom-4 right-4 z-50"
                style={{ width: '240px' }}
            >
                <div className="bg-white border-2 border-purple-500 rounded-lg shadow-xl">
                    <div
                        className="flex items-center justify-between bg-purple-600 text-white p-2 rounded-t-md cursor-move"
                        onMouseDown={handleHeaderMouseDown}
                    >
                        <span className="font-bold text-sm">🔍 Debug Console</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsMinimized(false)}
                                className="hover:bg-purple-700 px-2 rounded transition-colors"
                                title="Restore"
                            >
                                ▲
                            </button>
                            <button
                                onClick={() => setIsVisible(false)}
                                className="hover:bg-purple-700 px-2 rounded transition-colors"
                                title="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const consoleStyle = isMaximized
        ? { top: 0, left: 0, width: '100vw', height: '100vh' }
        : {
            top: `${position.y}px`,
            left: `${position.x}px`,
            width: `${size.width}px`,
            height: `${size.height}px`
        };

    return (
        <div
            ref={consoleRef}
            className="fixed z-50 bg-white border-2 border-purple-500 rounded-lg shadow-2xl overflow-hidden flex flex-col"
            style={consoleStyle}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between bg-purple-600 text-white p-2 cursor-move select-none"
                onMouseDown={handleHeaderMouseDown}
            >
                <span className="font-bold text-sm">🔍 Debug Console ({logs.length} logs)</span>
                <div className="flex gap-2">
                    <button
                        onClick={() => setLogs([])}
                        className="hover:bg-purple-700 px-2 py-1 rounded text-xs transition-colors"
                        title="Clear Logs"
                    >
                        Clear
                    </button>
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="hover:bg-purple-700 px-2 rounded transition-colors"
                        title="Minimize"
                    >
                        ▼
                    </button>
                    <button
                        onClick={toggleMaximize}
                        className="hover:bg-purple-700 px-2 rounded transition-colors"
                        title={isMaximized ? "Restore" : "Maximize"}
                    >
                        {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="hover:bg-purple-700 px-2 rounded transition-colors"
                        title="Close"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Logs Container */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs bg-white">
                {logs.length === 0 ? (
                    <div className="text-gray-400 text-center py-8">No logs yet...</div>
                ) : (
                    logs.map(log => (
                        <div
                            key={log.id}
                            className={`p-2 rounded border-l-4 ${log.type === 'error' ? 'bg-red-50 border-red-500 text-red-900' :
                                    log.type === 'warn' ? 'bg-yellow-50 border-yellow-500 text-yellow-900' :
                                        log.type === 'info' ? 'bg-blue-50 border-blue-500 text-blue-900' :
                                            'bg-gray-50 border-gray-400 text-gray-900'
                                }`}
                        >
                            <div className="flex gap-2 items-center mb-1">
                                <span className="text-gray-500 text-[10px]">{log.timestamp}</span>
                                <span className="text-sm">
                                    {log.type === 'error' ? '❌' :
                                        log.type === 'warn' ? '⚠️' :
                                            log.type === 'info' ? 'ℹ️' : '📝'}
                                </span>
                                <span className="font-bold text-[10px] uppercase">{log.type}</span>
                            </div>
                            <div className="whitespace-pre-wrap break-all text-xs leading-relaxed">{log.message}</div>
                        </div>
                    ))
                )}
            </div>

            {/* Resize Handle */}
            {!isMaximized && (
                <div
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-purple-500 hover:bg-purple-600 transition-colors"
                    onMouseDown={handleResizeMouseDown}
                    style={{
                        clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                    }}
                />
            )}
        </div>
    );
};
