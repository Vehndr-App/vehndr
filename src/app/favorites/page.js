"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "../../services/api";
import FavoriteButton from "../../components/FavoriteButton";
import { getVendorPlaceholderImage } from "../../utils/placeholderImages";

const FAVORITES_KEY = "vehndr_favorites";

function getFavorites() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFavorites = async () => {
      const favoriteIds = getFavorites();
      setFavorites(favoriteIds);

      if (favoriteIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        // Fetch all vendors and filter to favorites
        const allVendors = await api("/api/vendors");
        const vendorList = Array.isArray(allVendors) ? allVendors : allVendors?.vendors || [];
        const favoriteVendors = vendorList.filter((v) => favoriteIds.includes(v.id));
        setVendors(favoriteVendors);
      } catch (err) {
        console.error("Error loading favorites:", err);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();

    // Listen for storage changes (when favorites are updated)
    const handleStorageChange = () => {
      loadFavorites();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Refresh when returning to page
  useEffect(() => {
    const handleFocus = () => {
      const favoriteIds = getFavorites();
      setFavorites(favoriteIds);
      setVendors((prev) => prev.filter((v) => favoriteIds.includes(v.id)));
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--gray-50)] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-[var(--violet-600)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gray-50)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--gray-100)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--coral-400)] to-[var(--coral-600)] flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-[var(--gray-900)]">
                My Favorites
              </h1>
              <p className="text-[var(--gray-500)] text-sm">
                {favorites.length} saved vendor{favorites.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {vendors.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VendorCard({ vendor }) {
  const hasImage = vendor.heroImage && vendor.heroImage.length > 0;
  const placeholderImage = getVendorPlaceholderImage(vendor.categories, vendor.id);

  return (
    <Link
      href={`/store/${vendor.id}`}
      className="group bg-white rounded-[var(--radius-2xl)] overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hasImage ? vendor.heroImage : placeholderImage}
          alt={vendor.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Favorite button */}
        <FavoriteButton vendorId={vendor.id} className="absolute top-3 right-3" />

        {/* Rating Badge */}
        {vendor.rating && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-sm font-semibold text-[var(--gray-900)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--amber-500)" stroke="none">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {vendor.rating}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-lg text-[var(--gray-900)] group-hover:text-[var(--violet-600)] transition-colors">
          {vendor.name}
        </h3>
        <p className="text-sm text-[var(--gray-500)] line-clamp-2 mt-1">{vendor.description}</p>

        <div className="flex items-center gap-4 mt-3">
          {vendor.location && (
            <div className="flex items-center gap-1 text-xs text-[var(--gray-400)]">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {vendor.location}
            </div>
          )}

          {vendor.categories?.length > 0 && (
            <span className="px-2 py-0.5 bg-[var(--violet-100)] text-[var(--violet-700)] text-xs font-medium rounded-full">
              {vendor.categories[0]}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--gray-300)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-[var(--gray-900)] mb-2">No favorites yet</h2>
      <p className="text-[var(--gray-500)] mb-8 max-w-sm mx-auto">
        Start exploring vendors and tap the heart icon to save your favorites here.
      </p>
      <Link href="/" className="btn btn-gradient inline-flex items-center gap-2">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        Explore Vendors
      </Link>
    </div>
  );
}

