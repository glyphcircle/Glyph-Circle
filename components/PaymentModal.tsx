
import React, { useState, useEffect, useMemo } from 'react';
import Button from './shared/Button';
import { useTranslation } from '../hooks/useTranslation';
import { useUser } from '../context/UserContext';
import { dbService } from '../services/db';
import { securityService } from '../services/security';
import { paymentManager, PaymentProvider } from '../services/paymentManager';
import { useDb } from '../hooks/useDb';
import { Currency } from '../context/LanguageContext';

// Define Razorpay on Window
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  basePrice: number; // Base price in INR (from DB)
  serviceName: string;
}

const CURRENCIES: Currency[] = ['INR', 'USD', 'EUR', 'SAR', 'GBP' as Currency, 'BRL', 'JPY'];

const PaymentModal: React.FC<PaymentModalProps> = ({ isVisible, onClose, onSuccess, basePrice, serviceName }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState<PaymentProvider | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi'>('upi');
  
  // UPI Specific State
  const [upiVpa, setUpiVpa] = useState('');
  const [showVpaInput, setShowVpaInput] = useState(false);
  
  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string, percentage: number } | null>(null);
  const [couponMessage, setCouponMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const { t, getRegionalPrice, currency, setCurrency } = useTranslation();
  const { user, commitPendingReading, pendingReading, refreshUser } = useUser();
  const { db } = useDb();

  // Reset state when modal opens & Sync User Currency
  useEffect(() => {
      if (isVisible) {
          // 1. Sync Currency from User Profile if available
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
          
          // If currency is INR, default to UPI, else Card
          if (effectiveCurrency === 'INR') setPaymentMethod('upi');
          else setPaymentMethod('card');

          const providersList = db.payment_providers || [];
          const provider = paymentManager.getActiveProviderFromList(providersList, region);
          setActiveProvider(provider);
      }
  }, [isVisible, db.payment_providers, user]);

  const handleCurrencyChange = async (newCurrency: Currency) => {
      setCurrency(newCurrency);
      // Persist to DB if user is logged in
      if (user) {
          try {
              await dbService.updateEntry('users', user.id, { currency: newCurrency });
          } catch (e) {
              console.warn("Failed to save currency preference:", e);
          }
      }
  };

  // Calculate Finals
  const finalPriceINR = useMemo(() => {
      if (!appliedDiscount) return basePrice;
      const discountAmount = (basePrice * appliedDiscount.percentage) / 100;
      return Math.max(0, basePrice - discountAmount);
  }, [basePrice, appliedDiscount]);

  // Convert to display currency
  const priceDisplay = getRegionalPrice(finalPriceINR);
  const originalPriceDisplay = getRegionalPrice(basePrice);

  if (!isVisible) return null;

  const handleApplyCoupon = () => {
      setCouponMessage(null);
      if (!couponCode.trim()) return;

      const discounts = db.store_discounts || [];
      const validCoupon = discounts.find((d: any) => d.code === couponCode.trim().toUpperCase() && d.status === 'active');

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
        amount: finalPriceINR, // Store final amount paid (Base INR for consistent DB records)
        description: pendingReading ? `${activeProvider?.name || 'Mock'}: ${pendingReading.title}` : `${serviceName} (${activeProvider?.name || 'Mock'})`,
        status: 'success'
      });

      if (pendingReading) {
        commitPendingReading();
      }

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
        console.warn("No provider configured. Using mock success.");
        setTimeout(() => handlePaymentSuccess("mock_fallback_id"), 1500);
        return;
    }

    if (activeProvider.provider_type === 'razorpay') {
        // Fallback to mock if Razorpay SDK is missing
        if (typeof window.Razorpay === 'undefined') {
            console.warn("Razorpay SDK not found. Mocking success for demo.");
            setTimeout(() => handlePaymentSuccess(`mock_rzp_${Date.now()}`), 2000);
        } else {
            initRazorpay(activeProvider, specificMethod);
        }
    } else {
        // Simulating other providers (Stripe, PayPal)
        setTimeout(() => {
            handlePaymentSuccess(`${activeProvider.provider_type}_mock_id_${Date.now()}`);
        }, 1500);
    }
  };

  const initRazorpay = (provider: PaymentProvider, method?: string) => {
    const targetCurrency = currency;
    const targetAmount = priceDisplay.price; 
    const amountInSubunits = Math.round(targetAmount * 100);

    const options: any = {
      key: provider.api_key,
      amount: amountInSubunits, 
      currency: targetCurrency, 
      name: "Glyph Circle",
      description: serviceName,
      image: "https://cdn-icons-png.flaticon.com/512/3063/3063822.png",
      handler: function (response: any) {
        handlePaymentSuccess(response.razorpay_payment_id);
      },
      prefill: {
        name: user?.name || "Mystical Seeker",
        email: user?.email || "seeker@glyph.circle",
        contact: "9999999999",
        method: method === 'vpa' ? undefined : undefined, 
        'vpa': method === 'vpa' ? upiVpa : undefined
      },
      theme: { color: "#F59E0B" },
      modal: {
        ondismiss: function() { setIsLoading(false); }
      }
    };

    try {
        const rzp1 = new window.Razorpay(options);
        rzp1.on('payment.failed', function (response: any){
            // Fallback to mock on error for this demo context
            console.error("Payment failed", response.error);
            const confirmMock = window.confirm("Real payment failed (likely due to test key). Use mock success?");
            if (confirmMock) {
                handlePaymentSuccess("mock_forced_success");
            } else {
                setIsLoading(false);
            }
        });
        rzp1.open();
    } catch (e) {
        console.error("Razorpay Init Error", e);
        // Auto fallback to mock if init crashes
        setTimeout(() => handlePaymentSuccess("mock_fallback_success"), 1000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in-up">
      <div className="bg-gray-900 border border-amber-500/30 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-amber-500 hover:text-white z-10">✕</button>

        <div className="p-6 text-center">
            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-500/50">
                <span className="text-2xl">🕉️</span>
            </div>
            
            <h3 className="text-xl font-cinzel font-bold text-amber-100 mb-1">Dakshina (Offering)</h3>
            <p className="text-amber-200/60 text-xs mb-4">
                Complete your transaction for <strong>{serviceName}</strong>.
            </p>

            {/* Pricing Display */}
            <div className="mb-6 bg-black/40 p-4 rounded-lg border border-amber-500/20 relative">
                {/* Currency Switcher Absolute */}
                <div className="absolute top-2 right-2">
                    <select 
                        value={currency} 
                        onChange={(e) => handleCurrencyChange(e.target.value as Currency)}
                        className="bg-gray-800 text-amber-200 text-xs rounded border border-amber-500/30 px-1 py-0.5 outline-none focus:border-amber-500 cursor-pointer"
                    >
                        {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {appliedDiscount ? (
                    <div className="flex flex-col items-center">
                        <span className="text-gray-400 text-sm line-through">{originalPriceDisplay.display}</span>
                        <span className="text-green-400 text-xs font-bold mb-1">
                            {appliedDiscount.code} applied (-{appliedDiscount.percentage}%)
                        </span>
                        <span className="text-white font-bold text-3xl mt-1">{priceDisplay.display}</span>
                    </div>
                ) : (
                    <span className="text-white font-bold text-3xl block pt-2">{priceDisplay.display}</span>
                )}
            </div>

            {/* Coupon Input */}
            <div className="flex gap-2 mb-6">
                <input 
                    type="text" 
                    placeholder="Coupon Code" 
                    className="bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white flex-grow uppercase"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                />
                <button 
                    onClick={handleApplyCoupon}
                    className="bg-amber-700 hover:bg-amber-600 text-white px-3 rounded text-xs font-bold uppercase transition-colors"
                >
                    Apply
                </button>
            </div>
            {couponMessage && (
                <p className={`text-xs -mt-4 mb-4 ${couponMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {couponMessage.text}
                </p>
            )}

            <div className="flex p-1 bg-black/40 rounded-lg mb-4">
                {currency === 'INR' && (
                    <button onClick={() => setPaymentMethod('upi')} className={`flex-1 py-2 text-xs font-bold rounded transition-colors ${paymentMethod === 'upi' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'}`}>UPI / Apps</button>
                )}
                <button onClick={() => setPaymentMethod('card')} className={`flex-1 py-2 text-xs font-bold rounded transition-colors ${paymentMethod === 'card' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'}`}>Cards</button>
            </div>

            {paymentMethod === 'upi' && (
                <div className="space-y-3 mb-4 animate-fade-in-up">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest text-left ml-1 mb-2">Select App</p>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                        {/* GPay */}
                        <button onClick={() => handleInitiatePayment('google_pay')} className="flex flex-col items-center gap-1 p-2 bg-gray-800 rounded hover:bg-gray-700 border border-transparent hover:border-amber-500/30 transition-all">
                            <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full p-1"><img src="https://cdn-icons-png.flaticon.com/512/6124/6124998.png" alt="GPay" className="w-full h-full object-contain" /></div>
                            <span className="text-[9px] text-gray-300">GPay</span>
                        </button>
                        {/* PhonePe */}
                        <button onClick={() => handleInitiatePayment('phonepe')} className="flex flex-col items-center gap-1 p-2 bg-gray-800 rounded hover:bg-gray-700 border border-transparent hover:border-amber-500/30 transition-all">
                            <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full p-1"><img src="https://cdn-icons-png.flaticon.com/512/15579/15579489.png" alt="PhonePe" className="w-full h-full object-contain" /></div>
                            <span className="text-[9px] text-gray-300">PhonePe</span>
                        </button>
                        {/* Paytm */}
                        <button onClick={() => handleInitiatePayment('paytm')} className="flex flex-col items-center gap-1 p-2 bg-gray-800 rounded hover:bg-gray-700 border border-transparent hover:border-amber-500/30 transition-all">
                            <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full p-1"><img src="https://cdn-icons-png.flaticon.com/512/825/825454.png" alt="Paytm" className="w-full h-full object-contain" /></div>
                            <span className="text-[9px] text-gray-300">Paytm</span>
                        </button>
                        {/* BHIM */}
                        <button onClick={() => handleInitiatePayment('bhim')} className="flex flex-col items-center gap-1 p-2 bg-gray-800 rounded hover:bg-gray-700 border border-transparent hover:border-amber-500/30 transition-all">
                            <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full p-1"><img src="https://img.icons8.com/color/48/bhim.png" alt="BHIM" className="w-full h-full object-contain" /></div>
                            <span className="text-[9px] text-gray-300">BHIM</span>
                        </button>
                    </div>

                    {!showVpaInput ? (
                        <button 
                            onClick={() => setShowVpaInput(true)}
                            className="w-full py-3 bg-gray-800 border border-gray-700 hover:border-amber-500 rounded text-sm text-amber-200 hover:text-white flex items-center justify-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                            Enter Any UPI ID
                        </button>
                    ) : (
                        <div className="animate-fade-in-up">
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="example@upi" 
                                    value={upiVpa}
                                    onChange={(e) => setUpiVpa(e.target.value)}
                                    className="flex-grow bg-gray-950 border border-amber-500/30 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                                />
                                <button 
                                    onClick={() => handleInitiatePayment('vpa')}
                                    disabled={upiVpa.length < 5 || isLoading}
                                    className="bg-amber-600 hover:bg-amber-500 text-white px-4 rounded text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    PAY
                                </button>
                            </div>
                            <button onClick={() => setShowVpaInput(false)} className="text-[10px] text-gray-500 hover:text-gray-300 mt-2 underline">Cancel UPI ID</button>
                        </div>
                    )}
                </div>
            )}

            {paymentMethod === 'card' && (
                <div className="space-y-3 mb-4 animate-fade-in-up">
                    <Button onClick={() => handleInitiatePayment('card')} disabled={isLoading} className="w-full bg-blue-700 hover:bg-blue-600 border-none shadow-lg text-xs py-3">
                        {isLoading ? 'Processing...' : 'Pay via Credit/Debit Card'}
                    </Button>
                </div>
            )}

            <div className="mt-4 flex flex-col items-center justify-center gap-1 text-[9px] text-gray-500 uppercase tracking-widest border-t border-gray-800 pt-3">
                <div className="flex gap-2 items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span>SECURE TRANSACTION</span>
                </div>
                <span>Processed by {activeProvider?.name || 'Mock Gateway'}</span>
                <span>Currency: {priceDisplay.currency}</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
