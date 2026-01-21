"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import SmartImage from "./SmartImage";
import { VENDOR_CATEGORIES, CATEGORY_DISPLAY } from "../constants/categories";
import { resizeImage, resizeImages, formatFileSize } from "../utils/imageResize";

export default function VendorProfile({ user, onSuccess }) {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    heroImage: null,
    heroImageUrl: '',
    galleryImages: [],           // New files to upload (File objects)
    existingGalleryImages: [],   // Existing images from server [{id, url}]
    categories: []
  });
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [processingImages, setProcessingImages] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

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
        description: vendorData.description || '',
        location: vendorData.location || '',
        heroImage: null,
        heroImageUrl: vendorData.heroImage || '',
        galleryImages: [],
        // Use galleryImagesData if available (has id+url), fallback to galleryImages URLs
        existingGalleryImages: vendorData.galleryImagesData ||
          (vendorData.galleryImages || []).map((url, i) => ({ id: `legacy_${i}`, url })),
        categories: vendorData.categories || []
      };
      setFormData(newFormData);
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
    setSaving(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('vendor[name]', formData.name);
      formDataToSend.append('vendor[description]', formData.description);
      formDataToSend.append('vendor[location]', formData.location);

      // Add categories as an array
      formData.categories.forEach(category => {
        formDataToSend.append('vendor[categories][]', category);
      });

      // Add hero image if a new file was selected
      if (formData.heroImage) {
        formDataToSend.append('vendor[hero_image]', formData.heroImage);
      } else if (vendor && vendor.heroImage && !formData.heroImageUrl) {
        // Hero image was removed (had one before, now empty, no new one selected)
        formDataToSend.append('remove_hero_image', 'true');
      }

      // Add gallery images if new files were selected
      if (formData.galleryImages && formData.galleryImages.length > 0) {
        formData.galleryImages.forEach(image => {
          formDataToSend.append('vendor[gallery_images][]', image);
        });
      }

      // When editing, send the list of existing gallery images to keep and their order
      // This allows the backend to delete images that were removed and maintain order
      if (vendor) {
        const existingImages = formData.existingGalleryImages || [];
        if (existingImages.length > 0) {
          existingImages.forEach(img => {
            formDataToSend.append('keep_gallery_images[]', img.url);
          });
          // Send the order of image IDs (existing images in their current order)
          existingImages.forEach(img => {
            if (img.id && !img.id.startsWith('legacy_')) {
              formDataToSend.append('vendor[gallery_image_order][]', img.id);
            }
          });
        } else if (vendor.galleryImages && vendor.galleryImages.length > 0) {
          // Had images before but now empty - signal to clear all
          formDataToSend.append('clear_gallery_images', 'true');
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
        heroImage: null,
        heroImageUrl: resultData.heroImage || prev.heroImageUrl,
        galleryImages: [],
        existingGalleryImages: resultData.galleryImagesData ||
          (resultData.galleryImages || []).map((url, i) => ({ id: `legacy_${i}`, url }))
      }));

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

  const toggleCategory = (category) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const removeGalleryImage = (index, isNew = false) => {
    if (isNew) {
      setFormData(prev => ({
        ...prev,
        galleryImages: (prev.galleryImages || []).filter((_, i) => i !== index)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        existingGalleryImages: (prev.existingGalleryImages || []).filter((_, i) => i !== index)
      }));
    }
  };

  // Drag and drop handlers for reordering gallery images
  const handleDragStart = (e, index, isNew) => {
    setDraggedIndex({ index, isNew });
    e.dataTransfer.effectAllowed = 'move';
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e, index, isNew) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex({ index, isNew });
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex, dropIsNew) => {
    e.preventDefault();
    if (!draggedIndex) return;

    const { index: dragIndex, isNew: dragIsNew } = draggedIndex;

    // Only allow reordering within the same category (existing or new)
    if (dragIsNew !== dropIsNew) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setFormData(prev => {
      if (dragIsNew) {
        // Reorder new gallery images
        const newImages = [...(prev.galleryImages || [])];
        const [removed] = newImages.splice(dragIndex, 1);
        newImages.splice(dropIndex, 0, removed);
        return { ...prev, galleryImages: newImages };
      } else {
        // Reorder existing gallery images
        const existingImages = [...(prev.existingGalleryImages || [])];
        const [removed] = existingImages.splice(dragIndex, 1);
        existingImages.splice(dropIndex, 0, removed);
        return { ...prev, existingGalleryImages: existingImages };
      }
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
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

    // Filter out any null/undefined URLs
    const existingGalleryUrls = (formData.existingGalleryImages || []).map(img => img.url).filter(url => url);
    const newGalleryUrls = (formData.galleryImages || []).map(f => URL.createObjectURL(f));
    const allGalleryImages = [...existingGalleryUrls, ...newGalleryUrls];

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
        
        {/* Hero Image Preview */}
        <div className="relative">
          {heroUrl ? (
            <div className="aspect-[21/9] bg-[var(--gray-100)]">
              <SmartImage 
                src={heroUrl} 
                alt="Hero preview" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
          ) : (
            <div className="aspect-[21/9] bg-gradient-primary" />
          )}
          
          {/* Store Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
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
        </div>

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
          </div>
        </div>

        {/* Hero Image Card */}
        <div className="card bg-white p-5">
          <h3 className="text-h4 mb-2">Cover Photo</h3>
          <p className="text-sm text-[var(--gray-500)] mb-4">
            This banner image appears at the top of your storefront (recommended: 1200×400px)
          </p>

          {/* Current/Preview Image */}
          {(formData.heroImageUrl || formData.heroImage) && (
            <div className="relative mb-4 rounded-xl overflow-hidden">
              <div className="aspect-[3/1] bg-[var(--gray-100)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={formData.heroImage ? URL.createObjectURL(formData.heroImage) : formData.heroImageUrl}
                  alt="Cover photo"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, heroImage: null, heroImageUrl: '' })}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Upload Button */}
          <label className="block">
            <div className="border-2 border-dashed border-[var(--gray-300)] rounded-xl p-6 text-center hover:border-[var(--violet-400)] hover:bg-[var(--violet-50)] transition-colors cursor-pointer">
              <div className="w-12 h-12 mx-auto rounded-full bg-[var(--violet-100)] flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-[var(--violet-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-medium text-[var(--foreground)]">Upload cover photo</p>
              <p className="text-sm text-[var(--gray-500)] mt-1">JPG, PNG or GIF up to 10MB</p>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (file) {
                  setProcessingImages(true);
                  try {
                    const originalSize = file.size;
                    const resizedFile = await resizeImage(file, { maxWidth: 2400, maxHeight: 800 });
                    const newSize = resizedFile.size;
                    if (newSize < originalSize) {
                      console.log(`Hero image resized: ${formatFileSize(originalSize)} → ${formatFileSize(newSize)}`);
                    }
                    setFormData(prev => ({ ...prev, heroImage: resizedFile }));
                  } catch (err) {
                    console.error('Failed to resize image:', err);
                    setFormData(prev => ({ ...prev, heroImage: file }));
                  } finally {
                    setProcessingImages(false);
                  }
                }
              }}
              className="hidden"
            />
          </label>
        </div>

        {/* Gallery Images Card */}
        <div className="card bg-white p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-h4">Gallery Photos</h3>
            {((formData.existingGalleryImages || []).length + (formData.galleryImages || []).length) > 0 && (
              <span className="chip chip-filled text-xs">
                {(formData.existingGalleryImages || []).length + (formData.galleryImages || []).length} photo{((formData.existingGalleryImages || []).length + (formData.galleryImages || []).length) !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--gray-500)] mb-4">
            Add photos to showcase your products, services, and workspace. Drag to reorder.
          </p>

          {/* Existing & New Gallery Images */}
          {((formData.existingGalleryImages || []).length > 0 || (formData.galleryImages || []).length > 0) && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {/* Existing images from server */}
              {(formData.existingGalleryImages || []).map((img, index) => (
                <div
                  key={`existing-${img.id}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index, false)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index, false)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index, false)}
                  className={`relative aspect-square rounded-lg overflow-hidden group bg-[var(--gray-100)] cursor-grab active:cursor-grabbing transition-all ${
                    dragOverIndex?.index === index && !dragOverIndex?.isNew ? 'ring-2 ring-[var(--violet-500)] scale-105' : ''
                  }`}
                >
                  <SmartImage src={img.url} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover pointer-events-none" />
                  {/* Drag handle indicator */}
                  <div className="absolute bottom-1 left-1 w-5 h-5 rounded bg-black/30 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(index, false)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              {/* New images to upload */}
              {(formData.galleryImages || []).map((file, index) => (
                <div
                  key={`new-${index}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index, true)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index, true)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index, true)}
                  className={`relative aspect-square rounded-lg overflow-hidden group bg-[var(--gray-100)] cursor-grab active:cursor-grabbing transition-all ${
                    dragOverIndex?.index === index && dragOverIndex?.isNew ? 'ring-2 ring-[var(--violet-500)] scale-105' : ''
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(file)} alt={`New ${index + 1}`} className="w-full h-full object-cover pointer-events-none" />
                  <div className="absolute inset-0 bg-[var(--violet-600)]/10 pointer-events-none" />
                  <span className="absolute top-1 left-1 badge bg-[var(--violet-600)] text-white text-[10px]">New</span>
                  {/* Drag handle indicator */}
                  <div className="absolute bottom-1 left-1 w-5 h-5 rounded bg-black/30 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(index, true)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
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
              accept="image/*"
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                  setProcessingImages(true);
                  try {
                    const totalOriginal = files.reduce((sum, f) => sum + f.size, 0);
                    const resizedFiles = await resizeImages(files);
                    const totalResized = resizedFiles.reduce((sum, f) => sum + f.size, 0);
                    if (totalResized < totalOriginal) {
                      console.log(`Gallery images resized: ${formatFileSize(totalOriginal)} → ${formatFileSize(totalResized)}`);
                    }
                    setFormData(prev => ({
                      ...prev,
                      galleryImages: [...(prev.galleryImages || []), ...resizedFiles]
                    }));
                  } catch (err) {
                    console.error('Failed to resize images:', err);
                    setFormData(prev => ({
                      ...prev,
                      galleryImages: [...(prev.galleryImages || []), ...files]
                    }));
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
        {processingImages && (
          <div className="card bg-[var(--violet-50)] border border-[var(--violet-200)] p-4">
            <div className="flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-[var(--violet-600)]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-[var(--violet-700)]">Optimizing images for upload...</p>
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
    </div>
  );
}
