/** Wizard screen order (UI steps). */
export const WIZARD_STEPS = [
  { id: "welcome", title: "Welcome", skippable: true },
  { id: "basics", title: "Basics", skippable: false },
  { id: "businessPhotos", title: "Business photos", skippable: false },
  { id: "business", title: "Business details", skippable: false },
  { id: "storefront", title: "First item", skippable: true },
  { id: "offerings", title: "Event offerings", skippable: true },
  { id: "availability", title: "Availability", skippable: true },
  { id: "stripe", title: "Payments", skippable: false }
];

/** Map API onboarding currentStep to wizard index. */
export const API_STEP_TO_WIZARD_INDEX = {
  contact: 1,
  profilePhoto: 1,
  businessIdentity: 3,
  coverPhoto: 2,
  location: 3,
  gallery: 2,
  categories: 3,
  storefront: 4,
  offerings: 5,
  availability: 6,
  stripe: 7
};

export const ONBOARDING_STEP_STORAGE_KEY = "vehndr_onboarding_step";
export const ONBOARDING_SKIP_STORAGE_KEY = "vehndr_onboarding_skipped_at";

export const STEP_LABELS = {
  contact: "Contact info",
  profilePhoto: "Profile photo",
  businessIdentity: "Business details",
  coverPhoto: "Cover photo",
  location: "Location",
  gallery: "Gallery photos",
  categories: "Categories",
  storefront: "Storefront item",
  offerings: "Event offerings",
  availability: "Availability",
  stripe: "Stripe payments"
};

export function wizardIndexFromApiStep(apiStep, user, vendor) {
  if (!apiStep) return 0;
  if (apiStep === "businessIdentity") {
    if (!vendor?.name || !vendor?.profileImage) return 1;
    if (!vendor?.description || !vendor?.location || !vendor?.categories?.length) return 3;
    return 3;
  }
  if (apiStep === "contact") {
    if (!user?.name || !user?.phone || !vendor?.profileImage) return 1;
    return API_STEP_TO_WIZARD_INDEX.contact ?? 1;
  }
  return API_STEP_TO_WIZARD_INDEX[apiStep] ?? 0;
}
