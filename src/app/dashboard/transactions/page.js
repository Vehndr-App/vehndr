"use client";

import AuthGate from "../../../components/AuthGate";
import { getCurrentUser } from "../../../services/auth";
import { api } from "../../../services/api";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

export default function TransactionsPage() {
  return (
    <AuthGate>
      <TransactionsInner />
    </AuthGate>
  );
}

function TransactionsInner() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

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

  // Filter transactions
  const filterTransactions = (transactions) => {
    let filtered = [...transactions];

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(t => {
        const date = new Date(t.created_at || t.createdAt);
        switch (dateFilter) {
          case 'today':
            return date.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return date >= weekAgo;
          case 'month':
            const monthAgo = new Date(now);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return date >= monthAgo;
          case 'year':
            const yearAgo = new Date(now);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            return date >= yearAgo;
          default:
            return true;
        }
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.paymentStatus === statusFilter);
    }

    return filtered.sort((a, b) => 
      new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)
    );
  };

  const filteredTransactions = filterTransactions(orders);

  // Calculate totals
  const totalAmount = filteredTransactions
    .filter(t => t.paymentStatus === 'succeeded')
    .reduce((sum, t) => sum + (t.total_cents || t.totalCents || 0), 0);
  
  const refundedAmount = filteredTransactions
    .filter(t => t.refundStatus && t.refundStatus !== 'none')
    .reduce((sum, t) => sum + (t.refund_amount_cents || t.refundAmountCents || 0), 0);

  // Export to CSV
  const exportToCSV = () => {
    setExporting(true);
    
    try {
      const headers = [
        'Transaction ID',
        'Date',
        'Customer Name',
        'Customer Email',
        'Status',
        'Payment Status',
        'Amount',
        'Platform Fee',
        'Net Amount',
        'Refund Status',
        'Refund Amount',
        'Items'
      ];

      const rows = filteredTransactions.map(t => {
        const total = (t.total_cents || t.totalCents || 0) / 100;
        const fee = (t.application_fee_cents || t.applicationFeeCents || 0) / 100;
        const net = total - fee;
        const refund = (t.refund_amount_cents || t.refundAmountCents || 0) / 100;
        const items = t.line_items?.map(item => 
          `${item.product?.name || 'Unknown'} x${item.quantity}`
        ).join('; ') || '';
        
        return [
          t.id,
          new Date(t.created_at || t.createdAt).toISOString(),
          t.customer?.name || 'Guest',
          t.customer?.email || '',
          t.status,
          t.paymentStatus || t.payment_status || 'pending',
          total.toFixed(2),
          fee.toFixed(2),
          net.toFixed(2),
          t.refundStatus || t.refund_status || 'none',
          refund.toFixed(2),
          `"${items}"`
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export transactions');
    } finally {
      setExporting(false);
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
      {/* Header */}
      <div className="bg-white border-b border-[var(--gray-200)] px-4 pt-12 pb-4 safe-area-top sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="w-10 h-10 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--gray-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-h2">Transactions</h1>
            </div>
            <button
              onClick={exportToCSV}
              disabled={exporting || filteredTransactions.length === 0}
              className="btn btn-secondary flex items-center gap-2 h-10 px-4 text-sm"
            >
              {exporting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              Export CSV
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="chip chip-outlined text-sm border border-[var(--gray-300)] bg-white px-3 py-1.5 rounded-full"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="chip chip-outlined text-sm border border-[var(--gray-300)] bg-white px-3 py-1.5 rounded-full"
            >
              <option value="all">All Status</option>
              <option value="succeeded">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="card bg-white p-4">
              <p className="text-sm text-[var(--gray-500)]">Total Revenue</p>
              <p className="text-h3 text-[var(--success)] mt-1">+${(totalAmount / 100).toFixed(2)}</p>
              <p className="text-xs text-[var(--gray-400)] mt-1">{filteredTransactions.filter(t => t.paymentStatus === 'succeeded').length} transactions</p>
            </div>
            <div className="card bg-white p-4">
              <p className="text-sm text-[var(--gray-500)]">Total Refunds</p>
              <p className="text-h3 text-[var(--error)] mt-1">-${(refundedAmount / 100).toFixed(2)}</p>
              <p className="text-xs text-[var(--gray-400)] mt-1">{filteredTransactions.filter(t => t.refundStatus && t.refundStatus !== 'none').length} refunds</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="px-4">
        <div className="max-w-lg mx-auto">
          {filteredTransactions.length === 0 ? (
            <div className="card bg-white p-8 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-[var(--gray-100)] flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[var(--gray-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
              <h3 className="text-h4 text-[var(--gray-700)] mb-2">No transactions found</h3>
              <p className="text-sm text-[var(--gray-500)]">Transactions will appear here when customers make purchases</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((transaction) => (
                <TransactionCard key={transaction.id} transaction={transaction} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionCard({ transaction }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(transaction.created_at || transaction.createdAt);
  const total = (transaction.total_cents || transaction.totalCents || 0) / 100;
  const fee = (transaction.application_fee_cents || transaction.applicationFeeCents || 0) / 100;
  const net = total - fee;
  const refund = (transaction.refund_amount_cents || transaction.refundAmountCents || 0) / 100;
  const paymentStatus = transaction.paymentStatus || transaction.payment_status || 'pending';
  const refundStatus = transaction.refundStatus || transaction.refund_status;
  const customerName = transaction.customer?.name || 'Guest';
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'succeeded': return 'bg-[var(--success)]/10 text-[var(--success)]';
      case 'pending': return 'bg-[var(--warning)]/10 text-[var(--warning)]';
      case 'failed': return 'bg-[var(--error)]/10 text-[var(--error)]';
      case 'refunded': return 'bg-[var(--gray-200)] text-[var(--gray-600)]';
      default: return 'bg-[var(--gray-100)] text-[var(--gray-600)]';
    }
  };

  return (
    <div className="card bg-white overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            paymentStatus === 'succeeded' ? 'bg-[var(--success)]/10' : 
            paymentStatus === 'failed' ? 'bg-[var(--error)]/10' : 'bg-[var(--gray-100)]'
          }`}>
            {paymentStatus === 'succeeded' ? (
              <svg className="w-5 h-5 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : paymentStatus === 'failed' ? (
              <svg className="w-5 h-5 text-[var(--error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-[var(--gray-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-[var(--foreground)] truncate">{customerName}</p>
              <p className={`font-semibold ${paymentStatus === 'succeeded' ? 'text-[var(--success)]' : 'text-[var(--gray-600)]'}`}>
                {paymentStatus === 'succeeded' ? '+' : ''}${total.toFixed(2)}
              </p>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm text-[var(--gray-500)]">
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <div className="flex items-center gap-2">
                <span className={`chip text-xs px-2 py-0.5 ${getStatusColor(paymentStatus)}`}>
                  {paymentStatus}
                </span>
                {refundStatus && refundStatus !== 'none' && (
                  <span className="chip text-xs px-2 py-0.5 bg-[var(--amber-500)]/10 text-[var(--amber-600)]">
                    {refundStatus === 'full_refund' ? 'Refunded' : 'Partial Refund'}
                  </span>
                )}
              </div>
            </div>
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
          {/* Transaction Details */}
          <div className="space-y-3 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--gray-500)]">Transaction ID</span>
              <span className="font-mono text-xs text-[var(--gray-700)]">{transaction.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--gray-500)]">Customer Email</span>
              <span className="text-[var(--gray-700)]">{transaction.customer?.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--gray-500)]">Order Status</span>
              <span className="text-[var(--gray-700)] capitalize">{transaction.status}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--gray-500)]">Date & Time</span>
              <span className="text-[var(--gray-700)]">
                {date.toLocaleString('en-US', { 
                  month: 'short', day: 'numeric', year: 'numeric',
                  hour: 'numeric', minute: '2-digit'
                })}
              </span>
            </div>
          </div>

          {/* Line Items */}
          {transaction.line_items && transaction.line_items.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-[var(--gray-700)] mb-2">Items</p>
              <div className="space-y-2">
                {transaction.line_items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-[var(--gray-600)]">
                      {item.product?.name || 'Unknown'} × {item.quantity}
                    </span>
                    <span className="text-[var(--gray-700)]">
                      ${((item.price_cents || item.priceCents || 0) / 100 * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Summary */}
          <div className="border-t border-[var(--gray-200)] pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--gray-500)]">Subtotal</span>
              <span className="text-[var(--gray-700)]">${total.toFixed(2)}</span>
            </div>
            {fee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--gray-500)]">Platform Fee</span>
                <span className="text-[var(--error)]">-${fee.toFixed(2)}</span>
              </div>
            )}
            {refund > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--gray-500)]">Refunded</span>
                <span className="text-[var(--error)]">-${refund.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold pt-2 border-t border-[var(--gray-200)]">
              <span className="text-[var(--gray-700)]">Net Amount</span>
              <span className="text-[var(--success)]">${(net - refund).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

