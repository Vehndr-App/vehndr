"use client";

import AuthGate from "../../../components/AuthGate";
import { getCurrentUser } from "../../../services/auth";
import { api } from "../../../services/api";
import { useEffect, useState, useCallback, useRef } from "react";
import SmartImage from "../../../components/SmartImage";

export default function StorefrontPage() {
  return (
    <AuthGate>
      <POSSystem />
    </AuthGate>
  );
}

function POSSystem() {
  const [user, setUser] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // POS State
  const [activeTab, setActiveTab] = useState('library'); // 'library' | 'keypad'
  const [activeLibraryCategory, setActiveLibraryCategory] = useState('items');
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('tap_to_pay');
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrderTotal, setLastOrderTotal] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [keypadValue, setKeypadValue] = useState('0');
  const [customItemName, setCustomItemName] = useState('Custom Amount');

  const fetchData = useCallback(async (vendorId) => {
    try {
      const [vendorData, productsData] = await Promise.all([
        api(`/api/vendors/${vendorId}`),
        api(`/api/vendors/${vendorId}/products`)
      ]);

      setVendor(vendorData.vendor || vendorData);
      
      if (Array.isArray(productsData)) {
        setProducts(productsData);
      } else if (productsData && Array.isArray(productsData.products)) {
        setProducts(productsData.products);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      setUser(u);

      if (u?.vendorId) {
        await fetchData(u.vendorId);
      }
      setLoading(false);
    })();
  }, [fetchData]);

  // Cart Functions
  const addToCart = (product, quantity = 1) => {
    const existingItem = cart.find(item => item.id === product.id && !item.isCustom);
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id && !item.isCustom
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity, cartId: Date.now() }]);
    }
  };

  const addCustomAmount = () => {
    const amount = parseFloat(keypadValue);
    if (amount > 0) {
      setCart([...cart, {
        id: `custom-${Date.now()}`,
        name: customItemName,
        price: Math.round(amount * 100),
        quantity: 1,
        isCustom: true,
        cartId: Date.now()
      }]);
      setKeypadValue('0');
      setCustomItemName('Custom Amount');
    }
  };

  const removeFromCart = (cartId) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const updateQuantity = (cartId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(cartId);
    } else {
      setCart(cart.map(item => 
        item.cartId === cartId 
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  // Checkout
  const handleCharge = async () => {
    if (cart.length === 0) return;
    
    setProcessing(true);
    
    try {
      const items = cart.filter(item => !item.isCustom).map(item => ({
        product_id: item.id,
        quantity: item.quantity
      }));

      const customItems = cart.filter(item => item.isCustom).map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }));

      const response = await api('/api/checkout/in_person', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vendor_id: vendor.id,
          items: items,
          custom_items: customItems,
          payment_method: paymentMethod
        })
      });

      if (response.success) {
        setLastOrderTotal(totalWithTax);
        setProcessing(false);
        setShowSuccess(true);
        
        setTimeout(() => {
          setShowSuccess(false);
          clearCart();
        }, 2500);
      } else {
        throw new Error(response.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setProcessing(false);
      alert(`Payment failed: ${error.message}`);
    }
  };

  // Product Management
  const handleSaveProduct = async (productData) => {
    try {
      const formData = new FormData();
      formData.append('product[name]', productData.name);
      formData.append('product[description]', productData.description || '');
      formData.append('product[price]', Math.round(parseFloat(productData.price) * 100));
      formData.append('product[is_service]', productData.isService);
      if (productData.isService && productData.duration) {
        formData.append('product[duration]', productData.duration);
      }

      if (productData.images && productData.images.length > 0) {
        productData.images.forEach((image) => {
          formData.append('images[]', image);
        });
      }

      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PATCH' : 'POST';

      await api(url, { method, body: formData });

      if (user?.vendorId) {
        await fetchData(user.vendorId);
      }

      setShowAddModal(false);
      setEditingProduct(null);
    } catch (err) {
      console.error('Failed to save product', err);
      alert(`Failed to save: ${err.message}`);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Delete this item?')) return;

    try {
      await api(`/api/products/${productId}`, { method: 'DELETE' });
      if (user?.vendorId) {
        await fetchData(user.vendorId);
      }
    } catch (err) {
      console.error('Failed to delete product', err);
      alert('Failed to delete item');
    }
  };

  // Calculations
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const taxRate = 0.08;
  const taxAmount = cartTotal * taxRate;
  const totalWithTax = cartTotal + taxAmount;

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = 
      (activeLibraryCategory === 'items' && !product.isService) ||
      (activeLibraryCategory === 'services' && product.isService) ||
      activeLibraryCategory === 'all';
    return matchesSearch && matchesCategory;
  });

  // Keypad functions
  const handleKeypadPress = (key) => {
    if (key === 'C') {
      setKeypadValue('0');
    } else if (key === '⌫') {
      setKeypadValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else if (key === '.') {
      if (!keypadValue.includes('.')) {
        setKeypadValue(prev => prev + '.');
      }
    } else {
      setKeypadValue(prev => prev === '0' ? key : prev + key);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--gray-900)] flex items-center justify-center">
        <div className="animate-pulse-soft">
          <div className="w-16 h-16 rounded-2xl bg-[var(--violet-600)]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gray-50)] flex flex-col">
      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 bg-[var(--success)] flex items-center justify-center animate-fade-in">
          <div className="text-center text-white">
            <div className="w-24 h-24 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-6 animate-scale-in">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-medium mb-2 opacity-80">Payment Complete</p>
            <p className="text-5xl font-bold tracking-tight">${(lastOrderTotal / 100).toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-[var(--gray-200)] px-4 py-3 safe-area-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-[var(--gray-500)] font-medium">Point of Sale</p>
              <h1 className="text-lg font-bold text-[var(--foreground)]">{vendor?.name || 'Your Store'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-xl bg-[var(--gray-100)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--gray-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-[var(--gray-100)] p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('library')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'library' 
                ? 'bg-white text-[var(--foreground)] shadow-sm' 
                : 'text-[var(--gray-500)]'
            }`}
          >
            Library
          </button>
          <button
            onClick={() => setActiveTab('keypad')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'keypad' 
                ? 'bg-white text-[var(--foreground)] shadow-sm' 
                : 'text-[var(--gray-500)]'
            }`}
          >
            Keypad
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - Library or Keypad */}
        <div className="flex-1 flex flex-col overflow-hidden lg:border-r lg:border-[var(--gray-200)]">
          {activeTab === 'library' ? (
            <LibraryPanel
              products={filteredProducts}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              activeCategory={activeLibraryCategory}
              setActiveCategory={setActiveLibraryCategory}
              onAddToCart={addToCart}
              onEdit={(product) => { setEditingProduct(product); setShowAddModal(true); }}
              onDelete={handleDeleteProduct}
              onAddNew={() => { setEditingProduct(null); setShowAddModal(true); }}
              cart={cart}
            />
          ) : (
            <KeypadPanel
              value={keypadValue}
              onKeyPress={handleKeypadPress}
              customItemName={customItemName}
              setCustomItemName={setCustomItemName}
              onAddToCart={addCustomAmount}
            />
          )}
        </div>

        {/* Right Panel - Cart */}
        <div className="lg:w-[400px] bg-white flex flex-col border-t lg:border-t-0 border-[var(--gray-200)]">
          <CartPanel
            cart={cart}
            onUpdateQuantity={updateQuantity}
            onRemove={removeFromCart}
            onClear={clearCart}
            cartTotal={cartTotal}
            taxAmount={taxAmount}
            totalWithTax={totalWithTax}
            cartItemCount={cartItemCount}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            onCharge={handleCharge}
            processing={processing}
          />
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {showAddModal && (
        <ProductModal
          product={editingProduct}
          onSave={handleSaveProduct}
          onClose={() => { setShowAddModal(false); setEditingProduct(null); }}
        />
      )}
    </div>
  );
}

// Library Panel Component
function LibraryPanel({ 
  products, 
  searchQuery, 
  setSearchQuery, 
  activeCategory, 
  setActiveCategory, 
  onAddToCart, 
  onEdit, 
  onDelete, 
  onAddNew,
  cart 
}) {
  const categories = [
    { id: 'items', label: 'Items', icon: '📦' },
    { id: 'services', label: 'Services', icon: '✨' },
    { id: 'discounts', label: 'Discounts', icon: '🏷️' },
    { id: 'gift_cards', label: 'Gift Cards', icon: '🎁' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search */}
      <div className="px-4 pt-4">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--gray-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all items"
            className="w-full h-12 pl-12 pr-12 rounded-xl bg-[var(--gray-100)] border-0 text-[var(--foreground)] placeholder:text-[var(--gray-400)] focus:ring-2 focus:ring-[var(--violet-500)] focus:bg-white transition-all"
          />
          <button 
            onClick={onAddNew}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-[var(--violet-600)] flex items-center justify-center"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Category List */}
      <div className="flex-1 overflow-y-auto">
        {categories.map((category) => (
          <div key={category.id}>
            <button
              onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
              className={`w-full flex items-center justify-between px-4 py-4 border-b border-[var(--gray-100)] hover:bg-[var(--gray-50)] transition-colors ${
                activeCategory === category.id ? 'bg-[var(--violet-50)]' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{category.icon}</span>
                <span className="font-semibold text-[var(--foreground)]">{category.label}</span>
              </div>
              <svg 
                className={`w-5 h-5 text-[var(--gray-400)] transition-transform ${activeCategory === category.id ? 'rotate-90' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {/* Expanded Items */}
            {activeCategory === category.id && (category.id === 'items' || category.id === 'services') && (
              <div className="bg-[var(--gray-50)]">
                {products.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-[var(--gray-500)] mb-3">No {category.label.toLowerCase()} yet</p>
                    <button
                      onClick={onAddNew}
                      className="text-sm font-semibold text-[var(--violet-600)]"
                    >
                      + Add {category.id === 'services' ? 'Service' : 'Item'}
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--gray-200)]">
                    {products.map((product) => (
                      <LibraryItem
                        key={product.id}
                        product={product}
                        onAdd={() => onAddToCart(product)}
                        onEdit={() => onEdit(product)}
                        onDelete={() => onDelete(product.id)}
                        inCart={cart.some(item => item.id === product.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Placeholder for Discounts & Gift Cards */}
            {activeCategory === category.id && (category.id === 'discounts' || category.id === 'gift_cards') && (
              <div className="bg-[var(--gray-50)] px-4 py-8 text-center">
                <p className="text-sm text-[var(--gray-500)]">Coming soon</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Library Item Component
function LibraryItem({ product, onAdd, onEdit, onDelete, inCart }) {
  const price = (product.price || 0) / 100;
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-[var(--gray-50)] transition-colors">
      {/* Image */}
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-[var(--gray-100)] flex-shrink-0">
        {product.images && product.images[0] ? (
          <SmartImage
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--violet-100)] to-[var(--magenta-100)] flex items-center justify-center">
            {product.isService ? (
              <svg className="w-6 h-6 text-[var(--violet-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-[var(--violet-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-[var(--foreground)] truncate">{product.name}</h3>
          {inCart && (
            <span className="w-2 h-2 rounded-full bg-[var(--success)] flex-shrink-0"></span>
          )}
        </div>
        <p className="text-lg font-bold text-[var(--foreground)]">${price.toFixed(2)}</p>
        {product.isService && product.duration && (
          <p className="text-xs text-[var(--gray-500)]">{product.duration} min</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowActions(!showActions)}
          className="w-10 h-10 rounded-xl bg-[var(--gray-100)] flex items-center justify-center hover:bg-[var(--gray-200)] transition-colors"
        >
          <svg className="w-5 h-5 text-[var(--gray-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
        <button
          onClick={onAdd}
          className="w-10 h-10 rounded-xl bg-[var(--violet-600)] flex items-center justify-center hover:bg-[var(--violet-700)] transition-colors shadow-md"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Actions Dropdown */}
      {showActions && (
        <div className="absolute right-16 mt-32 bg-white rounded-xl shadow-lg border border-[var(--gray-200)] overflow-hidden z-10">
          <button
            onClick={() => { onEdit(); setShowActions(false); }}
            className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-[var(--gray-50)] flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-[var(--gray-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit
          </button>
          <button
            onClick={() => { onDelete(); setShowActions(false); }}
            className="w-full px-4 py-3 text-left text-sm font-medium text-[var(--error)] hover:bg-[var(--error)]/5 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// Keypad Panel Component
function KeypadPanel({ value, onKeyPress, customItemName, setCustomItemName, onAddToCart }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'];

  return (
    <div className="flex-1 flex flex-col p-4">
      {/* Custom Item Name */}
      <input
        type="text"
        value={customItemName}
        onChange={(e) => setCustomItemName(e.target.value)}
        placeholder="Item name"
        className="w-full h-12 px-4 mb-4 rounded-xl bg-[var(--gray-100)] border-0 text-center font-medium text-[var(--foreground)] placeholder:text-[var(--gray-400)]"
      />

      {/* Amount Display */}
      <div className="bg-white rounded-2xl p-6 mb-4 text-center shadow-sm">
        <p className="text-xs text-[var(--gray-500)] mb-2 font-medium uppercase tracking-wide">Amount</p>
        <p className="text-5xl font-bold text-[var(--foreground)] tracking-tight">
          ${parseFloat(value || '0').toFixed(2)}
        </p>
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2 flex-1">
        {keys.map((key) => (
          <button
            key={key}
            onClick={() => onKeyPress(key)}
            className={`rounded-2xl text-2xl font-semibold transition-all active:scale-95 ${
              key === '⌫'
                ? 'bg-[var(--gray-200)] text-[var(--gray-600)]'
                : 'bg-white text-[var(--foreground)] shadow-sm hover:shadow-md'
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Clear & Add Buttons */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => onKeyPress('C')}
          className="flex-1 h-14 rounded-2xl bg-[var(--gray-200)] text-[var(--gray-700)] font-semibold text-lg"
        >
          Clear
        </button>
        <button
          onClick={onAddToCart}
          disabled={parseFloat(value) <= 0}
          className="flex-1 h-14 rounded-2xl bg-[var(--violet-600)] text-white font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          Add to Sale
        </button>
      </div>
    </div>
  );
}

// Cart Panel Component
function CartPanel({ 
  cart, 
  onUpdateQuantity, 
  onRemove, 
  onClear, 
  cartTotal, 
  taxAmount, 
  totalWithTax, 
  cartItemCount,
  paymentMethod,
  setPaymentMethod,
  onCharge,
  processing
}) {
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Cart Header */}
      <div className="px-4 py-4 border-b border-[var(--gray-100)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Current Sale</h2>
            <p className="text-sm text-[var(--gray-500)]">{cartItemCount} item{cartItemCount !== 1 ? 's' : ''}</p>
          </div>
          {cart.length > 0 && (
            <button
              onClick={onClear}
              className="text-sm font-medium text-[var(--error)]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-20 h-20 rounded-2xl bg-[var(--gray-100)] flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-[var(--gray-300)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p className="text-[var(--gray-500)] font-medium">No items yet</p>
            <p className="text-sm text-[var(--gray-400)] mt-1">Add items from the library or keypad</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--gray-100)]">
            {cart.map((item) => (
              <CartItem
                key={item.cartId}
                item={item}
                onUpdateQuantity={(qty) => onUpdateQuantity(item.cartId, qty)}
                onRemove={() => onRemove(item.cartId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Checkout Section */}
      {cart.length > 0 && (
        <div className="border-t border-[var(--gray-200)] bg-[var(--gray-50)] p-4 space-y-4">
          {/* Totals */}
          <div className="bg-white rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--gray-600)]">Subtotal</span>
              <span className="font-medium">${(cartTotal / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--gray-600)]">Tax (8%)</span>
              <span className="font-medium">${(taxAmount / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t border-[var(--gray-200)]">
              <span>Total</span>
              <span className="text-[var(--violet-600)]">${(totalWithTax / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="flex gap-2">
            <PaymentMethodButton
              active={paymentMethod === 'tap_to_pay'}
              onClick={() => setPaymentMethod('tap_to_pay')}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              }
              label="Tap"
            />
            <PaymentMethodButton
              active={paymentMethod === 'card'}
              onClick={() => setPaymentMethod('card')}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              }
              label="Card"
            />
            <PaymentMethodButton
              active={paymentMethod === 'cash'}
              onClick={() => setPaymentMethod('cash')}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              label="Cash"
            />
          </div>

          {/* Charge Button */}
          <button
            onClick={onCharge}
            disabled={processing || cart.length === 0}
            className="w-full h-16 rounded-2xl bg-[var(--gray-900)] text-white font-bold text-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:bg-[var(--gray-800)] transition-colors"
          >
            {processing ? (
              <>
                <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                Charge ${(totalWithTax / 100).toFixed(2)}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// Cart Item Component
function CartItem({ item, onUpdateQuantity, onRemove }) {
  const price = (item.price || 0) / 100;
  const subtotal = price * item.quantity;

  return (
    <div className="flex items-center gap-3 p-4">
      {/* Image */}
      {!item.isCustom && (
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--gray-100)] flex-shrink-0">
          {item.images && item.images[0] ? (
            <SmartImage
              src={item.images[0]}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--violet-100)] to-[var(--magenta-100)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--violet-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          )}
        </div>
      )}

      {item.isCustom && (
        <div className="w-12 h-12 rounded-xl bg-[var(--violet-100)] flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-[var(--violet-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm text-[var(--foreground)] truncate">{item.name}</h4>
        <p className="text-sm text-[var(--gray-500)]">${price.toFixed(2)} × {item.quantity}</p>
      </div>

      {/* Quantity & Price */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-[var(--gray-100)] rounded-lg">
          <button
            onClick={() => onUpdateQuantity(item.quantity - 1)}
            className="w-8 h-8 flex items-center justify-center text-[var(--gray-600)] hover:text-[var(--foreground)]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
            </svg>
          </button>
          <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
          <button
            onClick={() => onUpdateQuantity(item.quantity + 1)}
            className="w-8 h-8 flex items-center justify-center text-[var(--gray-600)] hover:text-[var(--foreground)]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <p className="w-16 text-right font-bold text-[var(--foreground)]">${subtotal.toFixed(2)}</p>

        <button
          onClick={onRemove}
          className="w-8 h-8 rounded-lg bg-[var(--error)]/10 flex items-center justify-center text-[var(--error)]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Payment Method Button Component
function PaymentMethodButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
        active
          ? 'bg-[var(--violet-600)] text-white shadow-md'
          : 'bg-white text-[var(--gray-600)] border border-[var(--gray-200)] hover:border-[var(--violet-300)]'
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

// Product Modal Component
function ProductModal({ product, onSave, onClose }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product ? (product.price / 100).toString() : '',
    isService: product?.isService || false,
    duration: product?.duration?.toString() || '',
    images: []
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl max-h-[90vh] overflow-y-auto safe-area-bottom rounded-t-3xl">
        <div className="p-6">
          {/* Handle */}
          <div className="w-10 h-1 bg-[var(--gray-300)] rounded-full mx-auto mb-6 sm:hidden" />
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">{product ? 'Edit Item' : 'New Item'}</h2>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-[var(--gray-100)] flex items-center justify-center"
            >
              <svg className="w-5 h-5 text-[var(--gray-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Toggle */}
            <div className="flex gap-2 p-1 bg-[var(--gray-100)] rounded-xl">
              <button
                type="button"
                onClick={() => setForm({ ...form, isService: false, duration: '' })}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  !form.isService ? 'bg-white shadow-sm text-[var(--foreground)]' : 'text-[var(--gray-500)]'
                }`}
              >
                Product
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, isService: true })}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  form.isService ? 'bg-white shadow-sm text-[var(--foreground)]' : 'text-[var(--gray-500)]'
                }`}
              >
                Service
              </button>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-[var(--gray-700)] mb-2">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-12 px-4 rounded-xl bg-[var(--gray-100)] border-0 text-[var(--foreground)] placeholder:text-[var(--gray-400)] focus:ring-2 focus:ring-[var(--violet-500)] focus:bg-white transition-all"
                placeholder="Item name"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-semibold text-[var(--gray-700)] mb-2">Price</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gray-500)] font-semibold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full h-12 pl-8 pr-4 rounded-xl bg-[var(--gray-100)] border-0 text-[var(--foreground)] placeholder:text-[var(--gray-400)] focus:ring-2 focus:ring-[var(--violet-500)] focus:bg-white transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Duration (Services only) */}
            {form.isService && (
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-700)] mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl bg-[var(--gray-100)] border-0 text-[var(--foreground)] placeholder:text-[var(--gray-400)] focus:ring-2 focus:ring-[var(--violet-500)] focus:bg-white transition-all"
                  placeholder="60"
                />
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-[var(--gray-700)] mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-[var(--gray-100)] border-0 text-[var(--foreground)] placeholder:text-[var(--gray-400)] focus:ring-2 focus:ring-[var(--violet-500)] focus:bg-white transition-all resize-none"
                placeholder="Describe your item..."
              />
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-semibold text-[var(--gray-700)] mb-2">Photos</label>
              
              {form.images.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
                  {Array.from(form.images).map((file, i) => (
                    <div key={i} className="relative flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={URL.createObjectURL(file)} alt="" className="w-20 h-20 rounded-xl object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, images: Array.from(form.images).filter((_, idx) => idx !== i) })}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--error)] text-white flex items-center justify-center shadow-md"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <label className="flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-dashed border-[var(--gray-300)] text-[var(--gray-500)] cursor-pointer hover:border-[var(--violet-400)] hover:text-[var(--violet-600)] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Add Photos</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setForm({ ...form, images: Array.from(e.target.files) })}
                  className="hidden"
                />
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-14 rounded-xl border-2 border-[var(--gray-200)] text-[var(--foreground)] font-semibold hover:bg-[var(--gray-50)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 h-14 rounded-xl bg-[var(--violet-600)] text-white font-semibold disabled:opacity-50 shadow-lg hover:bg-[var(--violet-700)] transition-colors"
              >
                {saving ? 'Saving...' : (product ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
