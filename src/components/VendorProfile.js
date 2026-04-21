"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "../services/api";
import SmartImage from "./SmartImage";
import ImageEditorModal from "./ImageEditorModal";
import GuidanceModal from "./GuidanceModal";
import { VENDOR_CATEGORIES, CATEGORY_DISPLAY } from "../constants/categories";
import {
  resizeImage,
  resizeImages,
  formatFileSize,
  validateFileSize,
  validateFileType
} from "../utils/imageResize";

const DEFAULT_HERO_FOCAL_POINT = { x: 50, y: 50 };

function clampFocalPoint(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 50;
  return Math.min(Math.max(numeric, 0), 100);
}

function getHeroObjectPosition(focalX, focalY) {
  return `${clampFocalPoint(focalX)}% ${clampFocalPoint(focalY)}%`;
}

export default function VendorProfile({ user, onSuccess }) {
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    location: '',
    collectTax: true,
    profileImage: null,           // Profile photo (the actual person)
    profileImageUrl: '',
    heroImage: null,              // Cover photo (business in action)
    heroImageUrl: '',
    heroFocalX: DEFAULT_HERO_FOCAL_POINT.x,
    heroFocalY: DEFAULT_HERO_FOCAL_POINT.y,
    galleryImages: [],           // New files to upload (File objects)
    existingGalleryImages: [],   // Existing images from server [{id, url}]
    categories: []
  });
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [slugError, setSlugError] = useState(null);
  const [galleryItems, setGalleryItems] = useState([]);
  const [heroEditor, setHeroEditor] = useState({
    isOpen: false,
    imageSrc: null,
    fileName: "cover-photo.jpg"
  });
  const [galleryEditor, setGalleryEditor] = useState({
    isOpen: false,
    imageSrc: null,
    fileName: "gallery-photo.jpg",
    targetId: null,
    isExisting: false
  });
  const [showCoverPhotoTip, setShowCoverPhotoTip] = useState(false);
  const coverPhotoFileInputRef = useRef(null);
  const profilePhotoFileInputRef = useRef(null);

  // Handle hash-based scroll and auto-trigger upload (e.g., from dashboard avatar click)
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const hash = window.location.hash;
    if (hash === "#profile-photo") {
      // Small delay to ensure element is rendered
      setTimeout(() => {
        const element = document.getElementById("profile-photo");
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          // Auto-trigger file input if no profile photo exists
          if (!formData.profileImageUrl && !formData.profileImage) {
            setTimeout(() => {
              profilePhotoFileInputRef.current?.click();
            }, 500);
          }
        }
        // Clear hash from URL
        window.history.replaceState(null, "", window.location.pathname);
      }, 100);
    }
  }, [loading, formData.profileImageUrl, formData.profileImage]);

  const fetchVendor = useCallback(async () => {
    if (!user?.vendorId) {
      setLoading(false);
      return;
    }

    try {
      const data = await api(`/api/vendors/${user.vendorId}`);

      // Handle both wrapped and unwrapped responses
      const vendorData = data.vendor || data;
      setVendor(vendorData);

      const newFormData = {
        name: vendorData.name || '',
        slug: vendorData.slug || '',
        description: vendorData.description || '',
        location: vendorData.location || '',
        collectTax: vendorData.collectTax !== false,
        profileImage: null,
        profileImageUrl: vendorData.profileImage || '',
        heroImage: null,
        heroImageUrl: vendorData.heroImage || '',
        heroFocalX: vendorData.heroFocalX ?? DEFAULT_HERO_FOCAL_POINT.x,
        heroFocalY: vendorData.heroFocalY ?? DEFAULT_HERO_FOCAL_POINT.y,
        galleryImages: [],
        // Use galleryImagesData if available (has id+url), fallback to galleryImages URLs
        existingGalleryImages: vendorData.galleryImagesData ||
          (vendorData.galleryImages || []).map((url, i) => ({ id: `legacy_${i}`, url })),
        categories: vendorData.categories || []
      };
      setFormData(newFormData);
      const existingItems = (vendorData.galleryImagesData ||
        (vendorData.galleryImages || []).map((url, i) => ({ id: `legacy_${i}`, url }))
      ).map((img) => ({
        id: img.id,
        url: img.url,
        signedId: img.signed_id || img.signedId || null,
        isExisting: true,
        file: null
      }));
      setGalleryItems(existingItems);
    } catch (err) {
      console.error("Failed to fetch vendor", err);
      setError(`Failed to load vendor profile: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.vendorId) {
      fetchVendor();
    } else {
      setLoading(false);
    }
  }, [user, fetchVendor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedSlug = formData.slug?.trim().toLowerCase();
    if (normalizedSlug && !slugPattern.test(normalizedSlug)) {
      setSlugError("Use lowercase letters, numbers, and dashes only.");
      return;
    }
    setSlugError(null);
    setSaving(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('vendor[name]', formData.name);
      formDataToSend.append('vendor[slug]', normalizedSlug || '');
      formDataToSend.append('vendor[description]', formData.description);
      formDataToSend.append('vendor[location]', formData.location);
      formDataToSend.append('vendor[collect_tax]', formData.collectTax ? 'true' : 'false');

      // Add categories as an array
      formData.categories.forEach(category => {
        formDataToSend.append('vendor[categories][]', category);
      });

      // Add profile image if a new file was selected
      if (formData.profileImage) {
        formDataToSend.append('vendor[profile_image]', formData.profileImage);
      } else if (vendor && vendor.profileImage && !formData.profileImageUrl) {
        // Profile image was removed
        formDataToSend.append('remove_profile_image', 'true');
      }

      // Add hero image if a new file was selected
      if (formData.heroImage) {
        formDataToSend.append('vendor[hero_image]', formData.heroImage);
      } else if (vendor && vendor.heroImage && !formData.heroImageUrl) {
        // Hero image was removed (had one before, now empty, no new one selected)
        formDataToSend.append('remove_hero_image', 'true');
      }
      formDataToSend.append('vendor[hero_focal_x]', clampFocalPoint(formData.heroFocalX).toString());
      formDataToSend.append('vendor[hero_focal_y]', clampFocalPoint(formData.heroFocalY).toString());

      const newGalleryItems = galleryItems.filter((item) => !item.isExisting);
      const existingGalleryItems = galleryItems.filter((item) => item.isExisting);

      // Add gallery images if new files were selected
      if (newGalleryItems.length > 0) {
        newGalleryItems.forEach(item => {
          if (!item.file) return;
          formDataToSend.append('vendor[gallery_images][]', item.file);
        });
      }

      // When editing, send the list of existing gallery images to keep and their order
      // This allows the backend to delete images that were removed and maintain order
      if (vendor) {
        if (existingGalleryItems.length > 0) {
          existingGalleryItems.forEach(img => {
            const keepValue = img.signedId || img.url;
            formDataToSend.append('keep_gallery_images[]', keepValue);
          });
          // Send the order of image IDs (existing images in their current order)
          existingGalleryItems.forEach(img => {
            if (img.id && !img.id.startsWith('legacy_')) {
              formDataToSend.append('vendor[gallery_image_order][]', img.id);
            }
          });
        }
      }

      let result;
      const url = vendor ? `/api/vendors/${vendor.id}` : '/api/vendors';
      const method = vendor ? 'PATCH' : 'POST';

      result = await api(url, {
        method,
        body: formDataToSend
      });

      // Handle wrapped response
      const resultData = result.vendor || result;
      setVendor(resultData);

      // Update form data with new URLs
      setFormData(prev => ({
        ...prev,
        collectTax: resultData.collectTax !== false,
        profileImage: null,
        profileImageUrl: resultData.profileImage || prev.profileImageUrl,
        heroImage: null,
        heroImageUrl: resultData.heroImage || prev.heroImageUrl,
        heroFocalX: resultData.heroFocalX ?? prev.heroFocalX,
        heroFocalY: resultData.heroFocalY ?? prev.heroFocalY,
        galleryImages: [],
        slug: resultData.slug || prev.slug,
        existingGalleryImages: resultData.galleryImagesData ||
          (resultData.galleryImages || []).map((url, i) => ({ id: `legacy_${i}`, url }))
      }));
      const nextGalleryItems = (resultData.galleryImagesData ||
        (resultData.galleryImages || []).map((url, i) => ({ id: `legacy_${i}`, url }))
      ).map((img) => ({
        id: img.id,
        url: img.url,
        signedId: img.signed_id || img.signedId || null,
        isExisting: true,
        file: null
      }));
      setGalleryItems(nextGalleryItems);

      if (onSuccess) {
        onSuccess(resultData);
      }
    } catch (err) {
      console.error("Failed to save vendor profile", err);
      setError(err.message || "Failed to save vendor profile");
    } finally {
      setSaving(false);
    }
  };

  const normalizeSlugInput = (value) => (
    value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
  );

  const toggleCategory = (category) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const openHeroEditor = (imageSrc, fileName = "cover-photo.jpg") => {
    setHeroEditor({ isOpen: true, imageSrc, fileName });
  };

  const openGalleryEditor = (item) => {
    setGalleryEditor({
      isOpen: true,
      imageSrc: item.url,
      fileName: item.file?.name || "gallery-photo.jpg",
      targetId: item.id,
      isExisting: item.isExisting
    });
  };

  const createGalleryItem = (file) => ({
    id: `new_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    url: URL.createObjectURL(file),
    file,
    isExisting: false
  });

  const removeGalleryImage = (itemId, isExisting) => {
    setConfirmRemove({ itemId, isExisting });
  };

  const sortableIds = useMemo(() => galleryItems.map((item) => item.id), [galleryItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const persistGalleryOrder = async (nextImages) => {
    const orderedIds = nextImages
      .filter((img) => img.isExisting)
      .map((img) => img.id)
      .filter((id) => id && !id.startsWith("legacy_"));
    const hasLegacy = orderedIds.length !== nextImages.filter((img) => img.isExisting).length;
    if (hasLegacy) {
      setError("Some images need a full save to persist order.");
      return;
    }

    setSavingOrder(true);
    try {
      await api(`/api/vendors/${vendor.id}/photos/reorder`, {
        method: "PATCH",
        body: { ordered_ids: orderedIds }
      });
    } catch (err) {
      throw err;
    } finally {
      setSavingOrder(false);
    }
  };


  const handleGalleryDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const current = galleryItems;
    const oldIndex = current.findIndex((img) => img.id === active.id);
    const newIndex = current.findIndex((img) => img.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const nextImages = arrayMove(current, oldIndex, newIndex);
    setGalleryItems(nextImages);

    const existingOnly = nextImages.filter((img) => img.isExisting);
    if (existingOnly.length === nextImages.length) {
      try {
        await persistGalleryOrder(existingOnly);
      } catch (err) {
        setGalleryItems(current);
        setError(err.message || "Failed to save gallery order");
      }
    }
  };

  const handleConfirmRemove = async () => {
    if (!confirmRemove) return;
    const { itemId, isExisting } = confirmRemove;
    setConfirmRemove(null);

    if (!isExisting) {
      setGalleryItems((prev) => prev.filter((item) => item.id !== itemId));
      return;
    }

    const existingImages = galleryItems.filter((item) => item.isExisting);
    const image = existingImages.find((item) => item.id === itemId);
    if (!image) return;

    const nextImages = galleryItems.filter((item) => item.id !== itemId);
    setGalleryItems(nextImages);

    try {
      await api(`/api/vendors/${vendor.id}/photos/${image.id}`, { method: "DELETE" });
    } catch (err) {
      setGalleryItems(galleryItems);
      setError(err.message || "Failed to remove photo");
    }
  };

  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoadingLocation(true);
    setError(null);

    try {
      // Get user's coordinates
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode using OpenStreetMap Nominatim API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Vehndr App'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get address');
      }

      const data = await response.json();

      // Format the location string
      let locationString = '';
      if (data.address) {
        const city = data.address.city || data.address.town || data.address.village || data.address.county;
        const state = data.address.state;

        if (city && state) {
          locationString = `${city}, ${state}`;
        } else if (city) {
          locationString = city;
        } else if (state) {
          locationString = state;
        } else {
          locationString = data.display_name;
        }
      } else {
        locationString = data.display_name;
      }

      setFormData(prev => ({
        ...prev,
        location: locationString
      }));
    } catch (err) {
      console.error('Error getting location:', err);
      if (err.code === 1) {
        setError('Location access denied. Please enable location permissions in your browser.');
      } else if (err.code === 2) {
        setError('Location unavailable. Please try again.');
      } else if (err.code === 3) {
        setError('Location request timed out. Please try again.');
      } else {
        setError('Failed to get location. Please enter manually.');
      }
    } finally {
      setLoadingLocation(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card bg-white p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-[var(--gray-200)] rounded-xl"></div>
            <div className="h-4 bg-[var(--gray-200)] rounded w-1/3"></div>
            <div className="h-4 bg-[var(--gray-200)] rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  // Preview of how the storefront will look
  const PreviewSection = () => {
    const heroUrl = formData.heroImage
      ? URL.createObjectURL(formData.heroImage)
      : formData.heroImageUrl;
    const heroObjectPosition = getHeroObjectPosition(formData.heroFocalX, formData.heroFocalY);

    // Filter out any null/undefined URLs
    const allGalleryImages = galleryItems.map((item) => item.url).filter((url) => url);

    if (!heroUrl && allGalleryImages.length === 0 && !formData.name) {
      return null;
    }

    return (
      <div className="card bg-white overflow-hidden mb-6">
        <div className="p-4 border-b border-[var(--gray-100)]">
          <h3 className="text-h4 flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--violet-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Storefront Preview
          </h3>
        </div>
        
        {/* Hero Image Preview - Clickable to upload cover photo */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && !localStorage.getItem("vehndr_cover_photo_tip_seen")) {
              setShowCoverPhotoTip(true);
            } else {
              coverPhotoFileInputRef.current?.click();
            }
          }}
          className="relative w-full text-left group"
        >
          {heroUrl ? (
            <div className="aspect-[21/9] bg-[var(--gray-100)]">
              <SmartImage 
                src={heroUrl} 
                alt="Hero preview" 
                className="w-full h-full object-cover"
                style={{ objectPosition: heroObjectPosition }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              {/* Edit overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="bg-white/90 rounded-full p-3 shadow-lg">
                  <svg className="w-5 h-5 text-[var(--gray-700)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-[21/9] bg-gradient-primary group-hover:opacity-90 transition-opacity relative">
              {/* Upload prompt when no image */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white/80">
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm font-medium">Tap to add cover photo</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Store Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white pointer-events-none">
            <h2 className="text-h2 text-white drop-shadow-lg">{formData.name || 'Your Business Name'}</h2>
            {formData.location && (
              <p className="text-sm text-white/80 mt-1 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {formData.location}
              </p>
            )}
          </div>
        </button>

        {/* Gallery Preview */}
        {allGalleryImages.length > 0 && (
          <div className="p-4 border-t border-[var(--gray-100)]">
            <p className="text-xs text-[var(--gray-500)] mb-2">{allGalleryImages.length} gallery photo{allGalleryImages.length !== 1 ? 's' : ''}</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {allGalleryImages.slice(0, 5).map((url, index) => (
                <div key={index} className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-[var(--gray-100)]">
                  <SmartImage src={url} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
              {allGalleryImages.length > 5 && (
                <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-[var(--gray-200)] flex items-center justify-center">
                  <span className="text-sm font-semibold text-[var(--gray-600)]">+{allGalleryImages.length - 5}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Preview */}
      <PreviewSection />

      {error && (
        <div className="card bg-[var(--error)]/10 border border-[var(--error)]/30 p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[var(--error)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-[var(--error)]">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Card */}
        <div className="card bg-white p-5">
          <h3 className="text-h4 mb-4">Basic Information</h3>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                Business Name <span className="text-[var(--error)]">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="Your business name"
              />
            </div>

            {/* Storefront Slug */}
            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                Storefront URL
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs text-[var(--gray-500)] sm:whitespace-nowrap">
                  https://www.vehndr.com/store/
                </span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => {
                    const nextSlug = normalizeSlugInput(e.target.value);
                    setFormData({ ...formData, slug: nextSlug });
                    if (nextSlug && !slugPattern.test(nextSlug)) {
                      setSlugError("Use lowercase letters, numbers, and dashes only.");
                    } else {
                      setSlugError(null);
                    }
                  }}
                  className="input flex-1"
                  placeholder="your-business-name"
                />
              </div>
              <p className="text-xs text-[var(--gray-500)] mt-2">
                This is the link you can share with customers.
              </p>
              {slugError && (
                <p className="text-xs text-[var(--error)] mt-2">{slugError}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                Description <span className="text-[var(--error)]">*</span>
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="input h-auto py-3"
                placeholder="Tell customers about your business..."
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
                Location <span className="text-[var(--error)]">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="input flex-1"
                  placeholder="City, State"
                />
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={loadingLocation}
                  className="btn btn-outlined whitespace-nowrap flex items-center gap-2 px-4"
                  title="Use my current location"
                >
                  {loadingLocation ? (
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                  <span className="hidden sm:inline">Use My Location</span>
                </button>
              </div>
            </div>

            {/* Tax Setting */}
            <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--gray-50)] border border-[var(--gray-200)]">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="collectTax"
                  checked={formData.collectTax}
                  onChange={(e) => setFormData({ ...formData, collectTax: e.target.checked })}
                  className="w-5 h-5 mt-0.5 rounded border-[var(--gray-300)] text-[var(--violet-600)] focus:ring-[var(--violet-500)]"
                />
                <label htmlFor="collectTax" className="flex-1 cursor-pointer">
                  <div className="font-medium text-[var(--gray-900)]">Collect sales tax at checkout</div>
                  <div className="text-xs text-[var(--gray-500)] mt-1">
                    When enabled, customers are charged tax during checkout. Turn off if your business should not collect tax through Vehndr.
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Photo Card - Photo of the actual person */}
        <div id="profile-photo" className="card bg-white p-5 scroll-mt-20">
          <h3 className="text-h4 mb-2">Your Profile Photo</h3>
          <p className="text-sm text-[var(--gray-500)] mb-4">
            A photo of you, the vendor. This helps organizers and customers put a face to your business.
          </p>

          <div className="flex items-start gap-4">
            {/* Current Profile Photo */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-[var(--violet-100)] border-4 border-[var(--gray-100)]">
                {(formData.profileImageUrl || formData.profileImage) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={formData.profileImage ? URL.createObjectURL(formData.profileImage) : formData.profileImageUrl}
                    alt="Profile photo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-[var(--violet-300)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
              {(formData.profileImageUrl || formData.profileImage) && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, profileImage: null, profileImageUrl: '' })}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[var(--gray-700)] text-white flex items-center justify-center hover:bg-[var(--gray-800)] transition-colors shadow-sm"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Upload Button */}
            <div className="flex-1">
              <input
                ref={profilePhotoFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const typeCheck = validateFileType(file);
                    if (!typeCheck.valid) {
                      setError(typeCheck.message);
                      return;
                    }
                    const sizeCheck = validateFileSize(file, 5);
                    if (!sizeCheck.valid) {
                      setError(sizeCheck.message);
                      return;
                    }
                    setError(null);
                    // Resize and set directly (no editor for profile photo)
                    const resized = await resizeImage(file, 400, 400);
                    setFormData(prev => ({ ...prev, profileImage: resized }));
                  }
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => profilePhotoFileInputRef.current?.click()}
                className="btn btn-secondary w-full justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {(formData.profileImageUrl || formData.profileImage) ? 'Change Photo' : 'Upload Photo'}
              </button>
              <p className="text-xs text-[var(--gray-500)] mt-2 text-center">
                JPG or PNG, max 5MB
              </p>
            </div>
          </div>
        </div>

        {/* Hero Image Card */}
        <div className="card bg-white p-5">
          <h3 className="text-h4 mb-2">Cover Photo</h3>
          <p className="text-sm text-[var(--gray-500)] mb-4">
            This banner image appears at the top of your storefront (recommended: 1200×400px)
          </p>

          {/* Cover Photo Recommendation - Good vs Bad Examples */}
          <div className="mb-6 p-4 rounded-[var(--radius-xl)] bg-[var(--violet-50)] border border-[var(--violet-100)]">
            <p className="text-sm font-medium text-[var(--foreground)] mb-3">
              Use a photo of your business in action—not a logo. Professional quality helps attract bookings.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center">
                <div className="w-full aspect-[2/1] rounded-lg overflow-hidden border-2 border-[var(--mint-500)] shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/onboarding/cover-good.svg"
                    alt="Good example: business in action"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs font-semibold text-[var(--mint-600)] mt-2">Good example</p>
                <p className="text-xs text-[var(--gray-600)] text-center">Real setup, booth, or service in action</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-full aspect-[2/1] rounded-lg overflow-hidden border-2 border-[var(--gray-300)] shadow-sm opacity-80">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/onboarding/cover-bad.svg"
                    alt="Bad example: logo only"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs font-semibold text-[var(--gray-600)] mt-2">Avoid</p>
                <p className="text-xs text-[var(--gray-600)] text-center">Logo only, blurry, or stock clip-art</p>
              </div>
            </div>
          </div>

          {/* Current/Preview Image */}
          {(formData.heroImageUrl || formData.heroImage) && (
            <div className="relative mb-4 rounded-xl overflow-hidden">
              <div className="aspect-[3/1] bg-[var(--gray-100)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={formData.heroImage ? URL.createObjectURL(formData.heroImage) : formData.heroImageUrl}
                  alt="Cover photo"
                  className="w-full h-full object-cover"
                  style={{ objectPosition: getHeroObjectPosition(formData.heroFocalX, formData.heroFocalY) }}
                />
              </div>
              <button
                type="button"
                onClick={() => openHeroEditor(formData.heroImage ? URL.createObjectURL(formData.heroImage) : formData.heroImageUrl)}
                className="absolute top-2 left-2 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-semibold hover:bg-black/70 transition-colors"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setFormData({
                  ...formData,
                  heroImage: null,
                  heroImageUrl: '',
                  heroFocalX: DEFAULT_HERO_FOCAL_POINT.x,
                  heroFocalY: DEFAULT_HERO_FOCAL_POINT.y
                })}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {(formData.heroImageUrl || formData.heroImage) && (
            <FocalPointPicker
              imageSrc={formData.heroImage ? URL.createObjectURL(formData.heroImage) : formData.heroImageUrl}
              focalX={formData.heroFocalX}
              focalY={formData.heroFocalY}
              onChange={({ x, y }) =>
                setFormData((prev) => ({
                  ...prev,
                  heroFocalX: x,
                  heroFocalY: y
                }))
              }
            />
          )}

          {/* Upload Button */}
          <input
            ref={coverPhotoFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={async (e) => {
              const file = e.target.files[0];
              if (file) {
                const typeCheck = validateFileType(file);
                if (!typeCheck.valid) {
                  setError(typeCheck.message);
                  return;
                }
                const sizeCheck = validateFileSize(file, 10);
                if (!sizeCheck.valid) {
                  setError(sizeCheck.message);
                  return;
                }
                setError(null);
                setFormData((prev) => ({
                  ...prev,
                  heroFocalX: DEFAULT_HERO_FOCAL_POINT.x,
                  heroFocalY: DEFAULT_HERO_FOCAL_POINT.y
                }));
                openHeroEditor(URL.createObjectURL(file), file.name);
              }
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && !localStorage.getItem("vehndr_cover_photo_tip_seen")) {
                setShowCoverPhotoTip(true);
              } else {
                coverPhotoFileInputRef.current?.click();
              }
            }}
            className="w-full text-left"
          >
            <div className="border-2 border-dashed border-[var(--gray-300)] rounded-xl p-6 text-center hover:border-[var(--violet-400)] hover:bg-[var(--violet-50)] transition-colors cursor-pointer">
              <div className="w-12 h-12 mx-auto rounded-full bg-[var(--violet-100)] flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-[var(--violet-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-medium text-[var(--foreground)]">Upload cover photo</p>
              <p className="text-sm text-[var(--gray-500)] mt-1">JPG, PNG or GIF up to 10MB</p>
            </div>
          </button>
        </div>

        <GuidanceModal
          isOpen={showCoverPhotoTip}
          onClose={() => setShowCoverPhotoTip(false)}
          title="Cover Photo Tips"
          description="Use a photo of your business in action—not a logo. Show your booth, food truck, DJ setup, or service in progress. Professional quality helps attract more bookings."
          primaryAction={{
            label: "Got it",
            onClick: () => {
              if (typeof window !== "undefined") {
                localStorage.setItem("vehndr_cover_photo_tip_seen", "true");
              }
              setShowCoverPhotoTip(false);
              setTimeout(() => coverPhotoFileInputRef.current?.click(), 100);
            }
          }}
        />

        {/* Gallery Images Card */}
        <div className="card bg-white p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-h4">Gallery Photos</h3>
            {galleryItems.length > 0 && (
              <span className="chip chip-filled text-xs">
                {galleryItems.length} photo{galleryItems.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--gray-500)] mb-2">
            Add photos to showcase your products, services, and workspace. Drag to reorder.
          </p>
          <p className="text-sm text-[var(--violet-600)] font-medium mb-4 px-3 py-2 rounded-lg bg-[var(--violet-50)] border border-[var(--violet-100)]">
            Showcase your work, products, and setup. Mix close-ups and wide shots for best impact.
          </p>

          {/* Existing & New Gallery Images */}
          {galleryItems.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleGalleryDragEnd}
              >
                <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
                  {galleryItems.map((item, index) => (
                    <SortableGalleryImage
                      key={item.id}
                      id={item.id}
                      item={item}
                      index={index}
                      onEdit={() => openGalleryEditor(item)}
                      onRemove={() => removeGalleryImage(item.id, item.isExisting)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Upload Button */}
          <label className="block">
            <div className="border-2 border-dashed border-[var(--gray-300)] rounded-xl p-4 text-center hover:border-[var(--violet-400)] hover:bg-[var(--violet-50)] transition-colors cursor-pointer">
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-[var(--violet-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-medium text-[var(--violet-600)]">Add photos</span>
              </div>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                  const validFiles = [];
                  const errors = [];
                  files.forEach((file) => {
                    const typeCheck = validateFileType(file);
                    if (!typeCheck.valid) {
                      errors.push(typeCheck.message);
                      return;
                    }
                    const sizeCheck = validateFileSize(file, 10);
                    if (!sizeCheck.valid) {
                      errors.push(sizeCheck.message);
                      return;
                    }
                    validFiles.push(file);
                  });

                  if (errors.length > 0) {
                    setError(errors[0]);
                  }

                  if (validFiles.length === 0) {
                    return;
                  }

                  setError(null);
                  setProcessingImages(true);
                  try {
                    const totalOriginal = validFiles.reduce((sum, f) => sum + f.size, 0);
                    const resizedFiles = await resizeImages(validFiles);
                    const totalResized = resizedFiles.reduce((sum, f) => sum + f.size, 0);
                    if (totalResized < totalOriginal) {
                      console.log(`Gallery images resized: ${formatFileSize(totalOriginal)} → ${formatFileSize(totalResized)}`);
                    }
                    setGalleryItems(prev => ([
                      ...prev,
                      ...resizedFiles.map(createGalleryItem)
                    ]));
                  } catch (err) {
                    console.error('Failed to resize images:', err);
                    setGalleryItems(prev => ([
                      ...prev,
                      ...validFiles.map(createGalleryItem)
                    ]));
                  } finally {
                    setProcessingImages(false);
                  }
                }
              }}
              className="hidden"
            />
          </label>
        </div>

        {/* Categories Card */}
        <div className="card bg-white p-5">
          <h3 className="text-h4 mb-2">Categories</h3>
          <p className="text-sm text-[var(--gray-500)] mb-4">
            Select categories that best describe your business
          </p>
          
          <div className="flex flex-wrap gap-2">
            {VENDOR_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                className={`chip ${
                  formData.categories.includes(category)
                    ? 'chip-active'
                    : 'chip-outlined'
                }`}
              >
                {formData.categories.includes(category) && (
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {CATEGORY_DISPLAY[category]?.label || category}
              </button>
            ))}
          </div>
          
          {formData.categories.length === 0 && (
            <p className="text-sm text-[var(--error)] mt-3 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Please select at least one category
            </p>
          )}
        </div>

        {/* Processing indicator */}
        {(processingImages || savingOrder) && (
          <div className="card bg-[var(--violet-50)] border border-[var(--violet-200)] p-4">
            <div className="flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-[var(--violet-600)]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-[var(--violet-700)]">
                {savingOrder ? "Saving gallery order..." : "Optimizing images for upload..."}
              </p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={saving || processingImages || formData.categories.length === 0}
          className="w-full btn btn-gradient flex items-center justify-center gap-2"
        >
          {saving && (
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {saving ? 'Saving...' : (vendor ? 'Save Changes' : 'Create Store Profile')}
        </button>
      </form>

      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-[var(--radius-xl)] bg-white p-5 shadow-xl">
            <h4 className="text-lg font-semibold text-[var(--gray-900)]">Remove this photo?</h4>
            <p className="text-sm text-[var(--gray-600)] mt-1">
              This will permanently delete the photo from your gallery.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmRemove(null)}
                className="flex-1 btn btn-outlined"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                className="flex-1 btn btn-gradient"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
      <ImageEditorModal
        isOpen={heroEditor.isOpen}
        imageSrc={heroEditor.imageSrc}
        fileName={heroEditor.fileName}
        initialAspect={3 / 1}
        onClose={() => setHeroEditor({ isOpen: false, imageSrc: null, fileName: "cover-photo.jpg" })}
        onSave={async (editedFile) => {
          setProcessingImages(true);
          try {
            const originalSize = editedFile.size;
            const resizedFile = await resizeImage(editedFile, { maxWidth: 2400, maxHeight: 800 });
            const newSize = resizedFile.size;
            if (newSize < originalSize) {
              console.log(`Hero image resized: ${formatFileSize(originalSize)} → ${formatFileSize(newSize)}`);
            }
            setFormData(prev => ({ ...prev, heroImage: resizedFile }));
          } catch (err) {
            console.error("Failed to resize image:", err);
            setFormData(prev => ({ ...prev, heroImage: editedFile }));
          } finally {
            setProcessingImages(false);
          }
        }}
      />
      <ImageEditorModal
        isOpen={galleryEditor.isOpen}
        imageSrc={galleryEditor.imageSrc}
        fileName={galleryEditor.fileName}
        initialAspect={1}
        onClose={() => setGalleryEditor({
          isOpen: false,
          imageSrc: null,
          fileName: "gallery-photo.jpg",
          targetId: null,
          isExisting: false
        })}
        onSave={(editedFile) => {
          setGalleryItems((prev) =>
            prev.map((item) => {
              if (item.id !== galleryEditor.targetId) return item;
              return {
                ...item,
                url: URL.createObjectURL(editedFile),
                file: editedFile,
                isExisting: false
              };
            })
          );
        }}
      />
    </div>
  );
}

function FocalPointPicker({ imageSrc, focalX, focalY, onChange }) {
  const pickerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const x = clampFocalPoint(focalX);
  const y = clampFocalPoint(focalY);

  const updateFocalPoint = (event) => {
    const bounds = pickerRef.current?.getBoundingClientRect();
    if (!bounds) return;

    onChange?.({
      x: clampFocalPoint(((event.clientX - bounds.left) / bounds.width) * 100),
      y: clampFocalPoint(((event.clientY - bounds.top) / bounds.height) * 100)
    });
  };

  const handlePointerDown = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
    updateFocalPoint(event);
  };

  const handlePointerMove = (event) => {
    if (!dragging) return;
    updateFocalPoint(event);
  };

  const handlePointerEnd = () => {
    setDragging(false);
  };

  const handleKeyDown = (event) => {
    const step = event.shiftKey ? 10 : 2;
    const updates = {
      ArrowLeft: { x: clampFocalPoint(x - step), y },
      ArrowRight: { x: clampFocalPoint(x + step), y },
      ArrowUp: { x, y: clampFocalPoint(y - step) },
      ArrowDown: { x, y: clampFocalPoint(y + step) }
    };
    const nextPoint = updates[event.key];
    if (!nextPoint) return;

    event.preventDefault();
    onChange?.(nextPoint);
  };

  return (
    <div className="mb-4 rounded-xl border border-[var(--gray-200)] bg-[var(--gray-50)] p-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-sm font-semibold text-[var(--foreground)]">Banner focal point</span>
        <span className="text-xs text-[var(--gray-500)]">{Math.round(x)}% / {Math.round(y)}%</span>
      </div>
      <div
        ref={pickerRef}
        role="slider"
        tabIndex={0}
        aria-label="Banner focal point"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(x)}
        aria-valuetext={`${Math.round(x)} percent from left, ${Math.round(y)} percent from top`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onKeyDown={handleKeyDown}
        className="relative aspect-[3/1] overflow-hidden rounded-lg bg-[var(--gray-200)] touch-none cursor-crosshair"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt=""
          draggable={false}
          className="w-full h-full object-cover select-none"
          style={{ objectPosition: getHeroObjectPosition(x, y) }}
        />
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
        <div
          className="absolute w-9 h-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black/35 shadow-lg pointer-events-none"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--gray-500)]">
        Tap or drag the marker to keep the main subject visible on the storefront banner.
      </p>
    </div>
  );
}

function SortableGalleryImage({ id, item, index, onEdit, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative aspect-square rounded-lg overflow-hidden group bg-[var(--gray-100)] cursor-grab active:cursor-grabbing transition-all"
      {...attributes}
      {...listeners}
    >
      <SmartImage src={item.url} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover pointer-events-none" />
      {!item.isExisting && (
        <span className="absolute top-1 left-1 badge bg-[var(--violet-600)] text-white text-[10px]">New</span>
      )}
      <div className="absolute bottom-1 left-1 w-5 h-5 rounded bg-black/30 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit?.();
        }}
        className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6-6m2.828 2.828l-6 6M7 17l-2 2 2-2z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove?.();
        }}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
