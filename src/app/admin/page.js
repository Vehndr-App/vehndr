"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../../services/api";
import brand, { shadows } from "../../brand/colors";
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

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

function formatCurrency(value) {
  return CURRENCY_FORMATTER.format(Number(value || 0));
}

function formatNumber(value) {
  return NUMBER_FORMATTER.format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return "No activity yet";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeAgo(value) {
  if (!value) return "No activity yet";

  const diffMs = Date.now() - new Date(value).getTime();
  if (diffMs < 60000) return "Just now";
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
  return `${Math.floor(diffMs / 86400000)}d ago`;
}

function formatPercentDelta(value, baselineLabel = "previous period") {
  if (value === null || value === undefined) {
    return `No baseline from ${baselineLabel}`;
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}% vs ${baselineLabel}`;
}

function getLaunchPalette(darkMode) {
  if (darkMode) {
    return {
      shellBackground: `linear-gradient(160deg, ${brand.neutral[900]} 0%, ${brand.neutral[800]} 100%)`,
      shellBorder: brand.neutral[700],
      panelBackground: brand.neutral[900],
      panelBackgroundAlt: brand.neutral[800],
      panelBorder: brand.neutral[700],
      panelShadow: "none",
      rowBackground: brand.neutral[800],
      rowBorder: brand.neutral[700],
      text: brand.neutral.white,
      mutedText: brand.neutral[300],
      subtleText: brand.neutral[400],
      positiveText: brand.accent.mint[500],
      metricTones: {
        violet: {
          background: `linear-gradient(145deg, rgba(124, 58, 237, 0.28) 0%, rgba(91, 33, 182, 0.4) 60%, rgba(76, 29, 149, 0.5) 100%)`,
          border: brand.violet[600],
          accent: "#F5F3FF",
          glow: "0 12px 28px rgba(124, 58, 237, 0.35)",
          subtitle: brand.neutral[200],
        },
        emerald: {
          background:
            "linear-gradient(145deg, rgba(5, 150, 105, 0.26) 0%, rgba(4, 120, 87, 0.38) 70%, rgba(6, 95, 70, 0.45) 100%)",
          border: brand.accent.mint[600],
          accent: "#ECFDF5",
          glow: "0 12px 28px rgba(5, 150, 105, 0.3)",
          subtitle: brand.neutral[200],
        },
        cyan: {
          background:
            "linear-gradient(145deg, rgba(59, 130, 246, 0.28) 0%, rgba(37, 99, 235, 0.4) 70%, rgba(30, 64, 175, 0.48) 100%)",
          border: brand.semantic.info,
          accent: "#EFF6FF",
          glow: "0 12px 28px rgba(59, 130, 246, 0.32)",
          subtitle: brand.neutral[200],
        },
        amber: {
          background:
            "linear-gradient(145deg, rgba(217, 119, 6, 0.28) 0%, rgba(180, 83, 9, 0.4) 70%, rgba(146, 64, 14, 0.48) 100%)",
          border: brand.accent.amber[600],
          accent: "#FFFBEB",
          glow: "0 12px 28px rgba(217, 119, 6, 0.32)",
          subtitle: brand.neutral[200],
        },
      },
    };
  }

  return {
    shellBackground: brand.gradients.warm,
    shellBorder: brand.violet[100],
    panelBackground: brand.surface,
    panelBackgroundAlt: brand.neutral.offWhite,
    panelBorder: brand.violet[100],
    panelShadow: shadows.md,
    rowBackground: brand.neutral.offWhite,
    rowBorder: brand.neutral[200],
    text: brand.text,
    mutedText: brand.neutral[600],
    subtleText: brand.neutral[500],
    positiveText: brand.accent.mint[600],
    metricTones: {
      violet: {
        background: `linear-gradient(145deg, ${brand.violet[50]} 0%, ${brand.violet[100]} 60%, ${brand.violet[200]} 100%)`,
        border: brand.violet[300],
        accent: brand.violet[700],
        glow: "0 10px 22px rgba(124, 58, 237, 0.2)",
        subtitle: brand.violet[800],
      },
      emerald: {
        background: "linear-gradient(145deg, #ECFDF5 0%, #D1FAE5 60%, #A7F3D0 100%)",
        border: "rgba(16, 185, 129, 0.45)",
        accent: brand.accent.mint[600],
        glow: "0 10px 22px rgba(16, 185, 129, 0.18)",
        subtitle: "#065F46",
      },
      cyan: {
        background: "linear-gradient(145deg, #EFF6FF 0%, #DBEAFE 60%, #BFDBFE 100%)",
        border: "rgba(59, 130, 246, 0.45)",
        accent: "#1D4ED8",
        glow: "0 10px 22px rgba(59, 130, 246, 0.2)",
        subtitle: "#1E3A8A",
      },
      amber: {
        background: "linear-gradient(145deg, #FFFBEB 0%, #FEF3C7 60%, #FDE68A 100%)",
        border: "rgba(245, 158, 11, 0.5)",
        accent: brand.accent.amber[600],
        glow: "0 10px 22px rgba(245, 158, 11, 0.2)",
        subtitle: "#92400E",
      },
    },
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [userGrowthData, setUserGrowthData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState("30");
  const [activeTab, setActiveTab] = useState("overview");
  const [launchDarkMode, setLaunchDarkMode] = useState(false);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedPreference = window.localStorage?.getItem("vehndr_launch_dark_mode");
    if (savedPreference) {
      setLaunchDarkMode(savedPreference === "true");
    }
  }, []);

  const toggleLaunchDarkMode = useCallback(() => {
    setLaunchDarkMode((current) => {
      const next = !current;
      if (typeof window !== "undefined") {
        window.localStorage?.setItem("vehndr_launch_dark_mode", String(next));
      }
      return next;
    });
  }, []);

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      if (!silent) setLoading(true);

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
      if (!silent) {
        setError(err.message || "Failed to load dashboard data");
      }
    } finally {
      isFetchingRef.current = false;
      if (!silent) setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab !== "launch") return;

    fetchData({ silent: true });
    const intervalId = window.setInterval(() => {
      fetchData({ silent: true });
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [activeTab, fetchData]);

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

  const COLORS = [
    "var(--violet-500)",
    "var(--info)",
    "var(--amber-500)",
    "var(--error)",
    "var(--mint-500)",
  ];

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Admin Dashboard
        </h1>
        <p className="text-[var(--gray-500)] mt-1">
          Platform overview and analytics
        </p>
      </div>

      <div className="mb-6 inline-flex rounded-xl border border-[var(--gray-200)] bg-white p-1 gap-1">
        <DashboardTabButton
          label="Dashboard"
          active={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
        />
        <DashboardTabButton
          label="Launch Leaderboard"
          active={activeTab === "launch"}
          badge="Public"
          onClick={() => setActiveTab("launch")}
        />
      </div>

      {activeTab === "overview" ? (
        <OverviewDashboard
          period={period}
          setPeriod={setPeriod}
          stats={stats}
          revenueData={revenueData}
          userGrowthData={userGrowthData}
          roleData={roleData}
          orderStatusData={orderStatusData}
          colors={COLORS}
        />
      ) : (
        <LaunchLeaderboard
          launch={stats?.launch || {}}
          darkMode={launchDarkMode}
          onToggleDarkMode={toggleLaunchDarkMode}
        />
      )}
    </div>
  );
}

function DashboardTabButton({ label, active, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-[var(--violet-600)] text-white"
          : "text-[var(--gray-700)] hover:bg-[var(--gray-100)]"
      }`}
    >
      <span className="inline-flex items-center gap-2">
        {label}
        {badge ? (
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full ${
              active ? "bg-white/20 text-white" : "bg-[var(--violet-100)] text-[var(--violet-700)]"
            }`}
          >
            {badge}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function OverviewDashboard({
  period,
  setPeriod,
  stats,
  revenueData,
  userGrowthData,
  roleData,
  orderStatusData,
  colors,
}) {
  return (
    <>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4 md:p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Revenue Over Time
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--violet-500)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--violet-500)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => {
                    const d = new Date(v);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(value) => [`$${value.toFixed(2)}`, "Revenue"]}
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString()
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--violet-500)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4 md:p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            User Growth
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
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
                  stroke="var(--info)"
                  strokeWidth={2}
                  dot={false}
                  name="Total Users"
                />
                <Line
                  type="monotone"
                  dataKey="newUsers"
                  stroke="var(--violet-500)"
                  strokeWidth={2}
                  dot={false}
                  name="New Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4 md:p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Orders by Status
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderStatusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 12 }}
                  width={80}
                />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <div className="bg-white rounded-xl border border-[var(--gray-200)] p-4 md:p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Product Stats
          </h3>
          <div className="space-y-4">
            <StatRow label="Total Listings" value={stats?.products?.total || 0} />
            <StatRow label="Products" value={stats?.products?.products || 0} />
            <StatRow label="Services" value={stats?.products?.services || 0} />
            <StatRow label="Verified Users" value={stats?.users?.verified || 0} />
          </div>
        </div>
      </div>
    </>
  );
}

function LaunchLeaderboard({ launch, darkMode, onToggleDarkMode }) {
  const windowHours = launch?.timeWindow?.hours || 12;
  const todaySales = launch?.todaySales || {};
  const pulse = launch?.pulse || {};
  const vendorHighlights = launch?.vendorHighlights || {};
  const topVendors = launch?.topVendors || [];
  const recentSales = launch?.recentSales || [];
  const palette = getLaunchPalette(darkMode);

  return (
    <div
      className="rounded-2xl border p-3 transition-colors"
      style={{
        background: palette.shellBackground,
        borderColor: palette.shellBorder,
      }}
    >
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border transition-colors hover:opacity-90"
          style={{
            backgroundColor: palette.panelBackground,
            borderColor: palette.panelBorder,
            color: palette.text,
            boxShadow: darkMode ? "none" : shadows.sm,
          }}
        >
          <ThemeToggleIcon />
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </div>

      <div
        className="relative overflow-hidden rounded-3xl text-white p-6 md:p-8 mb-6"
        style={{
          background: brand.gradients.primary,
          boxShadow: shadows.colored,
        }}
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/15 blur-md"></div>
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-black/10 blur-md"></div>
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-white/75">
              Launch Party Leaderboard
            </p>
            <h2 className="text-3xl md:text-4xl font-black mt-2">
              Live Marketplace Momentum
            </h2>
            <p className="text-sm md:text-base text-white/80 mt-3">
              Snapshot for{" "}
              {new Date().toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <LaunchPill
              label={`Sales (${windowHours}h)`}
              value={formatNumber(todaySales.count)}
            />
            <LaunchPill
              label={`Revenue (${windowHours}h)`}
              value={formatCurrency(todaySales.total)}
            />
            <LaunchPill
              label="Active Vendors"
              value={formatNumber(todaySales.activeVendors)}
            />
            <LaunchPill
              label="Last Hour"
              value={`${formatNumber(pulse.lastHourSalesCount)} sales`}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <LaunchMetricCard
          title={`Checkout Count (${windowHours}h)`}
          value={formatNumber(todaySales.count)}
          subtitle={formatPercentDelta(
            pulse.salesVsPreviousWindowPct,
            `previous ${windowHours}h`
          )}
          color="violet"
          palette={palette}
        />
        <LaunchMetricCard
          title={`Revenue (${windowHours}h)`}
          value={formatCurrency(todaySales.total)}
          subtitle={formatPercentDelta(
            pulse.revenueVsPreviousWindowPct,
            `previous ${windowHours}h`
          )}
          color="emerald"
          palette={palette}
        />
        <LaunchMetricCard
          title={`Average Ticket (${windowHours}h)`}
          value={formatCurrency(todaySales.averageOrder)}
          subtitle={`${formatNumber(todaySales.uniqueCustomers)} unique buyers`}
          color="cyan"
          palette={palette}
        />
        <LaunchMetricCard
          title="Averaging one sale every"
          value={
            pulse.averageMinutesBetweenSales !== null &&
            pulse.averageMinutesBetweenSales !== undefined
              ? `${pulse.averageMinutesBetweenSales} minute${
                  Number(pulse.averageMinutesBetweenSales) === 1 ? "" : "s"
                }`
              : "-- minutes"
          }
          subtitle={`${formatNumber(pulse.lastHourSalesCount)} sales in last hour`}
          color="amber"
          palette={palette}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div
          className="lg:col-span-6 rounded-xl border p-4 md:p-6 lg:min-h-[390px]"
          style={{
            backgroundColor: palette.panelBackground,
            borderColor: palette.panelBorder,
            boxShadow: palette.panelShadow,
          }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <h3 className="text-lg font-semibold" style={{ color: palette.text }}>
              Top Vendors (Last 12 Hours)
            </h3>
            <p className="text-xs" style={{ color: palette.mutedText }}>
              Ranked by completed sales count
            </p>
          </div>
          {topVendors.length > 0 ? (
            <div className="space-y-2">
              {topVendors.map((vendor, index) => (
                <LeaderboardRow
                  key={vendor.vendorId || `${vendor.vendorName}-${index}`}
                  vendor={vendor}
                  rank={index + 1}
                  palette={palette}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: palette.mutedText }}>
              Leaderboard will fill in as sales come through.
            </p>
          )}
        </div>

        <div
          className="lg:col-span-3 rounded-xl border p-4 md:p-6 lg:min-h-[390px]"
          style={{
            backgroundColor: palette.panelBackgroundAlt,
            borderColor: palette.panelBorder,
            boxShadow: palette.panelShadow,
          }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <h3 className="text-lg font-semibold" style={{ color: palette.text }}>
              Live Sales Feed
            </h3>
            <p className="text-xs" style={{ color: palette.mutedText }}>
              Last {recentSales.length} successful checkouts in the past 12h
            </p>
          </div>
          {recentSales.length > 0 ? (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {recentSales.map((sale) => (
                <RecentSaleCard key={sale.id} sale={sale} palette={palette} />
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: palette.mutedText }}>
              Sales activity will appear here in real time.
            </p>
          )}
        </div>

        <div className="lg:col-span-3 space-y-4">
          <LaunchHighlightCard
            title="Total Vendors"
            value={formatNumber(vendorHighlights.totalVendors)}
            subtitle={`${formatNumber(todaySales.activeVendors)} active in the last ${windowHours}h`}
            meta={`${formatNumber(vendorHighlights.stripeReadyVendors)} ready to take payments`}
            palette={palette}
            accent="violet"
          />
          <LaunchHighlightCard
            title="Most Popular Vendor"
            value={launch?.mostPopularVendor?.vendorName || "No vendor activity yet"}
            subtitle={
              launch?.mostPopularVendor
                ? `${formatNumber(launch.mostPopularVendor.ordersCount)} sales in the last ${windowHours}h`
                : "Waiting for launch-day checkouts"
            }
            meta={
              launch?.mostPopularVendor?.lastSaleAt
                ? `Last sale ${formatTimeAgo(launch.mostPopularVendor.lastSaleAt)}`
                : null
            }
            palette={palette}
            accent="mint"
          />
          <LaunchHighlightCard
            title="Most Recent Vendor"
            value={launch?.mostRecentVendor?.name || "No new vendors in the last 12h"}
            subtitle={
              launch?.mostRecentVendor
                ? `Joined ${formatDateTime(launch.mostRecentVendor.createdAt)}`
                : "New signups will show up here"
            }
            meta={
              launch?.mostRecentVendor?.categories?.length
                ? launch.mostRecentVendor.categories.slice(0, 2).join(" · ")
                : null
            }
            palette={palette}
            accent="coral"
          />
        </div>
      </div>
    </div>
  );
}

function LaunchPill({ label, value }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/15 px-3 py-2 min-w-28">
      <p className="text-[11px] uppercase tracking-wide text-white/75">{label}</p>
      <p className="text-base md:text-lg font-bold text-white mt-1">{value}</p>
    </div>
  );
}

function LaunchMetricCard({ title, value, subtitle, color, palette }) {
  const tone = palette.metricTones[color] || {
    background: palette.panelBackground,
    border: palette.panelBorder,
    accent: palette.text,
    glow: palette.panelShadow,
    subtitle: palette.mutedText,
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl border p-4"
      style={{
        background: tone.background,
        borderColor: tone.border,
        boxShadow: tone.glow || palette.panelShadow,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: tone.border }}
      />
      <div
        className="pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full opacity-25"
        style={{ backgroundColor: tone.accent }}
      />
      <p className="relative text-xs uppercase tracking-wide" style={{ color: tone.subtitle }}>
        {title}
      </p>
      <p className="relative text-3xl font-black mt-2 leading-none" style={{ color: tone.accent }}>
        {value}
      </p>
      <p className="relative text-xs mt-2" style={{ color: tone.subtitle }}>
        {subtitle}
      </p>
    </div>
  );
}

function LaunchHighlightCard({
  title,
  value,
  subtitle,
  meta,
  palette,
  accent = "violet",
}) {
  const accentMap = {
    violet: brand.violet[500],
    mint: brand.accent.mint[500],
    coral: brand.accent.coral[500],
    amber: brand.accent.amber[500],
  };
  const accentColor = accentMap[accent] || brand.violet[500];

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        backgroundColor: palette.panelBackground,
        borderColor: palette.panelBorder,
        boxShadow: palette.panelShadow,
        borderLeftWidth: 4,
        borderLeftColor: accentColor,
      }}
    >
      <p className="text-xs uppercase tracking-wide" style={{ color: palette.mutedText }}>
        {title}
      </p>
      <p className="text-lg font-semibold mt-2" style={{ color: palette.text }}>
        {value}
      </p>
      <p className="text-sm mt-1" style={{ color: palette.mutedText }}>
        {subtitle}
      </p>
      {meta && (
        <p className="text-xs mt-2" style={{ color: palette.subtleText }}>
          {meta}
        </p>
      )}
    </div>
  );
}

function LeaderboardRow({ vendor, rank, palette }) {
  const rankStyles = {
    1: { backgroundColor: brand.accent.amber[500], color: brand.neutral.white },
    2: { backgroundColor: brand.neutral[200], color: brand.neutral[700] },
    3: { backgroundColor: brand.accent.coral[500], color: brand.neutral.white },
  };
  const fallbackRankStyle = {
    backgroundColor: palette.rowBackground,
    color: palette.mutedText,
  };

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
      style={{
        borderColor: palette.rowBorder,
        backgroundColor: palette.rowBackground,
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
          style={rankStyles[rank] || fallbackRankStyle}
        >
          {rank}
        </div>
        <div className="min-w-0">
          <p className="font-semibold truncate" style={{ color: palette.text }}>
            {vendor.vendorName}
          </p>
          <p className="text-xs" style={{ color: palette.subtleText }}>
            {vendor.lastSaleAt
              ? `Last sale ${formatTimeAgo(vendor.lastSaleAt)}`
              : "No recent sale timestamp"}
          </p>
        </div>
      </div>
      <div className="text-right text-sm">
        <p className="text-xs" style={{ color: palette.subtleText }}>
          Sales
        </p>
        <p className="font-semibold" style={{ color: palette.text }}>
          {formatNumber(vendor.ordersCount)}
        </p>
      </div>
    </div>
  );
}

function RecentSaleCard({ sale, palette }) {
  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={{
        borderColor: palette.rowBorder,
        backgroundColor: palette.rowBackground,
      }}
    >
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold truncate" style={{ color: palette.text }}>
          {sale.vendorName || "Unknown vendor"}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 mt-1">
        <p className="text-xs truncate" style={{ color: palette.subtleText }}>
          {sale.customerName || "Guest checkout"}
        </p>
        <p className="text-xs" style={{ color: palette.subtleText }}>
          {formatTimeAgo(sale.createdAt)}
        </p>
      </div>
    </div>
  );
}

function ThemeToggleIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"
      />
    </svg>
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
