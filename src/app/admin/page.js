"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "../../services/api";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [userGrowthData, setUserGrowthData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState("30");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, revenueRes, userGrowthRes] = await Promise.all([
        api("/api/admin/stats"),
        api(`/api/admin/revenue_over_time?period=${period}`),
        api(`/api/admin/user_growth?period=${period}`),
      ]);
      setStats(statsRes);
      setRevenueData(revenueRes.data || []);
      setUserGrowthData(userGrowthRes.data || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch admin stats", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse-soft">
          <div className="w-12 h-12 rounded-full bg-[var(--violet-200)]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  const COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981"];

  const roleData = stats?.users?.byRole
    ? Object.entries(stats.users.byRole).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

  const orderStatusData = stats?.orders?.byStatus
    ? Object.entries(stats.orders.byStatus).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Admin Dashboard
        </h1>
        <p className="text-[var(--gray-500)] mt-1">
          Platform overview and analytics
        </p>
      </div>

      {/* Period Selector */}
      <div className="mb-6 flex gap-2">
        {["7", "30", "90"].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? "bg-[var(--violet-600)] text-white"
                : "bg-white border border-[var(--gray-200)] text-[var(--gray-700)] hover:bg-[var(--gray-50)]"
            }`}
          >
            {p} Days
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Revenue"
          value={`$${stats?.revenue?.total?.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) || "0.00"}`}
          subtitle={`$${stats?.revenue?.thisMonth?.toFixed(2) || "0.00"} this month`}
          icon={<DollarIcon />}
          color="violet"
        />
        <StatCard
          title="Total Users"
          value={stats?.users?.total?.toLocaleString() || "0"}
          subtitle={`${stats?.users?.newThisMonth || 0} new this month`}
          icon={<UsersIcon />}
          color="cyan"
        />
        <StatCard
          title="Total Orders"
          value={stats?.orders?.total?.toLocaleString() || "0"}
          subtitle={`${stats?.orders?.thisMonth || 0} this month`}
          icon={<OrdersIcon />}
          color="amber"
        />
        <StatCard
          title="Active Vendors"
          value={stats?.vendors?.stripeEnabled?.toLocaleString() || "0"}
          subtitle={`${stats?.vendors?.total || 0} total vendors`}
          icon={<StoreIcon />}
          color="emerald"
        />
      </div>

      {/* Revenue and Growth Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Over Time */}
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4 md:p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Revenue Over Time
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  formatter={(value) => [`$${value.toFixed(2)}`, "Revenue"]}
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString()
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Growth */}
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4 md:p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            User Growth
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString()
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="totalUsers"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                  name="Total Users"
                />
                <Line
                  type="monotone"
                  dataKey="newUsers"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  name="New Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Users by Role */}
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4 md:p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Users by Role
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {roleData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders by Status */}
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4 md:p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Orders by Status
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderStatusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {orderStatusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Revenue Breakdown */}
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4 md:p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Revenue Breakdown
          </h3>
          <div className="space-y-4">
            <StatRow
              label="Total Revenue"
              value={`$${stats?.revenue?.total?.toFixed(2) || "0.00"}`}
            />
            <StatRow
              label="Platform Fees"
              value={`$${stats?.revenue?.platformFees?.toFixed(2) || "0.00"}`}
            />
            <StatRow
              label="Total Refunds"
              value={`$${stats?.revenue?.refunds?.toFixed(2) || "0.00"}`}
              negative
            />
            <StatRow
              label="Avg Order Value"
              value={`$${stats?.revenue?.averageOrder?.toFixed(2) || "0.00"}`}
            />
          </div>
        </div>

        {/* Order Stats */}
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4 md:p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Order Stats
          </h3>
          <div className="space-y-4">
            <StatRow label="Total Orders" value={stats?.orders?.total || 0} />
            <StatRow
              label="Succeeded"
              value={stats?.orders?.byPaymentStatus?.succeeded || 0}
            />
            <StatRow
              label="Failed"
              value={stats?.orders?.byPaymentStatus?.failed || 0}
              negative
            />
            <StatRow
              label="Refunded"
              value={stats?.orders?.byPaymentStatus?.refunded || 0}
            />
          </div>
        </div>

        {/* Product Stats */}
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4 md:p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Product Stats
          </h3>
          <div className="space-y-4">
            <StatRow label="Total Listings" value={stats?.products?.total || 0} />
            <StatRow label="Products" value={stats?.products?.products || 0} />
            <StatRow label="Services" value={stats?.products?.services || 0} />
            <StatRow
              label="Verified Users"
              value={stats?.users?.verified || 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, color }) {
  const colorClasses = {
    violet: "bg-[var(--violet-100)] text-[var(--violet-600)]",
    cyan: "bg-cyan-100 text-cyan-600",
    amber: "bg-amber-100 text-amber-600",
    emerald: "bg-emerald-100 text-emerald-600",
  };

  return (
    <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4 md:p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--gray-500)]">{title}</p>
          <p className="text-2xl font-bold text-[var(--foreground)] mt-1">
            {value}
          </p>
          <p className="text-xs text-[var(--gray-400)] mt-1">{subtitle}</p>
        </div>
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value, negative }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[var(--gray-600)]">{label}</span>
      <span
        className={`font-semibold ${
          negative ? "text-red-600" : "text-[var(--foreground)]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function DollarIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg
      className="w-5 h-5"
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
  );
}

function StoreIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}
