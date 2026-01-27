"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../contexts/AuthContext";
import AuthGate from "../../../components/AuthGate";
import { api } from "../../../services/api";
import ImageEditorModal from "../../../components/ImageEditorModal";

const EVENT_THEMES = [
  { id: "party", emoji: "🎉", label: "Party", gradient: "from-pink-500 to-purple-600" },
  { id: "dinner", emoji: "🍽️", label: "Dinner", gradient: "from-amber-500 to-orange-600" },
  { id: "birthday", emoji: "🎂", label: "Birthday", gradient: "from-rose-500 to-pink-600" },
  { id: "wedding", emoji: "💒", label: "Wedding", gradient: "from-rose-400 to-pink-500" },
  { id: "brunch", emoji: "🥂", label: "Brunch", gradient: "from-yellow-400 to-orange-500" },
  { id: "outdoor", emoji: "🏕️", label: "Outdoor", gradient: "from-green-500 to-emerald-600" },
  { id: "concert", emoji: "🎸", label: "Concert", gradient: "from-violet-500 to-purple-600" },
  { id: "festival", emoji: "🎪", label: "Festival", gradient: "from-cyan-500 to-blue-600" },
  { id: "corporate", emoji: "💼", label: "Corporate", gradient: "from-slate-500 to-gray-700" },
  { id: "holiday", emoji: "🎄", label: "Holiday", gradient: "from-red-500 to-green-600" },
  { id: "wellness", emoji: "🧘", label: "Wellness", gradient: "from-teal-400 to-cyan-500" },
  { id: "custom", emoji: "✨", label: "Custom", gradient: "from-violet-500 to-magenta-500" },
];

const DRESS_CODES = [
  { id: "casual", label: "Casual", description: "Come as you are" },
  { id: "smart_casual", label: "Smart Casual", description: "Neat but relaxed" },
  { id: "cocktail", label: "Cocktail", description: "Semi-formal elegance" },
  { id: "formal", label: "Formal", description: "Black tie optional" },
  { id: "black_tie", label: "Black Tie", description: "Gowns & tuxedos" },
  { id: "costume", label: "Costume/Theme", description: "Get creative!" },
  { id: "white", label: "All White", description: "White attire only" },
  { id: "black", label: "All Black", description: "Black attire only" },
  { id: "colorful", label: "Colorful", description: "Bright & bold" },
  { id: "none", label: "No Dress Code", description: "Wear whatever" },
];

const VENDOR_CATEGORIES = [
  { id: "catering", emoji: "🍕", label: "Catering" },
  { id: "photography", emoji: "📸", label: "Photography" },
  { id: "dj", emoji: "🎧", label: "DJ/Music" },
  { id: "florist", emoji: "💐", label: "Florist" },
  { id: "decor", emoji: "🎈", label: "Decor" },
  { id: "bartender", emoji: "🍸", label: "Bartender" },
  { id: "rentals", emoji: "⛺", label: "Rentals" },
  { id: "entertainment", emoji: "🎪", label: "Entertainment" },
  { id: "beauty", emoji: "💄", label: "Hair & Makeup" },
  { id: "transport", emoji: "🚗", label: "Transportation" },
];

export default function NewEventPage() {
  return (
    <AuthGate allowedRoles={["coordinator"]}>
      <NewEventInner />
    </AuthGate>
  );
}

function NewEventInner() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editorState, setEditorState] = useState({
    isOpen: false,
    imageSrc: null,
    fileName: "event-cover.jpg"
  });
  
  // Form state
  const [eventData, setEventData] = useState({
    name: "",
    theme: null,
    coverImage: null,
    coverPreview: null,
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    locationDetails: "",
    description: "",
    dressCode: "casual",
    isPrivate: false,
    allowPlusOnes: true,
    maxGuests: "",
    rsvpDeadline: "",
    hostMessage: "",
  });

  const [selectedVendors, setSelectedVendors] = useState([]);
  const [vendorSearch, setVendorSearch] = useState("");
  const [availableVendors, setAvailableVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);

  // Fetch vendors when on step 3
  useEffect(() => {
    const fetchVendors = async () => {
      if (step !== 3) return;
      setLoadingVendors(true);
      try {
        const response = await api("/api/vendors");
        setAvailableVendors(Array.isArray(response) ? response : response?.vendors || []);
      } catch (err) {
        console.error("Failed to fetch vendors", err);
      } finally {
        setLoadingVendors(false);
      }
    };
    fetchVendors();
  }, [step]);

  const openEditor = (imageSrc, fileName = "event-cover.jpg") => {
    setEditorState({ isOpen: true, imageSrc, fileName });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      openEditor(URL.createObjectURL(file), file.name);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("event[name]", eventData.name);
      formData.append("event[description]", eventData.description);
      formData.append("event[start_time]", `${eventData.date}T${eventData.startTime}`);
      if (eventData.endTime) {
        formData.append("event[end_time]", `${eventData.date}T${eventData.endTime}`);
      }
      formData.append("event[location]", eventData.location);
      formData.append("event[dress_code]", eventData.dressCode);
      formData.append("event[theme]", eventData.theme);
      formData.append("event[is_private]", eventData.isPrivate);
      if (eventData.coverImage) {
        formData.append("event[cover_image]", eventData.coverImage);
      }
      
      selectedVendors.forEach((vendor) => {
        formData.append(`event[vendor_ids][]`, vendor.id);
      });

      const response = await api("/api/events", {
        method: "POST",
        body: formData,
        headers: {}
      });

      router.push(`/events/${response.id || response.event?.id}`);
    } catch (err) {
      console.error("Failed to create event", err);
      setError(err?.details?.error || "Failed to create event. Please try again.");
      setLoading(false);
    }
  };

  const filteredVendors = availableVendors.filter(v => 
    v.name?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.categories?.some(c => c.toLowerCase().includes(vendorSearch.toLowerCase()))
  );

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  return (
    <>
      <div className="min-h-screen bg-[var(--gray-50)] pb-24">
      {/* Progress Bar */}
      <div className="fixed top-14 left-0 right-0 z-40 bg-white border-b border-[var(--gray-100)]">
        <div className="h-1 bg-[var(--gray-100)]">
          <div 
            className="h-full bg-gradient-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : router.back()}
            className="flex items-center gap-2 text-sm font-medium text-[var(--gray-600)] hover:text-[var(--gray-900)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
          <span className="text-sm text-[var(--gray-500)]">Step {step} of {totalSteps}</span>
          <button
            onClick={() => router.push('/coordinator-dashboard')}
            className="text-sm font-medium text-[var(--gray-500)] hover:text-[var(--gray-700)]"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="pt-24 mx-auto max-w-2xl px-4 sm:px-6">
        {/* Step 1: Basic Info & Theme */}
        {step === 1 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="text-center mb-8">
              <h1 className="font-display text-3xl text-[var(--gray-900)] tracking-tight mb-2">
                Create Your Event
              </h1>
              <p className="text-[var(--gray-500)]">Let&apos;s start with the basics</p>
            </div>

            <div className="space-y-6">
              {/* Event Name */}
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-700)] mb-2">
                  Event Name *
                </label>
                <input
                  type="text"
                  value={eventData.name}
                  onChange={(e) => setEventData(prev => ({ ...prev, name: e.target.value }))}
                  className="input w-full text-lg"
                  placeholder="Summer Rooftop Party"
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* Theme Selection */}
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-700)] mb-3">
                  Event Theme
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {EVENT_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setEventData(prev => ({ ...prev, theme: theme.id }))}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-[var(--radius-xl)] border-2 transition-all ${
                        eventData.theme === theme.id
                          ? "border-[var(--violet-500)] bg-[var(--violet-50)] shadow-md"
                          : "border-[var(--gray-200)] hover:border-[var(--gray-300)] hover:bg-[var(--gray-50)]"
                      }`}
                    >
                      <span className="text-2xl">{theme.emoji}</span>
                      <span className="text-xs font-medium text-[var(--gray-700)]">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-700)] mb-2">
                  Cover Image
                </label>
                <div
                  onClick={() => {
                    if (eventData.coverPreview) {
                      openEditor(eventData.coverPreview, "event-cover.jpg");
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`relative aspect-[16/9] rounded-[var(--radius-2xl)] border-2 border-dashed cursor-pointer overflow-hidden transition-all ${
                    eventData.coverPreview
                      ? "border-transparent"
                      : "border-[var(--gray-300)] hover:border-[var(--violet-400)] bg-[var(--gray-50)] hover:bg-[var(--violet-50)]"
                  }`}
                >
                  {eventData.coverPreview ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={eventData.coverPreview}
                        alt="Cover preview"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white font-medium">Change Image</span>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--gray-400)]">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <span className="mt-2 text-sm font-medium">Click to upload</span>
                      <span className="text-xs">PNG, JPG up to 10MB</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!eventData.name}
              className="w-full mt-8 h-14 rounded-[var(--radius-xl)] bg-gradient-primary text-white font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Date, Time, Location */}
        {step === 2 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="text-center mb-8">
              <h1 className="font-display text-3xl text-[var(--gray-900)] tracking-tight mb-2">
                When & Where
              </h1>
              <p className="text-[var(--gray-500)]">Set the time and place</p>
            </div>

            <div className="space-y-6">
              {/* Date */}
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-700)] mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={eventData.date}
                  onChange={(e) => setEventData(prev => ({ ...prev, date: e.target.value }))}
                  className="input w-full"
                  min={new Date().toISOString().split('T')[0]}
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[var(--gray-700)] mb-2">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={eventData.startTime}
                    onChange={(e) => setEventData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="input w-full"
                    style={{ fontSize: '16px' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--gray-700)] mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={eventData.endTime}
                    onChange={(e) => setEventData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="input w-full"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-700)] mb-2">
                  Location *
                </label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gray-400)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <input
                    type="text"
                    value={eventData.location}
                    onChange={(e) => setEventData(prev => ({ ...prev, location: e.target.value }))}
                    className="input w-full pl-12"
                    placeholder="123 Main St, City, State"
                    style={{ fontSize: '16px' }}
                  />
                </div>
              </div>

              {/* Location Details */}
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-700)] mb-2">
                  Location Details
                </label>
                <input
                  type="text"
                  value={eventData.locationDetails}
                  onChange={(e) => setEventData(prev => ({ ...prev, locationDetails: e.target.value }))}
                  className="input w-full"
                  placeholder="Apt 4B, Ring doorbell, Rooftop access..."
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-700)] mb-2">
                  Description
                </label>
                <textarea
                  value={eventData.description}
                  onChange={(e) => setEventData(prev => ({ ...prev, description: e.target.value }))}
                  className="input w-full min-h-[120px] resize-none"
                  placeholder="Tell your guests what to expect..."
                  style={{ fontSize: '16px' }}
                />
              </div>

              {/* Dress Code */}
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-700)] mb-3">
                  Dress Code
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DRESS_CODES.map((code) => (
                    <button
                      key={code.id}
                      onClick={() => setEventData(prev => ({ ...prev, dressCode: code.id }))}
                      className={`p-3 rounded-[var(--radius-xl)] border-2 text-left transition-all ${
                        eventData.dressCode === code.id
                          ? "border-[var(--violet-500)] bg-[var(--violet-50)]"
                          : "border-[var(--gray-200)] hover:border-[var(--gray-300)]"
                      }`}
                    >
                      <span className="font-medium text-[var(--gray-900)] text-sm">{code.label}</span>
                      <p className="text-xs text-[var(--gray-500)]">{code.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy & Settings */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-[var(--gray-700)]">
                  Event Settings
                </label>
                
                <label className="flex items-center justify-between p-4 rounded-[var(--radius-xl)] border border-[var(--gray-200)] cursor-pointer hover:bg-[var(--gray-50)]">
                  <div>
                    <span className="font-medium text-[var(--gray-900)]">Private Event</span>
                    <p className="text-xs text-[var(--gray-500)]">Only invited guests can see details</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={eventData.isPrivate}
                    onChange={(e) => setEventData(prev => ({ ...prev, isPrivate: e.target.checked }))}
                    className="w-5 h-5 rounded-md border-[var(--gray-300)] text-[var(--violet-600)] focus:ring-[var(--violet-500)]"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-[var(--radius-xl)] border border-[var(--gray-200)] cursor-pointer hover:bg-[var(--gray-50)]">
                  <div>
                    <span className="font-medium text-[var(--gray-900)]">Allow Plus Ones</span>
                    <p className="text-xs text-[var(--gray-500)]">Guests can bring additional people</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={eventData.allowPlusOnes}
                    onChange={(e) => setEventData(prev => ({ ...prev, allowPlusOnes: e.target.checked }))}
                    className="w-5 h-5 rounded-md border-[var(--gray-300)] text-[var(--violet-600)] focus:ring-[var(--violet-500)]"
                  />
                </label>
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              disabled={!eventData.date || !eventData.startTime || !eventData.location}
              className="w-full mt-8 h-14 rounded-[var(--radius-xl)] bg-gradient-primary text-white font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Book Vendors */}
        {step === 3 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="text-center mb-8">
              <h1 className="font-display text-3xl text-[var(--gray-900)] tracking-tight mb-2">
                Book Vendors
              </h1>
              <p className="text-[var(--gray-500)]">Add vendors to make your event special</p>
            </div>

            <div className="space-y-6">
              {/* Vendor Categories */}
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-700)] mb-3">
                  What do you need?
                </label>
                <div className="flex flex-wrap gap-2">
                  {VENDOR_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setVendorSearch(cat.label)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[var(--gray-100)] hover:bg-[var(--violet-100)] text-[var(--gray-700)] hover:text-[var(--violet-700)] text-sm font-medium transition-colors"
                    >
                      <span>{cat.emoji}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-700)] mb-2">
                  Search Vendors
                </label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gray-400)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="input w-full pl-12"
                    placeholder="Search by name or category..."
                    style={{ fontSize: '16px' }}
                  />
                </div>
              </div>

              {/* Selected Vendors */}
              {selectedVendors.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-[var(--gray-700)] mb-3">
                    Selected Vendors ({selectedVendors.length})
                  </label>
                  <div className="space-y-2">
                    {selectedVendors.map((vendor) => (
                      <div
                        key={vendor.id}
                        className="flex items-center justify-between p-3 rounded-[var(--radius-xl)] bg-[var(--violet-50)] border border-[var(--violet-200)]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white text-lg">
                            {vendor.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-[var(--gray-900)]">{vendor.name}</p>
                            <p className="text-xs text-[var(--gray-500)]">{vendor.categories?.join(", ")}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedVendors(prev => prev.filter(v => v.id !== vendor.id))}
                          className="w-8 h-8 rounded-full hover:bg-white/50 flex items-center justify-center text-[var(--gray-500)]"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Vendors */}
              <div>
                <label className="block text-sm font-semibold text-[var(--gray-700)] mb-3">
                  Recommended Vendors
                </label>
                {loadingVendors ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 mx-auto border-2 border-[var(--violet-500)] border-t-transparent rounded-full animate-spin"/>
                  </div>
                ) : filteredVendors.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {filteredVendors.map((vendor) => {
                      const isSelected = selectedVendors.some(v => v.id === vendor.id);
                      return (
                        <button
                          key={vendor.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedVendors(prev => prev.filter(v => v.id !== vendor.id));
                            } else {
                              setSelectedVendors(prev => [...prev, vendor]);
                            }
                          }}
                          className={`w-full flex items-center justify-between p-4 rounded-[var(--radius-xl)] border-2 transition-all ${
                            isSelected
                              ? "border-[var(--violet-500)] bg-[var(--violet-50)]"
                              : "border-[var(--gray-200)] hover:border-[var(--gray-300)]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {vendor.hero_image_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={vendor.hero_image_url}
                                alt={vendor.name}
                                className="w-12 h-12 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--violet-400)] to-[var(--magenta-500)] flex items-center justify-center text-white text-xl font-bold">
                                {vendor.name?.charAt(0)}
                              </div>
                            )}
                            <div className="text-left">
                              <p className="font-semibold text-[var(--gray-900)]">{vendor.name}</p>
                              <div className="flex items-center gap-2 text-xs text-[var(--gray-500)]">
                                <span>{vendor.categories?.join(", ") || "Vendor"}</span>
                                {vendor.rating && (
                                  <span className="flex items-center gap-0.5">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--amber-500)" stroke="none">
                                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                    </svg>
                                    {vendor.rating}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? "border-[var(--violet-500)] bg-[var(--violet-500)]"
                              : "border-[var(--gray-300)]"
                          }`}>
                            {isSelected && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[var(--gray-500)]">
                    <p>No vendors found</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <button
                onClick={() => setStep(4)}
                className="w-full h-14 rounded-[var(--radius-xl)] bg-gradient-primary text-white font-semibold text-lg hover:shadow-lg transition-all"
              >
                Continue
              </button>
              <button
                onClick={() => setStep(4)}
                className="w-full h-12 rounded-[var(--radius-xl)] text-[var(--gray-600)] font-medium hover:bg-[var(--gray-100)] transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review & Create */}
        {step === 4 && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="text-center mb-8">
              <h1 className="font-display text-3xl text-[var(--gray-900)] tracking-tight mb-2">
                Review Your Event
              </h1>
              <p className="text-[var(--gray-500)]">Make sure everything looks good</p>
            </div>

            {/* Event Preview Card */}
            <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] overflow-hidden">
              {/* Cover Image */}
              <div className="relative aspect-[16/9]">
                {eventData.coverPreview ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={eventData.coverPreview}
                    alt="Event cover"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${EVENT_THEMES.find(t => t.id === eventData.theme)?.gradient || "from-violet-500 to-magenta-500"}`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-6xl">{EVENT_THEMES.find(t => t.id === eventData.theme)?.emoji || "🎉"}</span>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-sm font-medium text-[var(--gray-700)]">
                    {EVENT_THEMES.find(t => t.id === eventData.theme)?.label || "Event"}
                  </span>
                </div>
              </div>

              {/* Event Info */}
              <div className="p-6">
                <h2 className="font-display text-2xl text-[var(--gray-900)] mb-4">
                  {eventData.name}
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-[var(--gray-600)]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span>
                      {eventData.date && new Date(eventData.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[var(--gray-600)]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>
                      {eventData.startTime}
                      {eventData.endTime && ` - ${eventData.endTime}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[var(--gray-600)]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span>{eventData.location}</span>
                  </div>

                  <div className="flex items-center gap-3 text-[var(--gray-600)]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                      <line x1="7" y1="7" x2="7.01" y2="7"/>
                    </svg>
                    <span>{DRESS_CODES.find(d => d.id === eventData.dressCode)?.label}</span>
                  </div>
                </div>

                {eventData.description && (
                  <p className="text-[var(--gray-600)] mb-6">{eventData.description}</p>
                )}

                {/* Selected Vendors */}
                {selectedVendors.length > 0 && (
                  <div className="pt-4 border-t border-[var(--gray-100)]">
                    <h3 className="text-sm font-semibold text-[var(--gray-700)] mb-3">
                      Booked Vendors ({selectedVendors.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedVendors.map((vendor) => (
                        <span 
                          key={vendor.id}
                          className="px-3 py-1.5 rounded-full bg-[var(--violet-100)] text-[var(--violet-700)] text-sm font-medium"
                        >
                          {vendor.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-[var(--radius-lg)]">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full mt-8 h-14 rounded-[var(--radius-xl)] bg-gradient-primary text-white font-semibold text-lg disabled:opacity-50 hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              )}
              {loading ? "Creating Event..." : "Create Event 🎉"}
            </button>
          </div>
        )}
      </div>
      </div>
      <ImageEditorModal
        isOpen={editorState.isOpen}
        imageSrc={editorState.imageSrc}
        fileName={editorState.fileName}
        initialAspect={16 / 9}
        onClose={() => setEditorState({ isOpen: false, imageSrc: null, fileName: "event-cover.jpg" })}
        onSave={(editedFile) => {
          setEventData(prev => ({
            ...prev,
            coverImage: editedFile,
            coverPreview: URL.createObjectURL(editedFile)
          }));
        }}
      />
    </>
  );
}

