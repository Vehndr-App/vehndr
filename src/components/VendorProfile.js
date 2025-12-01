"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";

const CATEGORY_OPTIONS = [
  "Catering",
  "Photography",
  "Videography",
  "Florist",
  "DJ/Music",
  "Venue",
  "Decoration",
  "Planning",
  "Transportation",
  "Entertainment",
  "Other"
];

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
    categories: []
  });

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
        categories: vendorData.categories || []
      };
      setFormData(newFormData);
    } catch (err) {
      console.error("Failed to fetch vendor", err);
      setError(`Failed to load vendor profile: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user?.vendorId, user]);

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

  if (loading) {
    return (
      <div className="rounded-xl border border-black/[.08] p-6 bg-white shadow-sm">
        <div className="text-sm text-gray-500">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-black/[.08] p-6 bg-white shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Vendor Profile</h2>
        <p className="text-sm text-gray-600 mt-1">
          {vendor ? 'Update your vendor profile information' : 'Create your vendor profile to start selling'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your business name"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Tell customers about your business, services, and what makes you unique"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="City, State or Region"
          />
        </div>

        {/* Hero Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hero Image
          </label>

          {/* Current Image Preview */}
          {(formData.heroImageUrl || formData.heroImage) && (
            <div className="mb-3">
              <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={formData.heroImage ? URL.createObjectURL(formData.heroImage) : formData.heroImageUrl}
                  alt="Hero preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                setFormData({ ...formData, heroImage: file });
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Upload a banner image for your vendor profile page (JPG, PNG, or GIF)
          </p>
        </div>

        {/* Categories */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Categories <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {CATEGORY_OPTIONS.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => toggleCategory(category)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formData.categories.includes(category)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          {formData.categories.length === 0 && (
            <p className="text-xs text-red-500 mt-2">Please select at least one category</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving || formData.categories.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {saving ? 'Saving...' : (vendor ? 'Update Profile' : 'Create Profile')}
          </button>
        </div>
      </form>
    </div>
  );
}
