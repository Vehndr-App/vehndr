"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../../contexts/AuthContext";
import { getEvent } from "../../../../../services/events";
import { createInquiry, listInquiries } from "../../../../../services/inquiries";
import { listVendors } from "../../../../../services/vendors";
import { getCoordinatorStripeAccount } from "../../../../../services/coordinators";
import { getVendorPlaceholderImage } from "../../../../../utils/placeholderImages";
import { isVendorMarketplaceBookable } from "../../../../../utils/vendorMarketplace";
import MarketplaceComingSoonBadge from "../../../../../components/MarketplaceComingSoonBadge";

const COORDINATOR_TYPES = [
  {
    value: "hiring_vendor",
    label: "Hiring vendors",
    description: "I'm paying vendors to work at my event",
  },
  {
    value: "charges_fees",
    label: "Charging vending fees",
    description: "Vendors pay a fee to sell at my event",
  },
  {
    value: "no_fees",
    label: "Free to vend",
    description: "No fees — vendors join at no cost",
  },
];

function fmtEventDate(startRaw, endRaw) {
  if (!startRaw) return null;
  const parse = (r) => new Date(String(r).includes("T") ? r : `${r}T00:00:00`);
  const fmt = (d) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  try {
    const start = parse(startRaw);
    if (!endRaw || endRaw === startRaw) return fmt(start);
    const end = parse(endRaw);
    if (start.toDateString() === end.toDateString()) return fmt(start);
    return `${fmt(start)} – ${fmt(end)}`;
  } catch {
    return null;
  }
}

function buildMessage(vendor, event, coordinatorType, fields) {
  if (!vendor || !event) return "";
  const datePart = fmtEventDate(event.startDate || event.start_date, event.endDate || event.end_date) ?? "[date TBD]";
  const locationPart = event.streetAddress || event.location || "[location TBD]";
  const attendees = event.attendees;
  const guestPart = attendees ? `approximately ${attendees} guests` : "guests";

  if (coordinatorType === "hiring_vendor") {
    const budgetPart = fields.budget ? `$${Number(fields.budget).toLocaleString()}` : null;
    return [
      `Hi ${vendor.name}!`,
      `I'm organizing "${event.name}" on ${datePart} at ${locationPart} for ${guestPart}.`,
      budgetPart ? `My budget for this is ${budgetPart}.` : null,
      `I'd love to discuss how you can be part of our event — are you available?`,
    ].filter(Boolean).join(" ");
  }

  if (coordinatorType === "charges_fees") {
    const feePart = fields.vendingFee ? `$${Number(fields.vendingFee).toLocaleString()}` : null;
    return [
      `Hi ${vendor.name}!`,
      `I'm hosting "${event.name}" on ${datePart} at ${locationPart}, expecting ${guestPart}.`,
      `I'm looking for vendors to participate.`,
      feePart ? `The vending fee for this event is ${feePart}.` : null,
      `Payments are processed through VEHNDR. Would you be interested in joining?`,
    ].filter(Boolean).join(" ");
  }

  return [
    `Hi ${vendor.name}!`,
    `I'm hosting "${event.name}" on ${datePart} at ${locationPart}, expecting ${guestPart}.`,
    `I'm looking for vendors to participate.`,
    `There are no vending fees for this event — it's free to join.`,
    `Would you be interested?`,
  ].filter(Boolean).join(" ");
}

export default function InviteVendorsPage() {
  const { eventId } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [event, setEvent] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [alreadyInvitedIds, setAlreadyInvitedIds] = useState(() => new Set());
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [coordinatorType, setCoordinatorType] = useState("hiring_vendor");
  const [fields, setFields] = useState({ budget: "", vendingFee: "" });
  const [messageTemplate, setMessageTemplate] = useState("");
  const [messageEdited, setMessageEdited] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/buyer-dashboard/events/${eventId}/invite`)}`);
      return;
    }

    Promise.all([
      getEvent(eventId),
      listVendors(),
      listInquiries().catch(() => []),
      getCoordinatorStripeAccount().catch(() => null),
    ])
      .then(([evtRes, vendorList, inquiries, stripe]) => {
        const evt = evtRes?.event ?? evtRes;
        setEvent(evt);
        setVendors(Array.isArray(vendorList) ? vendorList : []);
        const invited = new Set(
          (inquiries || [])
            .filter((inq) => String(inq.event_id ?? inq.event?.id) === String(eventId))
            .map((inq) => String(inq.vendor?.id ?? inq.vendor_id))
            .filter(Boolean)
        );
        setAlreadyInvitedIds(invited);
        setStripeConnected(stripe?.chargesEnabled === true);
      })
      .catch(() => setError("Could not load event or vendors."))
      .finally(() => setLoading(false));
  }, [authLoading, user, router, eventId]);

  // Shared template uses a placeholder name; per-vendor send personalizes it
  useEffect(() => {
    if (!event || messageEdited) return;
    setMessageTemplate(
      buildMessage({ name: "[Vendor]" }, event, coordinatorType, fields).replace(
        "Hi [Vendor]!",
        "Hi {vendor_name}!"
      )
    );
  }, [event, coordinatorType, fields, messageEdited]);

  const bookableVendors = useMemo(
    () => vendors.filter((v) => isVendorMarketplaceBookable(v)),
    [vendors]
  );

  const filteredVendors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookableVendors;
    return bookableVendors.filter((v) => {
      const hay = `${v.name || ""} ${v.location || ""} ${(v.categories || []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [bookableVendors, search]);

  const selectableFiltered = useMemo(
    () => filteredVendors.filter((v) => !alreadyInvitedIds.has(String(v.id))),
    [filteredVendors, alreadyInvitedIds]
  );

  const selectedCount = selectedIds.size;

  const toggleVendor = useCallback((id) => {
    const key = String(id);
    if (alreadyInvitedIds.has(key)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, [alreadyInvitedIds]);

  function selectAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      selectableFiltered.forEach((v) => next.add(String(v.id)));
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleSend() {
    if (!event?.id || selectedCount === 0) return;
    const template = messageTemplate.trim();
    if (!template) {
      setError("Please add a message before sending.");
      return;
    }

    setError(null);
    setSubmitting(true);
    setResult(null);

    const selected = vendors.filter((v) => selectedIds.has(String(v.id)));
    let sent = 0;
    let skipped = 0;
    const failures = [];

    for (let i = 0; i < selected.length; i++) {
      const vendor = selected[i];
      setProgress({ current: i + 1, total: selected.length, name: vendor.name });

      const personalized = template
        .replaceAll("{vendor_name}", vendor.name)
        .replace(/^Hi \[Vendor\]!/, `Hi ${vendor.name}!`);

      const payload = {
        vendor_id: vendor.id,
        event_id: event.id,
        coordinator_type: coordinatorType,
        initial_message: personalized,
      };
      if (coordinatorType === "hiring_vendor" && fields.budget) {
        payload.budget_cents = Math.round(Number(fields.budget) * 100);
      }
      if (coordinatorType === "charges_fees" && fields.vendingFee) {
        payload.vending_fee_cents = Math.round(Number(fields.vendingFee) * 100);
      }

      try {
        await createInquiry(payload);
        sent += 1;
        setAlreadyInvitedIds((prev) => new Set(prev).add(String(vendor.id)));
      } catch (err) {
        const msg = err?.message || "";
        if (/only one proposal/i.test(msg)) {
          skipped += 1;
          setAlreadyInvitedIds((prev) => new Set(prev).add(String(vendor.id)));
        } else {
          failures.push({ name: vendor.name, error: msg || "Failed" });
        }
      }
    }

    setSubmitting(false);
    setProgress(null);
    setSelectedIds(new Set());
    setResult({ sent, skipped, failures });
  }

  if (loading || authLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
        <div className="h-8 w-48 bg-[var(--gray-100)] rounded animate-pulse" />
        <div className="h-24 bg-[var(--gray-100)] rounded-2xl animate-pulse" />
        <div className="h-64 bg-[var(--gray-100)] rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-[var(--gray-500)] mb-3">{error || "Event not found."}</p>
        <Link href="/buyer-dashboard/events" className="text-sm text-[var(--violet-600)]">
          ← Back to Events
        </Link>
      </div>
    );
  }

  const dateStr = fmtEventDate(event.startDate, event.endDate);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-36 space-y-5">
      <div className="flex items-center gap-2 text-sm text-[var(--gray-400)]">
        <Link href="/buyer-dashboard/events" className="hover:text-[var(--violet-600)]">Events</Link>
        <span>/</span>
        <Link href={`/buyer-dashboard/events/${eventId}`} className="hover:text-[var(--violet-600)] truncate max-w-[140px]">
          {event.name}
        </Link>
        <span>/</span>
        <span className="text-[var(--gray-600)] font-medium">Invite</span>
      </div>

      <div>
        <h1 className="text-2xl font-display font-bold text-[var(--gray-900)]">Invite vendors</h1>
        <p className="text-sm text-[var(--gray-500)] mt-1">
          Pick as many as you want — we&apos;ll send the same event details to each.
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-[var(--gray-100)] px-4 py-3.5" style={{ boxShadow: "var(--shadow-card)" }}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--gray-400)]">Event</p>
        <p className="text-sm font-semibold text-[var(--gray-900)] mt-0.5">{event.name}</p>
        <p className="text-xs text-[var(--gray-500)] mt-0.5">
          {[dateStr, event.streetAddress || event.location].filter(Boolean).join(" · ")}
        </p>
      </div>

      {result && (
        <div className="rounded-2xl border border-[var(--mint-100)] bg-[var(--mint-50)] px-4 py-3.5 space-y-1">
          <p className="text-sm font-semibold text-[var(--mint-800)]">Invites sent</p>
          <p className="text-xs text-[var(--mint-700)]">
            {result.sent} sent
            {result.skipped ? ` · ${result.skipped} already invited` : ""}
            {result.failures.length ? ` · ${result.failures.length} failed` : ""}
          </p>
          {result.failures.length > 0 && (
            <ul className="text-xs text-[var(--error)] pt-1 space-y-0.5">
              {result.failures.map((f) => (
                <li key={f.name}>{f.name}: {f.error}</li>
              ))}
            </ul>
          )}
          <Link
            href="/buyer-dashboard/proposals"
            className="inline-block mt-2 text-xs font-semibold text-[var(--violet-700)] underline underline-offset-2"
          >
            View proposals
          </Link>
        </div>
      )}

      {/* Deal type + shared fields */}
      <div className="rounded-2xl bg-white border border-[var(--gray-100)] p-4 sm:p-5 space-y-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <p className="text-xs font-semibold text-[var(--gray-400)] uppercase tracking-wider">I am…</p>
        <div className="space-y-2">
          {COORDINATOR_TYPES.map((type) => {
            const selected = coordinatorType === type.value;
            const locked = type.value === "charges_fees" && !stripeConnected;
            return (
              <button
                key={type.value}
                type="button"
                disabled={locked}
                onClick={() => {
                  if (locked) return;
                  setCoordinatorType(type.value);
                  setMessageEdited(false);
                  if (type.value !== "hiring_vendor") setFields((f) => ({ ...f, budget: "" }));
                  if (type.value !== "charges_fees") setFields((f) => ({ ...f, vendingFee: "" }));
                }}
                className="w-full text-left px-3.5 py-3 rounded-xl border-2 transition-all"
                style={{
                  borderColor: selected ? "var(--violet-500)" : "var(--gray-200)",
                  background: selected ? "var(--violet-50)" : "white",
                  opacity: locked ? 0.5 : 1,
                }}
              >
                <p className={`text-sm font-semibold ${selected ? "text-[var(--violet-800)]" : "text-[var(--gray-800)]"}`}>
                  {type.label}
                </p>
                <p className="text-xs text-[var(--gray-400)] mt-0.5">
                  {locked ? "Connect Stripe to enable this option" : type.description}
                </p>
              </button>
            );
          })}
        </div>

        {coordinatorType === "hiring_vendor" && (
          <div>
            <label className="block text-sm font-semibold text-[var(--gray-800)] mb-1.5">
              Budget per vendor (optional)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gray-400)]">$</span>
              <input
                type="text"
                inputMode="numeric"
                value={fields.budget}
                onChange={(e) => {
                  setFields((f) => ({ ...f, budget: e.target.value.replace(/[^0-9]/g, "") }));
                  setMessageEdited(false);
                }}
                placeholder="500"
                className="input pl-8"
              />
            </div>
          </div>
        )}

        {coordinatorType === "charges_fees" && (
          <div>
            <label className="block text-sm font-semibold text-[var(--gray-800)] mb-1.5">
              Fee per vendor (USD)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gray-400)]">$</span>
              <input
                type="number"
                min="1"
                value={fields.vendingFee}
                onChange={(e) => {
                  setFields((f) => ({ ...f, vendingFee: e.target.value }));
                  setMessageEdited(false);
                }}
                placeholder="150"
                className="input pl-8"
              />
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold text-[var(--gray-800)]">Message to each vendor</label>
            {messageEdited && (
              <button
                type="button"
                className="text-xs font-medium text-[var(--violet-600)]"
                onClick={() => setMessageEdited(false)}
              >
                Regenerate
              </button>
            )}
          </div>
          <textarea
            rows={5}
            value={messageTemplate}
            onChange={(e) => {
              setMessageTemplate(e.target.value);
              setMessageEdited(true);
            }}
            className="w-full rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-[var(--gray-50)] px-4 py-3 text-sm leading-relaxed outline-none focus:border-[var(--violet-500)] focus:bg-white resize-none"
          />
          <p className="text-[11px] text-[var(--gray-400)] mt-1.5">
            Use {"{vendor_name}"} to insert each vendor&apos;s name automatically.
          </p>
        </div>
      </div>

      {/* Vendor picker */}
      <div className="rounded-2xl bg-white border border-[var(--gray-100)] overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="px-4 py-3 border-b border-[var(--gray-100)] space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--gray-900)]">
              Vendors
              <span className="text-[var(--gray-400)] font-normal ml-1.5">
                ({selectableFiltered.length} available
                {alreadyInvitedIds.size ? ` · ${alreadyInvitedIds.size} already invited` : ""})
              </span>
            </p>
            <div className="flex gap-2 text-xs font-semibold">
              <button type="button" onClick={selectAllVisible} className="text-[var(--violet-600)]">
                Select all
              </button>
              {selectedCount > 0 && (
                <button type="button" onClick={clearSelection} className="text-[var(--gray-400)]">
                  Clear
                </button>
              )}
            </div>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or location…"
            className="input"
          />
        </div>

        <div className="max-h-[420px] overflow-y-auto divide-y divide-[var(--gray-50)]">
          {filteredVendors.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[var(--gray-400)]">
              No bookable vendors match your search.
            </p>
          ) : (
            filteredVendors.map((vendor) => {
              const id = String(vendor.id);
              const invited = alreadyInvitedIds.has(id);
              const selected = selectedIds.has(id);
              const img = vendor.heroImage || getVendorPlaceholderImage(vendor.categories, vendor.id);
              return (
                <button
                  key={id}
                  type="button"
                  disabled={invited || submitting}
                  onClick={() => toggleVendor(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    invited ? "opacity-50 cursor-not-allowed" : selected ? "bg-[var(--violet-50)]" : "hover:bg-[var(--gray-50)]"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                      invited
                        ? "border-[var(--gray-300)] bg-[var(--gray-100)]"
                        : selected
                        ? "border-[var(--violet-600)] bg-[var(--violet-600)]"
                        : "border-[var(--gray-300)] bg-white"
                    }`}
                  >
                    {(selected || invited) && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={invited ? "var(--gray-400)" : "white"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--gray-900)] truncate">{vendor.name}</p>
                    <p className="text-xs text-[var(--gray-400)] truncate">{vendor.location || "—"}</p>
                  </div>
                  {invited ? (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--gray-400)]">Invited</span>
                  ) : !isVendorMarketplaceBookable(vendor) ? (
                    <MarketplaceComingSoonBadge />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--error)] text-center">{error}</p>
      )}

      {/* Sticky send bar */}
      <div
        className="fixed inset-x-0 z-[45] border-t border-[var(--gray-200)] bg-white/95 backdrop-blur-md"
        style={{
          bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.06)",
        }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--gray-900)]">
              {submitting && progress
                ? `Sending ${progress.current} of ${progress.total}…`
                : `${selectedCount} vendor${selectedCount === 1 ? "" : "s"} selected`}
            </p>
            {submitting && progress && (
              <p className="text-xs text-[var(--gray-400)] truncate">{progress.name}</p>
            )}
          </div>
          <Link
            href={`/buyer-dashboard/events/${eventId}`}
            className="btn btn-outline px-4 hidden sm:inline-flex"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSend}
            disabled={submitting || selectedCount === 0}
            className="btn btn-gradient px-5 disabled:opacity-40"
          >
            {submitting ? "Sending…" : `Send invites (${selectedCount})`}
          </button>
        </div>
      </div>
    </div>
  );
}
