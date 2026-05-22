"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "../../services/api";
import { resendVerification } from "../../services/auth";
import { buildVendorFormData } from "../../utils/vendorFormData";
import { resizeImages } from "../../utils/imageResize";
import { useVendorOnboarding } from "../../hooks/useVendorOnboarding";
import OnboardingWizardLayout from "./OnboardingWizardLayout";
import OnboardingStepHeader from "./OnboardingStepHeader";
import PhotoUploadField from "../vendor-profile/PhotoUploadField";
import LocationField from "../vendor-profile/LocationField";
import CategoryFields from "../vendor-profile/CategoryFields";
import StripeConnectButton from "../StripeConnectButton";
import ImageEditorModal from "../ImageEditorModal";
import {
  ONBOARDING_STEP_STORAGE_KEY,
  WIZARD_STEPS
} from "../../constants/vendorOnboardingSteps";

const OFFERING_TYPES = [
  {
    value: "hourly",
    label: "Hourly",
    description: "Paid per hour (DJs, bartenders, photographers)",
    icon: "⏱️",
    color: "var(--violet-100)"
  },
  {
    value: "flat_booth",
    label: "Flat booth fee (paid by vendor)",
    description: "One fixed fee for the whole event",
    icon: "🏪",
    color: "var(--mint-100)"
  },
  {
    value: "package",
    label: "Package (paid by event host)",
    description: "Bundled services at one price",
    icon: "📦",
    color: "var(--magenta-100)"
  },
  {
    value: "trade",
    label: "Trade / exposure",
    description: "No fee — visibility in exchange",
    icon: "🤝",
    color: "var(--amber-100)"
  },
  {
    value: "free_with_sales",
    label: "Free + on-site sales",
    description: "No booking fee; sell at the event",
    icon: "🛍️",
    color: "var(--coral-100)"
  }
];

const SERVICE_RATE_TYPES = [
  {
    value: "per_hour",
    label: "Per hour",
    helper: "Great for DJs, bartenders, photographers",
    durationMinutes: 60
  },
  {
    value: "day_rate",
    label: "Day rate",
    helper: "Best for full-day staffing and activations",
    durationMinutes: 480
  },
  {
    value: "flat_service",
    label: "Flat service fee",
    helper: "One fixed price for the service",
    durationMinutes: null
  }
];

const EMPTY_PRODUCT_FORM = {
  name: "",
  price: "",
  description: "",
  isService: false,
  serviceRateType: "per_hour",
  images: []
};

const EMPTY_OFFERING_FORM = {
  title: "",
  offeringType: "hourly",
  price: "",
  description: ""
};

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" }
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";
  const value = `${String(hour).padStart(2, "0")}:${minute}`;
  const hour12 = ((hour + 11) % 12) + 1;
  const suffix = hour >= 12 ? "PM" : "AM";
  return {
    value,
    label: `${String(hour12).padStart(2, "0")}:${minute} ${suffix}`
  };
});

const DEFAULT_AVAILABILITY_SCHEDULE = WEEKDAYS.reduce((acc, day) => {
  acc[day.value] = {
    enabled: day.value >= 1 && day.value <= 5,
    start: "09:00",
    end: "17:00"
  };
  return acc;
}, {});

export default function VendorSetupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    setUser,
    vendor,
    setVendor,
    onboarding,
    loading,
    error: loadError,
    stepIndex,
    currentStep,
    goNext,
    goBack,
    goToStep,
    refresh,
    refreshOnboarding
  } = useVendorOnboarding();

  const [saving, setSaving] = useState(false);
  const [stepError, setStepError] = useState(null);

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [serviceRadiusMiles, setServiceRadiusMiles] = useState("");
  const [categories, setCategories] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);

  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [heroEditor, setHeroEditor] = useState({ isOpen: false, imageSrc: null });
  const [profileEditor, setProfileEditor] = useState({ isOpen: false, imageSrc: null });

  const [galleryFiles, setGalleryFiles] = useState([]);

  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [storefrontItemsAdded, setStorefrontItemsAdded] = useState(0);
  const [storefrontSuccess, setStorefrontSuccess] = useState("");

  const [offeringForm, setOfferingForm] = useState(EMPTY_OFFERING_FORM);
  const [offeringsAdded, setOfferingsAdded] = useState(0);
  const [offeringSuccess, setOfferingSuccess] = useState("");

  const [availabilitySchedule, setAvailabilitySchedule] = useState(DEFAULT_AVAILABILITY_SCHEDULE);

  const [stripeStatus, setStripeStatus] = useState(null);

  useEffect(() => {
    if (!user && !vendor) return;
    setName(user?.name || "");
    setPhone(user?.phone || "");
    setBusinessName(vendor?.name || "");
    setDescription(vendor?.description || "");
    setLocation(vendor?.location || "");
    setServiceRadiusMiles(
      vendor?.serviceRadiusMiles !== undefined && vendor?.serviceRadiusMiles !== null
        ? String(vendor.serviceRadiusMiles)
        : ""
    );
    setCategories(vendor?.categories || []);
    setEventTypes(vendor?.eventTypes || []);
    setProfilePreview(vendor?.profileImage || "");
    setCoverPreview(vendor?.heroImage || "");
  }, [user, vendor]);

  useEffect(() => {
    const step = searchParams.get("step");
    if (step === "stripe" && !loading) {
      goToStep("stripe");
    }
  }, [searchParams, loading, goToStep]);

  const loadStripeStatus = useCallback(async () => {
    if (!vendor?.id) return;
    try {
      const response = await api(`/api/vendors/${vendor.id}/stripe/account`);
      setStripeStatus(response);
    } catch {
      setStripeStatus(null);
    }
  }, [vendor?.id]);

  useEffect(() => {
    if (currentStep?.id === "stripe") {
      loadStripeStatus();
    }
  }, [currentStep?.id, loadStripeStatus]);

  const patchVendor = async (fields) => {
    const formData = buildVendorFormData(fields);
    const result = await api(`/api/vendors/${vendor.id}`, { method: "PATCH", body: formData });
    const v = result.vendor || result;
    setVendor(v);
    return v;
  };

  const patchUser = async (fields) => {
    const data = new FormData();
    if (fields.name !== undefined) data.append("name", fields.name);
    if (fields.phone !== undefined) data.append("phone", fields.phone);
    const result = await api("/api/auth/update_profile", { method: "PATCH", body: data });
    const u = result.user || result;
    setUser(u);
    return u;
  };

  const runStep = async (handler) => {
    setSaving(true);
    setStepError(null);
    try {
      await handler();
      await refreshOnboarding();
      goNext();
    } catch (err) {
      setStepError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const createStorefrontItem = async () => {
    if (!productForm.name.trim() || !productForm.price) {
      throw new Error("Add an item name and price");
    }

    const fd = new FormData();
    const selectedServiceRate = SERVICE_RATE_TYPES.find(
      (rateType) => rateType.value === productForm.serviceRateType
    );
    const durationMinutes = productForm.isService ? selectedServiceRate?.durationMinutes : null;

    fd.append("product[name]", productForm.name.trim());
    fd.append("product[description]", productForm.description || "");
    fd.append("product[price]", String(Math.round(parseFloat(productForm.price) * 100)));
    fd.append("product[is_service]", productForm.isService ? "true" : "false");
    if (productForm.isService && durationMinutes) {
      fd.append("product[duration]", String(durationMinutes));
    }
    fd.append("product[active]", "true");
    productForm.images.forEach((image) => {
      if (image) fd.append("images[]", image);
    });

    const created = await api("/api/products", { method: "POST", body: fd });
    setStorefrontItemsAdded((count) => count + 1);
    return created;
  };

  const createOfferingPackage = async () => {
    if (!offeringForm.title.trim()) {
      throw new Error("Add an offering title");
    }

    const isFree =
      offeringForm.offeringType === "trade" ||
      offeringForm.offeringType === "free_with_sales";
    const priceCents = isFree
      ? 0
      : Math.round(parseFloat(offeringForm.price || "0") * 100);

    const created = await api(`/api/vendors/${vendor.id}/offerings`, {
      method: "POST",
      body: {
        vendor_offering: {
          title: offeringForm.title.trim(),
          offering_type: offeringForm.offeringType,
          price_cents: priceCents,
          description: offeringForm.description || "",
          active: true
        }
      }
    });
    setOfferingsAdded((count) => count + 1);
    return created;
  };

  const handleSkipFlow = () => {
    router.push("/dashboard");
  };

  const continueButton = (label = "Continue", disabled = false, onClick) => (
    <button
      type="button"
      onClick={onClick}
      disabled={saving || disabled}
      className="btn btn-gradient w-full !h-14 text-base font-semibold rounded-[var(--radius-full)] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {saving ? "Saving…" : label}
    </button>
  );

  const renderStep = () => {
    switch (currentStep?.id) {
      case "welcome":
        return (
          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-[var(--radius-2xl)] bg-gradient-primary px-5 py-6 text-white">
              <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-white/15" />
              <div className="absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-white/10" />
              <p className="relative text-xs uppercase tracking-[0.14em] text-white/80 mb-2">Vehndr Vendor Setup</p>
              <h2 className="relative text-[25px] leading-[1.2] font-semibold mb-2">Build a standout vendor profile</h2>
              <p className="relative text-sm text-white/90">
                A quick setup now helps you get discovered and booked sooner.
              </p>
            </div>
            <OnboardingStepHeader
              title="Welcome to your vendor onboarding"
              subtitle="Swipe through what you unlock on Vehndr."
            />
            <div className="overflow-x-auto -mx-1 px-1 pb-1">
              <div className="flex gap-3 snap-x snap-mandatory">
                {[
                  {
                    title: "Get more bookings",
                    text: "Appear in front of event hosts actively searching for vendors."
                  },
                  {
                    title: "Manage everything in one place",
                    text: "Track bookings, proposals, sales, and updates from one dashboard."
                  },
                  {
                    title: "Get discovered faster",
                    text: "Strong photos and offerings help your business stand out."
                  },
                  {
                    title: "Connect with event hosts",
                    text: "Accept paid gigs, trade opportunities, and sponsored events."
                  }
                ].map((slide) => (
                  <div
                    key={slide.title}
                    className="snap-start min-w-[86%] rounded-[var(--radius-xl)] border border-[var(--gray-200)] bg-[var(--gray-50)] p-4"
                  >
                    <p className="text-sm font-semibold text-[var(--gray-900)]">{slide.title}</p>
                    <p className="text-sm text-[var(--gray-600)] mt-1.5">{slide.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-[var(--gray-500)]">Tip: swipe cards left to preview benefits.</p>
          </div>
        );

      case "basics":
        return (
          <>
            <OnboardingStepHeader
              title="Owner profile and basics"
              subtitle="Add your photo and contact info in one step."
            />
            <div className="space-y-4 rounded-[var(--radius-xl)] border border-[var(--gray-200)] p-3 bg-[var(--gray-50)]">
              {!!profilePreview && (
                <div className="rounded-[var(--radius-xl)] border border-[var(--gray-200)] p-3 bg-white">
                  <p className="text-xs text-[var(--gray-500)] mb-2">Profile preview</p>
                  <div className="w-24 h-24 mx-auto rounded-full overflow-hidden shadow-[var(--shadow-card)] border-2 border-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={profilePreview} alt="Profile preview" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
              <div className="rounded-[var(--radius-xl)] border border-[var(--gray-200)] p-3 bg-white">
                <p className="text-sm text-[var(--gray-600)] mb-3">
                  Upload a clear photo of you, the business owner. Crop to center your face.
                </p>
                <PhotoUploadField
                  variant="onboarding"
                  aspect="circle"
                  label="Profile photo"
                  imageUrl={profileFile ? URL.createObjectURL(profileFile) : profilePreview}
                  onFileSelect={(file) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                      setProfileEditor({ isOpen: true, imageSrc: reader.result });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input text-base py-3"
                  placeholder="Your full name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">Business name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="input text-base py-3"
                  placeholder="Your business name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input text-base py-3"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">Email</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="input text-base py-3 bg-white text-[var(--gray-500)]"
                />
                {user && !user.emailVerified && (
                  <div className="mt-2 p-3 rounded-[var(--radius-lg)] bg-[var(--amber-50)] border border-[var(--amber-100)]">
                    <p className="text-sm text-[var(--amber-800)] mb-2">Verify your email before accepting paid bookings.</p>
                    <button
                      type="button"
                      className="text-sm font-semibold text-[var(--violet-700)]"
                      onClick={async () => {
                        try {
                          await resendVerification(user.email);
                          alert("Verification email sent.");
                        } catch (e) {
                          alert(e.message);
                        }
                      }}
                    >
                      Resend verification email
                    </button>
                  </div>
                )}
              </div>
            </div>
            <ImageEditorModal
              isOpen={profileEditor.isOpen}
              imageSrc={profileEditor.imageSrc}
              fileName="profile-photo.jpg"
              onClose={() => setProfileEditor({ isOpen: false, imageSrc: null })}
              onSave={async (editedFile) => {
                setStepError(null);
                setProfileFile(editedFile);
                setProfilePreview(URL.createObjectURL(editedFile));
                setProfileEditor({ isOpen: false, imageSrc: null });
              }}
            />
          </>
        );

      case "businessPhotos":
        return (
          <>
            <OnboardingStepHeader
              title="Business cover and gallery"
              subtitle="Show your business in action with real photos of services, products, and setup."
            />

            {!!coverPreview && (
              <div className="mb-4 rounded-[var(--radius-xl)] border border-[var(--gray-200)] p-2.5 bg-[var(--gray-50)]">
                <p className="text-xs text-[var(--gray-500)] mb-2 px-1">Cover preview</p>
                <div className="aspect-[21/9] rounded-[var(--radius-lg)] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            <div className="mb-4 rounded-[var(--radius-xl)] border border-[var(--gray-200)] p-3 bg-[var(--gray-50)]">
              <p className="text-sm text-[var(--gray-600)] mb-3">
                Cover photo should show your business in action. Avoid logos-only images.
              </p>
              <PhotoUploadField
                variant="onboarding"
                aspect="cover"
                label="Business cover photo"
                imageUrl={coverFile ? URL.createObjectURL(coverFile) : coverPreview}
                onFileSelect={async (file) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    setHeroEditor({ isOpen: true, imageSrc: reader.result });
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </div>

            <OnboardingStepHeader
              overline="Gallery"
              title="Add gallery photos"
              subtitle="Add examples of your work, products, team, setup, and service quality."
            />
            <label className="block">
              <div className="border-2 border-dashed border-[var(--gray-200)] rounded-[var(--radius-xl)] p-8 text-center cursor-pointer hover:border-[var(--violet-400)] transition-colors bg-[var(--gray-50)]">
                <span className="text-sm font-semibold text-[var(--violet-700)]">Add photos</span>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (!files.length) return;
                  const resized = await resizeImages(files);
                  setGalleryFiles((prev) => [...prev, ...resized]);
                  e.target.value = "";
                }}
              />
            </label>
            {galleryFiles.length > 0 && (
              <div className="mt-4 space-y-2.5">
                <p className="text-xs text-[var(--gray-500)]">Gallery preview</p>
                <div className="rounded-[var(--radius-xl)] overflow-hidden border border-[var(--gray-200)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(galleryFiles[0])} alt="Featured gallery preview" className="w-full aspect-[4/3] object-cover" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {galleryFiles.map((file, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={URL.createObjectURL(file)} alt="Gallery preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs"
                        onClick={() => setGalleryFiles((prev) => prev.filter((_, j) => j !== i))}
                        aria-label="Remove photo"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(vendor?.galleryImages?.length > 0 || vendor?.galleryImagesData?.length > 0) && (
              <p className="text-sm text-[var(--mint-700)] mt-2">
                Existing gallery photos are already on your profile.
              </p>
            )}

            <ImageEditorModal
              isOpen={heroEditor.isOpen}
              imageSrc={heroEditor.imageSrc}
              fileName="cover-photo.jpg"
              onClose={() => setHeroEditor({ isOpen: false, imageSrc: null })}
              onSave={async (editedFile) => {
                setCoverFile(editedFile);
                setCoverPreview(URL.createObjectURL(editedFile));
                setHeroEditor({ isOpen: false, imageSrc: null });
              }}
            />
          </>
        );

      case "business":
        return (
          <>
            <OnboardingStepHeader
              title="Business details"
              subtitle="Describe your business, choose categories, and set your location."
            />
            <div className="rounded-[var(--radius-xl)] border border-[var(--gray-200)] p-3 bg-[var(--gray-50)] mb-4">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input min-h-[160px] text-base py-3 resize-y"
                placeholder="We provide premium cocktail catering for weddings, brand activations, and private events..."
              />
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--gray-200)] p-3 bg-[var(--gray-50)] mb-4">
              <LocationField
                variant="onboarding"
                value={location}
                onChange={setLocation}
                radiusMiles={serviceRadiusMiles}
                onRadiusChange={setServiceRadiusMiles}
              />
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--gray-200)] p-3 bg-[var(--gray-50)]">
              <CategoryFields
                categories={categories}
                eventTypes={eventTypes}
                onCategoriesChange={setCategories}
                onEventTypesChange={setEventTypes}
              />
            </div>
          </>
        );

      case "storefront":
        return (
          <>
            <OnboardingStepHeader
              title="Add your first item"
              subtitle="Create one product or service with a price and photo."
            />
            <div className="space-y-4 rounded-[var(--radius-xl)] border border-[var(--gray-200)] p-3 bg-[var(--gray-50)]">
              {storefrontItemsAdded > 0 && (
                <div className="rounded-[var(--radius-lg)] border border-[var(--mint-200)] bg-[var(--mint-50)] px-3 py-2">
                  <p className="text-sm font-medium text-[var(--mint-700)]">
                    {storefrontItemsAdded} item{storefrontItemsAdded === 1 ? "" : "s"} added in this step.
                  </p>
                </div>
              )}
              {storefrontSuccess && (
                <div className="rounded-[var(--radius-lg)] border border-[var(--info-100)] bg-[var(--info-50)] px-3 py-2">
                  <p className="text-sm font-medium text-[var(--info)]">{storefrontSuccess}</p>
                </div>
              )}
              <div className="rounded-[var(--radius-xl)] border border-[var(--gray-200)] bg-white p-3.5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--gray-900)]">Photos</p>
                    <p className="text-xs text-[var(--gray-500)] mt-1">
                      Add one or multiple photos to help buyers trust your listing.
                    </p>
                  </div>
                  <span className="text-xs font-medium text-[var(--gray-500)]">
                    {productForm.images.length} selected
                  </span>
                </div>
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-[var(--gray-200)] rounded-[var(--radius-xl)] px-4 py-6 text-center hover:border-[var(--violet-400)] hover:bg-[var(--violet-50)] transition-colors">
                    <p className="text-sm font-semibold text-[var(--violet-700)]">
                      Add photo{productForm.images.length === 1 ? "" : "s"}
                    </p>
                    <p className="text-xs text-[var(--gray-500)] mt-1">PNG, JPG, HEIC supported</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;
                      const resized = await resizeImages(files);
                      setProductForm((prev) => ({ ...prev, images: [...prev.images, ...resized] }));
                      e.target.value = "";
                    }}
                  />
                </label>
                {productForm.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {productForm.images.map((file, i) => (
                      <div key={`${file.name}-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-[var(--gray-200)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={URL.createObjectURL(file)} alt="Product preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/65 text-white text-xs"
                          onClick={() =>
                            setProductForm((prev) => ({
                              ...prev,
                              images: prev.images.filter((_, index) => index !== i)
                            }))
                          }
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                value={productForm.name}
                onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
                className="input"
                placeholder="Item or service name"
              />
              <textarea
                value={productForm.description}
                onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))}
                className="input min-h-[110px] h-auto py-3"
                placeholder="Short description"
              />
              <div className="flex gap-3">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))}
                  className="input flex-1"
                  placeholder="Price ($)"
                />
                <label className="flex items-center gap-2 text-sm text-[var(--gray-700)] shrink-0 px-2">
                  <input
                    type="checkbox"
                    checked={productForm.isService}
                    onChange={(e) =>
                      setProductForm((p) => ({ ...p, isService: e.target.checked, serviceRateType: "per_hour" }))
                    }
                  />
                  Service
                </label>
              </div>
              {productForm.isService && (
                <div className="space-y-2 rounded-[var(--radius-xl)] border border-[var(--gray-200)] bg-white p-3">
                  <p className="text-sm font-semibold text-[var(--gray-900)]">Service pricing style</p>
                  <div className="grid grid-cols-1 gap-2">
                    {SERVICE_RATE_TYPES.map((rateType) => (
                      <button
                        key={rateType.value}
                        type="button"
                        onClick={() =>
                          setProductForm((prev) => ({ ...prev, serviceRateType: rateType.value }))
                        }
                        className={`w-full rounded-[var(--radius-lg)] border px-3 py-2.5 text-left transition-colors ${
                          productForm.serviceRateType === rateType.value
                            ? "border-[var(--violet-500)] bg-[var(--violet-50)]"
                            : "border-[var(--gray-200)] bg-[var(--gray-50)] hover:border-[var(--violet-300)]"
                        }`}
                      >
                        <p className="text-sm font-semibold text-[var(--gray-900)]">{rateType.label}</p>
                        <p className="text-xs text-[var(--gray-500)] mt-0.5">{rateType.helper}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <button
                type="button"
                className="btn btn-secondary w-full !h-12 text-sm font-semibold"
                disabled={saving}
                onClick={async () => {
                  setStepError(null);
                  setStorefrontSuccess("");
                  try {
                    setSaving(true);
                    await createStorefrontItem();
                    setProductForm({ ...EMPTY_PRODUCT_FORM });
                    setStorefrontSuccess("Saved. You can add another item or continue.");
                    await refreshOnboarding();
                  } catch (err) {
                    setStepError(err.message || "Could not save item");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Save item and add another
              </button>
            </div>
          </>
        );

      case "offerings":
        return (
          <>
            <OnboardingStepHeader
              title="How organizers book you"
              subtitle="This shows event hosts which booking types you're open to and can be booked for."
            />
            {offeringsAdded > 0 && (
              <div className="rounded-[var(--radius-lg)] border border-[var(--mint-200)] bg-[var(--mint-50)] px-3 py-2 mb-3">
                <p className="text-sm font-medium text-[var(--mint-700)]">
                  {offeringsAdded} offering package{offeringsAdded === 1 ? "" : "s"} added.
                </p>
              </div>
            )}
            {offeringSuccess && (
              <div className="rounded-[var(--radius-lg)] border border-[var(--info-100)] bg-[var(--info-50)] px-3 py-2 mb-3">
                <p className="text-sm font-medium text-[var(--info)]">{offeringSuccess}</p>
              </div>
            )}
            <div className="space-y-3 mb-4">
              {OFFERING_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() =>
                    setOfferingForm((p) => ({
                      ...p,
                      offeringType: type.value,
                      price: type.value === "trade" || type.value === "free_with_sales" ? "0" : p.price
                    }))
                  }
                  className={`w-full text-left p-4 rounded-[var(--radius-xl)] border-2 transition-all cursor-pointer ${
                    offeringForm.offeringType === type.value
                      ? "border-[var(--violet-500)] bg-[var(--violet-50)] shadow-[var(--shadow-card)]"
                      : "border-[var(--gray-200)] hover:border-[var(--violet-300)]"
                  }`}
                  style={{
                    backgroundImage:
                      offeringForm.offeringType === type.value
                        ? undefined
                        : `linear-gradient(135deg, color-mix(in srgb, ${type.color} 78%, white), color-mix(in srgb, ${type.color} 35%, white))`
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-lg shadow-sm"
                      style={{ backgroundColor: type.color }}
                    >
                      {type.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--gray-900)] flex items-center justify-between gap-2">
                        <span>{type.label}</span>
                        {offeringForm.offeringType === type.value ? (
                          <span className="text-xs font-semibold text-[var(--violet-700)]">Selected</span>
                        ) : null}
                      </p>
                      <p className="text-sm text-[var(--gray-500)] mt-0.5">{type.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="space-y-3 rounded-[var(--radius-xl)] border border-[var(--gray-200)] p-3 bg-[var(--gray-50)]">
              <input
                type="text"
                value={offeringForm.title}
                onChange={(e) => setOfferingForm((p) => ({ ...p, title: e.target.value }))}
                className="input"
                placeholder="Offering title (example: 4-hour bar package)"
              />
              {offeringForm.offeringType !== "trade" &&
                offeringForm.offeringType !== "free_with_sales" && (
                  <input
                    type="number"
                    min="0"
                    value={offeringForm.price}
                    onChange={(e) => setOfferingForm((p) => ({ ...p, price: e.target.value }))}
                    className="input"
                    placeholder="Price ($)"
                  />
                )}
              <textarea
                value={offeringForm.description}
                onChange={(e) => setOfferingForm((p) => ({ ...p, description: e.target.value }))}
                className="input min-h-[90px] h-auto py-3"
                placeholder="Add package details, what is included, minimum hours, setup notes..."
              />
              <button
                type="button"
                className="btn btn-secondary w-full !h-12 text-sm font-semibold mt-1"
                disabled={saving}
                onClick={async () => {
                  setStepError(null);
                  setOfferingSuccess("");
                  try {
                    setSaving(true);
                    await createOfferingPackage();
                    setOfferingForm({ ...EMPTY_OFFERING_FORM });
                    setOfferingSuccess("Saved. You can add another offering package or continue.");
                    await refreshOnboarding();
                  } catch (err) {
                    setStepError(err.message || "Could not save offering");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Save offering and add another
              </button>
            </div>
          </>
        );

      case "availability":
        return (
          <>
            <OnboardingStepHeader
              title="When are you available?"
              subtitle="Set custom hours for each day. You can fine-tune dates later."
            />
            <div className="rounded-[var(--radius-xl)] border border-[var(--gray-200)] p-3 bg-[var(--gray-50)] space-y-2.5">
              {WEEKDAYS.map((day) => {
                const daySchedule = availabilitySchedule[day.value];
                const isEnabled = daySchedule?.enabled;
                return (
                  <div
                    key={day.value}
                    className={`rounded-[var(--radius-lg)] border px-3 py-2.5 ${
                      isEnabled
                        ? "border-[var(--violet-200)] bg-[var(--violet-50)]"
                        : "border-[var(--gray-200)] bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--gray-900)] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) =>
                            setAvailabilitySchedule((prev) => ({
                              ...prev,
                              [day.value]: { ...prev[day.value], enabled: e.target.checked }
                            }))
                          }
                        />
                        {day.label}
                      </label>
                      <span className="text-xs font-medium text-[var(--gray-500)]">
                        {isEnabled ? "Available" : "Unavailable"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="text-xs text-[var(--gray-500)]">From</label>
                        <select
                          value={daySchedule?.start || "09:00"}
                          disabled={!isEnabled}
                          onChange={(e) =>
                            setAvailabilitySchedule((prev) => ({
                              ...prev,
                              [day.value]: { ...prev[day.value], start: e.target.value }
                            }))
                          }
                          className="input"
                        >
                          {TIME_OPTIONS.map((timeOption) => (
                            <option key={timeOption.value} value={timeOption.value}>
                              {timeOption.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-[var(--gray-500)]">To</label>
                        <select
                          value={daySchedule?.end || "17:00"}
                          disabled={!isEnabled}
                          onChange={(e) =>
                            setAvailabilitySchedule((prev) => ({
                              ...prev,
                              [day.value]: { ...prev[day.value], end: e.target.value }
                            }))
                          }
                          className="input"
                        >
                          {TIME_OPTIONS.map((timeOption) => (
                            <option key={timeOption.value} value={timeOption.value}>
                              {timeOption.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-white px-3 py-2">
                <p className="text-xs text-[var(--gray-500)]">
                  Tip: set weekend hours differently from weekdays so hosts can request the right times.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/availability"
              className="inline-block mt-4 text-sm font-semibold text-[var(--violet-700)]"
            >
              Customize full calendar later →
            </Link>
          </>
        );

      case "stripe":
        return (
          <>
            <OnboardingStepHeader
              title="Connect payments"
              subtitle="Connect Stripe to accept card payments and receive payouts."
            />
            <div className="rounded-[var(--radius-xl)] border border-[var(--gray-200)] p-3 bg-[var(--gray-50)]">
              {vendor?.id && (
                <StripeConnectButton
                  vendorId={vendor.id}
                  accountStatus={stripeStatus}
                  onStatusUpdate={loadStripeStatus}
                />
              )}
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const handleContinue = async () => {
    const id = currentStep?.id;

    if (id === "welcome") {
      goNext();
      return;
    }

    if (!vendor?.id && id !== "welcome") {
      setStepError("Vendor profile not found. Please contact support.");
      return;
    }

    switch (id) {
      case "basics":
        if (!name.trim()) {
          setStepError("Please enter your name");
          return;
        }
        if (!businessName.trim()) {
          setStepError("Please enter your business name");
          return;
        }
        if (!phone.trim()) {
          setStepError("Please enter your phone number");
          return;
        }
        if (!profileFile && !vendor?.profileImage) {
          setStepError("Please add a profile photo");
          return;
        }
        await runStep(async () => {
          await patchUser({ name: name.trim(), phone: phone.trim() });
          const updatedVendor = await patchVendor({
            name: businessName.trim(),
            ...(profileFile ? { profileImage: profileFile } : {})
          });
          if (updatedVendor?.profileImage) {
            setProfilePreview(updatedVendor.profileImage);
            setProfileFile(null);
          }
        });
        break;

      case "businessPhotos": {
        const hasExistingGallery =
          (vendor?.galleryImages?.length || 0) > 0 ||
          (vendor?.galleryImagesData?.length || 0) > 0;
        const hasCover = !!coverFile || !!vendor?.heroImage;
        const hasGallery = galleryFiles.length > 0 || hasExistingGallery;

        if (!hasCover) {
          setStepError("Please add a cover photo");
          return;
        }
        if (!hasGallery) {
          setStepError("Please add at least one gallery photo");
          return;
        }

        if (!coverFile && galleryFiles.length === 0) {
          goNext();
          return;
        }

        await runStep(async () => {
          const fields = {};
          if (coverFile) {
            fields.heroImage = coverFile;
            fields.heroFocalX = 50;
            fields.heroFocalY = 50;
          }
          if (galleryFiles.length > 0) fields.galleryImages = galleryFiles;
          await patchVendor(fields);
        });
        break;
      }

      case "business":
        if (!description.trim()) {
          setStepError("Please add a description");
          return;
        }
        if (!location.trim()) {
          setStepError("Please enter your location");
          return;
        }
        if (!serviceRadiusMiles || Number(serviceRadiusMiles) <= 0) {
          setStepError("Please set your service radius in miles");
          return;
        }
        if (!categories.length) {
          setStepError("Please select at least one category");
          return;
        }
        await runStep(() =>
          patchVendor({
            description: description.trim(),
            location: location.trim(),
            serviceRadiusMiles: String(Math.round(Number(serviceRadiusMiles))),
            categories,
            eventTypes
          })
        );
        break;

      case "storefront": {
        const skippable = currentStep.skippable;
        const hasDraftInput =
          !!productForm.name.trim() ||
          !!productForm.price ||
          !!productForm.description.trim() ||
          productForm.images.length > 0;

        if (!hasDraftInput && storefrontItemsAdded > 0) {
          goNext();
          return;
        }

        if (!productForm.name.trim() || !productForm.price) {
          if (skippable) {
            goNext();
            return;
          }
          setStepError("Add an item name and price, or skip this step");
          return;
        }
        await runStep(async () => {
          await createStorefrontItem();
          setProductForm({ ...EMPTY_PRODUCT_FORM });
          setStorefrontSuccess("");
        });
        break;
      }

      case "offerings": {
        const hasOfferingDraft =
          !!offeringForm.title.trim() ||
          !!offeringForm.price ||
          !!offeringForm.description.trim();

        if (!hasOfferingDraft && offeringsAdded > 0) {
          goNext();
          return;
        }

        if (!offeringForm.title.trim()) {
          if (currentStep.skippable) {
            goNext();
            return;
          }
          setStepError("Add an offering title or skip");
          return;
        }
        await runStep(async () => {
          await createOfferingPackage();
          setOfferingForm({ ...EMPTY_OFFERING_FORM });
          setOfferingSuccess("");
        });
        break;
      }

      case "availability":
        {
        const selectedDaySchedules = WEEKDAYS
          .map((day) => ({ day: day.value, ...availabilitySchedule[day.value] }))
          .filter((daySchedule) => daySchedule.enabled);

        if (!selectedDaySchedules.length) {
          if (currentStep.skippable) {
            goNext();
            return;
          }
          setStepError("Select at least one day");
          return;
        }

        const invalidSchedule = selectedDaySchedules.find(
          (daySchedule) => !daySchedule.start || !daySchedule.end || daySchedule.start >= daySchedule.end
        );
        if (invalidSchedule) {
          setStepError("Each available day needs a valid From/To time range");
          return;
        }

        await runStep(async () => {
          for (const daySchedule of selectedDaySchedules) {
            await api(`/api/vendors/${vendor.id}/availabilities`, {
              method: "POST",
              body: {
                vendor_availability: {
                  day_of_week: daySchedule.day,
                  start_time: daySchedule.start,
                  end_time: daySchedule.end,
                  slot_duration: 60,
                  employee_count: 1,
                  break_duration: 0
                }
              }
            });
          }
        });
        break;
        }

      case "stripe":
        if (stripeStatus?.chargesEnabled) {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(ONBOARDING_STEP_STORAGE_KEY);
          }
          router.push("/dashboard?setup=complete");
        } else {
          setStepError("Complete Stripe onboarding to finish, or tap Refresh Status after returning from Stripe.");
        }
        break;

      default:
        goNext();
    }
  };

  const handleContinueClick = () => {
    if (currentStep?.id === "welcome") {
      goNext();
      return;
    }
    if (currentStep?.id === "stripe") {
      handleContinue();
      return;
    }
    handleContinue();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <p className="text-[var(--gray-500)]">Loading setup…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-[var(--error)]">{loadError}</p>
      </div>
    );
  }

  if (!user?.vendorId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-[var(--gray-600)]">Create your vendor profile first.</p>
        <Link href="/dashboard/profile" className="btn btn-primary">
          Set up profile
        </Link>
      </div>
    );
  }

  const isLast = currentStep?.id === "stripe";
  const skippableStep = currentStep?.skippable && currentStep?.id !== "welcome";
  const canArrowForward = stepIndex < WIZARD_STEPS.length - 1;

  return (
    <OnboardingWizardLayout
      stepIndex={stepIndex}
      onBack={goBack}
      onStepBack={goBack}
      onStepForward={() => {
        if (!canArrowForward) return;
        goNext();
      }}
      canStepForward={canArrowForward}
      onSkip={handleSkipFlow}
      hideSkip={isLast}
      footer={
        <>
          {skippableStep && (
            <button
              type="button"
              onClick={() => goNext()}
              className="btn btn-secondary w-full !h-14 text-base font-semibold"
              disabled={saving}
            >
              Skip step
            </button>
          )}
          {continueButton(
            isLast ? "Finish setup" : "Continue",
            false,
            handleContinueClick
          )}
        </>
      }
    >
      {stepError && (
        <div className="mb-4 p-3 rounded-[var(--radius-lg)] bg-[var(--error-50)] text-[var(--error)] text-sm">
          {stepError}
        </div>
      )}
      {renderStep()}
    </OnboardingWizardLayout>
  );
}
