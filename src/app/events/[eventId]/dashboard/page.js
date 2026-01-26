"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../contexts/AuthContext";
import AuthGate from "../../../../components/AuthGate";
import { api } from "../../../../services/api";
import Link from "next/link";
import { getVendorPlaceholderImage } from "../../../../utils/placeholderImages";

export default function EventDashboardPage() {
  return (
    <AuthGate allowedRoles={["coordinator"]}>
      <EventDashboardInner />
    </AuthGate>
  );
}

function EventDashboardInner() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [recommendedVendors, setRecommendedVendors] = useState([]);
  const [vendorRequests, setVendorRequests] = useState([]);
  const [availableVendors, setAvailableVendors] = useState([]);
  const [offeringsByVendor, setOfferingsByVendor] = useState({});
  const [activeVendorId, setActiveVendorId] = useState("");
  const [selectedOfferingId, setSelectedOfferingId] = useState("");
  const [requestHours, setRequestHours] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [requestError, setRequestError] = useState(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const vendorScrollRef = useRef(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  useEffect(() => {
    if (user && user.role === 'coordinator') {
      fetchEventDashboard();
      fetchRecommendedVendors();
      fetchVendorRequests();
      fetchAvailableVendors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, params.eventId]);

  const fetchEventDashboard = async () => {
    setLoading(true);
    try {
      const data = await api(`/api/events/${params.eventId}/dashboard`);
      setEvent(data.event);
      setVendors(data.vendors || []);
      setTotalSales(data.totalSales || 0);
    } catch (err) {
      console.error("Failed to fetch event dashboard", err);
      setError(err?.details?.error || "Failed to load event dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendedVendors = async () => {
    try {
      const data = await api(`/api/events/${params.eventId}/recommended_vendors`);
      setRecommendedVendors(data.vendors || []);
    } catch (err) {
      console.error("Failed to fetch recommended vendors", err);
    }
  };

  const fetchVendorRequests = async () => {
    try {
      const data = await api(`/api/event_bookings?event_id=${params.eventId}`);
      setVendorRequests(Array.isArray(data) ? data : data?.bookings || []);
    } catch (err) {
      console.error("Failed to fetch vendor requests", err);
      setVendorRequests([]);
    }
  };

  const fetchAvailableVendors = async () => {
    try {
      const data = await api("/api/vendors");
      const vendorsList = Array.isArray(data) ? data : data?.vendors || [];
      setAvailableVendors(vendorsList);
    } catch (err) {
      console.error("Failed to fetch vendors", err);
      setAvailableVendors([]);
    }
  };

  const fetchVendorOfferings = async (vendorId) => {
    if (!vendorId) return;
    try {
      const data = await api(`/api/vendors/${vendorId}/offerings`);
      const vendorOfferings = Array.isArray(data) ? data : data?.offerings || [];
      setOfferingsByVendor((prev) => ({ ...prev, [vendorId]: vendorOfferings }));
    } catch (err) {
      console.error("Failed to fetch vendor offerings", err);
      setOfferingsByVendor((prev) => ({ ...prev, [vendorId]: [] }));
    }
  };

  const formatCurrency = (cents) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return 'bg-[var(--violet-100)] text-[var(--violet-700)]';
      case 'active':
        return 'bg-[var(--mint-500)]/10 text-[var(--mint-600)]';
      case 'past':
        return 'bg-[var(--gray-100)] text-[var(--gray-700)]';
      default:
        return 'bg-[var(--gray-100)] text-[var(--gray-700)]';
    }
  };

  const getRequestStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'accepted':
        return 'bg-[var(--mint-500)]/10 text-[var(--mint-600)]';
      case 'pending':
      case 'requested':
        return 'bg-[var(--amber-500)]/10 text-[var(--amber-600)]';
      case 'declined':
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'cancelled':
        return 'bg-[var(--gray-100)] text-[var(--gray-700)]';
      default:
        return 'bg-[var(--amber-500)]/10 text-[var(--amber-600)]';
    }
  };

  const getRequestStatusLabel = (status) => {
    switch (status) {
      case 'approved':
      case 'accepted':
        return 'Approved';
      case 'pending':
        return 'Pending';
      case 'requested':
        return 'Requested';
      case 'declined':
      case 'rejected':
        return 'Declined';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status || 'Pending';
    }
  };

  const getOfferingTypeLabel = (type) => {
    switch (type) {
      case "hourly":
        return "Hourly (Book Vendor)";
      case "flat_booth":
        return "Flat Booth";
      case "trade":
        return "Trade for Exposure";
      case "free_with_sales":
        return "Free + Sales Allowed";
      case "package":
        return "Package";
      default:
        return "Offering";
    }
  };

  const getOfferingPriceLabel = (offering) => {
    if (!offering) return "";
    if (offering.offeringType === "trade") return "Trade";
    if (offering.offeringType === "free_with_sales") return "Free";
    return formatCurrency(offering.priceCents);
  };

  const activeVendor = availableVendors.find((vendor) => vendor.id === activeVendorId);
  const activeOfferings = offeringsByVendor[activeVendorId] || [];
  const activeOffering = activeOfferings.find((offering) => offering.id === selectedOfferingId);
  const isSelectionIncomplete = !activeVendorId
    || !selectedOfferingId
    || (activeOffering?.offeringType === "hourly" && !requestHours);
  const handleVendorScroll = (direction) => {
    const container = vendorScrollRef.current;
    if (!container) return;
    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({ left: scrollAmount * direction, behavior: "smooth" });
  };

  const closeRequestModal = () => {
    setIsRequestModalOpen(false);
    setActiveVendorId("");
    setSelectedOfferingId("");
    setRequestHours("");
    setRequestNote("");
    setRequestError(null);
  };

  const handleRequestVendor = async () => {
    if (isSelectionIncomplete) return;

    setRequestLoading(true);
    setRequestError(null);

    try {
      await api("/api/event_bookings", {
        method: "POST",
        body: {
          event_id: params.eventId,
          vendor_id: activeVendorId,
          vendor_offering_id: selectedOfferingId,
          hours: activeOffering?.offeringType === "hourly" ? Number(requestHours) || null : null,
          notes: requestNote || null
        }
      });

      await fetchVendorRequests();
      setIsRequestModalOpen(false);
      setActiveVendorId("");
      setSelectedOfferingId("");
      setRequestHours("");
      setRequestNote("");
    } catch (err) {
      console.error("Failed to request vendor", err);
      setRequestError(err?.details?.error || err?.details?.errors?.join(", ") || "Failed to send request.");
    } finally {
      setRequestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-[var(--gray-200)] border-t-[var(--violet-600)] mb-3 sm:mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600 font-medium">Loading event dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-4xl sm:text-5xl mb-3 sm:mb-4">⚠</div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Unable to Load Dashboard</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">{error}</p>
          <Link
            href="/coordinator-dashboard"
            className="btn btn-gradient min-h-[44px] px-6 py-3 text-sm sm:text-base"
          >
            Back to My Events
          </Link>
        </div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-[var(--background)] pb-24">
      {/* Header Section */}
      <div className="bg-white border-b border-[var(--gray-100)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Breadcrumb */}
          <div className="mb-4">
            <Link
              href="/coordinator-dashboard"
              className="text-sm sm:text-base text-gray-500 hover:text-gray-700 transition-colors inline-flex items-center gap-2 min-h-[44px] py-2"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">Back to My Events</span>
            </Link>
          </div>

          {/* Event Title and Status - Mobile-First Stack Layout */}
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Total Sales Card - Mobile First (appears at top on mobile) */}
            <div className="order-1 sm:order-2 card-gradient">
              <div className="flex items-center justify-between sm:flex-col sm:items-start">
                <div className="flex-1">
                  <div className="text-xs sm:text-sm font-medium opacity-90 mb-1 sm:mb-2">Total Event Sales</div>
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-bold">{formatCurrency(totalSales)}</div>
                </div>
                <div className="text-right sm:text-left sm:w-full">
                  <div className="text-xs sm:text-sm opacity-90 mt-0 sm:mt-2 whitespace-nowrap sm:whitespace-normal">
                    {vendors.length} vendor{vendors.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Event Info - Second on mobile */}
            <div className="order-2 sm:order-1 flex-1 min-w-0">
              <h1 className="text-h1 text-[var(--foreground)] mb-3 leading-tight">{event.name}</h1>

              {/* Status Badge */}
              <div className="mb-3">
                <span className={`chip ${getStatusColor(event.status)}`}>
                  {event.status}
                </span>
              </div>

              <div className="mb-4">
                <Link
                  href={`/events/${event.id}/edit`}
                  className="btn btn-ghost text-sm"
                >
                  Edit Event
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6h6m-6 6h6m-6 6h6M6 6h.01M6 12h.01M6 18h.01" />
                  </svg>
                </Link>
              </div>

              {/* Date and Location */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4 text-sm sm:text-base text-[var(--gray-600)]">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">{formatDate(event.startDate)}</span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">{event.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Column - Vendor Performance */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* Vendor Performance Section */}
            <section>
              <div className="section-header">
                <h2 className="text-h3 text-[var(--foreground)]">Vendor Performance</h2>
                <button
                  onClick={fetchEventDashboard}
                  className="btn btn-ghost text-sm"
                  aria-label="Refresh vendor performance data"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              {vendors.length === 0 ? (
                vendorRequests.length === 0 ? (
                  <div className="card text-center">
                    <svg className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-[var(--gray-300)] mb-3 sm:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <h3 className="text-h4 text-[var(--foreground)] mb-2">No Vendors Yet</h3>
                    <p className="text-sm sm:text-base text-[var(--gray-500)]">Add vendors to this event to start tracking sales</p>
                  </div>
                ) : (
                  <div className="card p-0 divide-y divide-[var(--gray-100)] overflow-hidden">
                    {vendorRequests.map((request) => {
                      const vendor = request.vendor || {};
                      const hasImage = vendor.heroImage && vendor.heroImage.length > 0;
                      const placeholderImage = getVendorPlaceholderImage(vendor.categories, vendor.id || request.id);
                      const offeringType = request.offering?.offeringType;
                      const offeringTitle = request.offering?.title;
                      const offeringPrice = request.offering?.priceCents;
                      const offeringTypeLabel = getOfferingTypeLabel(offeringType);

                      return (
                        <div key={request.id} className="p-4 sm:p-6 relative">
                          <span className={`chip absolute top-4 right-4 ${getRequestStatusColor(request.status)}`}>
                            {getRequestStatusLabel(request.status)}
                          </span>
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-[var(--gray-100)] flex-shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={hasImage ? vendor.heroImage : placeholderImage}
                                alt={vendor.name || "Vendor"}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              {vendor.id ? (
                                <Link
                                  href={`/vendors/${vendor.id}`}
                                  className="text-base sm:text-lg font-semibold text-[var(--foreground)] hover:text-[var(--violet-600)] transition-colors inline-flex items-center min-h-[44px]"
                                >
                                  {vendor.name}
                                </Link>
                              ) : (
                                <div className="text-base sm:text-lg font-semibold text-[var(--foreground)]">
                                  {vendor.name || "Vendor"}
                                </div>
                              )}
                              {offeringTitle && (
                                <div className="text-sm text-[var(--gray-500)]">
                                  {offeringTitle} • {offeringTypeLabel}
                                  {offeringType === "hourly" ? ` • ${request.hours || 0} hrs` : ""}
                                </div>
                              )}
                              {typeof offeringPrice === "number" && (
                                <div className="text-sm text-[var(--gray-500)]">
                                  {getOfferingPriceLabel({ offeringType, priceCents: offeringPrice })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="card p-0 divide-y divide-[var(--gray-100)] overflow-hidden">
                  {vendors.map((vendor, index) => (
                    <div key={vendor.id} className="p-4 sm:p-6 hover:bg-[var(--gray-50)] transition-colors active:bg-[var(--gray-100)]">
                      {/* Mobile-First Stack Layout */}
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Rank Badge */}
                        <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-base sm:text-lg ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-md' :
                          index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-md' :
                          index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          #{index + 1}
                        </div>

                        {/* Vendor Info + Sales (Stacked on mobile) */}
                        <div className="flex-1 min-w-0">
                          {/* Vendor Name and Link */}
                          <Link
                            href={`/vendors/${vendor.id}`}
                            className="text-base sm:text-lg font-semibold text-[var(--foreground)] hover:text-[var(--violet-600)] transition-colors inline-block mb-1 min-h-[44px] flex items-center"
                          >
                            {vendor.name}
                          </Link>

                          {/* Sales Amount - Prominent on mobile */}
                          <div className="mb-2 sm:mb-3">
                            <div className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">{formatCurrency(vendor.totalSales)}</div>
                            <div className="text-xs sm:text-sm text-[var(--gray-500)] mt-0.5">Total Sales</div>
                          </div>

                          {/* Description */}
                          {vendor.description && (
                            <p className="text-sm sm:text-base text-[var(--gray-600)] mb-2 line-clamp-2 sm:line-clamp-1">{vendor.description}</p>
                          )}

                          {/* Location */}
                          {vendor.location && (
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[var(--gray-500)]">
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              <span className="font-medium">{vendor.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Vendor Requests */}
            <section>
              <div className="section-header">
                <h2 className="text-h3 text-[var(--foreground)]">Vendors</h2>
                <button
                  onClick={fetchVendorRequests}
                  className="btn btn-ghost text-sm"
                  aria-label="Refresh vendor requests"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              <div className="card mb-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-[var(--gray-500)] font-semibold uppercase tracking-wide">Vendor</label>
                    <div className="mt-2">
                      {availableVendors.length === 0 ? (
                        <div className="card text-center text-sm text-[var(--gray-500)]">
                          No vendors available yet.
                        </div>
                      ) : (
                        <div className="relative">
                          <button
                            type="button"
                            aria-label="Scroll vendors left"
                            onClick={() => handleVendorScroll(-1)}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 h-9 w-9 flex items-center justify-center rounded-full bg-white shadow-[var(--shadow-card)] ring-1 ring-[var(--gray-200)] text-[var(--gray-600)] hover:text-[var(--violet-600)] hover:ring-[var(--violet-300)] transition"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="15 18 9 12 15 6" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            aria-label="Scroll vendors right"
                            onClick={() => handleVendorScroll(1)}
                            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 h-9 w-9 flex items-center justify-center rounded-full bg-white shadow-[var(--shadow-card)] ring-1 ring-[var(--gray-200)] text-[var(--gray-600)] hover:text-[var(--violet-600)] hover:ring-[var(--violet-300)] transition"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </button>
                          <div ref={vendorScrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 px-2">
                            {availableVendors.map((vendor) => {
                              const isSelected = vendor.id === activeVendorId;
                              const hasImage = vendor.heroImage && vendor.heroImage.length > 0;
                              const placeholderImage = getVendorPlaceholderImage(vendor.categories, vendor.id);

                              return (
                                <button
                                  key={vendor.id}
                                  type="button"
                                  aria-pressed={isSelected}
                                  aria-label={`Request vendor ${vendor.name}`}
                                  onClick={() => {
                                    const value = vendor.id;
                                    setActiveVendorId(value);
                                    setSelectedOfferingId("");
                                    setRequestHours("");
                                    setRequestNote("");
                                    setRequestError(null);
                                    fetchVendorOfferings(value);
                                    setIsRequestModalOpen(true);
                                  }}
                                  className="group flex-shrink-0 w-[190px] sm:w-[210px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet-500)] rounded-[var(--radius-xl)]"
                                >
                                  <div
                                    className={`rounded-[var(--radius-xl)] overflow-hidden bg-white transition-all ${
                                      isSelected
                                        ? "ring-2 ring-[var(--violet-500)] shadow-[var(--shadow-card-hover)]"
                                        : "ring-1 ring-[var(--gray-200)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:ring-[var(--violet-300)]"
                                    }`}
                                  >
                                    <div className="relative aspect-[4/3]">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={hasImage ? vendor.heroImage : placeholderImage}
                                        alt={vendor.name}
                                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                      />
                                    </div>
                                    <div className="p-3">
                                      <div className="font-semibold text-sm text-[var(--gray-900)] line-clamp-1 group-hover:text-[var(--violet-600)] transition-colors">
                                        {vendor.name}
                                      </div>
                                      {vendor.description && (
                                        <div className="text-xs text-[var(--gray-500)] line-clamp-1 mt-1">
                                          {vendor.description}
                                        </div>
                                      )}
                                      {vendor.location && (
                                        <div className="flex items-center gap-1 mt-1 text-[11px] text-[var(--gray-400)]">
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                            <circle cx="12" cy="10" r="3"/>
                                          </svg>
                                          {vendor.location}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {requestError && (
                    <div className="text-sm text-red-600">{requestError}</div>
                  )}
                </div>
              </div>

              <div className="card p-0 divide-y divide-[var(--gray-100)] overflow-hidden">
                {vendorRequests.length === 0 ? (
                  <div className="p-6 text-sm text-[var(--gray-500)] text-center">
                    No vendor requests yet. Send one to get started.
                  </div>
                ) : (
                  vendorRequests.map((request) => (
                    <div key={request.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <Link
                          href={`/vendors/${request.vendor.id}`}
                          className="font-semibold text-[var(--foreground)] hover:text-[var(--violet-600)] transition-colors"
                        >
                          {request.vendor.name}
                        </Link>
                        <div className="text-sm text-[var(--gray-500)]">
                          {request.offering.title} • {getOfferingTypeLabel(request.offering.offeringType)}
                          {request.offering.offeringType === "hourly" ? ` • ${request.hours || 0} hrs` : ""}
                        </div>
                        <div className="text-sm text-[var(--gray-500)]">
                          {getOfferingPriceLabel(request.offering)}
                        </div>
                      </div>
                      <span className={`chip ${getRequestStatusColor(request.status)}`}>
                        {getRequestStatusLabel(request.status)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Right Column - Recommended Vendors */}
          <div className="lg:col-span-1">
            <section className="lg:sticky lg:top-4">
              <h2 className="text-h3 text-[var(--foreground)] mb-4 sm:mb-6">Recommended Vendors</h2>

              <div className="space-y-3 sm:space-y-4">
                {recommendedVendors.map((vendor) => (
                  <Link
                    key={vendor.id}
                    href={`/vendors/${vendor.id}`}
                    className="card p-0 border border-[var(--gray-200)] hover:border-[var(--violet-400)] transition-all active:scale-[0.98] group overflow-hidden"
                  >
                    {vendor.heroImage && (
                      <div className="w-full h-40 sm:h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={vendor.heroImage}
                          alt={vendor.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                    )}
                    <div className="p-4 sm:p-5">
                      <h3 className="text-base sm:text-lg font-semibold text-[var(--foreground)] group-hover:text-[var(--violet-600)] transition-colors mb-2 leading-snug">
                        {vendor.name}
                      </h3>
                      {vendor.description && (
                        <p className="text-sm sm:text-base text-[var(--gray-600)] line-clamp-2 mb-3">{vendor.description}</p>
                      )}
                      {vendor.location && (
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[var(--gray-500)] mb-3">
                          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          <span className="font-medium">{vendor.location}</span>
                        </div>
                      )}

                      <div className="pt-3 mt-3 border-t border-gray-100">
                        <div className="text-sm sm:text-base text-[var(--violet-600)] font-semibold flex items-center gap-2">
                          View Profile
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}

                {recommendedVendors.length === 0 && (
                  <div className="card text-center border-2 border-dashed border-[var(--gray-200)]">
                    <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-[var(--gray-300)] mb-2 sm:mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-sm sm:text-base text-[var(--gray-500)] font-medium">No recommendations available yet</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close vendor request modal"
            onClick={closeRequestModal}
            className="absolute inset-0 bg-black/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl"
          >
            <div className="p-5 sm:p-6 border-b border-[var(--gray-100)] flex items-center justify-between">
              <div>
                <div className="text-xs text-[var(--gray-500)] uppercase tracking-wide font-semibold">Request Vendor</div>
                <div className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">
                  {activeVendor?.name || "Vendor"}
                </div>
              </div>
              <button
                type="button"
                onClick={closeRequestModal}
                className="h-9 w-9 rounded-full flex items-center justify-center text-[var(--gray-500)] hover:text-[var(--gray-700)] hover:bg-[var(--gray-100)] transition"
                aria-label="Close"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              {activeVendor && (
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-[var(--gray-100)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeVendor.heroImage || getVendorPlaceholderImage(activeVendor.categories, activeVendor.id)}
                      alt={activeVendor.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--foreground)]">{activeVendor.name}</div>
                    {activeVendor.location && (
                      <div className="text-xs text-[var(--gray-500)]">{activeVendor.location}</div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-[var(--gray-500)] font-semibold uppercase tracking-wide">Booking Option</label>
                <select
                  value={selectedOfferingId}
                  onChange={(e) => setSelectedOfferingId(e.target.value)}
                  className="input mt-2"
                  disabled={activeOfferings.length === 0}
                >
                  <option value="">Select offering</option>
                  {activeOfferings.map((offering) => (
                    <option key={offering.id} value={offering.id}>
                      {offering.title} • {getOfferingTypeLabel(offering.offeringType)} ({getOfferingPriceLabel(offering)})
                    </option>
                  ))}
                </select>
                {activeOfferings.length === 0 && (
                  <div className="text-xs text-[var(--gray-500)] mt-2">No offerings available for this vendor.</div>
                )}
              </div>

              {activeOffering?.offeringType === "hourly" && (
                <div>
                  <label className="text-xs text-[var(--gray-500)] font-semibold uppercase tracking-wide">Estimated Hours</label>
                  <input
                    type="number"
                    min="1"
                    value={requestHours}
                    onChange={(e) => setRequestHours(e.target.value)}
                    className="input mt-2"
                    placeholder="e.g. 4"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-[var(--gray-500)] font-semibold uppercase tracking-wide">Notes</label>
                <textarea
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  className="input mt-2 min-h-[120px] py-3"
                  rows={3}
                  placeholder="Share details about load-in, booth size, or schedule."
                />
              </div>

              {requestError && (
                <div className="text-sm text-red-600">{requestError}</div>
              )}
            </div>
            <div className="p-5 sm:p-6 border-t border-[var(--gray-100)] flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                onClick={closeRequestModal}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestVendor}
                disabled={requestLoading || isSelectionIncomplete}
                className="btn btn-gradient px-6 disabled:opacity-50"
              >
                {requestLoading ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
