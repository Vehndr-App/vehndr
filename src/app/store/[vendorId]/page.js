"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getVendorProfile, getVendorProducts } from "../../../services/vendors";
import ProductCard from "../../../components/ProductCard";
import SmartImage from "../../../components/SmartImage";
import ProposalModal from "../../../components/ProposalModal";
import Link from "next/link";
import { getStorefrontUrl } from "../../../utils/storefrontLinks";
import { useAuth } from "../../../contexts/AuthContext";

export default function StorefrontPage() {
  const { vendorId } = useParams();
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [sort, setSort] = useState("recommended");
  const [activeTab, setActiveTab] = useState("all");
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [shareStatus, setShareStatus] = useState(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [authWallOpen, setAuthWallOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      const v = await getVendorProfile(vendorId);
      const p = await getVendorProducts(vendorId);
      setVendor(v);
      setProducts(p);
    })();
  }, [vendorId]);

  const filteredProducts = useMemo(() => {
    if (activeTab === "products") return products.filter(p => !p.isService);
    if (activeTab === "services") return products.filter(p => p.isService);
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
  const productCount = products.filter(p => !p.isService).length;
  const serviceCount = products.filter(p => p.isService).length;
  const storefrontUrl = useMemo(() => getStorefrontUrl(vendor), [vendor]);

  function handleBookClick() {
    if (!user) { setAuthWallOpen(true); return; }
    setInquiryOpen(true);
  }

  const handleShare = async (event) => {
    event?.stopPropagation();
    if (!storefrontUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: vendor?.name || "Vehndr Storefront",
          url: storefrontUrl
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

  const openGallery = (index = 0) => {
    setGalleryIndex(index);
    setShowGallery(true);
  };

  if (!vendor) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 pb-24">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-[var(--gray-200)] rounded-[var(--radius-2xl)]" />
          <div className="h-8 bg-[var(--gray-200)] rounded w-1/3" />
          <div className="h-4 bg-[var(--gray-200)] rounded w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-24">
      {/* Hero Section - Uber Eats Style with Multiple Images */}
      <div className="relative">
        {/* Main Hero Image */}
        <div 
          className="relative h-52 sm:h-64 overflow-hidden cursor-pointer"
          onClick={() => allImages.length > 0 && openGallery(0)}
        >
        {hasHeroImage ? (
          <SmartImage
            src={vendor.heroImage}
            alt={vendor.name}
            className="absolute inset-0 w-full h-full object-cover"
            fallbackClassName="bg-gradient-primary"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-primary" />
        )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          
          {/* Photo Count Badge */}
          {allImages.length > 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); openGallery(0); }}
              className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-xs font-medium text-white hover:bg-black/70 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {allImages.length} photos
            </button>
          )}
          
          {/* Back Button */}
          <Link 
            href="/vendors"
            className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          {/* Vendor Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            <div className="mx-auto max-w-6xl">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-display text-white tracking-tight">
                    {vendor.name}
                  </h1>
                  <div className="flex items-center gap-3 mt-2 text-sm text-white/80">
                    {vendor.rating && (
                      <span className="flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--amber-500)" stroke="none">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        {vendor.rating}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      {vendor.location}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBookClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black rounded-full text-xs font-semibold hover:bg-white/90 transition-colors"
                  >
                    Request to Book
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white hover:bg-white/30 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="18" cy="5" r="3"/>
                      <circle cx="6" cy="12" r="3"/>
                      <circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gallery Thumbnails Strip - Uber Eats Style */}
        {galleryImages.length > 0 && (
          <div className="bg-white border-b border-[var(--gray-100)]">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
                {galleryImages.slice(0, 6).map((url, index) => (
                  <button
                    key={index}
                    onClick={() => openGallery(hasHeroImage ? index + 1 : index)}
                    className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden hover:opacity-90 transition-opacity relative bg-[var(--gray-100)]"
                  >
                    <SmartImage src={url} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
                    {index === 5 && galleryImages.length > 6 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white font-semibold">+{galleryImages.length - 6}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {shareStatus && (
          <div className="mt-4 flex items-center gap-2 rounded-full bg-[var(--gray-900)]/80 text-white text-xs px-3 py-1.5 w-fit">
            {shareStatus === "copied" && "Storefront link copied!"}
            {shareStatus === "shared" && "Thanks for sharing!"}
            {shareStatus === "error" && "Unable to share. Try again."}
          </div>
        )}
        {/* Description */}
        <p className="text-[var(--gray-600)] text-sm mt-4 mb-6">
          {vendor.description}
        </p>

        {/* Categories Pills */}
        {vendor.categories && vendor.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {vendor.categories.map((category, index) => (
              <span key={index} className="chip chip-filled text-xs">
                {category}
              </span>
            ))}
          </div>
        )}

        {/* Tap to Pay Section - Coming soon placeholder */}
        <div className="mb-6 p-4 rounded-[var(--radius-xl)] bg-gradient-to-r from-[var(--violet-50)] to-[var(--magenta-50)] border border-[var(--violet-100)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--gray-900)]">Tap to Pay coming soon</h3>
              <p className="text-xs text-[var(--gray-500)]">Contactless payments will be available in a future update.</p>
            </div>
          </div>
        </div>

        {/* Tabs - Products vs Services */}
        <div className="flex gap-1 p-1 bg-[var(--gray-100)] rounded-[var(--radius-lg)] mb-4 w-fit">
          <TabButton 
            active={activeTab === "all"} 
            onClick={() => setActiveTab("all")}
          >
            All ({products.length})
          </TabButton>
          {productCount > 0 && (
            <TabButton 
              active={activeTab === "products"} 
              onClick={() => setActiveTab("products")}
            >
              Products ({productCount})
            </TabButton>
          )}
          {serviceCount > 0 && (
            <TabButton 
              active={activeTab === "services"} 
              onClick={() => setActiveTab("services")}
            >
              Services ({serviceCount})
            </TabButton>
          )}
        </div>

        {/* Sort chips */}
        <div className="mb-6 scroll-horizontal scrollbar-hide -mx-4 px-4 gap-2">
          <SortChip label="Recommended" active={sort === "recommended"} onClick={() => setSort("recommended")} />
          <SortChip label="Price: Low to High" active={sort === "price_asc"} onClick={() => setSort("price_asc")} />
          <SortChip label="Price: High to Low" active={sort === "price_desc"} onClick={() => setSort("price_desc")} />
          <SortChip label="A–Z" active={sort === "name_asc"} onClick={() => setSort("name_asc")} />
        </div>

        {/* Products Grid */}
        {sortedProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {sortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--gray-900)] mb-1">No items yet</h3>
            <p className="text-[var(--gray-500)]">This vendor hasn&apos;t added any {activeTab === "all" ? "items" : activeTab} yet.</p>
          </div>
        )}

        {/* Vendor Contact/Info Footer */}
        <div className="mt-8 mb-4 p-4 rounded-[var(--radius-xl)] bg-[var(--gray-50)] border border-[var(--gray-100)]">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                {vendor.name?.charAt(0) || 'V'}
              </div>
              <div>
                <h4 className="font-semibold text-[var(--gray-900)]">{vendor.name}</h4>
                <p className="text-xs text-[var(--gray-500)]">Verified Vendor</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBookClick}
                className="btn bg-black text-white h-9 px-4 text-sm rounded-full hover:opacity-90 transition-opacity"
              >
                Request to Book
              </button>
              <button className="btn bg-gradient-primary text-white h-9 px-4 text-sm rounded-full">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Proposal Modal */}
      <ProposalModal
        vendor={vendor}
        isOpen={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
      />

      {/* Auth Wall */}
      {authWallOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setAuthWallOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-white rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl mb-5 flex items-center justify-center" style={{ background: "var(--gradient-vendor)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
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
              onClick={() => setAuthWallOpen(false)}
              className="mt-5 text-xs text-[var(--gray-400)] hover:text-[var(--gray-600)] transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Full Screen Gallery Modal */}
      {showGallery && allImages.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <button
              onClick={() => setShowGallery(false)}
              className="w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="text-white font-medium">
              {galleryIndex + 1} / {allImages.length}
            </span>
            <div className="w-10" /> {/* Spacer */}
          </div>

          {/* Main Image */}
          <div className="h-full flex items-center justify-center p-4">
            <SmartImage
              src={allImages[galleryIndex]}
              alt={`Photo ${galleryIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              fallbackClassName="bg-[var(--gray-800)]"
            />
          </div>

          {/* Navigation Arrows */}
          {galleryIndex > 0 && (
            <button
              onClick={() => setGalleryIndex(galleryIndex - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {galleryIndex < allImages.length - 1 && (
            <button
              onClick={() => setGalleryIndex(galleryIndex + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Thumbnail Strip */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex gap-2 justify-center overflow-x-auto scrollbar-hide">
              {allImages.map((url, index) => (
                <button
                  key={index}
                  onClick={() => setGalleryIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all bg-[var(--gray-800)] ${
                    index === galleryIndex ? 'ring-2 ring-white' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <SmartImage src={url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
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
      className={`chip flex-shrink-0 ${active ? 'chip-active' : 'chip-outlined'}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
