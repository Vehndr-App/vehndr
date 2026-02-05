"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGate from "../../../components/AuthGate";
import { api } from "../../../services/api";
import { getCurrentUser } from "../../../services/auth";

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
  return `$${(offering.priceCents / 100).toFixed(2)}`;
};

export default function RequestsPage() {
  return (
    <AuthGate>
      <RequestsInner />
    </AuthGate>
  );
}

function RequestsInner() {
  const [vendorId, setVendorId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user?.vendorId) {
        setVendorId(null);
        setRequests([]);
        setLoading(false);
        return;
      }
      setVendorId(user.vendorId);
      await fetchRequests(user.vendorId);
      setLoading(false);
    };

    loadData();
  }, []);

  const fetchRequests = async (id) => {
    try {
      const data = await api(`/api/event_bookings?vendor_id=${id}`);
      setRequests(Array.isArray(data) ? data : data?.bookings || []);
    } catch (err) {
      console.error("Failed to fetch requests", err);
      setRequests([]);
    }
  };

  const handleStatusChange = async (bookingId, status) => {
    setActionLoading(bookingId);
    try {
      await api(`/api/event_bookings/${bookingId}`, {
        method: "PATCH",
        body: { status }
      });
      await fetchRequests(vendorId);
    } catch (err) {
      console.error("Failed to update request", err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] pb-24">
      <div className="bg-white border-b border-[var(--gray-100)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <Link href="/dashboard" className="text-sm text-[var(--gray-500)] hover:text-[var(--gray-700)]">
            ← Back to Dashboard
          </Link>
          <h1 className="text-h2 text-[var(--foreground)] mt-3">Event Requests</h1>
          <p className="text-sm text-[var(--gray-500)] mt-1">
            Review and respond to event booking requests.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-h3 text-[var(--foreground)]">Requests</h2>
            <button
              type="button"
              onClick={() => vendorId && fetchRequests(vendorId)}
              className="btn btn-ghost text-sm"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-[var(--gray-500)]">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="text-sm text-[var(--gray-500)]">No requests yet.</div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="card p-4 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">{request.event.name}</p>
                      <p className="text-sm text-[var(--gray-500)]">
                        {new Date(request.event.startDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })} • {request.event.location || "Location TBD"}
                      </p>
                    </div>
                    <span className="chip chip-filled">
                      {request.status}
                    </span>
                  </div>

                  <div className="text-sm text-[var(--gray-600)]">
                    {request.offering.title} • {getOfferingTypeLabel(request.offering.offeringType)}
                    {request.offering.offeringType === "hourly" ? ` • ${request.hours || 0} hrs` : ""}
                    {" • "}
                    {getOfferingPriceLabel(request.offering)}
                  </div>

                  {request.notes && (
                    <p className="text-sm text-[var(--gray-500)]">{request.notes}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/events?eventId=${request.event.id}`}
                      className="btn btn-ghost text-sm"
                    >
                      View Event
                    </Link>
                    {request.status === "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(request.id, "accepted")}
                          disabled={actionLoading === request.id}
                          className="btn btn-gradient px-4 py-2 disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(request.id, "declined")}
                          disabled={actionLoading === request.id}
                          className="btn btn-outline px-4 py-2 disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

