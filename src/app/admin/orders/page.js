"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "../../../services/api";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Status update modal
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchOrders = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), per_page: "20" });
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      if (paymentStatusFilter) params.append("payment_status", paymentStatusFilter);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const res = await api(`/api/admin/orders?${params.toString()}`);
      setOrders(res.orders || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
      setError(null);
    } catch (err) {
      console.error("Failed to fetch orders", err);
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, paymentStatusFilter, startDate, endDate]);

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOrders(1);
  };

  const openStatusModal = (order) => {
    setUpdatingOrder(order);
    setNewStatus(order.status);
  };

  const closeStatusModal = () => {
    setUpdatingOrder(null);
    setNewStatus("");
  };

  const handleUpdateStatus = async () => {
    if (!updatingOrder || !newStatus) return;

    try {
      setSaving(true);
      const res = await api(`/api/admin/orders/${updatingOrder.id}`, {
        method: "PATCH",
        body: { order: { status: newStatus } },
      });

      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === updatingOrder.id ? res.order : o))
      );
      closeStatusModal();
    } catch (err) {
      console.error("Failed to update order", err);
      alert(err.message || "Failed to update order");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "confirmed":
        return "bg-blue-100 text-blue-700";
      case "completed":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case "succeeded":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "failed":
        return "bg-red-100 text-red-700";
      case "refunded":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Order Management
        </h1>
        <p className="text-[var(--gray-500)] mt-1">
          View and manage all platform orders
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4 mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by customer email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] focus:border-transparent"
            >
              <option value="">All Payments</option>
              <option value="pending">Pending</option>
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-[var(--gray-600)]">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-[var(--gray-600)]">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-[var(--violet-600)] text-white rounded-lg hover:bg-[var(--violet-700)] transition-colors"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setPaymentStatusFilter("");
                setStartDate("");
                setEndDate("");
              }}
              className="px-6 py-2 border border-[var(--gray-200)] rounded-lg text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-[var(--gray-200)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse-soft inline-block">
              <div className="w-8 h-8 rounded-full bg-[var(--violet-200)]"></div>
            </div>
            <p className="text-[var(--gray-500)] mt-2">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-[var(--gray-500)]">
            No orders found
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--gray-50)] border-b border-[var(--gray-200)]">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--gray-700)]">
                      Order ID
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--gray-700)]">
                      Customer
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--gray-700)]">
                      Vendor
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--gray-700)]">
                      Total
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--gray-700)]">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--gray-700)]">
                      Payment
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-[var(--gray-700)]">
                      Date
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-[var(--gray-700)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-[var(--gray-100)] hover:bg-[var(--gray-50)]"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-[var(--gray-600)]">
                          {order.id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-[var(--foreground)]">
                            {order.customerName || "Guest"}
                          </p>
                          <p className="text-sm text-[var(--gray-500)]">
                            {order.customerEmail}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--gray-600)]">
                        {order.vendorName || "Unknown"}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">
                            ${order.total?.toFixed(2)}
                          </p>
                          {order.applicationFeeCents > 0 && (
                            <p className="text-xs text-[var(--gray-400)]">
                              Fee: ${(order.applicationFeeCents / 100).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(
                            order.paymentStatus
                          )}`}
                        >
                          {order.paymentStatus || "pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--gray-500)]">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openStatusModal(order)}
                          className="text-[var(--violet-600)] hover:text-[var(--violet-700)] text-sm font-medium"
                        >
                          Update Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[var(--gray-100)]">
              {orders.map((order) => (
                <div key={order.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-[var(--foreground)]">
                        {order.customerName || "Guest"}
                      </p>
                      <p className="text-sm text-[var(--gray-500)]">
                        {order.customerEmail}
                      </p>
                    </div>
                    <p className="font-semibold text-[var(--foreground)]">
                      ${order.total?.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(
                        order.paymentStatus
                      )}`}
                    >
                      {order.paymentStatus || "pending"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--gray-500)]">
                      {order.vendorName} -{" "}
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => openStatusModal(order)}
                      className="text-[var(--violet-600)] font-medium"
                    >
                      Update
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[var(--gray-200)] flex items-center justify-between">
            <p className="text-sm text-[var(--gray-500)]">
              Showing {orders.length} of {pagination.total} orders
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchOrders(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1 border border-[var(--gray-200)] rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--gray-50)]"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-[var(--gray-600)]">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchOrders(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 border border-[var(--gray-200)] rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--gray-50)]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Update Status Modal */}
      {updatingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-[var(--gray-200)]">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Update Order Status
              </h2>
              <p className="text-sm text-[var(--gray-500)] mt-1">
                Order: {updatingOrder.id.slice(0, 8)}...
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Order Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--gray-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--violet-500)] focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="bg-[var(--gray-50)] rounded-lg p-4">
                <h4 className="text-sm font-medium text-[var(--gray-700)] mb-2">
                  Order Details
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--gray-500)]">Customer:</span>
                    <span>{updatingOrder.customerEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--gray-500)]">Total:</span>
                    <span className="font-semibold">
                      ${updatingOrder.total?.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--gray-500)]">Payment:</span>
                    <span
                      className={`${
                        updatingOrder.paymentStatus === "succeeded"
                          ? "text-green-600"
                          : updatingOrder.paymentStatus === "failed"
                          ? "text-red-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {updatingOrder.paymentStatus || "pending"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--gray-500)]">Items:</span>
                    <span>{updatingOrder.itemsCount}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeStatusModal}
                  className="flex-1 px-4 py-2 border border-[var(--gray-200)] rounded-lg text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={saving || newStatus === updatingOrder.status}
                  className="flex-1 px-4 py-2 bg-[var(--violet-600)] text-white rounded-lg hover:bg-[var(--violet-700)] disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Update Status"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
