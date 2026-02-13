/**
 * Store Component - E-commerce Store with Inventory Management
 * 
 * MOBILE OPTIMIZED VERSION
 * - Touch targets minimum 44px
 * - Responsive text sizes
 * - Mobile-friendly modals
 * - Proper z-index layering
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDb } from '../hooks/useDb';
import { supabase } from '../services/supabaseClient';
import { useTranslation } from '../hooks/useTranslation';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/db';
import SmartBackButton from './shared/SmartBackButton';
import OptimizedImage from './shared/OptimizedImage';
import { StoreItemWithStock } from '../services/db';
import { ShoppingCart, X, Plus, Minus, Trash2 } from 'lucide-react';
import AddressFormModal, { AddressFormData } from './AddressFormModal';
import PaymentModal from './PaymentModal';

const CATEGORIES = {
  crystals: { name: 'Crystals & Gemstones', icon: '💎', color: 'purple' },
  'spiritual-tools': { name: 'Spiritual Tools', icon: '🕉️', color: 'amber' },
  books: { name: 'Books & Learning', icon: '📚', color: 'blue' },
  remedies: { name: 'Remedies & Rituals', icon: '🔱', color: 'red' },
  meditation: { name: 'Meditation & Yoga', icon: '🧘', color: 'green' }
};

const ITEMS_PER_PAGE = 20;

const Store: React.FC = () => {
  const navigate = useNavigate();
  const { db } = useDb();
  const { getRegionalPrice } = useTranslation();
  const { cart, cartCount, totalPrice, addToCart, removeFromCart, updateQuantity, clearCart } = useCart();
  const { user } = useAuth();

  const [items, setItems] = useState<StoreItemWithStock[]>([]);
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

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('v_store_items_with_stock')
          .select('*', { count: 'exact' });

        if (selectedCategory !== 'all') {
          query = query.eq('category', selectedCategory);
        }

        if (searchTerm) {
          query = query.ilike('name', `%${searchTerm}%`);
        }

        const { data, error } = await query
          .order('name')
          .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

        if (error) throw error;
        setItems(data || []);
      } catch (err) {
        console.error('Failed to fetch items:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, [selectedCategory, searchTerm, page]);

  const handleAddToCart = (item: StoreItemWithStock) => {
    if (item.stock_status === 'out_of_stock') return;

    const cartItem = cart.find(i => i.id === item.id);
    const currentQuantityInCart = cartItem?.quantity || 0;

    if (currentQuantityInCart >= item.available_stock) {
      alert(`Sorry! Only ${item.available_stock} units available in stock.`);
      return;
    }

    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image_url,
      category: item.category,
      sku: item.sku,
      maxStock: item.available_stock
    });

    showToast(`✅ ${item.name} added to cart!`);
  };

  const showToast = (message: string) => {
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 right-4 z-[100] bg-green-600 text-white px-6 py-3 rounded-lg shadow-2xl animate-slide-in-right';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Your cart is empty!');
      return;
    }

    setIsProcessing(true);

    try {
      const { data: addresses, error: fetchError } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_shipping', true)
        .order('is_default', { ascending: false });

      if (fetchError) {
        console.error('Failed to load addresses:', fetchError);
        alert(`Failed to load addresses: ${fetchError.message}`);
        setIsProcessing(false);
        return;
      }

      setExistingAddresses(addresses || []);
      setIsAddressModalOpen(true);
      setIsProcessing(false);
    } catch (err: any) {
      console.error('Checkout error:', err);
      alert('Checkout failed: ' + err.message);
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
          await supabase
            .from('user_addresses')
            .update({ is_default: false })
            .eq('user_id', user?.id)
            .eq('is_shipping', true);
        }

        const insertData = {
          user_id: user?.id,
          label: addressData.label,
          full_name: addressData.full_name,
          phone: addressData.phone,
          address_line1: addressData.address_line1,
          address_line2: addressData.address_line2 || '',
          city: addressData.city,
          state: addressData.state,
          zip: addressData.zip,
          country: addressData.country,
          is_default: addressData.is_default,
          is_shipping: true,
          is_billing: false
        };

        const { data: newAddress, error: insertError } = await supabase
          .from('user_addresses')
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          console.error('Failed to save address:', insertError);
          alert(`Failed to save address: ${insertError.message}`);
          setIsProcessing(false);
          return;
        }

        selectedAddress = newAddress;
      }

      setCurrentShippingAddress(selectedAddress);

      for (const item of cart) {
        const { data: stockData, error } = await supabase
          .from('v_store_items_with_stock')
          .select('available_stock, name')
          .eq('id', item.id)
          .single();

        if (error || !stockData || stockData.available_stock < item.quantity) {
          alert(
            `${item.name} doesn't have enough stock!\n\n` +
            `Available: ${stockData?.available_stock || 0}\n` +
            `Requested: ${item.quantity}`
          );
          setIsProcessing(false);
          return;
        }
      }

      setPaymentService('Store Purchase');
      setPaymentAmount(totalPrice);
      setIsPaymentModalOpen(true);
      setIsProcessing(false);

    } catch (err: any) {
      console.error('Checkout error:', err);
      alert('Checkout failed: ' + err.message);
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (paymentDetails: any) => {
    setIsPaymentModalOpen(false);
    setIsProcessing(true);

    try {
      if (!currentShippingAddress) {
        throw new Error('No shipping address found');
      }

      const orderToInsert = {
        user_id: user?.id,
        total: totalPrice,
        status: 'completed',
        payment_method: paymentDetails?.method || 'manual',
        payment_id: paymentDetails?.transactionId || `TXN-${Date.now()}`,
        razorpay_payment_id: paymentDetails?.transactionId || `TXN-${Date.now()}`,
        razorpay_order_id: paymentDetails?.orderId || `ORD-${Date.now()}`,
        shipping_address_id: currentShippingAddress.id,
        shipping_address_snapshot: {
          full_name: currentShippingAddress.full_name,
          phone: currentShippingAddress.phone,
          address_line1: currentShippingAddress.address_line1,
          address_line2: currentShippingAddress.address_line2,
          city: currentShippingAddress.city,
          state: currentShippingAddress.state,
          zip: currentShippingAddress.zip,
          country: currentShippingAddress.country
        },
        delivery_address: {
          full_name: currentShippingAddress.full_name,
          phone: currentShippingAddress.phone,
          address_line1: currentShippingAddress.address_line1,
          address_line2: currentShippingAddress.address_line2,
          city: currentShippingAddress.city,
          state: currentShippingAddress.state,
          zip: currentShippingAddress.zip,
          country: currentShippingAddress.country
        },
        item_ids: cart.map(item => item.id),
        order_items: cart.map(item => ({
          item_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          sku: item.sku || ''
        }))
      };

      const { data: orderData, error: orderError } = await supabase
        .from('store_orders')
        .insert(orderToInsert)
        .select()
        .single();

      if (orderError) {
        console.error('Order creation failed:', orderError);
        throw orderError;
      }

      for (const item of cart) {
        const { data: rpcData, error: inventoryError } = await supabase.rpc(
          'reduce_inventory',
          {
            p_item_id: item.id,
            p_quantity: item.quantity
          }
        );

        if (inventoryError) {
          console.error(`Inventory reduction failed for ${item.name}:`, inventoryError);
        } else if (rpcData && !rpcData.success) {
          console.error(`Inventory reduction unsuccessful for ${item.name}:`, rpcData.error);
        }
      }

      await dbService.recordTransaction({
        user_id: user?.id,
        service_type: 'store_purchase',
        service_title: `Store Order #${orderData.id}`,
        amount: totalPrice,
        currency: 'INR',
        payment_method: paymentDetails?.method || 'manual',
        payment_provider: paymentDetails?.provider || 'manual',
        order_id: paymentDetails?.orderId || `ORD-${Date.now()}`,
        transaction_id: paymentDetails?.transactionId || `TXN-${Date.now()}`,
        status: 'success',
        metadata: {
          order_id: orderData.id,
          shipping_address: currentShippingAddress,
          items: cart.map(i => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            price: i.price
          }))
        }
      });

      clearCart();

      const { data: refreshed } = await supabase
        .from('v_store_items_with_stock')
        .select('*')
        .order('name');

      if (refreshed) {
        setItems(refreshed);
      }

      navigate(`/order-confirmation/${orderData.id}`, {
        state: {
          orderData,
          shippingAddress: currentShippingAddress
        }
      });

    } catch (err: any) {
      console.error('Order processing failed:', err);
      alert(
        '❌ Order failed: ' + err.message + '\n\n' +
        'Please contact support if payment was deducted.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-3 md:p-6 transition-colors duration-500">
      {/* ✅ FIXED: Floating Cart Button - Lower z-index, mobile responsive */}
      <button
        onClick={() => setIsCartOpen(true)}
        className="fixed top-20 right-4 md:right-6 z-30 bg-primary hover:bg-primary/90 text-primary-foreground p-3 md:p-4 rounded-full shadow-2xl transition-all active:scale-95"
        style={{ touchAction: 'manipulation' }}
        aria-label="Open shopping cart"
      >
        <ShoppingCart size={20} className="md:w-6 md:h-6" />
        {cartCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
            {cartCount}
          </span>
        )}
      </button>

      {/* Page Header */}
      <div className="max-w-7xl mx-auto mb-6 md:mb-10">
        <SmartBackButton className="mb-4" />
        <h1 className="text-3xl md:text-4xl font-cinzel font-black text-foreground mb-2 uppercase tracking-widest">
          Mystic Bazaar
        </h1>
        <p className="text-foreground/70 text-sm font-lora italic">
          Authentic spiritual artifacts & tools for your journey.
        </p>
      </div>

      {/* ✅ FIXED: Category Filters & Search Bar - Mobile optimized */}
      <div className="max-w-7xl mx-auto mb-6 md:mb-8 flex flex-col gap-4 md:gap-6">
        {/* Category Buttons */}
        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 md:pb-4 no-scrollbar">
          <button
            onClick={() => {
              setSelectedCategory('all');
              setPage(0);
            }}
            className={`px-4 md:px-6 py-3 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all border min-h-[44px] ${selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-card-foreground border-border hover:bg-muted active:bg-muted'
              }`}
            style={{ touchAction: 'manipulation' }}
          >
            ✨ All Items
          </button>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => {
                setSelectedCategory(key);
                setPage(0);
              }}
              className={`px-4 md:px-6 py-3 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all border min-h-[44px] ${selectedCategory === key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-card-foreground border-border hover:bg-muted active:bg-muted'
                }`}
              style={{ touchAction: 'manipulation' }}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* ✅ FIXED: Search Input - Taller for mobile */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search artifacts..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            className="w-full bg-card border border-border rounded-full px-4 md:px-6 py-3 text-sm focus:border-primary outline-none min-h-[44px]"
          />
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground italic font-lora">
          No items found in this category of the Bazaar.
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-2xl transition-all hover:scale-[1.02] flex flex-col h-full group"
            >
              {/* Product Image */}
              <div className="relative h-48 md:h-56 overflow-hidden">
                <OptimizedImage
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  containerClassName="w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                {/* Stock Status Badge */}
                <div
                  className={`absolute top-2 md:top-4 right-2 md:right-4 px-2 md:px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest shadow-xl ${item.stock_status === 'out_of_stock'
                      ? 'bg-red-600 text-white'
                      : item.stock_status === 'low_stock'
                        ? 'bg-amber-500 text-black'
                        : 'bg-green-600 text-white'
                    }`}
                >
                  {item.stock_status === 'out_of_stock'
                    ? 'Out of Stock'
                    : item.stock_status === 'low_stock'
                      ? `Only ${item.available_stock} left!`
                      : 'In Stock'}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4 md:p-5 flex flex-col flex-grow">
                <div className="mb-3 md:mb-4">
                  <div className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-primary mb-1">
                    {(CATEGORIES as any)[item.category]?.name || item.category}
                  </div>
                  <h3 className="text-card-foreground font-cinzel font-bold text-base md:text-lg mb-2 line-clamp-2 leading-tight">
                    {item.name}
                  </h3>
                  <p className="text-muted-foreground text-xs font-lora italic line-clamp-2">
                    {item.description}
                  </p>
                </div>

                {/* ✅ FIXED: Price & Add to Cart Button - Taller for mobile */}
                <div className="mt-auto">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-xl md:text-2xl font-black text-foreground font-mono">
                      {getRegionalPrice(item.price).display}
                    </span>
                    <button
                      onClick={() => handleAddToCart(item)}
                      disabled={item.stock_status === 'out_of_stock'}
                      className={`px-4 md:px-6 py-3 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg min-h-[44px] ${item.stock_status === 'out_of_stock'
                          ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        }`}
                      style={{ touchAction: 'manipulation' }}
                    >
                      {item.stock_status === 'out_of_stock' ? 'Sold Out' : 'Add to Cart'}
                    </button>
                  </div>

                  {/* SKU & Authenticity Badge */}
                  <div className="flex justify-between items-center text-[9px] md:text-[10px] text-muted-foreground font-bold uppercase tracking-widest pt-2 md:pt-3 border-t border-border/50">
                    <span>SKU: {item.sku}</span>
                    <span className="text-primary/50">✦ AUTHENTIC</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ✅ FIXED: Shopping Cart Modal - Mobile optimized */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          ></div>

          <div className="relative bg-gradient-to-br from-purple-900 via-indigo-900 to-black border-t-2 md:border-2 border-purple-500/30 rounded-t-2xl md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] md:max-h-[85vh] overflow-hidden">
            {/* Cart Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-purple-500/30">
              <div className="flex items-center gap-2 md:gap-3">
                <ShoppingCart className="text-purple-400" size={24} />
                <h2 className="text-xl md:text-2xl font-bold text-white font-cinzel">
                  Your Cart ({cartCount})
                </h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-purple-500/20 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                style={{ touchAction: 'manipulation' }}
                aria-label="Close cart"
              >
                <X className="text-white" size={24} />
              </button>
            </div>

            {/* Cart Items */}
            <div className="overflow-y-auto max-h-[40vh] md:max-h-[50vh] p-4 md:p-6">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="mx-auto text-purple-400/30" size={48} />
                  <p className="text-purple-300 mt-4 text-base md:text-lg">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 md:gap-4 p-3 md:p-4 bg-black/40 rounded-xl border border-purple-500/20"
                    >
                      {/* Item Image */}
                      {item.image && (
                        <div className="w-16 md:w-20 h-16 md:h-20 flex-shrink-0">
                          <OptimizedImage
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover rounded-lg"
                            containerClassName="w-full h-full"
                            showSkeleton={true}
                            fallbackSrc="https://via.placeholder.com/80x80?text=No+Image"
                          />
                        </div>
                      )}

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm md:text-base truncate">{item.name}</h3>
                        <p className="text-purple-300 text-xs md:text-sm">₹{item.price}</p>

                        {/* ✅ FIXED: Quantity Controls - Larger touch targets */}
                        <div className="flex items-center gap-2 md:gap-3 mt-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-2 md:p-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                            style={{ touchAction: 'manipulation' }}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={18} className="text-white" />
                          </button>
                          <span className="text-white font-bold text-base md:text-lg w-10 text-center">{item.quantity}</span>
                          <button
                            onClick={() => {
                              const maxStock = (item as any).maxStock || 999;
                              if (item.quantity < maxStock) {
                                updateQuantity(item.id, item.quantity + 1);
                              } else {
                                alert(`Maximum stock available: ${maxStock}`);
                              }
                            }}
                            className="p-2 md:p-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                            style={{ touchAction: 'manipulation' }}
                            aria-label="Increase quantity"
                          >
                            <Plus size={18} className="text-white" />
                          </button>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 md:p-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 active:bg-red-500/20 rounded-lg transition-colors self-start min-h-[44px] min-w-[44px] flex items-center justify-center"
                        style={{ touchAction: 'manipulation' }}
                        aria-label="Remove from cart"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Footer - Total & Actions */}
            {cart.length > 0 && (
              <div className="border-t border-purple-500/30 p-4 md:p-6 space-y-3 md:space-y-4">
                <div className="flex justify-between items-center text-lg md:text-xl font-bold">
                  <span className="text-purple-300">Total:</span>
                  <span className="text-white">₹{totalPrice}</span>
                </div>

                <div className="flex gap-2 md:gap-3">
                  <button
                    onClick={clearCart}
                    className="flex-1 py-3 md:py-3.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl font-bold transition-colors min-h-[48px] text-sm md:text-base"
                    style={{ touchAction: 'manipulation' }}
                  >
                    Clear Cart
                  </button>
                  <button
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="flex-1 py-3 md:py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:from-purple-800 active:to-pink-800 text-white rounded-xl font-bold transition-colors disabled:opacity-50 min-h-[48px] text-sm md:text-base"
                    style={{ touchAction: 'manipulation' }}
                  >
                    {isProcessing ? 'Processing...' : 'Checkout'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Address Form Modal */}
      <AddressFormModal
        isOpen={isAddressModalOpen}
        onClose={() => {
          setIsAddressModalOpen(false);
          setIsProcessing(false);
        }}
        onSubmit={handleAddressSubmit}
        existingAddresses={existingAddresses}
      />

      {/* Payment Modal */}
      <PaymentModal
        isVisible={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setIsProcessing(false);
        }}
        onSuccess={handlePaymentSuccess}
        basePrice={paymentAmount}
        serviceName={paymentService}
      />
    </div>
  );
};

export default Store;
