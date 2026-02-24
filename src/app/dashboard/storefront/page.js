"use client";

import AuthGate from "../../../components/AuthGate";
import { getCurrentUser } from "../../../services/auth";
import { api } from "../../../services/api";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import SmartImage from "../../../components/SmartImage";
import ImageEditorModal from "../../../components/ImageEditorModal";
import { getStorefrontUrl } from "../../../utils/storefrontLinks";

const MAX_CHARGE_CENTS = 5000000;
const MAX_CHARGE_LABEL = "$50,000.00";

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
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrderTotal, setLastOrderTotal] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [keypadValue, setKeypadValue] = useState('0');
  const [customItemName, setCustomItemName] = useState('Custom Amount');
  const [shareStatus, setShareStatus] = useState(null);
  const [keypadError, setKeypadError] = useState(null);
  const [limitError, setLimitError] = useState(null);

  // Cash payment modal state
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashReceived, setCashReceived] = useState('0');

  // Checkout link modal state
  const [showCheckoutLinkModal, setShowCheckoutLinkModal] = useState(false);
  const [checkoutLinkData, setCheckoutLinkData] = useState(null);
  const [checkoutLinkLoading, setCheckoutLinkLoading] = useState(false);
  const [finalizingCheckoutLink, setFinalizingCheckoutLink] = useState(false);

  const [currentTip, setCurrentTip] = useState(0);
  const storefrontUrl = useMemo(() => getStorefrontUrl(vendor), [vendor]);

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
    const nextTotal = cartTotal + (product.price * quantity);
    if (nextTotal > MAX_CHARGE_CENTS) {
      setLimitError(`Maximum charge is ${MAX_CHARGE_LABEL}.`);
      return;
    }

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
    setLimitError(null);
  };

  const addCustomAmount = () => {
    const amountInCents = parseInt(keypadValue);
    if (amountInCents > MAX_CHARGE_CENTS) {
      setKeypadError(`Maximum charge is ${MAX_CHARGE_LABEL}.`);
      return;
    }

    if (amountInCents > 0) {
      const nextTotal = cartTotal + amountInCents;
      if (nextTotal > MAX_CHARGE_CENTS) {
        setKeypadError(`Maximum charge is ${MAX_CHARGE_LABEL}.`);
        return;
      }

      setCart([...cart, {
        id: `custom-${Date.now()}`,
        name: customItemName,
        price: amountInCents,
        quantity: 1,
        isCustom: true,
        cartId: Date.now()
      }]);
      setKeypadValue('0');
      setCustomItemName('Custom Amount');
      setKeypadError(null);
      setLimitError(null);
    }
  };

  const removeFromCart = (cartId) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const updateQuantity = (cartId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(cartId);
    } else {
      const targetItem = cart.find(item => item.cartId === cartId);
      if (targetItem) {
        const nextTotal = cartTotal - (targetItem.price * targetItem.quantity) + (targetItem.price * quantity);
        if (nextTotal > MAX_CHARGE_CENTS) {
          setLimitError(`Maximum charge is ${MAX_CHARGE_LABEL}.`);
          return;
        }
      }

      setCart(cart.map(item => 
        item.cartId === cartId 
          ? { ...item, quantity }
          : item
      ));
      setLimitError(null);
    }
  };

  const clearCart = () => {
    setCart([]);
    setLimitError(null);
    setKeypadError(null);
  };

  const handleShare = async () => {
    if (!storefrontUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: vendor?.name || "Vehndr Storefront",
          url: storefrontUrl
        });
        setShareStatus("shared");
        return;
      }

      await navigator.clipboard.writeText(storefrontUrl);
      setShareStatus("copied");
    } catch (error) {
      console.error("Failed to share storefront link:", error);
      setShareStatus("error");
    } finally {
      setTimeout(() => setShareStatus(null), 2500);
    }
  };

  // Checkout flow:
  // - Card: generate a checkout link and let the customer add tip on their device
  // - Cash: process in POS without a vendor-side tip selection screen
  const handleCharge = async () => {
    if (cart.length === 0) return;
    if (totalWithTax > MAX_CHARGE_CENTS) {
      setLimitError(`Maximum charge is ${MAX_CHARGE_LABEL}.`);
      return;
    }

    // For card payments, generate checkout link directly (tip is on customer's phone)
    if (paymentMethod === 'card') {
      await generateCheckoutLink(0); // No tip from vendor side, customer adds on their phone
      return;
    }

    // For cash, open cash modal directly (no tip screen)
    setCurrentTip(0);
    setCashReceived('0');
    setShowCashModal(true);
  };

  // Generate checkout link for customer payment
  const generateCheckoutLink = async (tipCents = currentTip) => {
    setCheckoutLinkLoading(true);

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

      const response = await api('/api/checkout/pos_link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vendor_id: vendor.id,
          items: items,
          custom_items: customItems,
          tip_cents: tipCents
        })
      });

      if (response.success) {
        setCheckoutLinkData({
          url: response.checkoutUrl,
          paymentIntentId: response.paymentIntentId,
          subtotalCents: response.subtotalCents || 0,
          totalCents: response.totalCents,
          taxCents: response.taxCents || 0,
          tipCents: response.tipCents
        });
        setShowCheckoutLinkModal(true);
        setCheckoutLinkLoading(false);
      } else {
        throw new Error(response.message || 'Failed to create checkout link');
      }
    } catch (error) {
      console.error('Checkout link error:', error);
      setCheckoutLinkLoading(false);
      alert(`Failed to create checkout link: ${error.message}`);
    }
  };

  // Handle checkout link modal close (after sale complete or cancel)
  const handleCheckoutLinkComplete = async () => {
    if (!checkoutLinkData?.paymentIntentId) {
      alert("Missing checkout link details. Please reopen the checkout link.");
      return;
    }

    setFinalizingCheckoutLink(true);

    try {
      const response = await api(`/api/checkout/pos_link/${checkoutLinkData.paymentIntentId}/confirm`, {
        method: "POST",
        body: { vendor_id: vendor.id }
      });

      if (!response.success) {
        throw new Error(response.message || "Payment not confirmed yet");
      }

      setShowCheckoutLinkModal(false);
      setCheckoutLinkData(null);
      setCurrentTip(0);
      setShowSuccess(true);
      setLastOrderTotal(response.totalCents ?? checkoutLinkData.totalCents ?? 0);

      setTimeout(() => {
        setShowSuccess(false);
        clearCart();
      }, 2500);
    } catch (error) {
      console.error("Checkout link confirmation error:", error);
      alert(`Payment is not complete yet: ${error.message}`);
    } finally {
      setFinalizingCheckoutLink(false);
    }
  };

  const handleCheckoutLinkCancel = () => {
    if (finalizingCheckoutLink) return;
    setShowCheckoutLinkModal(false);
    setCheckoutLinkData(null);
  };

  // Process the in-person cash payment after cash modal confirmation
  const processPayment = async (tipCents = currentTip) => {
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
          payment_method: paymentMethod,
          tip_cents: tipCents
        })
      });

      if (response.success) {
        setLastOrderTotal(totalWithTax + tipCents);
        setCurrentTip(0);
        setProcessing(false);
        setShowCashModal(false);
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

  // Handle cash modal keypad
  const handleCashKeypadPress = (key) => {
    if (key === 'C') {
      setCashReceived('0');
    } else if (key === '⌫') {
      setCashReceived(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else {
      setCashReceived(prev => prev === '0' ? key : prev + key);
    }
  };

  // Quick cash amount buttons (in cents)
  const handleQuickCash = (amountCents) => {
    setCashReceived(amountCents.toString());
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

      // Add new images
      const existingItems = productData.imageItems?.filter((item) => item.isExisting) || [];
      const newItems = productData.imageItems?.filter((item) => !item.isExisting) || [];
      if (newItems.length > 0) {
        newItems.forEach((item) => {
          if (item.file) {
            formData.append('images[]', item.file);
          }
        });
      }

      // When editing, send the list of existing images to keep
      if (editingProduct && existingItems.length > 0) {
        existingItems.forEach((item) => {
          formData.append('keep_images[]', item.url);
        });
        existingItems.forEach((item) => {
          if (item.id && !item.id.startsWith("legacy_")) {
            formData.append("image_order[]", item.id);
          }
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

  const handleToggleActive = async (product) => {
    if (!product?.id) return;
    const nextActive = !product.active;
    try {
      await api(`/api/products/${product.id}`, {
        method: 'PATCH',
        body: { product: { active: nextActive } }
      });
      if (user?.vendorId) {
        await fetchData(user.vendorId);
      }
    } catch (err) {
      console.error('Failed to update visibility', err);
      alert('Failed to update visibility');
    }
  };

  // Calculations
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const taxRate = 0.0625;
  const taxAmount = Math.round(cartTotal * taxRate);
  const totalWithTax = cartTotal + taxAmount;
  const keypadAmount = parseInt(keypadValue || '0');
  const canAddCustomAmount = keypadAmount > 0
    && keypadAmount <= MAX_CHARGE_CENTS
    && (cartTotal + keypadAmount) <= MAX_CHARGE_CENTS;

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = 
      (activeLibraryCategory === 'items' && !product.isService) ||
      (activeLibraryCategory === 'services' && product.isService) ||
      activeLibraryCategory === 'all';
    return matchesSearch && matchesCategory;
  });

  // Keypad functions (works in cents like banking software)
  const handleKeypadPress = (key) => {
    if (key === 'C') {
      setKeypadValue('0');
      setKeypadError(null);
    } else if (key === '⌫') {
      setKeypadValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
      setKeypadError(null);
    } else {
      // Only append digits, treating value as cents
      setKeypadValue(prev => {
        const nextValue = prev === '0' ? key : prev + key;
        const nextCents = parseInt(nextValue);
        if (nextCents > MAX_CHARGE_CENTS) {
          setKeypadError(`Maximum charge is ${MAX_CHARGE_LABEL}.`);
          return prev;
        }
        setKeypadError(null);
        return nextValue;
      });
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
            <button
              type="button"
              onClick={handleShare}
              className="h-10 px-3 rounded-xl bg-[var(--violet-600)] text-white text-sm font-semibold flex items-center gap-2 hover:bg-[var(--violet-700)] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Share link
            </button>
            <button className="w-10 h-10 rounded-xl bg-[var(--gray-100)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--gray-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {shareStatus && (
          <div className="mt-3 text-xs font-medium text-[var(--gray-500)]">
            {shareStatus === "copied" && "Storefront link copied."}
            {shareStatus === "shared" && "Share sent."}
            {shareStatus === "error" && "Unable to share link right now."}
          </div>
        )}

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
              onToggleActive={handleToggleActive}
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
              errorMessage={keypadError}
              canAdd={canAddCustomAmount}
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
            limitError={limitError}
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

      {/* Cash Payment Modal */}
      {showCashModal && (
        <CashPaymentModal
          totalDue={totalWithTax + currentTip}
          cashReceived={cashReceived}
          onKeyPress={handleCashKeypadPress}
          onQuickCash={handleQuickCash}
          onConfirm={processPayment}
          onCancel={() => setShowCashModal(false)}
          processing={processing}
          tipCents={currentTip}
        />
      )}

      {/* Checkout Link Modal */}
      {showCheckoutLinkModal && checkoutLinkData && (
        <CheckoutLinkModal
          checkoutUrl={checkoutLinkData.url}
          subtotalCents={checkoutLinkData.subtotalCents}
          totalCents={checkoutLinkData.totalCents}
          taxCents={checkoutLinkData.taxCents}
          tipCents={checkoutLinkData.tipCents}
          vendorName={vendor?.name}
          onComplete={handleCheckoutLinkComplete}
          onCancel={handleCheckoutLinkCancel}
          processing={finalizingCheckoutLink}
        />
      )}

      {/* Loading overlay for checkout link generation */}
      {checkoutLinkLoading && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 text-center">
            <div className="animate-spin w-10 h-10 border-3 border-[var(--violet-600)] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-[var(--gray-700)] font-medium">Creating checkout link...</p>
          </div>
        </div>
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
  onToggleActive,
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
                        onToggleActive={() => onToggleActive(product)}
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
function LibraryItem({ product, onAdd, onEdit, onDelete, onToggleActive, inCart }) {
  const price = (product.price || 0) / 100;
  const [showActions, setShowActions] = useState(false);

  return (
    <div className={`flex items-center gap-3 px-4 py-3 bg-white hover:bg-[var(--gray-50)] transition-colors ${
      product.active === false ? 'opacity-60' : ''
    }`}>
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
          <h3 className="font-semibold text-[var(--foreground)] truncate flex-1 min-w-0">
            {product.name}
          </h3>
          {inCart && (
            <span className="w-2 h-2 rounded-full bg-[var(--success)] flex-shrink-0"></span>
          )}
          {product.active === false && (
            <span className="chip text-[10px] px-1.5 py-0.5 bg-[var(--gray-200)] text-[var(--gray-600)] flex-shrink-0">
              Hidden
            </span>
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
            onClick={() => { onToggleActive(); setShowActions(false); }}
            className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-[var(--gray-50)] flex items-center gap-2"
          >
            {product.active === false ? (
              <svg className="w-4 h-4 text-[var(--gray-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1.933 12.5C3.416 8.127 7.5 5 12 5c4.5 0 8.584 3.127 10.067 7.5-1.483 4.373-5.567 7.5-10.067 7.5-4.5 0-8.584-3.127-10.067-7.5z" />
                <circle cx="12" cy="12.5" r="3" strokeWidth={2} />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-[var(--gray-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.58 10.58a3 3 0 0 0 4.24 4.24" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.1 5.1C3.2 6.7 1.8 9.1 1.2 12c1.5 4.5 5.7 7.5 10.8 7.5 1.7 0 3.3-.3 4.7-.9" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.12 14.12 9.88 9.88" />
              </svg>
            )}
            {product.active === false ? 'Show on marketplace' : 'Hide from marketplace'}
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
function KeypadPanel({ value, onKeyPress, customItemName, setCustomItemName, onAddToCart, errorMessage, canAdd }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'];

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
          ${(parseInt(value || '0') / 100).toFixed(2)}
        </p>
        {errorMessage && (
          <p className="text-xs text-[var(--error)] mt-2">{errorMessage}</p>
        )}
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
          disabled={!canAdd}
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
  processing,
  limitError
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
              <span className="text-[var(--gray-600)]">Tax</span>
              <span className="font-medium">${(taxAmount / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t border-[var(--gray-200)]">
              <span>Total</span>
              <span className="text-[var(--violet-600)]">${(totalWithTax / 100).toFixed(2)}</span>
            </div>
          </div>
          {limitError && (
            <p className="text-sm text-[var(--error)] font-medium">{limitError}</p>
          )}

          {/* Payment Methods */}
          <div className="grid grid-cols-2 gap-2">
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
    imageItems: (product?.images_data || (product?.images || []).map((url, i) => ({ id: `legacy_${i}`, url }))).map(
      (img) => ({
        id: img.id,
        url: img.url,
        isExisting: true,
        file: null
      })
    )
  });
  const [saving, setSaving] = useState(false);
  const [imageEditor, setImageEditor] = useState({
    isOpen: false,
    imageSrc: null,
    fileName: "product-photo.jpg",
    targetId: null
  });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const createImageItem = (file) => ({
    id: `new_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    url: URL.createObjectURL(file),
    file,
    isExisting: false
  });

  const openImageEditor = (item) => {
    setImageEditor({
      isOpen: true,
      imageSrc: item.url,
      fileName: item.file?.name || "product-photo.jpg",
      targetId: item.id
    });
  };

  const handleImageDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const current = form.imageItems;
    const oldIndex = current.findIndex((img) => img.id === active.id);
    const newIndex = current.findIndex((img) => img.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    setForm((prev) => ({
      ...prev,
      imageItems: arrayMove(current, oldIndex, newIndex)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <>
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

              {form.imageItems.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-[var(--gray-500)] mb-2">Drag to reorder</p>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleImageDragEnd}
                  >
                    <SortableContext items={form.imageItems.map((item) => item.id)} strategy={rectSortingStrategy}>
                      <div className="flex gap-2 mb-2 overflow-x-auto scrollbar-hide">
                        {form.imageItems.map((item) => (
                          <SortableProductImage
                            key={item.id}
                            id={item.id}
                            item={item}
                            onEdit={() => openImageEditor(item)}
                            onRemove={() =>
                              setForm((prev) => ({
                                ...prev,
                                imageItems: prev.imageItems.filter((img) => img.id !== item.id)
                              }))
                            }
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
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
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      imageItems: [...prev.imageItems, ...Array.from(e.target.files).map(createImageItem)]
                    }))
                  }
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
      <ImageEditorModal
        isOpen={imageEditor.isOpen}
        imageSrc={imageEditor.imageSrc}
        fileName={imageEditor.fileName}
        initialAspect={1}
        onClose={() => setImageEditor({ isOpen: false, imageSrc: null, fileName: "product-photo.jpg", targetId: null })}
        onSave={(editedFile) => {
          setForm((prev) => ({
            ...prev,
            imageItems: prev.imageItems.map((item) => {
              if (item.id !== imageEditor.targetId) return item;
              return {
                ...item,
                url: URL.createObjectURL(editedFile),
                file: editedFile,
                isExisting: false
              };
            })
          }));
        }}
      />
    </>
  );
}

function SortableProductImage({ id, item, onEdit, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex-shrink-0 cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.url} alt="" className="w-20 h-20 rounded-xl object-cover" />
      {!item.isExisting && (
        <span className="absolute top-1 left-1 badge bg-[var(--violet-600)] text-white text-[10px]">New</span>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit?.();
        }}
        className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6-6m2.828 2.828l-6 6M7 17l-2 2 2-2z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove?.();
        }}
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--error)] text-white flex items-center justify-center shadow-md"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// Cash Payment Modal Component
function CashPaymentModal({
  totalDue,
  cashReceived,
  onKeyPress,
  onQuickCash,
  onConfirm,
  onCancel,
  processing,
  tipCents = 0
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'];
  const cashReceivedCents = parseInt(cashReceived || '0');
  const changeDue = cashReceivedCents - totalDue;
  const canComplete = cashReceivedCents >= totalDue;

  // Quick cash buttons - common bill amounts
  const quickAmounts = [
    { label: '$5', cents: 500 },
    { label: '$10', cents: 1000 },
    { label: '$20', cents: 2000 },
    { label: '$50', cents: 5000 },
    { label: '$100', cents: 10000 },
  ];

  // Calculate next rounded amount above total
  const getExactAmount = () => {
    return totalDue;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl max-h-[95vh] overflow-y-auto safe-area-bottom rounded-t-3xl">
        <div className="p-6">
          {/* Handle */}
          <div className="w-10 h-1 bg-[var(--gray-300)] rounded-full mx-auto mb-6 sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Cash Payment</h2>
            <button
              onClick={onCancel}
              className="w-10 h-10 rounded-xl bg-[var(--gray-100)] flex items-center justify-center"
            >
              <svg className="w-5 h-5 text-[var(--gray-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Amount Summary */}
          <div className="bg-[var(--gray-50)] rounded-2xl p-4 mb-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[var(--gray-600)] font-medium">Subtotal + Tax</span>
              <span className="font-medium text-[var(--foreground)]">
                ${((totalDue - tipCents) / 100).toFixed(2)}
              </span>
            </div>
            {tipCents > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-[var(--gray-600)] font-medium">Tip</span>
                <span className="font-medium text-[var(--success)]">
                  +${(tipCents / 100).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-[var(--gray-200)]">
              <span className="text-[var(--gray-700)] font-semibold">Total Due</span>
              <span className="text-2xl font-bold text-[var(--foreground)]">
                ${(totalDue / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[var(--gray-600)] font-medium">Cash Received</span>
              <span className="text-2xl font-bold text-[var(--violet-600)]">
                ${(cashReceivedCents / 100).toFixed(2)}
              </span>
            </div>
            <div className="border-t border-[var(--gray-200)] pt-3">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-[var(--gray-700)]">Change Due</span>
                <span className={`text-3xl font-bold ${
                  changeDue >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'
                }`}>
                  {changeDue >= 0 ? '' : '-'}${(Math.abs(changeDue) / 100).toFixed(2)}
                </span>
              </div>
              {changeDue < 0 && (
                <p className="text-sm text-[var(--error)] mt-1 text-right">
                  Need ${(Math.abs(changeDue) / 100).toFixed(2)} more
                </p>
              )}
            </div>
          </div>

          {/* Quick Cash Buttons */}
          <div className="mb-4">
            <p className="text-xs text-[var(--gray-500)] mb-2 font-medium uppercase tracking-wide">Quick Amount</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => onQuickCash(getExactAmount())}
                className="px-4 py-2 rounded-xl bg-[var(--violet-100)] text-[var(--violet-700)] font-semibold text-sm hover:bg-[var(--violet-200)] transition-colors"
              >
                Exact ${(totalDue / 100).toFixed(2)}
              </button>
              {quickAmounts.map((amount) => (
                <button
                  key={amount.cents}
                  onClick={() => onQuickCash(amount.cents)}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
                    amount.cents >= totalDue
                      ? 'bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]'
                      : 'bg-[var(--gray-50)] text-[var(--gray-400)]'
                  }`}
                >
                  {amount.label}
                </button>
              ))}
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {keys.map((key) => (
              <button
                key={key}
                onClick={() => onKeyPress(key)}
                className={`h-14 rounded-2xl text-xl font-semibold transition-all active:scale-95 ${
                  key === '⌫'
                    ? 'bg-[var(--gray-200)] text-[var(--gray-600)]'
                    : 'bg-[var(--gray-100)] text-[var(--foreground)] hover:bg-[var(--gray-200)]'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          {/* Clear Button */}
          <button
            onClick={() => onKeyPress('C')}
            className="w-full h-12 rounded-xl bg-[var(--gray-100)] text-[var(--gray-600)] font-semibold mb-4 hover:bg-[var(--gray-200)] transition-colors"
          >
            Clear
          </button>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 h-14 rounded-xl border-2 border-[var(--gray-200)] text-[var(--foreground)] font-semibold hover:bg-[var(--gray-50)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!canComplete || processing}
              className={`flex-1 h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                canComplete && !processing
                  ? 'bg-[var(--success)] text-white shadow-lg hover:bg-[var(--success)]/90'
                  : 'bg-[var(--gray-200)] text-[var(--gray-400)] cursor-not-allowed'
              }`}
            >
              {processing ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Complete Sale
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Checkout Link Modal Component
function CheckoutLinkModal({
  checkoutUrl,
  subtotalCents = 0,
  totalCents,
  taxCents = 0,
  tipCents = 0,
  vendorName,
  onComplete,
  onCancel,
  processing = false
}) {
  const [copied, setCopied] = useState(false);
  const [shareStatus, setShareStatus] = useState(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(checkoutUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Pay ${vendorName || 'Vendor'}`,
          text: `Complete your $${(totalCents / 100).toFixed(2)} payment`,
          url: checkoutUrl
        });
        setShareStatus('shared');
      } else {
        handleCopy();
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Failed to share:', error);
      }
    }
  };

  // Generate QR code URL using a public API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(checkoutUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl max-h-[95vh] overflow-y-auto safe-area-bottom rounded-t-3xl">
        <div className="p-6">
          {/* Handle */}
          <div className="w-10 h-1 bg-[var(--gray-300)] rounded-full mx-auto mb-6 sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Checkout Link</h2>
            <button
              onClick={onCancel}
              disabled={processing}
              className="w-10 h-10 rounded-xl bg-[var(--gray-100)] flex items-center justify-center"
            >
              <svg className="w-5 h-5 text-[var(--gray-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Amount Summary */}
          <div className="bg-gradient-to-r from-[var(--violet-50)] to-[var(--magenta-50)] rounded-2xl p-4 mb-6 text-center">
            <p className="text-sm text-[var(--gray-600)] mb-1">Amount Due</p>
            <p className="text-4xl font-bold text-[var(--gray-900)]">
              ${(totalCents / 100).toFixed(2)}
            </p>
            <div className="mt-3 space-y-1 text-sm">
              <p className="text-[var(--gray-600)]">
                Subtotal ${(subtotalCents / 100).toFixed(2)}
              </p>
              <p className="text-[var(--gray-600)]">
                Tax ${(taxCents / 100).toFixed(2)}
              </p>
              <p className="text-[var(--violet-600)]">
                Tip ${(tipCents / 100).toFixed(2)}
              </p>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-2xl border-2 border-[var(--gray-200)] shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeUrl}
                alt="Checkout QR Code"
                className="w-48 h-48"
              />
            </div>
          </div>

          <p className="text-center text-sm text-[var(--gray-500)] mb-6">
            Customer can scan this code to pay on their device
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleShare}
              disabled={processing}
              className="w-full h-14 rounded-xl bg-[var(--violet-600)] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[var(--violet-700)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="18" cy="5" r="3" strokeWidth="2"/>
                <circle cx="6" cy="12" r="3" strokeWidth="2"/>
                <circle cx="18" cy="19" r="3" strokeWidth="2"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" strokeWidth="2"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" strokeWidth="2"/>
              </svg>
              Share Link
            </button>

            <button
              onClick={handleCopy}
              disabled={processing}
              className="w-full h-14 rounded-xl border-2 border-[var(--gray-200)] text-[var(--gray-700)] font-semibold flex items-center justify-center gap-2 hover:bg-[var(--gray-50)] transition-colors"
            >
              {copied ? (
                <>
                  <svg className="w-5 h-5 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Link
                </>
              )}
            </button>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onCancel}
                disabled={processing}
                className="flex-1 h-12 rounded-xl bg-[var(--gray-100)] text-[var(--gray-600)] font-semibold hover:bg-[var(--gray-200)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onComplete}
                disabled={processing}
                className="flex-1 h-12 rounded-xl bg-[var(--success)] text-white font-semibold hover:bg-[var(--success)]/90 transition-colors"
              >
                {processing ? "Confirming..." : "Done"}
              </button>
            </div>
          </div>

          {/* Note */}
          <p className="text-xs text-[var(--gray-400)] text-center mt-4">
            Click &quot;Done&quot; after customer completes payment
          </p>
        </div>
      </div>
    </div>
  );
}
