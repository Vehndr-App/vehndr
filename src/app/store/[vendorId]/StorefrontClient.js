"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { getVendorProfile, getVendorProducts } from "../../../services/vendors";
import ProductCard from "../../../components/ProductCard";
import ProposalModal from "../../../components/ProposalModal";
import StorefrontHeroGallery from "../../../components/storefront/StorefrontHeroGallery";
import StorefrontPhotoTour from "../../../components/storefront/StorefrontPhotoTour";
import StorefrontGalleryCarousel from "../../../components/storefront/StorefrontGalleryCarousel";
import { getStorefrontUrl, getStorefrontPath } from "../../../utils/storefrontLinks";
import {
  getVendorBookingPriceLabel,
  VENDOR_BOOKING_FOOTER_SUBTITLE,
} from "../../../utils/vendorBookingDisplay";
import { useAuth } from "../../../contexts/AuthContext";
import { getEvent } from "../../../services/events";
import MarketplaceComingSoonBadge from "../../../components/MarketplaceComingSoonBadge";
import {
  isVendorMarketplaceBookable,
  MARKETPLACE_COMING_SOON_BLURB,
} from "../../../utils/vendorMarketplace";
import { loadBookingDraft } from "../../../utils/bookingDraft";
import { useCart } from "../../../contexts/CartContext";
import { getListingType, isPackageListing, isShopListing } from "../../../utils/listingType";
import SmartImage from "../../../components/SmartImage";

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
  const [galleryView, setGalleryView] = useState("closed");
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [carouselReturnToTour, setCarouselReturnToTour] = useState(false);
  const [shareStatus, setShareStatus] = useState(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [bookingDraft, setBookingDraft] = useState(null);
  const [preselectedEvent, setPreselectedEvent] = useState(null);
  const [door, setDoor] = useState("book"); // "book" | "shop"
  const [prefillBudget, setPrefillBudget] = useState(""); // dollars, from package price
  const { user } = useAuth();
  const { totalItems } = useCart();

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

  useEffect(() => {
    if (searchParams.get("resume_booking") !== "1") return;
    if (!user || !vendor) return;
    const draft = loadBookingDraft();
    if (!draft || String(draft.vendorId) !== String(vendor.id)) return;
    setBookingDraft(draft);
    setInquiryOpen(true);
    router.replace(`/store/${vendorId}`, { scroll: false });
  }, [user, vendor, searchParams, vendorId, router]);

  const hasHeroImage = vendor?.heroImage && vendor.heroImage.length > 0;
  const galleryImages = vendor?.galleryImages || [];
  const allImages = hasHeroImage ? [vendor.heroImage, ...galleryImages] : galleryImages;
  const shopItems = useMemo(() => products.filter((p) => isShopListing(p)), [products]);
  const packages = useMemo(() => products.filter((p) => isPackageListing(p)), [products]);
  const productCount = shopItems.filter((p) => getListingType(p) === "product").length;
  const serviceCount = shopItems.filter((p) => getListingType(p) === "service").length;
  const packageCount = packages.length;

  const sortedShopItems = useMemo(() => {
    const list = [...shopItems];
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
  }, [shopItems, sort]);
  const storefrontUrl = useMemo(() => getStorefrontUrl(vendor), [vendor]);
  const storefrontPath = useMemo(() => getStorefrontPath(vendor), [vendor]);
  const heroObjectPosition = useMemo(() => getHeroObjectPosition(vendor), [vendor]);

  const footerPriceLabel = useMemo(() => getVendorBookingPriceLabel(vendor), [vendor]);
  const marketplaceBookable = vendor ? isVendorMarketplaceBookable(vendor) : true;
  const isBookDoor = door === "book";

  function budgetDollarsFromPackage(pkg) {
    if (!pkg || typeof pkg.price !== "number" || pkg.price <= 0) return "";
    return String(Math.round(pkg.price / 100));
  }

  function handleBookClick(pkg) {
    if (!marketplaceBookable) return;
    const budget = budgetDollarsFromPackage(pkg);
    setPrefillBudget(budget);
    if (preselectedEventId && user) {
      const params = new URLSearchParams({
        vendor_id: String(vendor.id),
        event_id: String(preselectedEventId),
      });
      if (budget) params.set("budget", budget);
      router.push(`/buyer-dashboard/proposals/new?${params.toString()}`);
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

  const subtitleParts = [vendor.location].filter(Boolean);

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
          {!marketplaceBookable && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <MarketplaceComingSoonBadge />
              <span className="text-xs text-[var(--gray-500)]">{MARKETPLACE_COMING_SOON_BLURB}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
            {Number(vendor.rating) > 0 ? (
              <span className="flex items-center gap-1 font-semibold text-[var(--gray-900)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--amber-500)" stroke="none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {vendor.rating}
              </span>
            ) : (
              <span className="font-semibold text-[var(--gray-900)]">New</span>
            )}
            {productCount + serviceCount + packageCount > 0 && (
              <span className="text-[var(--gray-500)]">
                {[
                  productCount > 0 && `${productCount} product${productCount !== 1 ? "s" : ""}`,
                  serviceCount > 0 && `${serviceCount} service${serviceCount !== 1 ? "s" : ""}`,
                  packageCount > 0 && `${packageCount} package${packageCount !== 1 ? "s" : ""}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
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

        <p className="text-[var(--gray-600)] text-sm mt-4 mb-6 whitespace-pre-wrap leading-relaxed">
          {vendor.description}
        </p>

        <StorefrontMetaChips vendor={vendor} />

        {/* Door toggle: Book for events vs Shop in person */}
        <div className="mb-3">
          <div className="flex gap-1 p-1 bg-[var(--gray-100)] rounded-full w-full sm:w-fit">
            <button
              type="button"
              onClick={() => setDoor("book")}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
                isBookDoor
                  ? "bg-white text-[var(--gray-900)] shadow-sm"
                  : "text-[var(--gray-500)] hover:text-[var(--gray-700)]"
              }`}
            >
              Book for your event
            </button>
            <button
              type="button"
              onClick={() => setDoor("shop")}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
                !isBookDoor
                  ? "bg-white text-[var(--gray-900)] shadow-sm"
                  : "text-[var(--gray-500)] hover:text-[var(--gray-700)]"
              }`}
            >
              Shop in person
            </button>
          </div>
          <p className="text-xs text-[var(--gray-500)] mt-2.5 leading-relaxed">
            {isBookDoor
              ? "Hire this vendor for your wedding, party, or event."
              : "For on-site / in-person shopping. Browse items and check out here."}
          </p>
        </div>

        {isBookDoor ? (
          <div className="mb-2">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-sm font-semibold text-[var(--gray-900)]">Packages</h2>
              {marketplaceBookable && (
                <button
                  type="button"
                  onClick={handleBookClick}
                  className="text-sm font-semibold text-[var(--violet-600)] hover:text-[var(--violet-700)]"
                >
                  Request to book
                </button>
              )}
            </div>

            {packages.length > 0 ? (
              <div className="space-y-3">
                {packages.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    href={`${storefrontPath}/products/${pkg.id}`}
                    onRequest={marketplaceBookable ? () => handleBookClick(pkg) : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--gray-200)] bg-[var(--gray-50)] px-4 py-8 text-center">
                <p className="text-sm font-medium text-[var(--gray-800)] mb-1">No packages listed yet</p>
                <p className="text-xs text-[var(--gray-500)] mb-4">
                  You can still send a custom booking request.
                </p>
                {marketplaceBookable && (
                  <button
                    type="button"
                    onClick={handleBookClick}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{ background: "var(--gradient-vendor)" }}
                  >
                    Request to book
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6 scroll-horizontal scrollbar-hide -mx-4 px-4 gap-2">
              <SortChip label="Recommended" active={sort === "recommended"} onClick={() => setSort("recommended")} />
              <SortChip label="Price: Low to High" active={sort === "price_asc"} onClick={() => setSort("price_asc")} />
              <SortChip label="Price: High to Low" active={sort === "price_desc"} onClick={() => setSort("price_desc")} />
              <SortChip label="A–Z" active={sort === "name_asc"} onClick={() => setSort("name_asc")} />
            </div>

            {sortedShopItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {sortedShopItems.map((product) => (
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
                <h3 className="text-lg font-semibold text-[var(--gray-900)] mb-1">No shop items yet</h3>
                <p className="text-[var(--gray-500)] text-sm">
                  This vendor hasn&apos;t added in-person shop items yet.
                </p>
              </div>
            )}
          </>
        )}

        <div className="mt-8 mb-4 grid grid-cols-3 gap-3">
          {[
            { icon: "⚡", label: "Easy Booking", sub: "Book in a few taps" },
            { icon: "🔒", label: "Secure Pay", sub: "Protected by Stripe" },
            { icon: "⭐", label: "From the Field", sub: "Built by event pros" },
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

        <StorefrontStorySections vendor={vendor} />
      </div>

      {/* Sticky footer — booking on Door 1, cart on Door 2 */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 footer-safe overflow-hidden"
        style={{ boxShadow: "0 -4px 24px rgba(0,0,0,0.08)" }}
      >
        {isBookDoor && preselectedEvent && (
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
            {isBookDoor ? (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-[var(--gray-900)] underline decoration-[var(--gray-300)] underline-offset-2">
                    {footerPriceLabel}
                  </p>
                  <p className="text-xs text-[var(--gray-500)] mt-0.5 leading-snug">
                    {marketplaceBookable
                      ? (preselectedEvent ? "Ready to send your request" : VENDOR_BOOKING_FOOTER_SUBTITLE)
                      : "This vendor is not bookable yet in your area"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBookClick}
                  disabled={!marketplaceBookable}
                  className={`tap-scale flex-shrink-0 px-6 sm:px-8 py-3.5 rounded-xl text-sm font-bold whitespace-nowrap min-w-[140px] sm:min-w-[160px] ${
                    marketplaceBookable
                      ? "text-white"
                      : "text-[var(--gray-600)] bg-[var(--gray-100)] cursor-not-allowed"
                  }`}
                  style={
                    marketplaceBookable
                      ? { background: "var(--gradient-vendor)", boxShadow: "var(--shadow-button)" }
                      : undefined
                  }
                >
                  {marketplaceBookable ? "Request to Book" : "Coming soon"}
                </button>
              </>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-[var(--gray-900)]">
                    {totalItems > 0 ? `${totalItems} in cart` : "Shop items"}
                  </p>
                  <p className="text-xs text-[var(--gray-500)] mt-0.5 leading-snug">
                    In-person style shopping — checkout when you&apos;re ready
                  </p>
                </div>
                <Link
                  href="/cart"
                  className="tap-scale flex-shrink-0 px-6 sm:px-8 py-3.5 rounded-xl text-sm font-bold whitespace-nowrap min-w-[140px] sm:min-w-[160px] text-white text-center"
                  style={{ background: "var(--gradient-vendor)", boxShadow: "var(--shadow-button)" }}
                >
                  {totalItems > 0 ? "View cart" : "Go to cart"}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <ProposalModal
        vendor={vendor}
        isOpen={inquiryOpen}
        onClose={() => {
          setInquiryOpen(false);
          setBookingDraft(null);
          setPrefillBudget("");
        }}
        resumeDraft={bookingDraft}
        initialBudget={prefillBudget}
      />

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

function StorefrontMetaChips({ vendor }) {
  const years = vendor.yearsInBusiness ?? vendor.years_in_business;
  const languages = vendor.languagesSpoken || vendor.languages_spoken || [];
  const hasYears = years != null && years !== "";
  if (!hasYears && languages.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {hasYears && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--gray-50)] border border-[var(--gray-100)] text-xs font-medium text-[var(--gray-700)]">
          {Number(years) === 1 ? "1 year in business" : `${years} years in business`}
        </span>
      )}
      {languages.map((language) => (
        <span
          key={language}
          className="inline-flex items-center px-3 py-1.5 rounded-full bg-[var(--mint-50)] border border-[var(--mint-100)] text-xs font-medium text-[var(--gray-700)]"
        >
          {language}
        </span>
      ))}
    </div>
  );
}

function StorefrontStorySections({ vendor }) {
  const trustedBy = (vendor.trustedBy || vendor.trusted_by || []).filter(Boolean);
  const pastEvents = (vendor.pastEvents || vendor.past_events || []).filter((event) => event?.name);
  const faqs = (vendor.faqs || []).filter((faq) => faq?.question && faq?.answer);
  const teamMembers = (vendor.teamMembers || vendor.team_members || []).filter((m) => m?.name);

  const hasAny =
    trustedBy.length > 0 ||
    pastEvents.length > 0 ||
    faqs.length > 0 ||
    teamMembers.length > 0;
  if (!hasAny) return null;

  return (
    <div className="space-y-6 mt-10 mb-8 pt-8 border-t border-[var(--gray-100)]">
      {trustedBy.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--gray-900)] mb-2">Trusted by</h2>
          <div className="flex flex-wrap gap-2">
            {trustedBy.map((name) => (
              <span
                key={name}
                className="px-3 py-1.5 rounded-lg bg-[var(--gray-50)] border border-[var(--gray-100)] text-xs font-medium text-[var(--gray-800)]"
              >
                {name}
              </span>
            ))}
          </div>
        </section>
      )}

      {pastEvents.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--gray-900)] mb-3">Events worked</h2>
          <ul className="space-y-2">
            {pastEvents.map((event, index) => {
              const meta = [event.year, event.location].filter(Boolean).join(" · ");
              return (
                <li
                  key={`${event.name}-${index}`}
                  className="flex items-start gap-3 rounded-xl border border-[var(--gray-100)] bg-[var(--gray-50)] px-4 py-3"
                >
                  <span className="mt-0.5 text-[var(--violet-500)]" aria-hidden>
                    ✦
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--gray-900)] leading-snug">
                      {event.name}
                    </p>
                    {meta && (
                      <p className="text-xs text-[var(--gray-500)] mt-0.5">{meta}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {teamMembers.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--gray-900)] mb-3">Team</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5">
            {teamMembers.map((member) => {
              const photoSrc = member.photoUrl || member.photo_url;
              return (
                <div
                  key={member.id || member.name}
                  className="relative aspect-square w-full rounded-full overflow-hidden bg-[var(--gray-100)] shadow-sm"
                >
                  {photoSrc ? (
                    <SmartImage
                      src={photoSrc}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-3xl font-semibold text-[var(--gray-400)]">
                      {(member.name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div
                    className="absolute inset-x-0 bottom-0 pt-10 pb-3 px-3 text-center"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 100%)",
                    }}
                  >
                    <p className="text-sm sm:text-[15px] font-semibold text-white leading-tight truncate drop-shadow-sm">
                      {member.name}
                    </p>
                    {member.title && (
                      <p className="text-[11px] sm:text-xs text-white/85 leading-tight truncate mt-0.5">
                        {member.title}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {faqs.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--gray-900)] mb-3">FAQs</h2>
          <div className="space-y-2">
            {faqs.map((faq, index) => (
              <details
                key={`${faq.question}-${index}`}
                className="group rounded-xl border border-[var(--gray-100)] bg-[var(--gray-50)] px-4 py-3"
              >
                <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-sm font-medium text-[var(--gray-900)]">
                  <span>{faq.question}</span>
                  <span className="text-[var(--gray-400)] group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-2 text-sm text-[var(--gray-600)] leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PackageCard({ pkg, href, onRequest }) {
  const price = typeof pkg.price === "number" ? (pkg.price / 100).toFixed(2) : null;
  const hasImage = pkg.images && pkg.images.length > 0;

  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--gray-100)] bg-white p-3 shadow-[var(--shadow-sm)]">
      <Link
        href={href}
        className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-[var(--gray-100)]"
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pkg.images[0]} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl text-[var(--violet-300)]">
            ✨
          </div>
        )}
      </Link>
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <Link href={href} className="block">
            <p className="text-sm font-semibold text-[var(--gray-900)] leading-snug line-clamp-2">
              {pkg.name}
            </p>
          </Link>
          {pkg.description && (
            <p className="text-xs text-[var(--gray-500)] mt-1 line-clamp-2">{pkg.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-2">
          {price != null && (
            <p className="text-sm font-bold text-[var(--gray-900)]">${price}</p>
          )}
          {onRequest ? (
            <button
              type="button"
              onClick={onRequest}
              className="text-xs font-semibold text-[var(--violet-600)] hover:text-[var(--violet-700)]"
            >
              Request
            </button>
          ) : (
            <Link
              href={href}
              className="text-xs font-semibold text-[var(--violet-600)] hover:text-[var(--violet-700)]"
            >
              View
            </Link>
          )}
        </div>
      </div>
    </div>
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
