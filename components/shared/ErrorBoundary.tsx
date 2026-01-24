
import React, { ErrorInfo, ReactNode } from 'react';
import Card from './Card';
import Button from './Button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 🌌 ErrorBoundary Component
 * Catches runtime errors in the mystical fabric and provides a recovery path.
 */
/* Fix: Explicitly using React.Component to ensure members like state, setState, and props are recognized by the TypeScript compiler */
class ErrorBoundary extends React.Component<Props, State> {
  // Explicitly initialize state in the constructor and call super(props)
  constructor(props: Props) {
    super(props);
    /* Fix: Property 'state' is now correctly inherited and recognized on the component instance */
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to the console
    console.error("🌌 Cosmic Interruption Caught:", error, errorInfo);
  }

  /* Handle retry logic with an arrow function to preserve 'this' context */
  public handleRetry = () => {
    /* Fix: Property 'setState' is now correctly recognized as part of the inherited React.Component class */
    this.setState({ hasError: false, error: null });
    window.location.reload(); 
  };

  public render(): ReactNode {
    /* Fix: Properties 'state' and 'props' are now correctly identified via React.Component inheritance */
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-6 animate-fade-in-up">
          <Card className="max-w-md w-full border-red-500/30 shadow-[0_0_50px_rgba(220,38,38,0.2)] bg-[#0A0A1A]">
            <div className="p-8 text-center">
              <div className="mb-6 inline-block p-4 rounded-full bg-red-900/20 border border-red-500/40 relative">
                <div className="absolute inset-0 bg-red-500/10 rounded-full animate-ping"></div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-cinzel font-bold text-amber-100 mb-2 uppercase tracking-widest">
                Cosmic interference detected
              </h2>
              
              <p className="text-amber-200/60 font-lora mb-6 italic">
                "The stars are momentarily misaligned. A flux in the mystical fabric has been detected."
              </p>

              {error && (
                <div className="bg-black/60 p-3 rounded mb-6 text-[10px] text-red-300 font-mono text-left overflow-auto max-h-24 border border-red-900/30 custom-scrollbar">
                  {error.message || "Unknown anomaly"}
                </div>
              )}

              <Button 
                onClick={this.handleRetry} 
                className="w-full bg-gradient-to-r from-red-900 to-maroon-800 border-red-500/50 shadow-lg hover:shadow-red-500/20"
              >
                Realign & Retry ✦
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
