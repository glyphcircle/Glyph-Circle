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

// Using official stable icons hosted on reliable public CDNs
const APP_ICONS: Record<string, string> = {
    gpay: "https://www.gstatic.com/lamda/images/google_pay_logo.svg",
    phonepe: "https://static.razorpay.com/app/upi/phonepe.png",
    paytm: "https://static.razorpay.com/app/upi/paytm.png",
    bhim: "https://upload.wikimedia.org/wikipedia/commons/f/f1/BHIM_Logo.svg"
};

const PaymentModal: React.FC<PaymentModalProps> = ({ isVisible, onClose, onSuccess, basePrice, serviceName }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState<PaymentProvider | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('upi');
  
  const [upiVpa, setUpiVpa] = useState('');
  const [showVpaInput, setShowVpaInput] = useState(false);
  
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string, percentage: number } | null>(null);

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
          setUpiVpa('');
          setShowVpaInput(false);
          setIsLoading(false);
          
          if (currency === 'INR') setPaymentMethod('upi');
          else setPaymentMethod('card');

          const providersList = db.payment_providers || [];
          const region = paymentManager.detectUserCountry();
          const provider = paymentManager.getActiveProviderFromList(providersList, region);
          setActiveProvider(provider);
      }
  }, [isVisible, db.payment_providers, user, currency, setCurrency]);

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
      if (!couponCode.trim()) return;
      const validCoupon = (db.store_discounts || []).find((d: any) => d.code === couponCode.trim().toUpperCase() && d.status === 'active');
      if (validCoupon) {
          setAppliedDiscount({ code: validCoupon.code, percentage: validCoupon.percentage });
      } else {
          setAppliedDiscount(null);
          alert("Invalid or expired coupon code.");
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
        console.warn("No active provider. Using development fallback.");
        setTimeout(() => handlePaymentSuccess(`mock_id_${Date.now()}`), 1500);
        return;
    }

    if (activeProvider.provider_type === 'razorpay') {
        initRazorpay(activeProvider, specificMethod);
    } else {
        setTimeout(() => handlePaymentSuccess(`${activeProvider.provider_type}_mock_${Date.now()}`), 1500);
    }
  };

  const initRazorpay = (provider: PaymentProvider, method?: string) => {
    if (typeof window.Razorpay === 'undefined') {
        alert("Payment service is initializing. Please try again in a moment.");
        setIsLoading(false);
        return;
    }

    const options: any = {
      key: provider.api_key,
      amount: Math.round(priceDisplay.price * 100), 
      currency: currency, 
      name: "Glyph Circle",
      description: serviceName,
      handler: (res: any) => handlePaymentSuccess(res.razorpay_payment_id),
      prefill: {
        name: user?.name || "Seeker",
        email: user?.email || "seeker@glyph.circle"
      },
      theme: { color: "#F59E0B" },
      modal: { ondismiss: () => setIsLoading(false) }
    };
    
    if (method && method !== 'vpa') {
        options.config = {
            display: {
                blocks: {
                    upi: {
                        name: 'Pay via UPI',
                        instruments: [
                            { method: 'upi', apps: [method] }
                        ]
                    }
                },
                sequence: ['block.upi']
            }
        };
    }

    try {
        const rzp = new window.Razorpay(options);
        rzp.open();
    } catch (e) {
        console.error("Razorpay Error", e);
        setIsLoading(false);
        alert("Divine gateway interrupted. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in-up">
      <div className="bg-[#0b0c15] border border-amber-500/30 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden relative">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-amber-500 hover:text-white z-10 p-2 text-2xl">✕</button>

        <div className="p-8 text-center">
            <h3 className="text-3xl font-cinzel font-bold text-amber-100 mb-1">Sacred Dakshina</h3>
            <p className="text-amber-200/50 text-[10px] uppercase tracking-[0.2em] mb-8">Offering for your spiritual reveal</p>

            <div className="mb-8 bg-black/60 p-6 rounded-xl border border-amber-500/20 relative">
                <div className="absolute top-2 right-2">
                    <select 
                        value={currency} 
                        onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
                        className="bg-gray-800 text-amber-200 text-[10px] rounded border border-amber-500/30 px-2 py-1 outline-none font-bold cursor-pointer"
                    >
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                {appliedDiscount ? (
                    <div className="flex flex-col items-center">
                        <span className="text-gray-500 text-sm line-through">{originalPriceDisplay.display}</span>
                        <span className="text-green-400 text-[10px] font-bold mt-1 uppercase tracking-tighter">{appliedDiscount.code} applied (-{appliedDiscount.percentage}%)</span>
                        <span className="text-white font-bold text-5xl mt-1 tracking-tighter">{priceDisplay.display}</span>
                    </div>
                ) : (
                    <span className="text-white font-bold text-5xl block pt-2 tracking-tighter">{priceDisplay.display}</span>
                )}
            </div>

            <div className="flex gap-2 mb-8">
                <input 
                    type="text" 
                    placeholder="COUPON CODE" 
                    className="bg-black/40 border border-gray-700 rounded p-3 text-sm text-white flex-grow uppercase tracking-widest focus:border-amber-500 outline-none" 
                    value={couponCode} 
                    onChange={(e) => setCouponCode(e.target.value)} 
                />
                <button type="button" onClick={handleApplyCoupon} className="bg-amber-700 hover:bg-amber-600 text-white px-6 rounded font-bold uppercase transition-all shadow-lg active:scale-95">Apply</button>
            </div>

            <div className="flex p-1 bg-black/60 rounded-lg mb-8 border border-white/5">
                {currency === 'INR' && (
                    <button type="button" onClick={() => setPaymentMethod('upi')} className={`flex-1 py-3 text-xs font-bold rounded-md transition-all uppercase tracking-widest ${paymentMethod === 'upi' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>UPI / Apps</button>
                )}
                <button type="button" onClick={() => setPaymentMethod('card')} className={`flex-1 py-3 text-xs font-bold rounded-md transition-all uppercase tracking-widest ${paymentMethod === 'card' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Cards</button>
            </div>

            {paymentMethod === 'upi' && (
                <div className="space-y-6 mb-4 animate-fade-in-up">
                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { id: 'gpay', label: 'GPay' },
                            { id: 'phonepe', label: 'PhonePe' },
                            { id: 'paytm', label: 'Paytm' },
                            { id: 'bhim', label: 'BHIM' }
                        ].map(app => (
                            <button type="button" key={app.id} onClick={() => handleInitiatePayment(app.id)} className="flex flex-col items-center gap-2 group cursor-pointer">
                                <div className="w-12 h-12 flex items-center justify-center bg-white rounded-xl p-2 border-2 border-transparent group-hover:border-amber-500 transition-all shadow-md overflow-hidden">
                                    <img 
                                      src={APP_ICONS[app.id]} 
                                      alt={app.label} 
                                      className="w-full h-full object-contain" 
                                      onError={(e) => { e.currentTarget.src = "https://img.icons8.com/color/48/bank-card-backside.png"; }} 
                                    />
                                </div>
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter group-hover:text-amber-200">{app.label}</span>
                            </button>
                        ))}
                    </div>
                    <button 
                        type="button"
                        onClick={() => setShowVpaInput(!showVpaInput)} 
                        className="w-full py-4 bg-gray-900 border border-gray-700 rounded-xl text-xs font-bold text-amber-200 hover:text-white flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        {showVpaInput ? 'HIDE UPI ID' : 'ENTER ANY UPI ID'}
                    </button>
                    {showVpaInput && (
                        <div className="flex gap-2 animate-fade-in-up">
                            <input 
                                type="text" 
                                placeholder="seeker@upi" 
                                value={upiVpa} 
                                onChange={(e) => setUpiVpa(e.target.value)} 
                                className="flex-grow bg-black border border-amber-500/30 rounded-xl px-4 py-3 text-white text-sm outline-none focus:ring-1 ring-amber-500" 
                            />
                            <button type="button" onClick={() => handleInitiatePayment('vpa')} disabled={upiVpa.length < 5 || isLoading} className="bg-amber-600 hover:bg-amber-500 text-white px-6 rounded-xl font-bold disabled:opacity-50 transition-colors uppercase text-xs">Pay</button>
                        </div>
                    )}
                </div>
            )}

            {paymentMethod === 'card' && (
                <div className="mb-4 animate-fade-in-up">
                    <Button type="button" onClick={() => handleInitiatePayment('card')} disabled={isLoading} className="w-full bg-blue-700 hover:bg-blue-600 border-none shadow-xl py-5 font-bold uppercase tracking-[0.2em] text-xs rounded-xl">
                        {isLoading ? 'INITIATING...' : 'Checkout with Card'}
                    </Button>
                </div>
            )}

            <div className="mt-10 flex flex-col items-center justify-center gap-2 text-[9px] text-gray-500 uppercase tracking-[0.2em] border-t border-gray-800 pt-6">
                <div className="flex gap-2 items-center text-green-500 font-bold">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span>ENCRYPTED SSL SECURE</span>
                </div>
                <span>Certified by Glyph Sanctuary</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;