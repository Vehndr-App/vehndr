"use client";

import AuthGate from "../../components/AuthGate";
import { getCurrentUser } from "../../services/auth";
import { api } from "../../services/api";
import { useEffect, useState, useCallback } from "react";
import { useVendorOrders } from "../../hooks/useVendorOrders";
import VendorProfile from "../../components/VendorProfile";
import StripeConnectButton from "../../components/StripeConnectButton";

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardInner />
    </AuthGate>
  );
}

function DashboardInner() {
  const [user, setUser] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [completingOrderId, setCompletingOrderId] = useState(null);
  const [completedOrderId, setCompletedOrderId] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [refundingOrderId, setRefundingOrderId] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundOrder, setRefundOrder] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('requested_by_customer');
  const [activeTab, setActiveTab] = useState('orders');
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null);
  const [loadingAccountStatus, setLoadingAccountStatus] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    isService: false,
    duration: '',
    images: []
  });
  const [savingProduct, setSavingProduct] = useState(false);

  const fetchOrders = useCallback(async (vendorId) => {
    try {
      const vendorOrders = await api(`/api/vendors/${vendorId}/orders`);
      setOrders(vendorOrders);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    }
  }, []);

  const fetchProducts = useCallback(async (vendorId) => {
    setLoadingProducts(true);
    try {
      const response = await api(`/api/vendors/${vendorId}/products`);
      console.log('Products API response:', response);

      // Handle both array responses and object responses
      if (Array.isArray(response)) {
        setProducts(response);
      } else if (response && Array.isArray(response.products)) {
        setProducts(response.products);
      } else {
        console.warn('Unexpected products response format:', response);
        setProducts([]);
      }
    } catch (err) {
      console.error("Failed to fetch products", err);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchVendor = useCallback(async (vendorId) => {
    try {
      const data = await api(`/api/vendors/${vendorId}`);
      const vendorData = data.vendor || data;
      setVendor(vendorData);
    } catch (err) {
      console.error("Failed to fetch vendor", err);
    }
  }, []);

  const fetchAccountStatus = useCallback(async (vendorId) => {
    setLoadingAccountStatus(true);
    try {
      const response = await api(`/api/vendors/${vendorId}/stripe/account`);
      setAccountStatus(response);
    } catch (err) {
      console.error("Failed to fetch account status", err);
      setAccountStatus(null);
    } finally {
      setLoadingAccountStatus(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      setUser(u);

      if (u?.vendorId) {
        await fetchVendor(u.vendorId);
        await fetchOrders(u.vendorId);
        await fetchProducts(u.vendorId);
        await fetchAccountStatus(u.vendorId);
      }
      setLoading(false);
    })();
  }, [fetchVendor, fetchOrders, fetchProducts, fetchAccountStatus]);

  // Real-time order updates via ActionCable
  const handleNewOrder = useCallback((newOrder) => {
    setOrders(prevOrders => [newOrder, ...prevOrders]);

    // Optional: Show a notification toast
    console.log('New order received:', newOrder);
  }, []);

  useVendorOrders(user?.vendorId, handleNewOrder);

  // Group orders by status
  const confirmedOrders = orders.filter(order => order.status === 'confirmed');
  const completedOrders = orders.filter(order => order.status === 'completed');
  const pendingOrders = orders.filter(order => order.status === 'pending');

  const toggleOrderDetails = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const handleCompleteOrder = async (orderId) => {
    setCompletingOrderId(orderId);
    try {
      await api(`/api/orders/${orderId}/complete`, { method: 'PATCH' });

      // Show success message
      setSuccessMessage('Order completed successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Trigger fade-out animation
      setCompletedOrderId(orderId);

      // Wait for animation to complete before updating state
      setTimeout(() => {
        // Update the order status in local state
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId
              ? { ...order, status: 'completed' }
              : order
          )
        );
        setCompletedOrderId(null);
      }, 500); // Match the animation duration
    } catch (err) {
      console.error("Failed to complete order", err);
      alert("Failed to complete order. Please try again.");
    } finally {
      setCompletingOrderId(null);
    }
  };

  const openRefundModal = (order) => {
    setRefundOrder(order);
    setRefundAmount((order.totalCents / 100).toFixed(2));
    setRefundReason('requested_by_customer');
    setShowRefundModal(true);
  };

  const closeRefundModal = () => {
    setShowRefundModal(false);
    setRefundOrder(null);
    setRefundAmount('');
    setRefundReason('requested_by_customer');
  };

  const handleRefundOrder = async () => {
    if (!refundOrder) return;

    const amountCents = Math.round(parseFloat(refundAmount) * 100);

    if (amountCents <= 0 || amountCents > refundOrder.totalCents) {
      alert('Invalid refund amount');
      return;
    }

    setRefundingOrderId(refundOrder.id);
    try {
      const response = await api(`/api/orders/${refundOrder.id}/refund`, {
        method: 'POST',
        body: JSON.stringify({
          amount_cents: amountCents,
          reason: refundReason
        })
      });

      // Show success message
      setSuccessMessage(response.message || 'Refund processed successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Update the order in local state
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === refundOrder.id
            ? {
                ...order,
                refundStatus: response.refund_status || response.refundStatus,
                refundAmountCents: response.refund_amount_cents || response.refundAmountCents,
                refundedAt: response.refunded_at || response.refundedAt
              }
            : order
        )
      );

      closeRefundModal();
    } catch (err) {
      console.error("Failed to refund order", err);
      alert(`Failed to refund order: ${err.message || 'Please try again.'}`);
    } finally {
      setRefundingOrderId(null);
    }
  };

  const openProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name || '',
        description: product.description || '',
        price: product.price ? (product.price / 100).toString() : '',
        isService: product.isService || false,
        duration: product.duration?.toString() || '',
        images: []
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        price: '',
        isService: false,
        duration: '',
        images: []
      });
    }
    setShowProductModal(true);
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    setEditingProduct(null);
    setProductForm({
      name: '',
      description: '',
      price: '',
      isService: false,
      duration: '',
      images: []
    });
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setSavingProduct(true);

    try {
      const formData = new FormData();
      formData.append('product[name]', productForm.name);
      formData.append('product[description]', productForm.description);
      formData.append('product[price]', Math.round(parseFloat(productForm.price) * 100));
      formData.append('product[is_service]', productForm.isService);
      if (productForm.isService && productForm.duration) {
        formData.append('product[duration]', productForm.duration);
      }

      // Append all selected images
      if (productForm.images && productForm.images.length > 0) {
        console.log(`Appending ${productForm.images.length} image(s)`);
        productForm.images.forEach((image) => {
          formData.append('images[]', image);
        });
      }

      console.log('Submitting product with FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : '/api/products';
      const method = editingProduct ? 'PATCH' : 'POST';

      const result = await api(url, { method, body: formData });
      console.log('Product save result:', result);

      setSuccessMessage(editingProduct ? 'Product updated successfully!' : 'Product created successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh products
      if (user?.vendorId) {
        await fetchProducts(user.vendorId);
      }

      closeProductModal();
    } catch (err) {
      console.error('Failed to save product', err);
      alert(`Failed to save product: ${err.message}`);
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      await api(`/api/products/${productId}`, { method: 'DELETE' });

      setSuccessMessage('Product deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh products
      if (user?.vendorId) {
        await fetchProducts(user.vendorId);
      }
    } catch (err) {
      console.error('Failed to delete product', err);
      alert('Failed to delete product. Please try again.');
    }
  };

  const handleProfileSuccess = (vendorData) => {
    setSuccessMessage('Profile saved successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);

    // Update vendor state with the saved data
    setVendor(vendorData);

    // Update user with new vendor ID if it was just created
    if (!user.vendorId && vendorData.id) {
      setUser({ ...user, vendorId: vendorData.id });
    }
  };

  const renderOrderCard = (order, forceExpanded = false) => {
    const isExpanded = forceExpanded || expandedOrderId === order.id;
    const isBeingCompleted = completedOrderId === order.id;

    return (
      <div
        key={order.id}
        className={`border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-all duration-500 ${
          isBeingCompleted ? 'opacity-0 scale-95 translate-x-4' : 'opacity-100 scale-100 translate-x-0'
        }`}
      >
        {/* Order Header */}
        <div
          className={`p-4 cursor-pointer flex items-center justify-between ${forceExpanded ? 'bg-blue-50 border-b border-blue-200' : 'bg-gray-50'}`}
          onClick={() => !forceExpanded && toggleOrderDetails(order.id)}
        >
          <div className="flex items-center gap-6 flex-1">
            <div>
              <div className="text-xs text-gray-500 mb-1">Order ID</div>
              <div className="font-mono text-sm text-gray-700">#{order.id.slice(0, 8)}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Date</div>
              <div className="text-sm">
                {new Date(order.created_at || order.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Customer</div>
              <div className="text-sm font-medium">{order.customer?.name || 'Unknown'}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Items</div>
              <div className="text-sm">{order.line_items?.length || 0} item(s)</div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Status</div>
              <div className="flex flex-col gap-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${order.status === 'completed' ? 'bg-green-100 text-green-800' :
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                  {order.status}
                </span>
                {order.refundStatus && order.refundStatus !== 'none' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    {order.refundStatus === 'full_refund' ? 'Refunded' :
                     order.refundStatus === 'partial_refund' ? 'Partial Refund' :
                     'Refund Pending'}
                  </span>
                )}
              </div>
            </div>

            <div className="ml-auto text-right">
              <div className="text-xs text-gray-500 mb-1">Total</div>
              <div className="text-lg font-semibold">
                ${((order.total_cents || order.totalCents) / 100).toFixed(2)}
              </div>
            </div>
          </div>

          {!forceExpanded && (
            <div className="ml-4">
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
        </div>

        {/* Order Details */}
        {isExpanded && (
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2 text-gray-700">Customer Information</h4>
              <div className="text-sm text-gray-600">
                <div><span className="font-medium">Name:</span> {order.customer?.name}</div>
                <div><span className="font-medium">Email:</span> {order.customer?.email}</div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-3 text-gray-700">Order Items</h4>
              <div className="space-y-3">
                {order.line_items?.map((item) => {
                  const product = item.product;
                  const productName = product?.name || item.product_name || item.productName;
                  const isService = product?.is_service || product?.isService;

                  return (
                    <div
                      key={item.id}
                      className="flex gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      {/* Product Image */}
                      {product?.images && product.images.length > 0 && (
                        <div className="flex-shrink-0">
                          <img
                            src={product.images[0]}
                            alt={productName}
                            className="w-16 h-16 object-cover rounded-md"
                          />
                        </div>
                      )}

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm flex items-center gap-2">
                              {productName}
                              {isService && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  Service
                                </span>
                              )}
                            </div>

                            {product?.description && (
                              <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {product.description}
                              </div>
                            )}

                            {product?.duration && (
                              <div className="text-xs text-gray-500 mt-1">
                                Duration: {product.duration} minutes
                              </div>
                            )}

                            {item.selected_options && Object.keys(item.selected_options).length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                <span className="font-medium">Options:</span> {Object.entries(item.selected_options).map(([key, value]) =>
                                  `${key}: ${value}`
                                ).join(', ')}
                              </div>
                            )}
                          </div>

                          <div className="flex-shrink-0 text-right">
                            <div className="text-sm text-gray-600">
                              Qty: {item.quantity}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ${((item.price_cents || item.priceCents) / 100).toFixed(2)} each
                            </div>
                            <div className="text-sm font-semibold mt-1">
                              ${((item.subtotal_cents || item.subtotalCents) / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Refund Information */}
            {order.refundStatus && order.refundStatus !== 'none' && order.refundAmountCents > 0 && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <h4 className="text-sm font-semibold mb-2 text-orange-900">Refund Information</h4>
                <div className="text-sm text-orange-800 space-y-1">
                  <div><span className="font-medium">Status:</span> {
                    order.refundStatus === 'full_refund' ? 'Full Refund' :
                    order.refundStatus === 'partial_refund' ? 'Partial Refund' :
                    'Refund Pending'
                  }</div>
                  <div><span className="font-medium">Amount:</span> ${(order.refundAmountCents / 100).toFixed(2)}</div>
                  {order.refundedAt && (
                    <div><span className="font-medium">Refunded on:</span> {new Date(order.refundedAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Order placed on {new Date(order.created_at || order.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>

              <div className="flex gap-2">
                {order.status !== 'completed' && order.status !== 'cancelled' && (
                  <button
                    onClick={() => handleCompleteOrder(order.id)}
                    disabled={completingOrderId === order.id}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {completingOrderId === order.id && (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {completingOrderId === order.id ? 'Completing...' : 'Mark as Completed'}
                  </button>
                )}

                {order.paymentStatus === 'succeeded' && (!order.refundStatus || order.refundStatus === 'none') && (
                  <button
                    onClick={() => openRefundModal(order)}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Refund Order
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl p-6 w-full min-h-screen">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-semibold mb-4">Vendor Dashboard</h1>
      {vendor && (
        <div className="text-sm text-black/60 mb-8">
          Signed in as <span className="font-medium text-black">{vendor.name}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'products'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Products & Services
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'payments'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Payments
          </button>
        </nav>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {activeTab === 'orders' && (
          <div className="rounded-xl border border-black/[.08] p-6 bg-white shadow-sm">
          {loading ? (
            <div className="text-sm text-gray-500">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="text-sm text-gray-500 py-8 text-center bg-gray-50 rounded-lg">No orders yet.</div>
          ) : (
            <div className="space-y-6">
              {/* Confirmed Orders - Always Expanded */}
              {confirmedOrders.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-blue-900">Confirmed Orders (Ready to Complete)</h2>
                    <div className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                      {confirmedOrders.length}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {confirmedOrders.map((order) => renderOrderCard(order, true))}
                  </div>
                </div>
              )}

              {/* Pending Orders - Collapsible */}
              {pendingOrders.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowPending(!showPending)}
                    className="w-full flex items-center justify-between p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors mb-4"
                  >
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-yellow-900">Pending Orders</h2>
                      <div className="px-3 py-1 bg-yellow-200 text-yellow-900 text-sm font-medium rounded-full">
                        {pendingOrders.length}
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-yellow-700 transition-transform ${showPending ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showPending && (
                    <div className="space-y-4">
                      {pendingOrders.map((order) => renderOrderCard(order, false))}
                    </div>
                  )}
                </div>
              )}

              {/* Completed Orders - Collapsible */}
              {completedOrders.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors mb-4"
                  >
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-green-900">Completed Orders</h2>
                      <div className="px-3 py-1 bg-green-200 text-green-900 text-sm font-medium rounded-full">
                        {completedOrders.length}
                      </div>
                    </div>
                    <svg
                      className={`w-5 h-5 text-green-700 transition-transform ${showCompleted ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showCompleted && (
                    <div className="space-y-4">
                      {completedOrders.map((order) => renderOrderCard(order, false))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="rounded-xl border border-black/[.08] p-6 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Your Products & Services</h2>
                <p className="text-sm text-gray-600 mt-1">Manage your product listings and service offerings</p>
              </div>
              <button
                onClick={() => openProductModal()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Add New
              </button>
            </div>

            {loadingProducts ? (
              <div className="text-sm text-gray-500">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No products yet</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating your first product or service.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => {
                  const images = product.images || [];

                  return (
                  <div
                    key={product.id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {images.length > 0 && (
                      <div className="aspect-square bg-gray-100 relative group">
                        <img
                          src={images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        {images.length > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                            +{images.length - 1} more
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                        {product.isService && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 flex-shrink-0">
                            Service
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2 mb-3">{product.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-gray-900">
                          ${((product.price) / 100).toFixed(2)}
                        </div>
                        {product.isService && product.duration && (
                          <div className="text-xs text-gray-500">
                            {product.duration} min
                          </div>
                        )}
                      </div>
                      {product.productOptions && product.productOptions.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="text-xs text-gray-500">
                            {product.productOptions.length} option(s)
                          </div>
                        </div>
                      )}
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => openProductModal(product)}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <VendorProfile user={user} onSuccess={handleProfileSuccess} />
        )}

        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Settings</h2>
              <p className="text-gray-600">
                Manage your Stripe account to accept payments from customers.
              </p>
            </div>

            {loadingAccountStatus ? (
              <div className="text-sm text-gray-500">Loading account status...</div>
            ) : (
              <StripeConnectButton
                vendorId={user?.vendorId}
                accountStatus={accountStatus}
                onStatusUpdate={() => fetchAccountStatus(user?.vendorId)}
              />
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">How It Works</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Click &quot;Connect Stripe Account&quot; to set up your payment account</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Complete the Stripe Express onboarding (takes about 5 minutes)</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Once approved, customers can purchase your products and services</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Funds are deposited directly to your bank account</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Platform fee is automatically deducted from each transaction</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <button
                  onClick={closeProductModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleProductSubmit} className="space-y-4">
                {/* Product Type Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={!productForm.isService}
                        onChange={() => setProductForm({ ...productForm, isService: false, duration: '' })}
                        className="mr-2"
                      />
                      <span>Product</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={productForm.isService}
                        onChange={() => setProductForm({ ...productForm, isService: true })}
                        className="mr-2"
                      />
                      <span>Service</span>
                    </label>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter product name"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe your product or service"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                {/* Duration (for services) */}
                {productForm.isService && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.duration}
                      onChange={(e) => setProductForm({ ...productForm, duration: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 30, 60, 90"
                    />
                  </div>
                )}

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Images
                  </label>

                  {/* Show existing images for editing */}
                  {editingProduct && editingProduct.images && editingProduct.images.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-600 mb-2">Current images:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {editingProduct.images.map((imageUrl, index) => (
                          <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                            <img
                              src={imageUrl}
                              alt={`Product image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show preview of newly selected images */}
                  {productForm.images.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-600 mb-2">Selected ({productForm.images.length}):</p>
                      <div className="grid grid-cols-3 gap-2">
                        {Array.from(productForm.images).map((file, index) => (
                          <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newImages = Array.from(productForm.images).filter((_, i) => i !== index);
                                setProductForm({ ...productForm, images: newImages });
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setProductForm({ ...productForm, images: Array.from(e.target.files) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Upload product images (JPG, PNG) - You can select multiple files</p>
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeProductModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProduct}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {savingProduct ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && refundOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Refund Order</h2>
                <button
                  onClick={closeRefundModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">Order Total</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${(refundOrder.totalCents / 100).toFixed(2)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Refund Amount (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={(refundOrder.totalCents / 100).toFixed(2)}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum refund: ${(refundOrder.totalCents / 100).toFixed(2)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason
                  </label>
                  <select
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="requested_by_customer">Requested by customer</option>
                    <option value="duplicate">Duplicate charge</option>
                    <option value="fraudulent">Fraudulent</option>
                  </select>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-sm text-yellow-800">
                      This action will process a refund through Stripe. This action cannot be undone.
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeRefundModal}
                    disabled={refundingOrderId === refundOrder.id}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRefundOrder}
                    disabled={refundingOrderId === refundOrder.id}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {refundingOrderId === refundOrder.id && (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {refundingOrderId === refundOrder.id ? 'Processing...' : 'Process Refund'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
