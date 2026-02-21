import React, { useState, useEffect, useCallback } from 'react';
import { X, CreditCard, Smartphone, Banknote, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

// @ts-ignore
declare const Razorpay: any;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentDetails {
  method: 'razorpay' | 'upi' | 'manual' | 'free';
  provider: string;
  transactionId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed';
  raw?: any;
}

interface PaymentMethod {
  id: string;
  name: string;
  type: 'razorpay' | 'manual_upi' | 'free';
  icon: string;
  description: string;
  is_active: boolean;
}

interface PaymentModalProps {
  // ✅ Supports BOTH prop naming conventions used across the codebase
  isVisible?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: (details: PaymentDetails) => void;
  // ✅ Supports BOTH price prop names
  basePrice?: number;
  amount?: number;
  serviceName: string;
}

// ─── Fallback methods (shown when DB fetch fails or returns empty) ────────────

const FALLBACK_METHODS: PaymentMethod[] = [
  {
    id: 'razorpay',
    name: 'Pay Online',
    type: 'razorpay',
    icon: '💳',
    description: 'UPI, Cards, Net Banking via Razorpay',
    is_active: true,
  },
  {
    id: 'manual_upi',
    name: 'UPI Transfer',
    type: 'manual_upi',
    icon: '📱',
    description: 'Pay via PhonePe, GPay, Paytm & send screenshot',
    is_active: true,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const PaymentModal: React.FC<PaymentModalProps> = ({
  isVisible,
  isOpen,
  onClose,
  onSuccess,
  basePrice,
  amount: amountProp,
  serviceName,
}) => {
  // ✅ Normalize both prop conventions
  const visible = isVisible ?? isOpen ?? false;
  const amount = basePrice ?? amountProp ?? 0;

  const { user } = useAuth();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [upiRef, setUpiRef] = useState('');
  const [step, setStep] = useState<'select' | 'upi_confirm' | 'success'>('select');

  // ── Fetch payment methods ──────────────────────────────────────────────────

  const fetchMethods = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      // 5-second timeout guard — never hang forever
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('timeout') }), 5000)
      );

      const queryPromise = supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      const { data, error: dbError } = await Promise.race([queryPromise, timeoutPromise]);

      if (dbError) throw dbError;

      const loaded = data && data.length > 0
        ? (data as PaymentMethod[])
        : FALLBACK_METHODS;

      setMethods(loaded);
      setSelectedMethod(loaded[0]?.id ?? '');
    } catch (err) {
      console.warn('[PaymentModal] Using fallback methods:', err);
      setMethods(FALLBACK_METHODS);
      setSelectedMethod(FALLBACK_METHODS[0].id);
    } finally {
      setIsLoading(false); // ✅ ALWAYS clears spinner — no more infinite loading
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setStep('select');
      setError('');
      setUpiRef('');
      setIsProcessing(false);
      fetchMethods();
    }
  }, [visible, fetchMethods]);

  // ── Razorpay handler ───────────────────────────────────────────────────────

  const handleRazorpay = async () => {
    setIsProcessing(true);
    setError('');

    try {
      // Create Razorpay order via Supabase Edge Function
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-razorpay-order',
        { body: { amount, currency: 'INR', serviceName } }
      );

      if (orderError || !orderData?.id) {
        // If edge function not available, use direct payment link as fallback
        throw new Error('Order creation failed. Try UPI transfer instead.');
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Glyph Circle',
        description: serviceName,
        order_id: orderData.id,
        prefill: {
          name: user?.user_metadata?.full_name || '',
          email: user?.email || '',
        },
        theme: { color: '#7C3AED' },
        handler: (response: any) => {
          const details: PaymentDetails = {
            method: 'razorpay',
            provider: 'razorpay',
            transactionId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            amount,
            currency: 'INR',
            status: 'success',
            raw: response,
          };
          setIsProcessing(false);
          onSuccess(details);
          onClose();
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setError('Payment cancelled.');
          },
        },
      };

      if (typeof Razorpay === 'undefined') {
        throw new Error('Razorpay SDK not loaded. Try UPI transfer instead.');
      }

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try UPI transfer.');
      setIsProcessing(false);
    }
  };

  // ── Manual UPI handler ─────────────────────────────────────────────────────

  const handleManualUPI = () => {
    setStep('upi_confirm');
  };

  const confirmUPIPayment = () => {
    if (!upiRef.trim()) {
      setError('Please enter your UPI transaction ID or UTR number.');
      return;
    }

    const details: PaymentDetails = {
      method: 'upi',
      provider: 'manual_upi',
      transactionId: upiRef.trim(),
      orderId: `UPI-ORD-${Date.now()}`,
      amount,
      currency: 'INR',
      status: 'success',
      raw: { upiRef: upiRef.trim(), manual: true },
    };

    onSuccess(details);
    onClose();
  };

  // ── Pay button dispatcher ──────────────────────────────────────────────────

  const handlePay = () => {
    const method = methods.find(m => m.id === selectedMethod);
    if (!method) return;

    if (method.type === 'razorpay') handleRazorpay();
    if (method.type === 'manual_upi') handleManualUPI();
    if (method.type === 'free') {
      onSuccess({
        method: 'free',
        provider: 'free',
        transactionId: `FREE-${Date.now()}`,
        orderId: `FREE-ORD-${Date.now()}`,
        amount: 0,
        currency: 'INR',
        status: 'success',
      });
      onClose();
    }
  };

  // ── Render guards ──────────────────────────────────────────────────────────

  if (!visible) return null;

  // ── UPI Confirm Step ───────────────────────────────────────────────────────

  if (step === 'upi_confirm') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-black border border-purple-500/30 rounded-2xl shadow-2xl max-w-sm w-full p-6">
          <h2 className="text-xl font-bold text-white text-center mb-4">📱 UPI Transfer</h2>

          <div className="bg-black/40 rounded-xl p-4 mb-4 text-center">
            <p className="text-purple-300 text-sm mb-1">Pay exactly</p>
            <p className="text-3xl font-black text-white">₹{amount}</p>
            <p className="text-purple-400 text-sm mt-2">to UPI ID</p>
            {/* Replace with your actual UPI ID */}
            <p className="text-white font-mono font-bold text-lg mt-1 select-all">
              glyphcircle@upi
            </p>
          </div>

          <p className="text-purple-300 text-xs text-center mb-4">
            After payment, enter the transaction ID / UTR number below
          </p>

          <input
            type="text"
            placeholder="Transaction ID / UTR Number"
            value={upiRef}
            onChange={(e) => setUpiRef(e.target.value)}
            className="w-full bg-black/40 border border-purple-500/40 rounded-xl px-4 py-3 text-white placeholder-purple-400 text-sm mb-3 outline-none focus:border-purple-400"
          />

          {error && (
            <p className="text-red-400 text-xs mb-3 flex items-center gap-1">
              <AlertCircle size={12} /> {error}
            </p>
          )}

          <button
            onClick={confirmUPIPayment}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold mb-2"
          >
            Confirm Payment ✓
          </button>
          <button
            onClick={() => { setStep('select'); setError(''); }}
            className="w-full py-2 text-purple-400 text-sm hover:text-white transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ── Main Select Step ───────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-black border border-purple-500/30 rounded-2xl shadow-2xl max-w-md w-full p-6 relative">

        {/* Close */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 p-2 hover:bg-purple-500/20 rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="text-white" size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <CreditCard className="text-white" size={28} />
          </div>
          <h2 className="text-2xl font-bold text-white font-cinzel uppercase tracking-widest">
            Complete Payment
          </h2>
          <p className="text-purple-300 text-sm mt-1">{serviceName}</p>
        </div>

        {/* Amount */}
        <div className="bg-black/40 border border-purple-500/20 rounded-xl p-4 mb-5 flex justify-between items-center">
          <span className="text-purple-300 text-sm">Amount</span>
          <span className="text-3xl font-black text-white">₹{amount}</span>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/40 border border-red-500/40 rounded-xl flex items-start gap-2">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Payment Methods */}
        {isLoading ? (
          // ✅ Short loading state — max 5 seconds, then shows fallback
          <div className="flex items-center justify-center py-8 gap-3">
            <Loader2 className="text-purple-400 animate-spin" size={24} />
            <span className="text-purple-300 text-sm">Loading payment methods...</span>
          </div>
        ) : (
          <div className="space-y-3 mb-5">
            {methods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${selectedMethod === method.id
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-purple-500/20 bg-black/20 hover:border-purple-500/50'
                  }`}
              >
                <span className="text-2xl">{method.icon}</span>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{method.name}</p>
                  <p className="text-purple-400 text-xs">{method.description}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedMethod === method.id
                    ? 'border-purple-400 bg-purple-400'
                    : 'border-purple-600'
                  }`}>
                  {selectedMethod === method.id && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pay Button */}
        <button
          onClick={handlePay}
          disabled={isProcessing || isLoading || !selectedMethod}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-base transition-all active:scale-95"
          style={{ touchAction: 'manipulation' }}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={18} />
              Processing...
            </span>
          ) : (
            `Pay ₹${amount} →`
          )}
        </button>

        <p className="text-xs text-center text-purple-500 mt-3">
          🔒 Secure · All transactions are encrypted
        </p>
      </div>
    </div>
  );
};

export default PaymentModal;
