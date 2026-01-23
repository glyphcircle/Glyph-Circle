
import React, { useState, useEffect, useMemo } from 'react';
import Button from './shared/Button';
import { useTranslation } from '../hooks/useTranslation';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import { securityService } from '../services/security';
import { paymentManager, PaymentProvider } from '../services/paymentManager';
import { useDb } from '../hooks/useDb';
import { Currency } from '../context/LanguageContext';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  basePrice: number; 
  serviceName: string;
}

const CURRENCIES: Currency[] = ['INR', 'USD', 'EUR', 'SAR', 'BRL', 'RUB', 'JPY', 'CNY'];

const PaymentModal: React.FC<PaymentModalProps> = ({ isVisible, onClose, onSuccess, basePrice, serviceName }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState<PaymentProvider | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('upi');
  
  const [upiVpa, setUpiVpa] = useState('');
  const [showVpaInput, setShowVpaInput] = useState(false);
  
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string, percentage: number } | null>(null);
  const [couponMessage, setCouponMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const { t, getRegionalPrice, currency, setCurrency } = useTranslation();
  const { user, pendingReading, commitPendingReading, refreshUser } = useAuth();
  const { db } = useDb();

  useEffect(() => {
      if (isVisible) {
          if (user?.currency && user.currency !== currency) {
              setCurrency(user.currency as Currency);
          }
          setCouponCode('');
          setAppliedDiscount(null);
          setCouponMessage(null);
          setUpiVpa('');
          setShowVpaInput(false);
          setIsLoading(false);
          
          const region = paymentManager.detectUserCountry();
          const effectiveCurrency = user?.currency || currency;
          
          if (effectiveCurrency === 'INR') setPaymentMethod('upi');
          else setPaymentMethod('card');

          const providersList = db.payment_providers || [];
          const provider = paymentManager.getActiveProviderFromList(providersList, region);
          setActiveProvider(provider);
      }
  }, [isVisible, db.payment_providers, user]);

  const handleCurrencyChange = async (newCurrency: Currency) => {
      setCurrency(newCurrency);
      if (user) {
          try {
              await dbService.updateEntry('users', user.id, { currency: newCurrency });
          } catch (e) {
              console.warn("Failed to save currency preference:", e);
          }
      }
  };

  const finalPriceINR = useMemo(() => {
      if (!appliedDiscount) return basePrice;
      const discountAmount = (basePrice * appliedDiscount.percentage) / 100;
      return Math.max(0, basePrice - discountAmount);
  }, [basePrice, appliedDiscount]);

  const priceDisplay = getRegionalPrice(finalPriceINR);
  const originalPriceDisplay = getRegionalPrice(basePrice);

  if (!isVisible) return null;

  const handleApplyCoupon = () => {
      setCouponMessage(null);
      if (!couponCode.trim()) return;
      const validCoupon = (db.store_discounts || []).find((d: any) => d.code === couponCode.trim().toUpperCase() && d.status === 'active');
      if (validCoupon) {
          setAppliedDiscount({ code: validCoupon.code, percentage: validCoupon.percentage });
          setCouponMessage({ type: 'success', text: `Success! ${validCoupon.percentage}% Off Applied.` });
      } else {
          setAppliedDiscount(null);
          setCouponMessage({ type: 'error', text: "Invalid or expired coupon code." });
      }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    setIsLoading(true);
    if (user) {
      await dbService.recordTransaction({
        user_id: user.id,
        amount: finalPriceINR,
        description: pendingReading ? `Payment for ${pendingReading.title}` : `${serviceName}`,
        status: 'success'
      });
      if (pendingReading) commitPendingReading();
      refreshUser();
    }
    setIsLoading(false);
    onSuccess();
    onClose();
  };

  const handleInitiatePayment = (specificMethod?: string) => {
    if (!securityService.checkSystemIntegrity()) {
        alert("Security Alert: Payment blocked due to insecure environment.");
        return;
    }
    setIsLoading(true);

    if (!activeProvider) {
        // Mock fallback for development if no provider configured
        console.warn("Using mock success path.");
        setTimeout(() => handlePaymentSuccess(`mock_id_${Date.now()}`), 1500);
        return;
    }

    if (activeProvider.provider_type === 'razorpay') {
        if (typeof window.Razorpay === 'undefined') {
            console.warn("Razorpay SDK not found. Using fallback.");
            setTimeout(() => handlePaymentSuccess(`mock_rzp_${Date.now()}`), 2000);
        } else {
            initRazorpay(activeProvider, specificMethod);
        }
    } else {
        setTimeout(() => handlePaymentSuccess(`${activeProvider.provider_type}_mock_${Date.now()}`), 1500);
    }
  };

  const initRazorpay = (provider: PaymentProvider, method?: string) => {
    const options: any = {
      key: provider.api_key,
      amount: Math.round(priceDisplay.price * 100), 
      currency: currency, 
      name: "Glyph Circle",
      description: serviceName,
      handler: (res: any) => handlePaymentSuccess(res.razorpay_payment_id),
      prefill: {
        name: user?.name || "Seeker",
        email: user?.email || "seeker@glyph.circle",
        contact: "9999999999"
      },
      theme: { color: "#F59E0B" },
      modal: { ondismiss: () => setIsLoading(false) }
    };
    try {
        const rzp = new window.Razorpay(options);
        rzp.open();
    } catch (e) {
        console.error("Razorpay Error", e);
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in-up">
      <div className="bg-gray-900 border border-amber-500/30 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-amber-500 hover:text-white z-10 p-2">✕</button>

        <div className="p-6 text-center">
            <div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/40">
                <span className="text-3xl">🕉️</span>
            </div>
            
            <h3 className="text-2xl font-cinzel font-bold text-amber-100 mb-1">Sacred Dakshina</h3>
            <p className="text-amber-200/50 text-[10px] uppercase tracking-widest mb-6">Offering for your spiritual reveal</p>

            <div className="mb-6 bg-black/60 p-5 rounded-xl border border-amber-500/20 relative">
                <div className="absolute top-2 right-2">
                    <select 
                        value={currency} 
                        onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
                        className="bg-gray-800 text-amber-200 text-[10px] rounded border border-amber-500/30 px-2 py-1 outline-none"
                    >
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                {appliedDiscount ? (
                    <div className="flex flex-col items-center">
                        <span className="text-gray-500 text-sm line-through">{originalPriceDisplay.display}</span>
                        <span className="text-green-400 text-[10px] font-bold mt-1 uppercase tracking-tighter">{appliedDiscount.code} applied (-{appliedDiscount.percentage}%)</span>
                        <span className="text-white font-bold text-4xl mt-1">{priceDisplay.display}</span>
                    </div>
                ) : (
                    <span className="text-white font-bold text-4xl block pt-2">{priceDisplay.display}</span>
                )}
            </div>

            <div className="flex gap-2 mb-6">
                <input type="text" placeholder="Coupon Code" className="bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white flex-grow uppercase" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
                <button onClick={handleApplyCoupon} className="bg-amber-700 hover:bg-amber-600 text-white px-4 rounded text-xs font-bold uppercase transition-colors">Apply</button>
            </div>

            <div className="flex p-1 bg-black/40 rounded-lg mb-6 border border-white/5">
                {currency === 'INR' && (
                    <button onClick={() => setPaymentMethod('upi')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${paymentMethod === 'upi' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>UPI / APPS</button>
                )}
                <button onClick={() => setPaymentMethod('card')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${paymentMethod === 'card' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>CARDS</button>
            </div>

            {paymentMethod === 'upi' && (
                <div className="space-y-4 mb-4 animate-fade-in-up">
                    <div className="grid grid-cols-4 gap-3">
                        {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map(app => (
                            <button key={app} onClick={() => handleInitiatePayment(app.toLowerCase())} className="flex flex-col items-center gap-1 p-2 bg-white/5 rounded-lg border border-transparent hover:border-amber-500/30 transition-all active:scale-95">
                                <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full p-1"><img src={`https://img.icons8.com/color/48/${app.toLowerCase()}.png`} alt={app} className="w-full h-full object-contain" /></div>
                                <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">{app}</span>
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setShowVpaInput(!showVpaInput)} className="w-full py-3 bg-gray-800 border border-gray-700 rounded-lg text-xs text-amber-200 hover:text-white flex items-center justify-center gap-2 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        {showVpaInput ? 'Hide UPI ID' : 'Enter Custom UPI ID'}
                    </button>
                    {showVpaInput && (
                        <div className="flex gap-2 animate-fade-in-up">
                            <input type="text" placeholder="example@upi" value={upiVpa} onChange={(e) => setUpiVpa(e.target.value)} className="flex-grow bg-black border border-amber-500/30 rounded px-3 py-2 text-white text-sm outline-none" />
                            <button onClick={() => handleInitiatePayment('vpa')} disabled={upiVpa.length < 5 || isLoading} className="bg-amber-600 hover:bg-amber-500 text-white px-4 rounded text-xs font-bold disabled:opacity-50">PAY</button>
                        </div>
                    )}
                </div>
            )}

            {paymentMethod === 'card' && (
                <div className="mb-4 animate-fade-in-up">
                    <Button onClick={() => handleInitiatePayment('card')} disabled={isLoading} className="w-full bg-blue-700 hover:bg-blue-600 border-none shadow-xl py-4 font-bold uppercase tracking-[0.2em] text-xs">
                        {isLoading ? 'Processing Access...' : 'Checkout with Card'}
                    </Button>
                </div>
            )}

            <div className="mt-8 flex flex-col items-center justify-center gap-1 text-[8px] text-gray-500 uppercase tracking-widest border-t border-gray-800 pt-4">
                <div className="flex gap-2 items-center mb-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-gray-400 font-bold">Encrypted SSL Secure</span>
                </div>
                <span>Certified by Glyph Sanctuary</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
