"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../services/api";
import ImageEditorModal from "../../components/ImageEditorModal";

export default function ProfilePage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
    interests: [],
  });
  
  // Profile photo
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [editorState, setEditorState] = useState({
    isOpen: false,
    imageSrc: null,
    fileName: "profile.jpg"
  });

  // Interest options
  const interestOptions = [
    "Food & Beverage", "Fashion", "Art", "Music", "Wellness",
    "Technology", "Sports", "Photography", "Crafts", "Entertainment",
    "Education", "Networking", "Outdoor Activities", "Nightlife"
  ];

  const getRoleLabel = (role) => {
    if (role === "coordinator") return "event organizer";
    return role;
  };

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    // Pre-fill form with user data
    setFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      bio: user.bio || "",
      interests: user.interests || [],
    });

    if (user.avatarUrl) {
      setProfileImagePreview(user.avatarUrl);
    }
  }, [user, router]);

  const openEditor = (imageSrc, fileName = "profile.jpg") => {
    setEditorState({ isOpen: true, imageSrc, fileName });
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      openEditor(objectUrl, file.name);
    }
  };

  const handleInterestToggle = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Update user profile
      const data = new FormData();
      data.append("name", formData.name);
      data.append("phone", formData.phone);
      data.append("bio", formData.bio);
      formData.interests.forEach(interest => {
        data.append("interests[]", interest);
      });
      
      if (profileImage) {
        data.append("avatar", profileImage);
      }

      await api("/api/auth/update_profile", {
        method: "PATCH",
        body: data,
      });

      await refreshUser();
      setSuccess("Profile updated successfully!");
      
      // Clear success after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-[var(--violet-600)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gray-50)] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--violet-600)] via-[var(--magenta-500)] to-[var(--coral-500)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdi0yMGgtNjB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2EpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
        
        <div className="relative mx-auto max-w-2xl px-4 sm:px-6 py-8 text-center">
          {/* Profile Photo */}
          <div className="relative inline-block mb-4">
            <div 
              className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-xl cursor-pointer bg-white/20 backdrop-blur-sm"
              onClick={() => {
                if (profileImagePreview) {
                  openEditor(profileImagePreview, "profile.jpg");
                } else {
                  fileInputRef.current?.click();
                }
              }}
            >
              {profileImagePreview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img 
                  src={profileImagePreview} 
                  alt={user.name || "Profile"} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                  {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-[var(--gray-50)] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            {profileImagePreview && (
              <button
                type="button"
                onClick={() => openEditor(profileImagePreview, "profile.jpg")}
                className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-xs font-semibold text-white/90 bg-black/40 px-3 py-1 rounded-full"
              >
                Edit photo
              </button>
            )}
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">{user.name || "Your Profile"}</h1>
          <p className="text-white/80 text-sm capitalize">
            {getRoleLabel(user.role)}
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mx-auto max-w-2xl px-4 sm:px-6 -mt-6 mb-6 relative z-10">
        <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-4 grid grid-cols-3 gap-2">
          {user.role === 'vendor' && (
            <Link 
              href="/dashboard"
              className="flex flex-col items-center gap-2 p-3 rounded-[var(--radius-xl)] hover:bg-[var(--gray-50)] transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--violet-100)] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="9"/>
                  <rect x="14" y="3" width="7" height="5"/>
                  <rect x="14" y="12" width="7" height="9"/>
                  <rect x="3" y="16" width="7" height="5"/>
                </svg>
              </div>
              <span className="text-xs font-medium text-[var(--gray-700)]">Dashboard</span>
            </Link>
          )}
          {user.role === 'coordinator' && (
            <Link 
              href="/coordinator-dashboard"
              className="flex flex-col items-center gap-2 p-3 rounded-[var(--radius-xl)] hover:bg-[var(--gray-50)] transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--violet-100)] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                </svg>
              </div>
              <span className="text-xs font-medium text-[var(--gray-700)]">Events</span>
            </Link>
          )}
          <Link 
            href="/favorites"
            className="flex flex-col items-center gap-2 p-3 rounded-[var(--radius-xl)] hover:bg-[var(--gray-50)] transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-[var(--coral-100)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--coral-600)" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
            <span className="text-xs font-medium text-[var(--gray-700)]">Saved</span>
          </Link>
          <Link 
            href="/orders"
            className="flex flex-col items-center gap-2 p-3 rounded-[var(--radius-xl)] hover:bg-[var(--gray-50)] transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-[var(--mint-100)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mint-600)" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <span className="text-xs font-medium text-[var(--gray-700)]">Orders</span>
          </Link>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-[var(--mint-50)] border border-[var(--mint-200)] text-[var(--mint-700)] rounded-[var(--radius-lg)] flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {success}
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-[var(--radius-lg)] flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Section */}
          <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-6">
            <h2 className="text-lg font-semibold text-[var(--gray-900)] mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                  placeholder="Your name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="input w-full bg-[var(--gray-50)] text-[var(--gray-500)] cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-[var(--gray-400)]">Email cannot be changed</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input w-full"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Bio Section */}
          <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-6">
            <h2 className="text-lg font-semibold text-[var(--gray-900)] mb-4">About You</h2>
            
            <div>
              <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                className="input w-full resize-none"
                placeholder="Tell us about yourself..."
              />
              <p className="mt-1 text-xs text-[var(--gray-400)]">
                {formData.bio.length}/500 characters
              </p>
            </div>
          </div>

          {/* Interests Section */}
          <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-6">
            <h2 className="text-lg font-semibold text-[var(--gray-900)] mb-2">Interests</h2>
            <p className="text-sm text-[var(--gray-500)] mb-4">
              Select your interests to connect with like-minded people
            </p>
            
            <div className="flex flex-wrap gap-2">
              {interestOptions.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => handleInterestToggle(interest)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    formData.interests.includes(interest)
                      ? "bg-[var(--violet-600)] text-white shadow-md"
                      : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]"
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full h-12 rounded-[var(--radius-xl)] bg-gradient-primary text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                </svg>
                Saving...
              </span>
            ) : (
              "Save Changes"
            )}
          </button>
        </form>
      </div>
      <ImageEditorModal
        isOpen={editorState.isOpen}
        imageSrc={editorState.imageSrc}
        fileName={editorState.fileName}
        initialAspect={1}
        onClose={() => setEditorState({ isOpen: false, imageSrc: null, fileName: "profile.jpg" })}
        onSave={(editedFile) => {
          setProfileImage(editedFile);
          setProfileImagePreview(URL.createObjectURL(editedFile));
        }}
      />
    </div>
  );
}

