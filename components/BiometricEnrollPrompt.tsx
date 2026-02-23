// components/BiometricEnrollPrompt.tsx
import React, { useState, useEffect } from 'react';
import { Fingerprint, X, Shield } from 'lucide-react';
import {
    isBiometricSupported,
    hasBiometricEnrolled,
    enrollBiometric,
} from '../services/biometricService';
import { useAuth } from '../context/AuthContext';

const BiometricEnrollPrompt: React.FC = () => {
    const { user } = useAuth();

    // ✅ ALL hooks declared at top level, in order
    const [show, setShow] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    // ✅ Single unified useEffect — no duplicates
    useEffect(() => {
        const check = async () => {
            if (!user) return;

            // Step 1: Check browser/device supports biometrics
            const supported = await isBiometricSupported();
            console.log('👆 Biometric supported:', supported);
            if (!supported) return;

            // Step 2: Check if already enrolled
            const enrolled = await hasBiometricEnrolled(user.id);
            console.log('🔑 Already enrolled:', enrolled);
            if (enrolled) return;

            // Step 3: Check if user dismissed previously
            const dismissed = localStorage.getItem(`biometric_dismissed_${user.id}`);
            if (dismissed) return;

            // ✅ All checks passed — show the prompt
            setShow(true);
        };
        check();
    }, [user]);

    // ✅ Early return AFTER all hooks
    if (!show || !user) return null;

    // ✅ handleEnable — no awaits before enrollBiometric call
    const handleEnable = async () => {
        setIsLoading(true);
        setMessage('');

        const result = await enrollBiometric(
            user.id,
            user.email || '',
            user.user_metadata?.full_name || 'User'
        );

        setIsLoading(false);
        if (result.success) {
            setMessage('✅ Biometric login enabled!');
            setTimeout(() => setShow(false), 1500);
        } else {
            setMessage(`❌ ${result.error}`);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem(`biometric_dismissed_${user.id}`, '1');
        setShow(false);
    };

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] w-[90vw] max-w-sm">
            <div className="bg-card border border-border rounded-2xl shadow-2xl p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Fingerprint size={20} className="text-primary" />
                        </div>
                        <div>
                            <p className="font-bold text-sm text-foreground">Enable Biometric Login</p>
                            <p className="text-[10px] text-muted-foreground">Fingerprint or Face ID</p>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="p-1.5 hover:bg-muted rounded-full transition-colors"
                        aria-label="Dismiss"
                    >
                        <X size={16} className="text-muted-foreground" />
                    </button>
                </div>

                <p className="text-xs text-muted-foreground mb-4 flex items-start gap-2">
                    <Shield size={13} className="text-primary mt-0.5 flex-shrink-0" />
                    Skip typing your password next time. Your biometric data never leaves your device.
                </p>

                {message && (
                    <p className="text-xs font-semibold mb-3 text-center">{message}</p>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={handleDismiss}
                        className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
                    >
                        Not Now
                    </button>
                    <button
                        onClick={handleEnable}
                        disabled={isLoading}
                        className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Setting up...' : '👆 Enable'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BiometricEnrollPrompt;
