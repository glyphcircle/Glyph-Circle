// Store.tsx — Fixed: theme-aware, no alert(), React toast, pagination, mobile grid

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDb } from '../hooks/useDb';
import { supabase } from '../services/supabaseClient';
import { useTranslation } from '../hooks/useTranslation';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dbService } from '../services/db';
import SmartBackButton from './shared/SmartBackButton';
import OptimizedImage from './shared/OptimizedImage';
import { StoreItemWithStock } from '../services/db';
import { ShoppingCart, X, Plus, Minus, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import AddressFormModal, { AddressFormData } from './AddressFormModal';
import PaymentModal from './PaymentModal';

const CATEGORIES = {
  crystals: { name: 'Crystals & Gemstones', icon: '💎' },
  'spiritual-tools': { name: 'Spiritual Tools', icon: '🕉️' },
  books: { name: 'Books & Learning', icon: '📚' },
  remedies: { name: 'Remedies & Rituals', icon: '🔱' },
  meditation: { name: 'Meditation & Yoga', icon: '🧘' },
};

const ITEMS_PER_PAGE = 20;

// ── React Toast ────────────────────────────────────────────────────────────
interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }

const Store: React.FC = () => {
  const navigate = useNavigate();
  const { db } = useDb();
  const { getRegionalPrice } = useTranslation();
  const { cart, cartCount, totalPrice, addToCart, removeFromCart, updateQuantity, clearCart } = useCart();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme.mode === 'light';

  const [items, setItems] = useState<StoreItemWithStock[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [existingAddresses, setExistingAddresses] = useState<any[]>([]);
  const [currentShippingAddress, setCurrentShippingAddress] = useState<any>(null);
  const [paymentService, setPaymentService] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // ── React toast state (replaces raw DOM manipulation) ──
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ── Safe price display ──
  const displayPrice = (price: number) => {
    try {
      return getRegionalPrice(price)?.display ?? `₹${price}`;
    } catch {
      return `₹${price}`;
    }
  };

  // ── Fetch items ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('v_store_items_with_stock')
          .select('*', { count: 'exact' });

        if (selectedCategory !== 'all') query = query.eq('category', selectedCategory);
        if (searchTerm) query = query.ilike('name', `%${searchTerm}%`);

        const { data, error, count } = await query
          .order('name')
          .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

        if (error) throw error;
        setItems(data || []);
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Failed to fetch items:', err);
        showToast('Failed to load items. Please refresh.', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, [selectedCategory, searchTerm, page]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // ── Add to cart ────────────────────────────────────────────────────────
  const handleAddToCart = (item: StoreItemWithStock) => {
    if (item.stock_status === 'out_of_stock') return;
    const cartItem = cart.find(i => i.id === item.id);
    const currentQty = cartItem?.quantity || 0;
    if (currentQty >= item.available_stock) {
      showToast(`Only ${item.available_stock} units available in stock.`, 'error');
      return;
    }
    addToCart({
      id: item.id, name: item.name, price: item.price,
      image: item.image_url, category: item.category,
      sku: item.sku, maxStock: item.available_stock
    });
    showToast(`${item.name} added to cart!`, 'success');
  };

  // ── Checkout ───────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) { showToast('Your cart is empty!', 'info'); return; }
    setIsProcessing(true);
    try {
      const { data: addresses, error } = await supabase
        .from('user_addresses').select('*')
        .eq('user_id', user?.id).eq('is_shipping', true)
        .order('is_default', { ascending: false });
      if (error) throw error;
      setExistingAddresses(addresses || []);
      setIsAddressModalOpen(true);
    } catch (err: any) {
      showToast('Failed to load addresses: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddressSubmit = async (addressData: AddressFormData | any) => {
    setIsAddressModalOpen(false);
    setIsCartOpen(false);
    setIsProcessing(true);
    try {
      let selectedAddress = addressData;
      if (!addressData.id) {
        if (addressData.is_default) {
          await supabase.from('user_addresses')
            .update({ is_default: false })
            .eq('user_id', user?.id).eq('is_shipping', true);
        }
        const { data: newAddress, error } = await supabase
          .from('user_addresses')
          .insert({
            user_id: user?.id, label: addressData.label,
            full_name: addressData.full_name, phone: addressData.phone,
            address_line1: addressData.address_line1,
            address_line2: addressData.address_line2 || '',
            city: addressData.city, state: addressData.state,
            zip: addressData.zip, country: addressData.country,
            is_default: addressData.is_default,
            is_shipping: true, is_billing: false
          }).select().single();
        if (error) throw error;
        selectedAddress = newAddress;
      }
      setCurrentShippingAddress(selectedAddress);

      // Stock validation
      for (const item of cart) {
        const { data: stockData, error } = await supabase
          .from('v_store_items_with_stock')
          .select('available_stock, name').eq('id', item.id).single();
        if (error || !stockData || stockData.available_stock < item.quantity) {
          showToast(
            `${item.name}: only ${stockData?.available_stock || 0} available, you requested ${item.quantity}.`,
            'error'
          );
          setIsProcessing(false);
          return;
        }
      }
      setPaymentService('Store Purchase');
      setPaymentAmount(totalPrice);
      setIsPaymentModalOpen(true);
    } catch (err: any) {
      showToast('Checkout failed: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (paymentDetails: any) => {
    setIsPaymentModalOpen(false);
    setIsProcessing(true);
    try {
      if (!currentShippingAddress) throw new Error('No shipping address found');

      const addrSnap = {
        full_name: currentShippingAddress.full_name,
        phone: currentShippingAddress.phone,
        address_line1: currentShippingAddress.address_line1,
        address_line2: currentShippingAddress.address_line2,
        city: currentShippingAddress.city,
        state: currentShippingAddress.state,
        zip: currentShippingAddress.zip,
        country: currentShippingAddress.country,
      };

      const { data: orderData, error: orderError } = await supabase
        .from('store_orders').insert({
          user_id: user?.id, total: totalPrice, status: 'completed',
          payment_method: paymentDetails?.method || 'manual',
          payment_id: paymentDetails?.transactionId || `TXN-${Date.now()}`,
          razorpay_payment_id: paymentDetails?.transactionId || `TXN-${Date.now()}`,
          razorpay_order_id: paymentDetails?.orderId || `ORD-${Date.now()}`,
          shipping_address_id: currentShippingAddress.id,
          shipping_address_snapshot: addrSnap,
          delivery_address: addrSnap,
          item_ids: cart.map(i => i.id),
          order_items: cart.map(i => ({
            item_id: i.id, name: i.name,
            quantity: i.quantity, price: i.price, sku: i.sku || ''
          }))
        }).select().single();

      if (orderError) throw orderError;

      for (const item of cart) {
        const { data: rpcData, error: invErr } = await supabase.rpc('reduce_inventory', {
          p_item_id: item.id, p_quantity: item.quantity
        });
        if (invErr) console.error(`Inventory error for ${item.name}:`, invErr);
        else if (rpcData && !rpcData.success) console.error(`Inventory unsuccessful:`, rpcData.error);
      }

      await dbService.recordTransaction({
        user_id: user?.id, service_type: 'store_purchase',
        service_title: `Store Order #${orderData.id}`,
        amount: totalPrice, currency: 'INR',
        payment_method: paymentDetails?.method || 'manual',
        payment_provider: paymentDetails?.provider || 'manual',
        order_id: paymentDetails?.orderId || `ORD-${Date.now()}`,
        transaction_id: paymentDetails?.transactionId || `TXN-${Date.now()}`,
        status: 'success',
        metadata: {
          order_id: orderData.id, shipping_address: currentShippingAddress,
          items: cart.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, price: i.price }))
        }
      });

      clearCart();
      const { data: refreshed } = await supabase
        .from('v_store_items_with_stock').select('*').order('name');
      if (refreshed) setItems(refreshed);

      navigate(`/order-confirmation/${orderData.id}`, {
        state: { orderData, shippingAddress: currentShippingAddress }
      });
    } catch (err: any) {
      showToast('Order failed: ' + err.message + '. Contact support if payment was deducted.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Cart modal background — theme aware ────────────────────────────────
  const cartModalBg = isLight
    ? 'bg-white border-purple-200'
    : 'bg-gradient-to-br from-purple-900 via-indigo-900 to-black border-purple-500/30';
  const cartHeaderBorder = isLight ? 'border-purple-100' : 'border-purple-500/30';
  const cartItemBg = isLight ? 'bg-purple-50 border-purple-100' : 'bg-black/40 border-purple-500/20';
  const cartTextPrimary = isLight ? 'text-gray-800' : 'text-white';
  const cartTextSecondary = isLight ? 'text-purple-600' : 'text-purple-300';
  const cartQtyBtnBg = isLight ? 'bg-purple-100 hover:bg-purple-200 text-purple-700' : 'bg-purple-600 hover:bg-purple-700 text-white';

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500">

      {/* ── React Toasts ── */}
      <div className="fixed top-20 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold max-w-[280px] animate-slide-in-right pointer-events-auto
              ${t.type === 'success' ? 'bg-green-600 text-white'
                : t.type === 'error' ? 'bg-red-600 text-white'
                  : 'bg-blue-600 text-white'}`}
          >
            {t.type === 'success' ? '✅ ' : t.type === 'error' ? '❌ ' : 'ℹ️ '}
            {t.message}
          </div>
        ))}
      </div>

      {/* ── Floating Cart Button ── */}
      <button
        onClick={() => setIsCartOpen(true)}
        className="fixed top-20 right-4 md:right-6 z-30 bg-primary hover:bg-primary/90 text-primary-foreground p-3 rounded-full shadow-2xl transition-all active:scale-95"
        style={{ touchAction: 'manipulation' }}
        aria-label="Open shopping cart"
      >
        <ShoppingCart size={20} />
        {cartCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        )}
      </button>

      <div className="max-w-7xl mx-auto px-3 md:px-6 py-3 md:py-6">

        {/* Header */}
        <div className="mb-6 md:mb-10">
          <SmartBackButton className="mb-4" />
          <h1 className="text-2xl md:text-4xl font-cinzel font-black text-foreground mb-2 uppercase tracking-widest">
            Mystic Bazaar
          </h1>
          <p className="text-foreground/70 text-sm font-lora italic">
            Authentic spiritual artifacts & tools for your journey.
          </p>
        </div>

        {/* Filters row */}
        <div className="mb-6 md:mb-8 space-y-3">
          {/* Category Buttons */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => { setSelectedCategory('all'); setPage(0); }}
              className={`px-3 md:px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border min-h-[40px] flex-shrink-0
                ${selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-card-foreground border-border hover:bg-muted'}`}
            >
              ✨ All
            </button>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => { setSelectedCategory(key); setPage(0); }}
                className={`px-3 md:px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border min-h-[40px] flex-shrink-0
                  ${selectedCategory === key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-card-foreground border-border hover:bg-muted'}`}
              >
                {cat.icon} <span className="hidden sm:inline">{cat.name}</span>
                <span className="sm:hidden">{cat.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search artifacts..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
              className="w-full bg-card border border-border rounded-full pl-9 pr-4 py-2.5 text-sm focus:border-primary outline-none transition-colors min-h-[40px]"
            />
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground italic font-lora">
            No items found in this category of the Bazaar.
          </div>
        ) : (
          <>
            {/* FIX: grid-cols-2 on mobile, not 1 */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
              {items.map((item) => {
                const inCart = cart.find(i => i.id === item.id);
                return (
                  <div
                    key={item.id}
                    className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all hover:scale-[1.02] flex flex-col group"
                  >
                    {/* Image */}
                    <div className="relative h-36 sm:h-48 md:h-56 overflow-hidden flex-shrink-0">
                      <OptimizedImage
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        containerClassName="w-full h-full"
                      />
                      {/* Stock badge */}
                      <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide shadow-lg
                        ${item.stock_status === 'out_of_stock' ? 'bg-red-600 text-white'
                          : item.stock_status === 'low_stock' ? 'bg-amber-500 text-black'
                            : 'bg-green-600 text-white'}`}>
                        {item.stock_status === 'out_of_stock' ? 'Sold Out'
                          : item.stock_status === 'low_stock' ? `${item.available_stock} left`
                            : 'In Stock'}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 md:p-5 flex flex-col flex-grow">
                      <div className="text-[9px] uppercase font-black tracking-widest text-primary mb-1">
                        {(CATEGORIES as any)[item.category]?.icon} {(CATEGORIES as any)[item.category]?.name || item.category}
                      </div>
                      <h3 className="text-card-foreground font-cinzel font-bold text-sm md:text-base mb-1 leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.name}
                      </h3>
                      <p className="text-muted-foreground text-[11px] md:text-xs font-lora italic mb-3" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.description}
                      </p>

                      <div className="mt-auto space-y-2">
                        <div className="text-lg md:text-2xl font-black text-foreground font-mono">
                          {displayPrice(item.price)}
                        </div>
                        {/* Show qty if in cart */}
                        {inCart && (
                          <p className="text-[10px] text-primary font-bold">
                            ✓ {inCart.quantity} in cart
                          </p>
                        )}
                        <button
                          onClick={() => handleAddToCart(item)}
                          disabled={item.stock_status === 'out_of_stock'}
                          className={`w-full py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 min-h-[40px]
                            ${item.stock_status === 'out_of_stock'
                              ? 'bg-muted text-muted-foreground cursor-not-allowed'
                              : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg'}`}
                        >
                          {item.stock_status === 'out_of_stock' ? 'Sold Out' : '+ Add to Cart'}
                        </button>
                      </div>

                      <div className="flex justify-between text-[9px] text-muted-foreground font-bold uppercase tracking-wider pt-2 mt-2 border-t border-border/50">
                        <span>{item.sku}</span>
                        <span className="text-primary/50">✦ Authentic</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-full bg-card border border-border disabled:opacity-30 hover:bg-muted transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm text-muted-foreground font-semibold">
                  Page {page + 1} of {totalPages}
                  <span className="ml-2 text-xs">({totalCount} items)</span>
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded-full bg-card border border-border disabled:opacity-30 hover:bg-muted transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Cart Modal — Theme Aware ── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className={`relative border-t-2 md:border-2 rounded-t-2xl md:rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden ${cartModalBg}
            max-h-[92vh] md:max-h-[85vh] flex flex-col`}>

            {/* Cart Header */}
            <div className={`flex items-center justify-between p-4 md:p-6 border-b ${cartHeaderBorder} flex-shrink-0`}>
              <div className="flex items-center gap-2">
                <ShoppingCart className="text-purple-500" size={22} />
                <h2 className={`text-lg md:text-2xl font-bold font-cinzel ${cartTextPrimary}`}>
                  Cart ({cartCount})
                </h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className={`p-2 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center
                  ${isLight ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-purple-500/20 text-white'}`}
              >
                <X size={22} />
              </button>
            </div>

            {/* Cart Items — scrollable */}
            <div className="overflow-y-auto flex-1 p-4 md:p-6">
              {cart.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingCart className="mx-auto text-purple-400/30" size={48} />
                  <p className={`mt-4 text-base ${cartTextSecondary}`}>Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className={`flex gap-3 p-3 rounded-xl border ${cartItemBg}`}>
                      {item.image && (
                        <div className="w-14 h-14 md:w-20 md:h-20 flex-shrink-0 rounded-lg overflow-hidden">
                          <OptimizedImage
                            src={item.image} alt={item.name}
                            className="w-full h-full object-cover"
                            containerClassName="w-full h-full"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold text-sm truncate ${cartTextPrimary}`}>{item.name}</h3>
                        <p className={`text-xs ${cartTextSecondary}`}>₹{item.price} each</p>
                        <p className={`text-xs font-bold ${cartTextPrimary}`}>
                          Subtotal: ₹{item.price * item.quantity}
                        </p>
                        {/* Qty controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className={`p-2 rounded min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors ${cartQtyBtnBg}`}
                          >
                            <Minus size={14} />
                          </button>
                          <span className={`font-bold text-sm w-8 text-center ${cartTextPrimary}`}>{item.quantity}</span>
                          <button
                            onClick={() => {
                              const max = (item as any).maxStock || 999;
                              if (item.quantity < max) updateQuantity(item.id, item.quantity + 1);
                              else showToast(`Max stock available: ${max}`, 'info');
                            }}
                            className={`p-2 rounded min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors ${cartQtyBtnBg}`}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors self-start min-h-[36px] min-w-[36px] flex items-center justify-center"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className={`border-t p-4 md:p-6 space-y-3 flex-shrink-0 ${cartHeaderBorder}
                ${isLight ? 'bg-gray-50' : 'bg-black/20'}`}>
                <div className="flex justify-between items-center">
                  <span className={`text-lg font-bold ${cartTextSecondary}`}>Total</span>
                  <span className={`text-xl font-black font-mono ${cartTextPrimary}`}>₹{totalPrice}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={clearCart}
                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors min-h-[48px] text-sm"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="flex-[2] py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 min-h-[48px] text-sm"
                  >
                    {isProcessing ? 'Processing...' : `Checkout • ₹${totalPrice}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Address Modal */}
      <AddressFormModal
        isOpen={isAddressModalOpen}
        onClose={() => { setIsAddressModalOpen(false); setIsProcessing(false); }}
        onSubmit={handleAddressSubmit}
        existingAddresses={existingAddresses}
      />

      {/* Payment Modal */}
      <PaymentModal
        isVisible={isPaymentModalOpen}
        onClose={() => { setIsPaymentModalOpen(false); setIsProcessing(false); }}
        onSuccess={handlePaymentSuccess}
        basePrice={paymentAmount}
        serviceName={paymentService}
      />
    </div>
  );
};

export default Store;
