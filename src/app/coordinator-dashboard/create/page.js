"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import AuthGate from "../../../components/AuthGate";
import Link from "next/link";
import { api } from "../../../services/api";
import ImageEditorModal from "../../../components/ImageEditorModal";

const EVENT_THEMES = [
  { id: "classic", name: "Classic", font: "font-body", style: "elegant" },
  { id: "eclectic", name: "Eclectic", font: "font-display", style: "playful" },
  { id: "fancy", name: "Fancy", font: "italic", style: "luxurious" },
  { id: "literary", name: "Literary", font: "serif", style: "refined" },
];

const EVENT_CATEGORIES = [
  { id: "festival", label: "Festival", emoji: "🎪" },
  { id: "party", label: "Party", emoji: "🎉" },
  { id: "market", label: "Market", emoji: "🛍️" },
  { id: "food", label: "Food & Drink", emoji: "🍕" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "wellness", label: "Wellness", emoji: "💆" },
  { id: "educational", label: "Educational", emoji: "📚" },
  { id: "networking", label: "Networking", emoji: "🤝" },
  { id: "art", label: "Art & Culture", emoji: "🎨" },
  { id: "sports", label: "Sports", emoji: "⚽" },
];

const COVER_STYLES = [
  { id: "gradient-primary", className: "bg-gradient-primary" },
  { id: "gradient-secondary", className: "bg-gradient-secondary" },
  { id: "gradient-sunset", className: "bg-gradient-sunset" },
  { id: "gradient-warm", className: "bg-gradient-warm" },
  { id: "gradient-vendor", className: "bg-gradient-vendor" },
  { id: "gradient-organizer", className: "bg-gradient-organizer" },
];

export default function CreateEventPage() {
  return (
    <AuthGate allowedRoles={["coordinator"]}>
      <CreateEventInner />
    </AuthGate>
  );
}

function CreateEventInner() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef(null);
  
  // Event state
  const [eventData, setEventData] = useState({
    name: "",
    description: "",
    location: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    category: "",
    attendees: "",
    theme: "classic",
    coverStyle: "gradient-primary",
    coverImage: null,
    coverImagePreview: null,
    costPerPerson: "",
    capacity: "",
    guestsCanInvite: true,
    dressCode: "",
    playlistLink: "",
    registryLink: "",
    externalLink: "",
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showCoverOptions, setShowCoverOptions] = useState(false);
  const [editorState, setEditorState] = useState({
    isOpen: false,
    imageSrc: null,
    fileName: "event-cover.jpg"
  });
  
  // Modal state for quick add buttons
  const [activeModal, setActiveModal] = useState(null);
  const [modalValue, setModalValue] = useState("");

  const handleInputChange = (field, value) => {
    setEventData(prev => ({ ...prev, [field]: value }));
  };

  const openEditor = (imageSrc, fileName = "event-cover.jpg") => {
    setEditorState({ isOpen: true, imageSrc, fileName });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      openEditor(URL.createObjectURL(file), file.name);
    }
  };

  const handleSaveDraft = async () => {
    await saveEvent("draft");
  };

  const handlePublish = async () => {
    await saveEvent("upcoming");
  };

  const openModal = (type, currentValue) => {
    setActiveModal(type);
    setModalValue(currentValue || "");
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalValue("");
  };

  const saveModalValue = () => {
    if (activeModal && modalValue) {
      handleInputChange(activeModal, modalValue);
    }
    closeModal();
  };

  const saveEvent = async (status) => {
    setSaving(true);
    setError(null);

    try {
      // Validate required fields
      if (!eventData.name.trim()) {
        throw new Error("Please enter an event name");
      }
      if (!eventData.startDate) {
        throw new Error("Please select a start date");
      }
      if (!eventData.endDate) {
        throw new Error("Please select an end date");
      }

      // Combine date and time
      const startDateTime = eventData.startTime 
        ? `${eventData.startDate}T${eventData.startTime}:00`
        : `${eventData.startDate}T00:00:00`;
      const endDateTime = eventData.endTime 
        ? `${eventData.endDate}T${eventData.endTime}:00`
        : `${eventData.endDate}T23:59:59`;

      const payload = {
        name: eventData.name,
        description: eventData.description,
        location: eventData.location,
        start_date: startDateTime,
        end_date: endDateTime,
        category: eventData.category,
        attendees: eventData.attendees ? parseInt(eventData.attendees) : 0,
        status: status,
        image: eventData.coverImagePreview || null,
      };

      const event = await api("/api/events", {
        method: "POST",
        body: payload,
      });
      
      // Redirect to the event page or dashboard
      router.push(`/events/${event.id}`);
    } catch (err) {
      console.error("Failed to create event:", err);
      // Show more detailed error message
      const errorMessage = err.details?.error || err.details?.errors?.join(", ") || err.message || "Failed to create event";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const selectedCover = COVER_STYLES.find(c => c.id === eventData.coverStyle);

  return (
    <div className="min-h-screen bg-[var(--gray-900)]">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[var(--violet-500)]/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[var(--magenta-500)]/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--coral-500)]/10 rounded-full blur-[150px]" />
        
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Modal for Quick Add */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-[var(--gray-800)] rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">
              {activeModal === "externalLink" && "Add External Link"}
              {activeModal === "playlistLink" && "Add Playlist Link"}
              {activeModal === "registryLink" && "Add Registry Link"}
              {activeModal === "dressCode" && "Set Dress Code"}
            </h3>
            <input
              type={activeModal === "dressCode" ? "text" : "url"}
              value={modalValue}
              onChange={(e) => setModalValue(e.target.value)}
              placeholder={activeModal === "dressCode" ? "e.g., Casual, Black Tie, etc." : "https://..."}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[var(--violet-500)] transition-colors"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 bg-white/5 text-white/70 rounded-xl font-medium hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveModalValue}
                className="flex-1 px-4 py-2.5 bg-[var(--violet-500)] text-white rounded-xl font-medium hover:bg-[var(--violet-600)] transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--gray-900)]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/coordinator-dashboard" 
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              <span className="text-sm font-medium">Back</span>
            </Link>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                onClick={handlePublish}
                disabled={saving}
                className="px-5 py-2.5 bg-gradient-to-r from-[var(--violet-500)] to-[var(--magenta-500)] text-white text-sm font-semibold rounded-full hover:shadow-lg hover:shadow-[var(--violet-500)]/30 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    Publish Event
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Toast */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-[var(--error)] text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 hover:bg-white/20 rounded-full p-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-32">
        {/* Event Title Section */}
        <div className="text-center mb-8">
          <input
            type="text"
            value={eventData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            placeholder="Untitled Event"
            className={`w-full text-center text-3xl sm:text-4xl md:text-5xl font-bold bg-transparent border-none outline-none text-white placeholder-white/40 ${
              eventData.theme === "fancy" ? "italic" : ""
            } ${eventData.theme === "literary" ? "font-serif" : "font-display"}`}
          />
          
          {/* Theme Selector */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {EVENT_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleInputChange("theme", theme.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  eventData.theme === theme.id
                    ? "bg-white/20 text-white"
                    : "text-white/50 hover:text-white/80 hover:bg-white/10"
                } ${theme.id === "fancy" ? "italic" : ""} ${theme.id === "literary" ? "font-serif" : ""}`}
              >
                {theme.name}
              </button>
            ))}
          </div>
        </div>

        {/* Cover Image Section */}
        <div className="relative mb-8">
          <div 
            className={`relative aspect-[16/10] rounded-[var(--radius-2xl)] overflow-hidden cursor-pointer group ${
              eventData.coverImagePreview ? "" : selectedCover?.className || "bg-gradient-primary"
            }`}
            onClick={() => setShowCoverOptions(!showCoverOptions)}
          >
            {eventData.coverImagePreview ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img 
                src={eventData.coverImagePreview} 
                alt="Event cover" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white/60">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-50">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <p className="text-sm font-medium">Click to add cover image</p>
                </div>
              </div>
            )}
            
            {/* Edit Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (eventData.coverImagePreview) {
                  openEditor(eventData.coverImagePreview, "event-cover.jpg");
                } else {
                  fileInputRef.current?.click();
                }
              }}
              className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm text-[var(--gray-900)] rounded-full text-sm font-medium hover:bg-white transition-colors shadow-lg"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Cover Style Options */}
          {showCoverOptions && !eventData.coverImagePreview && (
            <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-[var(--gray-800)] rounded-[var(--radius-xl)] border border-white/10 z-10">
              <p className="text-xs text-white/60 uppercase tracking-wider mb-3">Choose a gradient</p>
              <div className="flex gap-2 flex-wrap">
                {COVER_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => {
                      handleInputChange("coverStyle", style.id);
                      setShowCoverOptions(false);
                    }}
                    className={`w-12 h-12 rounded-xl ${style.className} transition-all ${
                      eventData.coverStyle === style.id ? "ring-2 ring-white ring-offset-2 ring-offset-[var(--gray-800)]" : "hover:scale-105"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full mt-3 py-2 border border-dashed border-white/20 rounded-xl text-white/60 text-sm font-medium hover:border-white/40 hover:text-white/80 transition-colors"
              >
                Upload custom image
              </button>
            </div>
          )}
        </div>

        {/* Date & Time Section */}
        <div className="bg-[var(--gray-800)]/80 backdrop-blur-sm rounded-[var(--radius-2xl)] p-6 mb-4 border border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--violet-500)]/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--violet-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold">Set a date...</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wider mb-2">Start</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={eventData.startDate}
                  onChange={(e) => handleInputChange("startDate", e.target.value)}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[var(--violet-500)] transition-colors"
                />
                <input
                  type="time"
                  value={eventData.startTime}
                  onChange={(e) => handleInputChange("startTime", e.target.value)}
                  className="w-28 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[var(--violet-500)] transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wider mb-2">End</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={eventData.endDate}
                  onChange={(e) => handleInputChange("endDate", e.target.value)}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[var(--violet-500)] transition-colors"
                />
                <input
                  type="time"
                  value={eventData.endTime}
                  onChange={(e) => handleInputChange("endTime", e.target.value)}
                  className="w-28 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[var(--violet-500)] transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Host Info */}
        <div className="bg-[var(--gray-800)]/80 backdrop-blur-sm rounded-[var(--radius-2xl)] p-6 mb-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--violet-500)] to-[var(--magenta-500)] flex items-center justify-center text-white font-semibold">
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1">
              <p className="text-xs text-white/50 uppercase tracking-wider">Hosted by</p>
              <p className="text-white font-medium">{user?.name || user?.email || "You"}</p>
            </div>
            <button className="px-4 py-2 border border-white/10 rounded-full text-white/60 text-sm font-medium hover:bg-white/5 transition-colors">
              + Add cohosts
            </button>
          </div>
        </div>

        {/* Location */}
        <div className="bg-[var(--gray-800)]/80 backdrop-blur-sm rounded-[var(--radius-2xl)] p-6 mb-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--coral-500)]/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--coral-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <input
              type="text"
              value={eventData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              placeholder="Add location"
              className="flex-1 bg-transparent text-white placeholder-white/40 outline-none"
            />
          </div>
        </div>

        {/* Capacity & Cost */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-[var(--gray-800)]/80 backdrop-blur-sm rounded-[var(--radius-2xl)] p-6 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--mint-500)]/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mint-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <input
                type="number"
                value={eventData.capacity}
                onChange={(e) => handleInputChange("capacity", e.target.value)}
                placeholder="Unlimited spots"
                className="flex-1 bg-transparent text-white placeholder-white/40 outline-none text-sm"
              />
            </div>
          </div>
          
          <div className="bg-[var(--gray-800)]/80 backdrop-blur-sm rounded-[var(--radius-2xl)] p-6 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--amber-500)]/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--amber-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <input
                type="number"
                value={eventData.costPerPerson}
                onChange={(e) => handleInputChange("costPerPerson", e.target.value)}
                placeholder="Cost per person"
                className="flex-1 bg-transparent text-white placeholder-white/40 outline-none text-sm"
              />
            </div>
          </div>
        </div>

        {/* Guest Settings */}
        <div className="bg-[var(--gray-800)]/80 backdrop-blur-sm rounded-[var(--radius-2xl)] p-6 mb-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--violet-500)]/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--violet-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </div>
              <span className="text-white">Guests can invite friends</span>
            </div>
            <button
              onClick={() => handleInputChange("guestsCanInvite", !eventData.guestsCanInvite)}
              className={`w-12 h-7 rounded-full transition-colors ${
                eventData.guestsCanInvite ? "bg-[var(--violet-500)]" : "bg-white/20"
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                eventData.guestsCanInvite ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>
        </div>

        {/* Quick Add Buttons */}
        <div className="flex gap-2 flex-wrap mb-4">
          <QuickAddButton 
            icon="🔗" 
            label="Link" 
            active={!!eventData.externalLink}
            onClick={() => openModal("externalLink", eventData.externalLink)}
          />
          <QuickAddButton 
            icon="🎵" 
            label="Playlist" 
            active={!!eventData.playlistLink}
            onClick={() => openModal("playlistLink", eventData.playlistLink)}
          />
          <QuickAddButton 
            icon="🎁" 
            label="Registry" 
            active={!!eventData.registryLink}
            onClick={() => openModal("registryLink", eventData.registryLink)}
          />
          <QuickAddButton 
            icon="👔" 
            label="Dress code" 
            active={!!eventData.dressCode}
            onClick={() => openModal("dressCode", eventData.dressCode)}
          />
        </div>

        {/* Description */}
        <div className="bg-[var(--gray-800)]/80 backdrop-blur-sm rounded-[var(--radius-2xl)] p-6 mb-4 border border-white/5">
          <textarea
            value={eventData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder="Add a description of your event"
            rows={4}
            className="w-full bg-transparent text-white placeholder-white/40 outline-none resize-none"
          />
        </div>

        {/* Category Selection */}
        <div className="bg-[var(--gray-800)]/80 backdrop-blur-sm rounded-[var(--radius-2xl)] p-6 mb-4 border border-white/5">
          <h3 className="text-white font-semibold mb-4">Event Category</h3>
          <div className="flex gap-2 flex-wrap">
            {EVENT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleInputChange("category", cat.label)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  eventData.category === cat.label
                    ? "bg-[var(--violet-500)] text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
                }`}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Expected Attendees */}
        <div className="bg-[var(--gray-800)]/80 backdrop-blur-sm rounded-[var(--radius-2xl)] p-6 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--magenta-500)]/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--magenta-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-white/50 uppercase tracking-wider mb-1">Expected Attendees</label>
              <input
                type="number"
                value={eventData.attendees}
                onChange={(e) => handleInputChange("attendees", e.target.value)}
                placeholder="Enter estimated attendance"
                className="w-full bg-transparent text-white placeholder-white/40 outline-none"
              />
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--gray-900)]/90 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="flex flex-col items-center gap-1 text-white/50 hover:text-white transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--violet-500)] to-[var(--magenta-500)]" />
                <span className="text-xs">Theme</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-white/50 hover:text-white transition-colors">
                <div className="w-8 h-8 rounded-full bg-[var(--gray-800)] border border-white/20 flex items-center justify-center">
                  <span className="text-sm">✨</span>
                </div>
                <span className="text-xs">Effect</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-white/50 hover:text-white transition-colors">
                <div className="w-8 h-8 rounded-full bg-[var(--gray-800)] border border-white/20 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </div>
                <span className="text-xs">Settings</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-white/50 hover:text-white transition-colors">
                <div className="w-8 h-8 rounded-full bg-[var(--gray-800)] border border-white/20 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </div>
                <span className="text-xs">Preview</span>
              </button>
            </div>
            
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="px-6 py-3 bg-white text-[var(--gray-900)] rounded-full font-semibold hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save draft"}
            </button>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.5;
        }
        input[type="date"]::-webkit-calendar-picker-indicator:hover,
        input[type="time"]::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }
      `}</style>
      <ImageEditorModal
        isOpen={editorState.isOpen}
        imageSrc={editorState.imageSrc}
        fileName={editorState.fileName}
        initialAspect={16 / 10}
        onClose={() => setEditorState({ isOpen: false, imageSrc: null, fileName: "event-cover.jpg" })}
        onSave={(editedFile) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            setEventData(prev => ({
              ...prev,
              coverImage: editedFile,
              coverImagePreview: event.target.result
            }));
          };
          reader.readAsDataURL(editedFile);
        }}
      />
    </div>
  );
}

function QuickAddButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
        active
          ? "bg-[var(--violet-500)] text-white"
          : "bg-[var(--gray-800)] text-white/60 border border-white/10 hover:bg-white/5 hover:text-white/80"
      }`}
    >
      <span className="text-base">+</span>
      <span>{label}</span>
    </button>
  );
}
