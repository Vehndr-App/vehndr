"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { getVendorProfile, getVendorProducts } from "../../../services/vendors";
import ProductCard from "../../../components/ProductCard";
import ProposalModal from "../../../components/ProposalModal";
import StorefrontHeroGallery from "../../../components/storefront/StorefrontHeroGallery";
import StorefrontPhotoTour from "../../../components/storefront/StorefrontPhotoTour";
import StorefrontGalleryCarousel from "../../../components/storefront/StorefrontGalleryCarousel";
import Link from "next/link";
import { getStorefrontUrl } from "../../../utils/storefrontLinks";
import {
  getVendorBookingPriceLabel,
  VENDOR_BOOKING_FOOTER_SUBTITLE,
} from "../../../utils/vendorBookingDisplay";
import { useAuth } from "../../../contexts/AuthContext";
import { getEvent } from "../../../services/events";

function clampFocalPoint(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 50;
  return Math.min(Math.max(numeric, 0), 100);
}

function getHeroObjectPosition(vendor) {
  return `${clampFocalPoint(vendor?.heroFocalX)}% ${clampFocalPoint(vendor?.heroFocalY)}%`;
}

export default function StorefrontPage() {
  const { vendorId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedEventId = searchParams.get("event_id");
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [sort, setSort] = useState("recommended");
  const [activeTab, setActiveTab] = useState("all");
  const [galleryView, setGalleryView] = useState("closed");
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [carouselReturnToTour, setCarouselReturnToTour] = useState(false);
  const [shareStatus, setShareStatus] = useState(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [authWallOpen, setAuthWallOpen] = useState(false);
  const [preselectedEvent, setPreselectedEvent] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      const v = await getVendorProfile(vendorId);
      const p = await getVendorProducts(vendorId);
      setVendor(v);
      setProducts(p);
    })();
  }, [vendorId]);

  useEffect(() => {
    if (!preselectedEventId) return;
    getEvent(preselectedEventId).then(setPreselectedEvent).catch(() => {});
  }, [preselectedEventId]);

  const filteredProducts = useMemo(() => {
    if (activeTab === "products") return products.filter((p) => !p.isService);
    if (activeTab === "services") return products.filter((p) => p.isService);
    return products;
  }, [products, activeTab]);

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (sort) {
      case "price_asc":
        return list.sort((a, b) => a.price - b.price);
      case "price_desc":
        return list.sort((a, b) => b.price - a.price);
      case "name_asc":
        return list.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return list;
    }
  }, [filteredProducts, sort]);

  const hasHeroImage = vendor?.heroImage && vendor.heroImage.length > 0;
  const galleryImages = vendor?.galleryImages || [];
  const allImages = hasHeroImage ? [vendor.heroImage, ...galleryImages] : galleryImages;
  const productCount = products.filter((p) => !p.isService).length;
  const serviceCount = products.filter((p) => p.isService).length;
  const storefrontUrl = useMemo(() => getStorefrontUrl(vendor), [vendor]);
  const heroObjectPosition = useMemo(() => getHeroObjectPosition(vendor), [vendor]);

  const footerPriceLabel = useMemo(() => getVendorBookingPriceLabel(vendor), [vendor]);

  function handleBookClick() {
    if (!user) {
      setAuthWallOpen(true);
      return;
    }
    if (preselectedEventId) {
      router.push(`/buyer-dashboard/proposals/new?vendor_id=${vendor.id}&event_id=${preselectedEventId}`);
      return;
    }
    setInquiryOpen(true);
  }

  const handleShare = async (event) => {
    event?.stopPropagation();
    if (!storefrontUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: vendor?.name || "Vehndr Storefront",
          url: storefrontUrl,
        });
        setShareStatus("shared");
        return;
      }

      await navigator.clipboard.writeText(storefrontUrl);
      setShareStatus("copied");
    } catch (error) {
      console.error("Failed to share storefront link:", error);
      setShareStatus("error");
    } finally {
      setTimeout(() => setShareStatus(null), 2500);
    }
  };

  const openCarousel = (index = 0, { fromTour = false } = {}) => {
    setGalleryIndex(index);
    setCarouselReturnToTour(fromTour);
    setGalleryView("carousel");
  };

  const openPhotoTour = () => {
    setGalleryView("tour");
  };

  const closeGallery = () => {
    setGalleryView("closed");
    setCarouselReturnToTour(false);
  };

  const closeCarousel = () => {
    if (carouselReturnToTour) {
      setGalleryView("tour");
      setCarouselReturnToTour(false);
    } else {
      closeGallery();
    }
  };

  if (!vendor) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 pb-24">
        <div className="animate-pulse space-y-4">
          <div className="h-[45vh] max-h-[480px] bg-[var(--gray-200)] rounded-none md:rounded-2xl" />
          <div className="h-8 bg-[var(--gray-200)] rounded w-1/3" />
          <div className="h-4 bg-[var(--gray-200)] rounded w-2/3" />
        </div>
      </div>
    );
  }

  const categoryLine =
    vendor.categories?.length > 0 ? vendor.categories.join(" · ") : null;
  const subtitleParts = [vendor.location, categoryLine].filter(Boolean);

  return (
    <div className="w-full pb-36">
      <StorefrontHeroGallery
        images={allImages}
        heroObjectPosition={heroObjectPosition}
        vendorId={vendor.id}
        onShare={handleShare}
        onImageClick={openCarousel}
        onShowAll={openPhotoTour}
      />

      {/* Vendor info card overlapping gallery */}
      <div className="relative z-10 -mt-6 rounded-t-3xl bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-2">
          <h1 className="text-2xl sm:text-[26px] font-display font-bold text-[var(--gray-900)] tracking-tight leading-tight">
            {vendor.name}
          </h1>
          {subtitleParts.length > 0 && (
            <p className="text-sm text-[var(--gray-500)] mt-1">{subtitleParts.join(" · ")}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
            {vendor.rating && (
              <span className="flex items-center gap-1 font-semibold text-[var(--gray-900)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--amber-500)" stroke="none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {vendor.rating}
              </span>
            )}
            {productCount + serviceCount > 0 && (
              <span className="text-[var(--gray-500)]">
                {productCount > 0 && `${productCount} product${productCount !== 1 ? "s" : ""}`}
                {productCount > 0 && serviceCount > 0 && " · "}
                {serviceCount > 0 && `${serviceCount} service${serviceCount !== 1 ? "s" : ""}`}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {shareStatus && (
          <div className="mt-4 flex items-center gap-2 rounded-full bg-[var(--gray-900)]/80 text-white text-xs px-3 py-1.5 w-fit">
            {shareStatus === "copied" && "Storefront link copied!"}
            {shareStatus === "shared" && "Thanks for sharing!"}
            {shareStatus === "error" && "Unable to share. Try again."}
          </div>
        )}

        <p className="text-[var(--gray-600)] text-sm mt-4 mb-6">{vendor.description}</p>

        {vendor.categories && vendor.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {vendor.categories.map((category, index) => (
              <span key={index} className="chip chip-filled text-xs">
                {category}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-1 p-1 bg-[var(--gray-100)] rounded-[var(--radius-lg)] mb-4 w-fit">
          <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")}>
            All ({products.length})
          </TabButton>
          {productCount > 0 && (
            <TabButton active={activeTab === "products"} onClick={() => setActiveTab("products")}>
              Products ({productCount})
            </TabButton>
          )}
          {serviceCount > 0 && (
            <TabButton active={activeTab === "services"} onClick={() => setActiveTab("services")}>
              Services ({serviceCount})
            </TabButton>
          )}
        </div>

        <div className="mb-6 scroll-horizontal scrollbar-hide -mx-4 px-4 gap-2">
          <SortChip label="Recommended" active={sort === "recommended"} onClick={() => setSort("recommended")} />
          <SortChip label="Price: Low to High" active={sort === "price_asc"} onClick={() => setSort("price_asc")} />
          <SortChip label="Price: High to Low" active={sort === "price_desc"} onClick={() => setSort("price_desc")} />
          <SortChip label="A–Z" active={sort === "name_asc"} onClick={() => setSort("name_asc")} />
        </div>

        {sortedProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {sortedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--gray-400)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--gray-900)] mb-1">No items yet</h3>
            <p className="text-[var(--gray-500)]">
              This vendor hasn&apos;t added any {activeTab === "all" ? "items" : activeTab} yet.
            </p>
          </div>
        )}

        <div className="mt-8 mb-4 grid grid-cols-3 gap-3">
          {[
            { icon: "✓", label: "Verified", sub: "Identity checked" },
            { icon: "🔒", label: "Secure Pay", sub: "Protected by Stripe" },
            { icon: "⭐", label: "Top Rated", sub: "Event marketplace" },
          ].map(({ icon, label, sub }) => (
            <div
              key={label}
              className="flex flex-col items-center text-center p-3 rounded-xl bg-[var(--gray-50)] border border-[var(--gray-100)]"
            >
              <span className="text-xl mb-1">{icon}</span>
              <p className="text-[11px] font-bold text-[var(--gray-800)]">{label}</p>
              <p className="text-[10px] text-[var(--gray-400)] leading-tight mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky booking bar — Airbnb Reserve style */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 footer-safe overflow-hidden"
        style={{ boxShadow: "0 -4px 24px rgba(0,0,0,0.08)" }}
      >
        {preselectedEvent && (
          <div className="bg-[var(--gray-900)] px-4 sm:px-6 py-2.5 flex items-center gap-2.5">
            <div className="mx-auto max-w-6xl w-full flex items-center gap-2.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 opacity-70">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <p className="text-[12px] text-white/60 flex-shrink-0">Event:</p>
              <p className="text-[12px] font-semibold text-white truncate">{preselectedEvent.name}</p>
            </div>
          </div>
        )}

        <div className="bg-white/90 backdrop-blur-xl border-t border-[var(--gray-100)]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-[var(--gray-900)] underline decoration-[var(--gray-300)] underline-offset-2">
                {footerPriceLabel}
              </p>
              <p className="text-xs text-[var(--gray-500)] mt-0.5 leading-snug">
                {preselectedEvent ? "Ready to send your request" : VENDOR_BOOKING_FOOTER_SUBTITLE}
              </p>
            </div>
            <button
              type="button"
              onClick={handleBookClick}
              className="tap-scale flex-shrink-0 px-6 sm:px-8 py-3.5 rounded-xl text-sm font-bold text-white whitespace-nowrap min-w-[140px] sm:min-w-[160px]"
              style={{ background: "var(--gradient-vendor)", boxShadow: "var(--shadow-button)" }}
            >
              Request to Book
            </button>
          </div>
        </div>
      </div>

      <ProposalModal vendor={vendor} isOpen={inquiryOpen} onClose={() => setInquiryOpen(false)} />

      {authWallOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setAuthWallOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-white rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-14 h-14 rounded-2xl mb-5 flex items-center justify-center"
              style={{ background: "var(--gradient-vendor)" }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--gray-900)] mb-2">Create an account to book</h2>
            <p className="text-sm text-[var(--gray-500)] mb-7 leading-relaxed">
              Sign up or log in to send a booking request to {vendor?.name ?? "this vendor"}.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <Link
                href={`/register?redirect=/store/${vendorId}`}
                className="w-full py-3 rounded-2xl text-white font-semibold text-sm text-center"
                style={{ background: "var(--gradient-vendor)" }}
              >
                Create account
              </Link>
              <Link
                href={`/login?redirect=/store/${vendorId}`}
                className="w-full py-3 rounded-2xl border border-[var(--gray-200)] text-[var(--gray-700)] font-semibold text-sm text-center hover:bg-[var(--gray-50)] transition-colors"
              >
                Log in
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setAuthWallOpen(false)}
              className="mt-5 text-xs text-[var(--gray-400)] hover:text-[var(--gray-600)] transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {galleryView === "tour" && allImages.length > 0 && (
        <StorefrontPhotoTour
          images={allImages}
          vendorId={vendor.id}
          vendorName={vendor.name}
          onShare={handleShare}
          onClose={closeGallery}
          onImageClick={(index) => openCarousel(index, { fromTour: true })}
        />
      )}

      {galleryView === "carousel" && allImages.length > 0 && (
        <StorefrontGalleryCarousel
          images={allImages}
          initialIndex={galleryIndex}
          heroObjectPosition={heroObjectPosition}
          onClose={closeCarousel}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      className={`px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-all ${
        active
          ? "bg-white text-[var(--gray-900)] shadow-sm"
          : "text-[var(--gray-500)] hover:text-[var(--gray-700)]"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SortChip({ label, active, onClick }) {
  return (
    <button
      className={`chip flex-shrink-0 ${active ? "chip-active" : "chip-outlined"}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
