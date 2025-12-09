"use client";

import AuthGate from "../../../components/AuthGate";
import { getCurrentUser } from "../../../services/auth";
import { api } from "../../../services/api";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

export default function ReportsPage() {
  return (
    <AuthGate>
      <ReportsInner />
    </AuthGate>
  );
}

function ReportsInner() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');

  const fetchOrders = useCallback(async (vendorId) => {
    try {
      const vendorOrders = await api(`/api/vendors/${vendorId}/orders`);
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
        await fetchOrders(u.vendorId);
      }
      setLoading(false);
    })();
  }, [fetchOrders]);

  // Filter orders by date range
  const filterByDateRange = (transactions) => {
    const now = new Date();
    return transactions.filter(t => {
      const date = new Date(t.created_at || t.createdAt);
      switch (dateRange) {
        case 'week':
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return date >= weekAgo;
        case 'month':
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return date >= monthAgo;
        case 'quarter':
          const quarterAgo = new Date(now);
          quarterAgo.setMonth(quarterAgo.getMonth() - 3);
          return date >= quarterAgo;
        case 'year':
          const yearAgo = new Date(now);
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          return date >= yearAgo;
        default:
          return true;
      }
    });
  };

  const filteredOrders = filterByDateRange(orders);
  const successfulOrders = filteredOrders.filter(o => o.paymentStatus === 'succeeded' || o.payment_status === 'succeeded');
  
  // Calculate metrics
  const totalRevenue = successfulOrders.reduce((sum, o) => sum + (o.total_cents || o.totalCents || 0), 0);
  const totalOrders = successfulOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalRefunds = filteredOrders
    .filter(o => o.refundStatus && o.refundStatus !== 'none')
    .reduce((sum, o) => sum + (o.refund_amount_cents || o.refundAmountCents || 0), 0);
  const platformFees = successfulOrders.reduce((sum, o) => sum + (o.application_fee_cents || o.applicationFeeCents || 0), 0);
  const netRevenue = totalRevenue - totalRefunds - platformFees;

  // Group by day for chart data
  const groupByDay = (transactions) => {
    const groups = {};
    transactions.forEach(t => {
      const date = new Date(t.created_at || t.createdAt);
      const key = date.toISOString().split('T')[0];
      if (!groups[key]) {
        groups[key] = { date: key, revenue: 0, orders: 0 };
      }
      groups[key].revenue += (t.total_cents || t.totalCents || 0);
      groups[key].orders += 1;
    });
    return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
  };

  const dailyData = groupByDay(successfulOrders);
  const maxRevenue = Math.max(...dailyData.map(d => d.revenue), 1);

  // Top products
  const getTopProducts = () => {
    const productMap = {};
    successfulOrders.forEach(order => {
      (order.line_items || []).forEach(item => {
        const productName = item.product?.name || 'Unknown';
        if (!productMap[productName]) {
          productMap[productName] = { name: productName, quantity: 0, revenue: 0 };
        }
        productMap[productName].quantity += item.quantity;
        productMap[productName].revenue += ((item.price_cents || item.priceCents || 0) * item.quantity);
      });
    });
    return Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const topProducts = getTopProducts();

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
            <Link href="/dashboard" className="w-10 h-10 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--gray-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-h2">Reports</h1>
          </div>

          {/* Date Range Selector */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            {[
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
              { value: 'quarter', label: 'Quarter' },
              { value: 'year', label: 'Year' },
              { value: 'all', label: 'All Time' },
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value)}
                className={`chip ${dateRange === option.value ? 'chip-active' : 'chip-filled'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-4 py-4">
        <div className="max-w-lg mx-auto space-y-4">
          {/* Revenue Card */}
          <div className="card-gradient p-5">
            <p className="text-white/70 text-sm">Net Revenue</p>
            <p className="text-currency text-white mt-1">${(netRevenue / 100).toFixed(2)}</p>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/20">
              <div>
                <p className="text-white/60 text-xs">Gross</p>
                <p className="text-white font-semibold">${(totalRevenue / 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs">Refunds</p>
                <p className="text-white font-semibold">-${(totalRefunds / 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs">Fees</p>
                <p className="text-white font-semibold">-${(platformFees / 100).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card bg-white p-4 text-center">
              <p className="text-[var(--gray-500)] text-xs mb-1">Orders</p>
              <p className="text-h3 text-[var(--foreground)]">{totalOrders}</p>
            </div>
            <div className="card bg-white p-4 text-center">
              <p className="text-[var(--gray-500)] text-xs mb-1">Avg Order</p>
              <p className="text-h3 text-[var(--foreground)]">${(avgOrderValue / 100).toFixed(0)}</p>
            </div>
            <div className="card bg-white p-4 text-center">
              <p className="text-[var(--gray-500)] text-xs mb-1">Refund Rate</p>
              <p className="text-h3 text-[var(--foreground)]">
                {totalOrders > 0 
                  ? ((filteredOrders.filter(o => o.refundStatus && o.refundStatus !== 'none').length / totalOrders) * 100).toFixed(0) 
                  : 0}%
              </p>
            </div>
          </div>

          {/* Revenue Chart */}
          {dailyData.length > 0 && (
            <div className="card bg-white p-4">
              <h3 className="text-h4 mb-4">Daily Revenue</h3>
              <div className="flex items-end gap-1 h-32">
                {dailyData.slice(-14).map((day, index) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-[var(--violet-500)] rounded-t-sm transition-all"
                      style={{ 
                        height: `${(day.revenue / maxRevenue) * 100}%`,
                        minHeight: day.revenue > 0 ? '4px' : '0'
                      }}
                    />
                    {index % 2 === 0 && (
                      <p className="text-[9px] text-[var(--gray-400)] mt-1 rotate-45">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Products */}
          {topProducts.length > 0 && (
            <div className="card bg-white p-4">
              <h3 className="text-h4 mb-4">Top Products</h3>
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--violet-100)] flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-[var(--violet-600)]">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-xs text-[var(--gray-500)]">{product.quantity} sold</p>
                    </div>
                    <p className="font-semibold text-sm">${(product.revenue / 100).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredOrders.length === 0 && (
            <div className="card bg-white p-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-[var(--gray-100)] flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[var(--gray-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-h4 text-[var(--gray-700)] mb-2">No data for this period</h3>
              <p className="text-sm text-[var(--gray-500)]">Sales data will appear here once you have orders</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

