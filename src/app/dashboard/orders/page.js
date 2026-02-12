"use client";

import AuthGate from "../../../components/AuthGate";
import { getCurrentUser } from "../../../services/auth";
import { api } from "../../../services/api";
import { useEffect, useState, useCallback } from "react";
import { useVendorOrders } from "../../../hooks/useVendorOrders";
import Link from "next/link";

export default function OrdersPage() {
  return (
    <AuthGate>
      <OrdersInner />
    </AuthGate>
  );
}

function OrdersInner() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [completingOrderId, setCompletingOrderId] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundOrder, setRefundOrder] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('requested_by_customer');
  const [refundingOrderId, setRefundingOrderId] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: '',
    paymentStatus: '',
    refundStatus: '',
    orderType: '',
    minTotal: '',
    maxTotal: '',
    hasTip: false
  });
  const [appliedFilters, setAppliedFilters] = useState({});

  const fetchOrders = useCallback(async (vendorId, filterParams = {}) => {
    try {
      const queryParams = new URLSearchParams();

      if (filterParams.search) queryParams.append('search', filterParams.search);
      if (filterParams.startDate) queryParams.append('start_date', filterParams.startDate);
      if (filterParams.endDate) queryParams.append('end_date', filterParams.endDate);
      if (filterParams.paymentStatus) queryParams.append('payment_status', filterParams.paymentStatus);
      if (filterParams.refundStatus) queryParams.append('refund_status', filterParams.refundStatus);
      if (filterParams.orderType) queryParams.append('order_type', filterParams.orderType);
      if (filterParams.minTotal) queryParams.append('min_total', filterParams.minTotal);
      if (filterParams.maxTotal) queryParams.append('max_total', filterParams.maxTotal);
      if (filterParams.hasTip) queryParams.append('has_tip', 'true');

      const queryString = queryParams.toString();
      const url = `/api/vendors/${vendorId}/orders${queryString ? `?${queryString}` : ''}`;

      const vendorOrders = await api(url);
      setOrders(vendorOrders);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      setUser(u);

      if (u?.vendorId) {
        await fetchOrders(u.vendorId, appliedFilters);
      }
      setLoading(false);
    })();
  }, [fetchOrders, appliedFilters]);

  // Real-time order updates
  const handleNewOrder = useCallback((newOrder) => {
    setOrders((prevOrders) => [newOrder, ...prevOrders]);
  }, []);

  useVendorOrders(user?.vendorId, handleNewOrder);

  // Filter handlers
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
    setShowFilters(false);
  };

  const clearFilters = () => {
    const emptyFilters = {
      search: '',
      startDate: '',
      endDate: '',
      paymentStatus: '',
      refundStatus: '',
      orderType: '',
      minTotal: '',
      maxTotal: '',
      hasTip: false
    };
    setFilters(emptyFilters);
    setAppliedFilters({});
  };

  const activeFilterCount = Object.entries(appliedFilters).filter(([key, value]) => {
    if (typeof value === 'boolean') return value;
    return value !== '';
  }).length;

  // Filter orders by tab
  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed');
  const completedOrders = orders.filter(o => o.status === 'completed');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  const displayedOrders = activeTab === 'active' ? activeOrders :
    activeTab === 'completed' ? completedOrders : cancelledOrders;

  const handleCompleteOrder = async (orderId) => {
    setCompletingOrderId(orderId);
    try {
      await api(`/api/orders/${orderId}/complete`, { method: 'PATCH' });
      setSuccessMessage('Order completed successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: 'completed' } : order
        )
      );
    } catch (err) {
      console.error("Failed to complete order", err);
      alert("Failed to complete order. Please try again.");
    } finally {
      setCompletingOrderId(null);
    }
  };

  const openRefundModal = (order) => {
    setRefundOrder(order);
    setRefundAmount(((order.total_cents || order.totalCents) / 100).toFixed(2));
    setRefundReason('requested_by_customer');
    setShowRefundModal(true);
  };

  const closeRefundModal = () => {
    setShowRefundModal(false);
    setRefundOrder(null);
    setRefundAmount('');
  };

  const handleRefundOrder = async () => {
    if (!refundOrder) return;

    const amountCents = Math.round(parseFloat(refundAmount) * 100);
    const maxAmount = refundOrder.total_cents || refundOrder.totalCents;

    if (amountCents <= 0 || amountCents > maxAmount) {
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

      setSuccessMessage(response.message || 'Refund processed successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center pb-20">
        <div className="animate-pulse-soft">
          <div className="w-12 h-12 rounded-full bg-[var(--violet-200)]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-24">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up">
          <div className="bg-[var(--success)] text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-[var(--gray-200)] px-4 pt-12 pb-4 safe-area-top sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/dashboard" className="w-10 h-10 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--gray-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-h2 flex-1">Orders</h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setActiveTab('active')}
              className={`chip ${activeTab === 'active' ? 'chip-active' : 'chip-filled'}`}
            >
              Active ({activeOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`chip ${activeTab === 'completed' ? 'chip-active' : 'chip-filled'}`}
            >
              Completed ({completedOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`chip ${activeTab === 'cancelled' ? 'chip-active' : 'chip-filled'}`}
            >
              Cancelled ({cancelledOrders.length})
            </button>
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilterCount > 0 ? 'bg-[var(--violet-100)] text-[var(--violet-600)]' : 'bg-[var(--gray-100)] text-[var(--gray-600)]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 bg-[var(--violet-600)] text-white text-xs rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border-b border-[var(--gray-200)] px-4 py-4">
          <div className="max-w-lg mx-auto space-y-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-1.5">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Customer name or email..."
                className="input"
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1.5">From Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1.5">To Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="input"
                />
              </div>
            </div>

            {/* Payment & Refund Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1.5">Payment Status</label>
                <select
                  value={filters.paymentStatus}
                  onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                  className="input"
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="succeeded">Succeeded</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1.5">Refund Status</label>
                <select
                  value={filters.refundStatus}
                  onChange={(e) => handleFilterChange('refundStatus', e.target.value)}
                  className="input"
                >
                  <option value="">All</option>
                  <option value="none">No Refund</option>
                  <option value="pending_refund">Pending</option>
                  <option value="partial_refund">Partial</option>
                  <option value="full_refund">Full</option>
                </select>
              </div>
            </div>

            {/* Order Type */}
            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-1.5">Order Type</label>
              <select
                value={filters.orderType}
                onChange={(e) => handleFilterChange('orderType', e.target.value)}
                className="input"
              >
                <option value="">All</option>
                <option value="online">Online</option>
                <option value="in_person">In-Person</option>
              </select>
            </div>

            {/* Price Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1.5">Min Total ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.minTotal}
                  onChange={(e) => handleFilterChange('minTotal', e.target.value)}
                  placeholder="0.00"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1.5">Max Total ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.maxTotal}
                  onChange={(e) => handleFilterChange('maxTotal', e.target.value)}
                  placeholder="1000.00"
                  className="input"
                />
              </div>
            </div>

            {/* Has Tip Toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasTip}
                onChange={(e) => handleFilterChange('hasTip', e.target.checked)}
                className="w-5 h-5 rounded border-[var(--gray-300)] text-[var(--violet-600)] focus:ring-[var(--violet-500)]"
              />
              <span className="text-sm font-medium text-[var(--gray-700)]">Orders with tips only</span>
            </label>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={clearFilters}
                className="btn btn-outline flex-1"
              >
                Clear All
              </button>
              <button
                onClick={applyFilters}
                className="btn btn-primary flex-1"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && !showFilters && (
        <div className="bg-[var(--violet-50)] border-b border-[var(--violet-100)] px-4 py-2">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-[var(--violet-700)]">{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active</span>
              {appliedFilters.search && (
                <span className="chip text-xs bg-[var(--violet-100)] text-[var(--violet-700)]">
                  &quot;{appliedFilters.search}&quot;
                </span>
              )}
              {appliedFilters.startDate && (
                <span className="chip text-xs bg-[var(--violet-100)] text-[var(--violet-700)]">
                  From {appliedFilters.startDate}
                </span>
              )}
              {appliedFilters.endDate && (
                <span className="chip text-xs bg-[var(--violet-100)] text-[var(--violet-700)]">
                  To {appliedFilters.endDate}
                </span>
              )}
              {appliedFilters.paymentStatus && (
                <span className="chip text-xs bg-[var(--violet-100)] text-[var(--violet-700)]">
                  Payment: {appliedFilters.paymentStatus}
                </span>
              )}
              {appliedFilters.refundStatus && (
                <span className="chip text-xs bg-[var(--violet-100)] text-[var(--violet-700)]">
                  Refund: {appliedFilters.refundStatus}
                </span>
              )}
              {appliedFilters.orderType && (
                <span className="chip text-xs bg-[var(--violet-100)] text-[var(--violet-700)]">
                  {appliedFilters.orderType === 'in_person' ? 'In-Person' : 'Online'}
                </span>
              )}
              {appliedFilters.hasTip && (
                <span className="chip text-xs bg-[var(--violet-100)] text-[var(--violet-700)]">
                  Has Tip
                </span>
              )}
            </div>
            <button
              onClick={clearFilters}
              className="text-sm text-[var(--violet-600)] hover:text-[var(--violet-800)] font-medium"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="px-4 py-4">
        <div className="max-w-lg mx-auto">
          {displayedOrders.length === 0 ? (
            <div className="card bg-white p-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-[var(--gray-100)] flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[var(--gray-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-h4 text-[var(--gray-700)] mb-2">No {activeTab} orders</h3>
              <p className="text-sm text-[var(--gray-500)]">
                {activeTab === 'active' ? 'New orders will appear here' : 
                 activeTab === 'completed' ? 'Completed orders will appear here' :
                 'Cancelled orders will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onComplete={handleCompleteOrder}
                  onRefund={openRefundModal}
                  isCompleting={completingOrderId === order.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && refundOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 overlay" onClick={closeRefundModal} />
          <div className="relative bg-white bottom-sheet sm:rounded-2xl w-full sm:max-w-md p-6 safe-area-bottom">
            <div className="bottom-sheet-handle sm:hidden" />
            
            <h2 className="text-h3 mb-4">Refund Order</h2>
            
            <div className="space-y-4">
              <div className="bg-[var(--gray-50)] p-4 rounded-xl">
                <p className="text-sm text-[var(--gray-500)]">Order Total</p>
                <p className="text-h2">${((refundOrder.total_cents || refundOrder.totalCents) / 100).toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                  Refund Amount (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={((refundOrder.total_cents || refundOrder.totalCents) / 100).toFixed(2)}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                  Reason
                </label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="input"
                >
                  <option value="requested_by_customer">Requested by customer</option>
                  <option value="duplicate">Duplicate charge</option>
                  <option value="fraudulent">Fraudulent</option>
                </select>
              </div>

              <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-[var(--warning)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-[var(--warning)]">
                    This will process a refund through Stripe. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={closeRefundModal}
                  disabled={refundingOrderId === refundOrder.id}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefundOrder}
                  disabled={refundingOrderId === refundOrder.id}
                  className="btn flex-1 bg-[var(--error)] text-white rounded-full h-12"
                >
                  {refundingOrderId === refundOrder.id ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : 'Process Refund'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onComplete, onRefund, isCompleting }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(order.created_at || order.createdAt);
  const totalCents = order.total_cents || order.totalCents || 0;
  const tipCents = order.tip_cents || order.tipCents || 0;
  const subtotalCents = (order.subtotal_cents || order.subtotalCents) || (totalCents - tipCents);
  const total = totalCents / 100;
  const customerName = order.customer?.name || 'Guest';
  const items = order.line_items || [];
  const refundStatus = order.refundStatus || order.refund_status;
  const paymentStatus = order.paymentStatus || order.payment_status;
  const orderNotes = (order.notes || "").trim();

  return (
    <div className="card bg-white overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
            order.status === 'confirmed' ? 'bg-[var(--info)]/10' :
            order.status === 'pending' ? 'bg-[var(--warning)]/10' :
            order.status === 'completed' ? 'bg-[var(--success)]/10' :
            'bg-[var(--gray-100)]'
          }`}>
            <span className={`font-semibold ${
              order.status === 'confirmed' ? 'text-[var(--info)]' :
              order.status === 'pending' ? 'text-[var(--warning)]' :
              order.status === 'completed' ? 'text-[var(--success)]' :
              'text-[var(--gray-600)]'
            }`}>
              {customerName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-[var(--foreground)] truncate">{customerName}</p>
              <p className="font-semibold text-[var(--foreground)]">${total.toFixed(2)}</p>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm text-[var(--gray-500)]">{items.length} item{items.length !== 1 ? 's' : ''}</p>
              <div className="flex items-center gap-2">
                <span className={`chip text-xs px-2 py-0.5 ${
                  order.status === 'confirmed' ? 'bg-[var(--info)]/10 text-[var(--info)]' :
                  order.status === 'pending' ? 'bg-[var(--warning)]/10 text-[var(--warning)]' :
                  order.status === 'completed' ? 'bg-[var(--success)]/10 text-[var(--success)]' :
                  'bg-[var(--gray-100)] text-[var(--gray-600)]'
                }`}>
                  {order.status}
                </span>
                {refundStatus && refundStatus !== 'none' && (
                  <span className="chip text-xs px-2 py-0.5 bg-[var(--amber-500)]/10 text-[var(--amber-600)]">
                    Refunded
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-[var(--gray-400)] mt-1">
              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
          <svg 
            className={`w-5 h-5 text-[var(--gray-400)] transition-transform ${expanded ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--gray-100)] p-4 bg-[var(--gray-50)]">
          {/* Customer Info */}
          <div className="mb-4">
            <p className="text-sm font-medium text-[var(--gray-700)] mb-2">Customer</p>
            <div className="space-y-1 text-sm text-[var(--gray-600)]">
              <p>{customerName}</p>
              <p>{order.customer?.email}</p>
            </div>
          </div>

          {orderNotes && (
            <div className="mb-4">
              <p className="text-sm font-medium text-[var(--gray-700)] mb-2">Notes</p>
              <p className="text-sm text-[var(--gray-600)] bg-white p-3 rounded-lg whitespace-pre-wrap">
                {orderNotes}
              </p>
            </div>
          )}

          {/* Line Items */}
          <div className="mb-4">
            <p className="text-sm font-medium text-[var(--gray-700)] mb-2">Items</p>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-lg">
                  {item.product?.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.product.images[0]}
                      alt={item.product?.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product?.name || 'Unknown'}</p>
                    <p className="text-xs text-[var(--gray-500)]">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-sm">
                    ${((item.price_cents || item.priceCents) / 100 * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="mb-4 bg-white rounded-lg p-3">
            <p className="text-sm font-medium text-[var(--gray-700)] mb-2">Order Summary</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--gray-600)]">Subtotal</span>
                <span>${(subtotalCents / 100).toFixed(2)}</span>
              </div>
              {tipCents > 0 && (
                <div className="flex justify-between">
                  <span className="text-[var(--gray-600)]">Tip</span>
                  <span className="text-[var(--success)] font-medium">+${(tipCents / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-2 border-t border-[var(--gray-100)]">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {(order.status === 'pending' || order.status === 'confirmed') && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => onComplete(order.id)}
                disabled={isCompleting}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2 bg-[var(--success)] h-11"
              >
                {isCompleting ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isCompleting ? 'Completing...' : 'Complete Order'}
              </button>
              {paymentStatus === 'succeeded' && (!refundStatus || refundStatus === 'none') && (
                <button
                  onClick={() => onRefund(order)}
                  className="btn btn-outline h-11 px-4"
                >
                  Refund
                </button>
              )}
            </div>
          )}
          {/* Refund action for completed orders */}
          {order.status === 'completed' && paymentStatus === 'succeeded' && (!refundStatus || refundStatus === 'none') && (
            <div className="pt-2">
              <button
                onClick={() => onRefund(order)}
                className="btn btn-outline h-11 px-4 w-full"
              >
                Refund
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

