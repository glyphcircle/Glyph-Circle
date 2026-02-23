// VoiceInput.tsx — Fixed: proper error handling, no crash on no-speech

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader } from 'lucide-react';

interface VoiceInputProps {
  onResult: (text: string) => void;
  className?: string;
  disabled?: boolean;
}

// ── Browser compatibility ────────────────────────────────────────────────
const getSpeechRecognition = () => {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition
    || (window as any).webkitSpeechRecognition
    || null;
};

const isSupported = () => !!getSpeechRecognition();


// ── Error messages shown to user ─────────────────────────────────────────
const ERROR_MESSAGES: Record<string, string> = {
  'no-speech': '',                                    // silent — just reset
  'aborted': '',                                    // silent — user stopped
  'network': 'No internet connection for voice.',
  'not-allowed': 'Microphone access denied.',
  'service-not-available': 'Voice service unavailable.',
  'audio-capture': 'No microphone found.',
  'bad-grammar': '',                                    // silent
};

type MicState = 'idle' | 'listening' | 'processing' | 'error';

const VoiceInput: React.FC<VoiceInputProps> = ({
  onResult,
  className = '',
  disabled = false,
}) => {
  const [micState, setMicState] = useState<MicState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [transcript, setTranscript] = useState('');

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { }
      }
    };
  }, []);


  const stopListening = useCallback(() => {
    // ← Tell restart loop to stop
    shouldRestartRef.current = false;
    isListeningRef.current = false;

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { }
    }
    setMicState('idle');
    setTranscript('');
  }, []);


  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setErrorMsg('Voice not supported in this browser.');
      setMicState('error');
      return;
    }

    // Clean up previous instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { }
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
    }

    setErrorMsg('');
    setTranscript('');
    setMicState('listening');
    isListeningRef.current = true;
    shouldRestartRef.current = true;  // ← user WANTS to listen

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.maxAlternatives = 1;

    // ── Results handler ──
    recognition.onresult = (event: any) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interimText += t;
      }

      setTranscript(finalText || interimText);

      if (finalText) {
        // Got a result — stop restarting
        shouldRestartRef.current = false;
        isListeningRef.current = false;
        setMicState('processing');
        onResult(finalText.trim());
        setTranscript('');
        setMicState('idle');
      }
    };

    // ── KEY FIX: error handler with auto-restart ──
    recognition.onerror = (event: any) => {
      const code = event.error as string;
      console.warn(`[VoiceInput] Recognition error: ${code}`);

      if (code === 'no-speech') {
        // Don't stop — just restart silently if user is still in listen mode
        if (shouldRestartRef.current) {
          setTranscript('');
          // Small delay before restart to avoid rapid fire
          restartTimerRef.current = setTimeout(() => {
            if (shouldRestartRef.current) {
              startListening();  // ← recursive restart
            }
          }, 300);
        }
        return;
      }

      if (code === 'aborted' || code === 'bad-grammar') {
        // Silent reset only if user manually stopped
        if (!shouldRestartRef.current) {
          setMicState('idle');
          isListeningRef.current = false;
        }
        return;
      }

      // Real errors — show message and stop
      shouldRestartRef.current = false;
      isListeningRef.current = false;
      const messages: Record<string, string> = {
        'network': 'No internet for voice recognition.',
        'not-allowed': 'Microphone access denied. Check browser settings.',
        'service-not-available': 'Voice service unavailable.',
        'audio-capture': 'No microphone found.',
      };
      setErrorMsg(messages[code] ?? `Voice error: ${code}`);
      setMicState('error');
      setTimeout(() => { setErrorMsg(''); setMicState('idle'); }, 4000);
    };

    // ── onend: only reset if user manually stopped ──
    recognition.onend = () => {
      // If no-speech restart is pending, don't reset state — let timer handle it
      if (!shouldRestartRef.current) {
        setMicState('idle');
        isListeningRef.current = false;
      }
      // If shouldRestart is true, the restartTimer will call startListening again
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('[VoiceInput] Failed to start:', e);
      shouldRestartRef.current = false;
      setMicState('idle');
      isListeningRef.current = false;
    }
  }, [onResult]);  // startListening is stable — onResult dep only


  const handleToggle = () => {
    if (disabled) return;
    if (micState === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  };

  // ── Unsupported browser ──
  if (!isSupported()) {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <div className="w-14 h-14 rounded-full bg-gray-800/50 border border-gray-700 flex items-center justify-center">
          <MicOff size={22} className="text-gray-500" />
        </div>
        <p className="text-[9px] text-gray-500 uppercase tracking-wider font-bold text-center max-w-[120px]">
          Voice not supported in this browser
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>

      {/* ── Main Mic Button ── */}
      <button
        onClick={handleToggle}
        disabled={disabled || micState === 'processing'}
        aria-label={micState === 'listening' ? 'Stop recording' : 'Start recording'}
        className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 flex items-center justify-center
          transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-skin-accent
          ${micState === 'listening'
            ? 'bg-red-600 border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.5)] scale-110'
            : micState === 'error'
              ? 'bg-gray-800 border-red-500/50'
              : micState === 'processing'
                ? 'bg-amber-700 border-amber-500'
                : 'bg-skin-surface border-skin-accent/40 hover:border-skin-accent hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]'
          }`}
      >
        {/* Pulsing ring — only when listening */}
        {micState === 'listening' && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-40" />
            <div className="absolute inset-[-8px] rounded-full border border-red-500/20 animate-ping opacity-20 [animation-delay:0.3s]" />
          </>
        )}

        {/* Icon */}
        {micState === 'processing' ? (
          <Loader size={22} className="text-amber-300 animate-spin" />
        ) : micState === 'listening' ? (
          <Mic size={22} className="text-white" />
        ) : micState === 'error' ? (
          <MicOff size={22} className="text-red-400" />
        ) : (
          <Mic size={22} className="text-skin-accent" />
        )}
      </button>

      {/* ── Live transcript preview ── */}
      {transcript && micState === 'listening' && (
        <div className="bg-black/30 rounded-xl px-3 py-2 max-w-[200px] text-center">
          <p className="text-[11px] text-amber-300 italic leading-snug truncate">
            "{transcript}"
          </p>
        </div>
      )}

      {/* ── Error message ── */}
      {errorMsg && (
        <p className="text-[10px] text-red-400 font-bold text-center max-w-[160px] animate-fade-in-up">
          {errorMsg}
        </p>
      )}

      {/* ── Status text ── */}
      {/* Status text */}
      {!errorMsg && (
        <p className="text-[9px] text-skin-accent/50 font-black uppercase tracking-widest">
          {micState === 'listening'
            ? transcript
              ? '● Hearing you...'
              : '● Waiting... speak now'   // ← was just "Recording"
            : micState === 'processing'
              ? 'Processing...'
              : 'Tap to speak'}
        </p>
      )}


    </div>
  );
};

export default VoiceInput;
