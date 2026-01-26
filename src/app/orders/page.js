"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../services/api";
import StarRating from "../../components/StarRating";
import RatingForm from "../../components/RatingForm";

export default function OrderHistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    startDate: "",
    endDate: "",
    status: "",
    paymentStatus: "",
    refundStatus: "",
    minTotal: "",
    maxTotal: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({});

  const fetchOrders = useCallback(async (filterParams = {}) => {
    try {
      const queryParams = new URLSearchParams();

      if (filterParams.search) queryParams.append("search", filterParams.search);
      if (filterParams.startDate) queryParams.append("start_date", filterParams.startDate);
      if (filterParams.endDate) queryParams.append("end_date", filterParams.endDate);
      if (filterParams.status) queryParams.append("status", filterParams.status);
      if (filterParams.paymentStatus) queryParams.append("payment_status", filterParams.paymentStatus);
      if (filterParams.refundStatus) queryParams.append("refund_status", filterParams.refundStatus);
      if (filterParams.minTotal) queryParams.append("min_total", filterParams.minTotal);
      if (filterParams.maxTotal) queryParams.append("max_total", filterParams.maxTotal);

      const queryString = queryParams.toString();
      const url = `/api/orders${queryString ? `?${queryString}` : ""}`;

      const customerOrders = await api(url);
      setOrders(customerOrders);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    (async () => {
      await fetchOrders(appliedFilters);
      setLoading(false);
    })();
  }, [user, router, fetchOrders, appliedFilters]);

  // Filter handlers
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
    setShowFilters(false);
  };

  const clearFilters = () => {
    const emptyFilters = {
      search: "",
      startDate: "",
      endDate: "",
      status: "",
      paymentStatus: "",
      refundStatus: "",
      minTotal: "",
      maxTotal: "",
    };
    setFilters(emptyFilters);
    setAppliedFilters({});
  };

  const activeFilterCount = Object.entries(appliedFilters).filter(
    ([, value]) => value !== ""
  ).length;

  // Filter orders by tab
  const activeOrders = orders.filter(
    (o) => o.status === "pending" || o.status === "confirmed"
  );
  const completedOrders = orders.filter((o) => o.status === "completed");
  const cancelledOrders = orders.filter((o) => o.status === "cancelled");

  const displayedOrders =
    activeTab === "all"
      ? orders
      : activeTab === "active"
      ? activeOrders
      : activeTab === "completed"
      ? completedOrders
      : cancelledOrders;

  if (!user) {
    return null;
  }

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
      {/* Header */}
      <div className="bg-white border-b border-[var(--gray-200)] px-4 pt-12 pb-4 safe-area-top sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/profile"
              className="w-10 h-10 rounded-full bg-[var(--gray-100)] flex items-center justify-center"
            >
              <svg
                className="w-5 h-5 text-[var(--gray-600)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-h2 flex-1">Order History</h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3">
            <button
              onClick={() => setActiveTab("all")}
              className={`chip whitespace-nowrap ${
                activeTab === "all" ? "chip-active" : "chip-filled"
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab("active")}
              className={`chip whitespace-nowrap ${
                activeTab === "active" ? "chip-active" : "chip-filled"
              }`}
            >
              Active ({activeOrders.length})
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`chip whitespace-nowrap ${
                activeTab === "completed" ? "chip-active" : "chip-filled"
              }`}
            >
              Completed ({completedOrders.length})
            </button>
            <button
              onClick={() => setActiveTab("cancelled")}
              className={`chip whitespace-nowrap ${
                activeTab === "cancelled" ? "chip-active" : "chip-filled"
              }`}
            >
              Cancelled ({cancelledOrders.length})
            </button>
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilterCount > 0
                ? "bg-[var(--violet-100)] text-[var(--violet-600)]"
                : "bg-[var(--gray-100)] text-[var(--gray-600)]"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
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
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-1.5">
                Search
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                placeholder="Vendor name..."
                className="input"
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1.5">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1.5">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                  className="input"
                />
              </div>
            </div>

            {/* Status Filters */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1.5">
                  Order Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="input"
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1.5">
                  Payment Status
                </label>
                <select
                  value={filters.paymentStatus}
                  onChange={(e) => handleFilterChange("paymentStatus", e.target.value)}
                  className="input"
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="succeeded">Succeeded</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>

            {/* Refund Status */}
            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-1.5">
                Refund Status
              </label>
              <select
                value={filters.refundStatus}
                onChange={(e) => handleFilterChange("refundStatus", e.target.value)}
                className="input"
              >
                <option value="">All</option>
                <option value="none">No Refund</option>
                <option value="pending_refund">Pending Refund</option>
                <option value="partial_refund">Partial Refund</option>
                <option value="full_refund">Full Refund</option>
              </select>
            </div>

            {/* Price Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1.5">
                  Min Total ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.minTotal}
                  onChange={(e) => handleFilterChange("minTotal", e.target.value)}
                  placeholder="0.00"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1.5">
                  Max Total ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.maxTotal}
                  onChange={(e) => handleFilterChange("maxTotal", e.target.value)}
                  placeholder="1000.00"
                  className="input"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button onClick={clearFilters} className="btn btn-outline flex-1">
                Clear All
              </button>
              <button onClick={applyFilters} className="btn btn-primary flex-1">
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
              <span className="text-sm text-[var(--violet-700)]">
                {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""} active
              </span>
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
              {appliedFilters.status && (
                <span className="chip text-xs bg-[var(--violet-100)] text-[var(--violet-700)]">
                  Status: {appliedFilters.status}
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
              {(appliedFilters.minTotal || appliedFilters.maxTotal) && (
                <span className="chip text-xs bg-[var(--violet-100)] text-[var(--violet-700)]">
                  ${appliedFilters.minTotal || "0"} - ${appliedFilters.maxTotal || "..."}
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
                <svg
                  className="w-8 h-8 text-[var(--gray-400)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="text-h4 text-[var(--gray-700)] mb-2">
                {activeFilterCount > 0 ? "No orders match your filters" : "No orders yet"}
              </h3>
              <p className="text-sm text-[var(--gray-500)]">
                {activeFilterCount > 0
                  ? "Try adjusting your filters to see more results"
                  : "Your order history will appear here after you make a purchase"}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="btn btn-outline mt-4"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {displayedOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [orderRating, setOrderRating] = useState(order.rating || null);
  const date = new Date(order.created_at || order.createdAt);
  const totalCents = order.total_cents || order.totalCents || 0;
  const tipCents = order.tip_cents || order.tipCents || 0;
  const subtotalCents = order.subtotal_cents || order.subtotalCents || totalCents - tipCents;
  const total = totalCents / 100;
  const vendorName = order.vendor?.name || "Unknown Vendor";
  const items = order.line_items || [];
  const refundStatus = order.refundStatus || order.refund_status;
  const refundAmountCents = order.refundAmountCents || order.refund_amount_cents || 0;
  const paymentStatus = order.payment_status || order.paymentStatus;
  const isRated = order.is_rated || order.isRated || orderRating !== null;
  const canRate = paymentStatus === "succeeded" && !isRated;

  const statusColors = {
    pending: "bg-[var(--warning)]/10 text-[var(--warning)]",
    confirmed: "bg-[var(--info)]/10 text-[var(--info)]",
    completed: "bg-[var(--success)]/10 text-[var(--success)]",
    cancelled: "bg-[var(--gray-100)] text-[var(--gray-600)]",
  };

  return (
    <div className="card bg-white overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-center gap-3">
          {/* Vendor Image */}
          <div className="w-12 h-12 rounded-full bg-[var(--gray-100)] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {order.vendor?.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={order.vendor.image_url}
                alt={vendorName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-semibold text-[var(--gray-600)]">
                {vendorName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-[var(--foreground)] truncate">
                {vendorName}
              </p>
              <p className="font-semibold text-[var(--foreground)]">
                ${total.toFixed(2)}
              </p>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm text-[var(--gray-500)]">
                {items.length} item{items.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`chip text-xs px-2 py-0.5 ${
                    statusColors[order.status] || statusColors.pending
                  }`}
                >
                  {order.status}
                </span>
                {refundStatus && refundStatus !== "none" && (
                  <span className="chip text-xs px-2 py-0.5 bg-[var(--amber-500)]/10 text-[var(--amber-600)]">
                    {refundStatus === "full_refund" ? "Refunded" : "Partial Refund"}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-[var(--gray-400)] mt-1">
              {date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
          <svg
            className={`w-5 h-5 text-[var(--gray-400)] transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--gray-100)] p-4 bg-[var(--gray-50)]">
          {/* Line Items */}
          <div className="mb-4">
            <p className="text-sm font-medium text-[var(--gray-700)] mb-2">Items</p>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 bg-white p-3 rounded-lg"
                >
                  {item.product?.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.product.images[0]}
                      alt={item.product?.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {item.product?.name || "Unknown"}
                    </p>
                    <p className="text-xs text-[var(--gray-500)]">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold text-sm">
                    $
                    {(
                      ((item.price_cents || item.priceCents) / 100) *
                      item.quantity
                    ).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg p-3">
            <p className="text-sm font-medium text-[var(--gray-700)] mb-2">
              Order Summary
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--gray-600)]">Subtotal</span>
                <span>${(subtotalCents / 100).toFixed(2)}</span>
              </div>
              {tipCents > 0 && (
                <div className="flex justify-between">
                  <span className="text-[var(--gray-600)]">Tip</span>
                  <span className="text-[var(--success)]">
                    +${(tipCents / 100).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-2 border-t border-[var(--gray-100)]">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              {refundStatus && refundStatus !== "none" && refundAmountCents > 0 && (
                <div className="flex justify-between text-[var(--amber-600)] pt-2 border-t border-[var(--gray-100)]">
                  <span>Refunded</span>
                  <span>-${(refundAmountCents / 100).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Rating Section */}
          {showRatingForm ? (
            <div className="mt-4 pt-4 border-t border-[var(--gray-200)]">
              <RatingForm
                orderId={order.id}
                vendorName={vendorName}
                onSuccess={() => {
                  setShowRatingForm(false);
                  setOrderRating({ stars: 5 }); // Mark as rated
                }}
                onCancel={() => setShowRatingForm(false)}
              />
            </div>
          ) : orderRating ? (
            <div className="mt-4 pt-4 border-t border-[var(--gray-200)]">
              <div className="bg-white rounded-lg p-3">
                <p className="text-sm font-medium text-[var(--gray-700)] mb-2">
                  Your Rating
                </p>
                <div className="flex items-center gap-2">
                  <StarRating value={orderRating.stars} readonly size="sm" />
                  <span className="text-sm text-[var(--gray-500)]">
                    ({orderRating.stars}/5)
                  </span>
                </div>
                {orderRating.comment && (
                  <p className="text-sm text-[var(--gray-600)] mt-2 italic">
                    &quot;{orderRating.comment}&quot;
                  </p>
                )}
              </div>
            </div>
          ) : canRate ? (
            <div className="mt-4 pt-4 border-t border-[var(--gray-200)]">
              <button
                onClick={() => setShowRatingForm(true)}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
                Rate This Order
              </button>
            </div>
          ) : null}

          {/* View Vendor Link */}
          {order.vendor?.id && (
            <div className="mt-4 pt-4 border-t border-[var(--gray-200)]">
              <Link
                href={`/vendors/${order.vendor.id}`}
                className="btn btn-outline w-full flex items-center justify-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
                View Vendor
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
