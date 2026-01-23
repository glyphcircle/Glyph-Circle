
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDb } from '../hooks/useDb';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { usePayment } from '../context/PaymentContext';
import Card from './shared/Card';
import Button from './shared/Button';
import Modal from './shared/Modal';
import { cloudManager } from '../services/cloudManager';
import OptimizedImage from './shared/OptimizedImage';
import { useNotifications } from './PushNotifications';

interface CartItem {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  stock?: number;
}

interface DeliveryDetails {
  fullName: string;
  address: string;
  city: string;
  zip: string;
  phone: string;
}

const Store: React.FC = () => {
  const { db, toggleStatus, createEntry, updateEntry } = useDb();
  const { user } = useAuth();
  const { t, getRegionalPrice } = useTranslation();
  const { openPayment } = usePayment();
  const { sendNotification } = useNotifications();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [sortOption, setSortOption] = useState('default');
  
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'address'>('cart');
  const [deliveryDetails, setDeliveryDetails] = useState<DeliveryDetails>({
      fullName: user?.name || '', address: '', city: '', zip: '', phone: ''
  });
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isAdmin = user?.role === 'admin';

  const categories: string[] = ['All', ...Array.from(new Set((db.store_items || []).map((i: any) => i.category || 'General'))) as string[]];

  const filteredItems = useMemo(() => {
    let items = db.store_items || [];
    if (!isAdmin) items = items.filter((i: any) => i.status === 'active');
    if (searchQuery) items = items.filter((i: any) => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || (i.category || '').toLowerCase().includes(searchQuery.toLowerCase()));
    if (selectedCategory !== 'All') items = items.filter((i: any) => i.category === selectedCategory);
    if (sortOption === 'price_asc') items = [...items].sort((a: any, b: any) => a.price - b.price);
    else if (sortOption === 'price_desc') items = [...items].sort((a: any, b: any) => b.price - a.price);
    return items;
  }, [db.store_items, isAdmin, searchQuery, selectedCategory, sortOption]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const isAddressValid = useMemo(() => Object.values(deliveryDetails).every((val: any) => val.trim().length > 0), [deliveryDetails]);

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      // Check if stock limit reached
      if (existing && existing.quantity >= (item.stock || 999)) {
          setToastMessage(`Max stock reached for ${item.name}`);
          setTimeout(() => setToastMessage(null), 3000);
          return prev;
      }
      
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      const img = cloudManager.getProxyImageUrl(item.id, item.image_url || `https://source.unsplash.com/random/200x200/?${item.category},spiritual`);
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1, image: img, stock: item.stock }];
    });
    
    if (navigator.vibrate) navigator.vibrate(50);
    setToastMessage(`${item.name} added to cart ✨`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const removeFromCart = (itemId: number | string) => setCart(prev => prev.filter(i => i.id !== itemId));
  const updateQuantity = (itemId: number | string, delta: number) => setCart(prev => prev.map(i => {
      if (i.id !== itemId) return i;
      const newQty = i.quantity + delta;
      if (newQty > (i.stock || 999)) return i; // Cap at stock
      return { ...i, quantity: Math.max(1, newQty) };
  }));
  
  const openCart = () => { setCheckoutStep('cart'); setIsCartOpen(true); };
  const handleDeliveryChange = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setDeliveryDetails(prev => ({ ...prev, [name]: value })); };

  const handleCheckout = () => {
      if (!isAddressValid) return alert("Please fill in all delivery details.");
      
      // Capture cart snapshot for post-payment processing
      const currentCart = [...cart];

      openPayment(async () => {
          // 1. Create Order
          const orderPayload = {
              user_id: user?.id || 'guest',
              item_ids: JSON.stringify(currentCart.map(c => ({ id: c.id, qty: c.quantity }))),
              total: cartTotal,
              description: `Store Order: ${currentCart.length} items`,
              delivery_address: JSON.stringify(deliveryDetails),
              status: 'paid'
          };
          createEntry('store_orders', orderPayload);

          // 2. Update Inventory & Check Low Stock
          for (const item of currentCart) {
              const dbItem = db.store_items.find((i:any) => i.id === item.id);
              if (dbItem) {
                  const newStock = Math.max(0, (dbItem.stock || 0) - item.quantity);
                  await updateEntry('store_items', item.id, { stock: newStock });
                  
                  if (newStock < 5) {
                      sendNotification(
                          "⚠️ Low Stock Alert", 
                          `${item.name} is running low (${newStock} left). Please restock.`
                      );
                  }
              }
          }

          setCart([]);
          setIsCartOpen(false);
          setCheckoutStep('cart'); 
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          alert("Payment Successful! Your mystical artifacts will be shipped to " + deliveryDetails.city);
      }, 'Vedic Store Order', cartTotal);
  };

  const getItemDescription = (item: any) => (item.description && item.description.trim() !== '') ? item.description : `Authentic ${item.name} enhances intuition and spiritual connection.`;
  const getImageUrl = (item: any) => item.image_url || `https://images.unsplash.com/photo-1600609842388-3e4b489d71c6?auto=format&fit=crop&w=400&q=80`;

  return (
    <div className="min-h-screen pb-20 relative">
      <button onClick={() => navigate('/home')} className="fixed top-20 left-4 z-30 bg-black/60 backdrop-blur border border-amber-500/30 text-amber-200 p-2 rounded-full shadow-lg md:hidden hover:bg-black/80 transition-colors" title="Back to Home"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
      {toastMessage && (<div className="fixed bottom-24 right-4 md:top-24 md:bottom-auto z-50 bg-green-900/90 text-white px-6 py-3 rounded-lg shadow-[0_0_20px_rgba(34,197,94,0.4)] border border-green-500/50 flex items-center gap-3 animate-fade-in-up"><span className="text-xl">🛍️</span><span className="font-cinzel font-bold text-sm">{toastMessage}</span></div>)}

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 pt-4 md:pt-0">
        <div>
            <Link to="/home" className="inline-flex items-center text-amber-200 hover:text-amber-400 transition-colors mb-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>{t('backToHome')}</Link>
            <h2 className="text-3xl font-cinzel font-bold text-amber-300">Vedic Inventory</h2>
            <p className="text-amber-200/60 font-lora text-sm">Sacred tools for your journey.</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0">
                <input 
                    autoFocus
                    type="text" 
                    placeholder="Search Rudraksha..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="w-full md:w-64 bg-black/40 border border-amber-500/30 rounded-full py-2 px-4 text-amber-100 focus:outline-none focus:border-amber-400" 
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-500/50 absolute right-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <button onClick={openCart} className="relative bg-amber-600 hover:bg-amber-500 p-2 rounded-full text-white shadow-lg transition-transform hover:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-black">{cart.reduce((a, b) => a + b.quantity, 0)}</span>}
            </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(cat => <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-1 rounded-full text-xs font-bold border transition-colors ${selectedCategory === cat ? 'bg-amber-500 border-amber-500 text-black' : 'bg-transparent border-amber-500/30 text-amber-200 hover:border-amber-400'}`}>{cat}</button>)}
          <div className="ml-auto"><select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="bg-black/40 border border-amber-500/30 rounded px-2 py-1 text-xs text-amber-200 focus:outline-none"><option value="default">Sort by: Default</option><option value="price_asc">Price: Low to High</option><option value="price_desc">Price: High to Low</option></select></div>
      </div>

      {filteredItems.length === 0 ? <div className="text-center py-16 text-amber-200/40"><p>The stars show no items matching your search.</p></div> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item: any) => (
                  <div key={item.id} className={`group relative bg-gray-900 border ${item.status === 'active' ? 'border-amber-500/20' : 'border-red-900/50 opacity-70'} rounded-xl overflow-hidden hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all duration-300 flex flex-col`}>
                      <div className="h-48 feature-image-container relative">
                          <OptimizedImage 
                            src={getImageUrl(item)} 
                            alt={item.name} 
                            className="dynamic-image" 
                            containerClassName="w-full h-full"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent pointer-events-none"></div>
                          {isAdmin && <button onClick={() => toggleStatus('store_items', item.id)} className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-1 rounded border z-20 ${item.status === 'active' ? 'bg-green-900/80 text-green-300 border-green-500' : 'bg-red-900/80 text-red-300 border-red-500'}`}>{item.status === 'active' ? 'ACTIVE' : 'INACTIVE'}</button>}
                          {(item.stock || 0) < 5 && item.status === 'active' && (
                              <span className="absolute bottom-2 right-2 bg-red-600/90 text-white text-[10px] font-bold px-2 py-1 rounded animate-pulse">Low Stock: {item.stock}</span>
                          )}
                      </div>
                      <div className="p-4 flex flex-col flex-grow">
                          <div className="flex justify-between items-start mb-2"><div><h3 className="font-cinzel font-bold text-amber-100 truncate pr-2" title={item.name}>{item.name}</h3><span className="text-[10px] text-amber-500 uppercase tracking-widest">{item.category || 'Relic'}</span></div><div className="font-mono font-bold text-amber-300">{getRegionalPrice(item.price).display}</div></div>
                          <p className="text-xs text-amber-200/60 font-lora mb-4 line-clamp-2 flex-grow">{getItemDescription(item)}</p>
                          <Button onClick={() => addToCart(item)} disabled={item.status !== 'active' || (item.stock || 0) <= 0} className="w-full py-2 text-sm bg-gradient-to-r from-amber-700 to-amber-900 border-none shadow-md hover:from-amber-600 hover:to-amber-800 disabled:opacity-50 disabled:cursor-not-allowed">
                              {item.status !== 'active' ? 'Unavailable' : ((item.stock || 0) > 0 ? 'Add to Cart' : 'Out of Stock')}
                          </Button>
                      </div>
                  </div>
              ))}
          </div>
      )}

      <div className="mt-12 text-center border-t border-amber-500/20 pt-8">
          <Link to="/home"><Button className="bg-transparent border border-amber-500/50 hover:bg-amber-900/20 text-amber-200">&larr; Back to Sanctuary</Button></Link>
      </div>

      <Modal isVisible={isCartOpen} onClose={() => setIsCartOpen(false)}>
          <div className="p-6 bg-gray-900 max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-center mb-6 border-b border-amber-500/30 pb-4">
                  <div className="flex items-center gap-3">{checkoutStep === 'address' && <button onClick={() => setCheckoutStep('cart')} className="text-gray-400 hover:text-white mr-2">←</button>}<h3 className="text-2xl font-cinzel font-bold text-amber-300">{checkoutStep === 'cart' ? 'Your Cart' : 'Delivery Details'}</h3></div>
                  <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-white">&times;</button>
              </div>
              <div className="flex-grow overflow-y-auto mb-6 pr-2 custom-scrollbar">
                  {checkoutStep === 'cart' ? (cart.length === 0 ? <p className="text-center text-gray-500 py-8">Your spiritual vessel is empty.</p> : (
                      <div className="space-y-4">
                          {cart.map(item => (
                              <div key={item.id} className="flex gap-4 items-center bg-black/30 p-3 rounded border border-gray-800">
                                  <div className="flex-grow"><h4 className="font-bold text-amber-100">{item.name}</h4><p className="text-xs text-amber-500">{getRegionalPrice(item.price).display}</p></div>
                                  <div className="flex items-center gap-3"><button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center">-</button><span className="text-sm font-mono w-4 text-center">{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center">+</button></div>
                                  <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-300 ml-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                              </div>
                          ))}
                      </div>
                  )) : (
                      <div className="space-y-4 animate-fade-in-up">
                          <div><label className="block text-xs text-gray-400 uppercase mb-1">Full Name *</label><input name="fullName" value={deliveryDetails.fullName} onChange={handleDeliveryChange} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-amber-500" placeholder="Recipient Name" /></div>
                          <div><label className="block text-xs text-gray-400 uppercase mb-1">Address *</label><input name="address" value={deliveryDetails.address} onChange={handleDeliveryChange} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-amber-500" placeholder="Street, House No." /></div>
                          <div className="grid grid-cols-2 gap-4">
                              <div><label className="block text-xs text-gray-400 uppercase mb-1">City *</label><input name="city" value={deliveryDetails.city} onChange={handleDeliveryChange} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-amber-500" placeholder="City" /></div>
                              <div><label className="block text-xs text-gray-400 uppercase mb-1">ZIP / Pin *</label><input name="zip" value={deliveryDetails.zip} onChange={handleDeliveryChange} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-amber-500" placeholder="123456" /></div>
                          </div>
                          <div><label className="block text-xs text-gray-400 uppercase mb-1">Phone Number *</label><input name="phone" value={deliveryDetails.phone} onChange={handleDeliveryChange} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white focus:border-amber-500" placeholder="+91 99999 99999" /></div>
                      </div>
                  )}
              </div>
              <div className="border-t border-amber-500/30 pt-4">
                  <div className="flex justify-between items-center mb-4 text-lg font-bold text-amber-100"><span>Total</span><span>{getRegionalPrice(cartTotal).display}</span></div>
                  {checkoutStep === 'cart' ? (
                      <Button className="w-full bg-gradient-to-r from-amber-700 to-amber-900 border-amber-500" disabled={cart.length === 0} onClick={() => setCheckoutStep('address')}>{cart.length === 0 ? 'Cart Empty' : 'Proceed to Checkout'}</Button>
                  ) : (
                      <Button className="w-full bg-gradient-to-r from-green-700 to-green-900 border-green-500" disabled={!isAddressValid} onClick={handleCheckout}>Proceed to Payment</Button>
                  )}
              </div>
          </div>
      </Modal>
    </div>
  );
};

export default Store;
