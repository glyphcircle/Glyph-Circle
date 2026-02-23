// hooks/useIdleTimeout.ts
import { useEffect, useRef, useCallback } from 'react';

const IDLE_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
const WARN_BEFORE_MS = 60 * 1000;       // warn 1 minute before

interface UseIdleTimeoutOptions {
    onIdle: () => void;
    onWarn?: () => void;
    enabled?: boolean;
}

export const useIdleTimeout = ({
    onIdle,
    onWarn,
    enabled = true,
}: UseIdleTimeoutOptions): void => {
    const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetTimers = useCallback(() => {
        if (idleTimer.current) clearTimeout(idleTimer.current);
        if (warnTimer.current) clearTimeout(warnTimer.current);

        if (!enabled) return;

        // Warn 1 minute before logout
        warnTimer.current = setTimeout(() => {
            onWarn?.();
        }, IDLE_TIMEOUT_MS - WARN_BEFORE_MS);

        // Actual logout at 20 min
        idleTimer.current = setTimeout(() => {
            onIdle();
        }, IDLE_TIMEOUT_MS);
    }, [onIdle, onWarn, enabled]);

    useEffect(() => {
        if (!enabled) return;

        const events: string[] = [
            'mousemove', 'keydown', 'mousedown',
            'touchstart', 'scroll', 'click', 'wheel',
        ];

        events.forEach(e => window.addEventListener(e, resetTimers, { passive: true }));
        resetTimers(); // start timers immediately on mount

        return () => {
            events.forEach(e => window.removeEventListener(e, resetTimers));
            if (idleTimer.current) clearTimeout(idleTimer.current);
            if (warnTimer.current) clearTimeout(warnTimer.current);
        };
    }, [resetTimers, enabled]);
};
