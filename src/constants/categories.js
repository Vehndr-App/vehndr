// Shared category catalog for the Vehndr marketplace.
// Keep the string exports below backward-compatible for existing imports/API payloads.

const slugify = (value) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\//g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const EVENT_TYPES = [
  "Weddings",
  "Festivals",
  "Corporate Events",
  "Private Parties",
  "Birthday Parties",
  "Wellness Events",
  "Retreats",
  "Brand Activations",
  "Nightlife / Club Events",
  "Markets / Pop-Ups",
  "Conferences",
  "Fundraisers / Nonprofit Events",
  "Baby Showers",
  "Bachelorette / Bachelor Parties",
  "Kids / Family Events",
  "Holiday Events",
  "Fashion Shows",
  "Art Shows",
  "Launch Parties",
  "Community Events"
].map((label) => ({ label, slug: slugify(label) }));

const vendorCategoryDefinitions = [
  { label: "Food & Drink", parent: null, icon: "🍕", color: "var(--coral-100)" },
  { label: "Bar / Beverage", parent: "food-drink", icon: "🍸", color: "var(--coral-50)" },
  { label: "Catering", parent: "food-drink", icon: "🍽️", color: "var(--coral-100)" },
  { label: "Desserts / Cakes", parent: "food-drink", icon: "🧁", color: "var(--amber-50)" },
  { label: "Coffee / Matcha / Tea", parent: "food-drink", icon: "☕", color: "var(--amber-100)" },
  { label: "Wellness", parent: null, icon: "💆", color: "var(--mint-100)" },
  { label: "Beauty", parent: null, icon: "💄", color: "var(--amber-100)" },
  { label: "Hair & Makeup", parent: "beauty", groups: ["wedding-vendors"], icon: "💋", color: "var(--amber-50)" },
  { label: "Fashion / Apparel", parent: null, icon: "👗", color: "var(--magenta-100)" },
  { label: "Artisan Goods", parent: null, icon: "🧺", color: "var(--violet-50)" },
  { label: "Handmade / Craft Vendors", parent: "artisan-goods", icon: "🧶", color: "var(--violet-50)" },
  { label: "Jewelry / Accessories", parent: "fashion-apparel", icon: "💍", color: "var(--magenta-50)" },
  { label: "Wedding Vendors", parent: null, icon: "💒", color: "var(--coral-100)" },
  { label: "Florals", parent: "wedding-vendors", icon: "💐", color: "var(--mint-100)" },
  { label: "Decor / Styling", parent: "wedding-vendors", icon: "🎈", color: "var(--coral-50)" },
  { label: "Rentals", parent: null, groups: ["wedding-vendors"], icon: "⛺", color: "var(--amber-50)" },
  { label: "Venues", parent: null, icon: "🏛️", color: "var(--info-50)" },
  { label: "Photo & Video", parent: null, groups: ["wedding-vendors"], icon: "🎬", color: "var(--magenta-50)" },
  { label: "Content Creators", parent: "photo-video", icon: "📱", color: "var(--magenta-100)" },
  { label: "DJs / Music", parent: null, icon: "🎵", color: "var(--violet-100)" },
  { label: "Live Musicians", parent: "performers", icon: "🎸", color: "var(--violet-50)" },
  { label: "Performers", parent: null, icon: "🎭", color: "var(--coral-50)" },
  { label: "Dancers / Go-Go Dancers", parent: "performers", icon: "💃", color: "var(--coral-50)" },
  { label: "Aerialists / Circus Acts", parent: "performers", icon: "🎪", color: "var(--violet-50)" },
  { label: "Fire Performers", parent: "performers", icon: "🔥", color: "var(--coral-100)" },
  { label: "Character Entertainment / Princesses", parent: "performers", icon: "👑", color: "var(--amber-100)" },
  { label: "Atmosphere Models", parent: "performers", groups: ["staff"], icon: "✨", color: "var(--magenta-50)" },
  { label: "Brand Ambassadors", parent: "staff", icon: "📣", color: "var(--info-50)" },
  { label: "Promo Staff", parent: "staff", icon: "📋", color: "var(--info-100)" },
  { label: "Event Staff", parent: "staff", icon: "👥", color: "var(--gray-100)" },
  { label: "Security", parent: "staff", icon: "🛡️", color: "var(--gray-100)" },
  { label: "AV / Lighting / Sound", parent: "production", icon: "🔊", color: "var(--violet-100)" },
  { label: "Production", parent: null, icon: "🎛️", color: "var(--violet-50)" },
  { label: "Event Planners", parent: "wedding-vendors", icon: "📝", color: "var(--coral-100)" },
  { label: "Event Coordinators", parent: "wedding-vendors", icon: "🤝", color: "var(--coral-50)" },
  { label: "Sponsorship / Brand Partners", parent: "brand-partners", icon: "🤝", color: "var(--info-50)" },
  { label: "Speakers / Workshop Hosts", parent: "workshops", icon: "🎤", color: "var(--violet-50)" },
  { label: "Artists / Live Painters", parent: "experiences", icon: "🎨", color: "var(--magenta-50)" },
  { label: "Interactive Experiences", parent: "experiences", icon: "🪄", color: "var(--mint-100)" },
  { label: "Kids Entertainment", parent: "experiences", icon: "🧸", color: "var(--amber-50)" },
  { label: "Transportation", parent: null, icon: "🚗", color: "var(--info-100)" }
];

export const VENDOR_CATEGORY_TREE = vendorCategoryDefinitions.map((category) => ({
  ...category,
  slug: slugify(category.label)
}));

export const VENDOR_CATEGORIES = VENDOR_CATEGORY_TREE.map((category) => category.label);

export const PARENT_CATEGORY_EXAMPLES = {
  performers: [
    "Dancers / Go-Go Dancers",
    "Aerialists / Circus Acts",
    "Fire Performers",
    "Character Entertainment / Princesses",
    "Live Musicians"
  ],
  "wedding-vendors": [
    "Florals",
    "Hair & Makeup",
    "Photo & Video",
    "Catering",
    "Desserts / Cakes",
    "Decor / Styling",
    "Rentals",
    "Event Planners"
  ],
  experiences: [
    "Glitter Bar",
    "Photo Booth",
    "Tarot",
    "Permanent Jewelry",
    "Live Art",
    "Massage",
    "IV Therapy",
    "Cold Plunge",
    "Interactive Experiences"
  ]
};

export const HOMEPAGE_VENDOR_GROUPS = [
  { label: "Food & Drink", slug: "food-drink", icon: "🍕", color: "var(--coral-100)" },
  { label: "Wellness", slug: "wellness", icon: "💆", color: "var(--mint-100)" },
  { label: "Beauty", slug: "beauty", icon: "💄", color: "var(--amber-100)" },
  { label: "Fashion", slug: "fashion-apparel", icon: "👗", color: "var(--magenta-100)" },
  { label: "Wedding", slug: "wedding-vendors", icon: "💒", color: "var(--coral-100)" },
  { label: "Venues", slug: "venues", icon: "🏛️", color: "var(--info-50)" },
  { label: "Rentals", slug: "rentals", icon: "⛺", color: "var(--amber-50)" },
  { label: "Photo & Video", slug: "photo-video", icon: "🎬", color: "var(--magenta-50)" },
  { label: "DJs / Music", slug: "djs-music", icon: "🎵", color: "var(--violet-100)" },
  { label: "Performers", slug: "performers", icon: "🎭", color: "var(--coral-50)" },
  { label: "Staff", slug: "staff", icon: "👥", color: "var(--gray-100)" },
  { label: "Experiences", slug: "experiences", icon: "🪄", color: "var(--mint-100)" },
  { label: "Workshops", slug: "workshops", icon: "🎤", color: "var(--violet-50)" }
];

export const GENERIC_CATEGORY_LABELS = ["Other", "Uncategorized", "Services", "Service"];

export const CATEGORY_SYNONYMS = {
  "Food & Beverage": "Food & Drink",
  "Food/Beverage": "Food & Drink",
  "Health & Wellness": "Wellness",
  "Clothing/Accessories": "Fashion / Apparel",
  "Clothing & Accessories": "Fashion / Apparel",
  Fashion: "Fashion / Apparel",
  "DJ/Music": "DJs / Music",
  "DJs/Music": "DJs / Music",
  Photography: "Photo & Video",
  Videography: "Photo & Video",
  "Photography & Videography": "Photo & Video",
  "Photo & Video": "Photo & Video",
  Venue: "Venues",
  Florist: "Florals",
  Decor: "Decor / Styling",
  Bakery: "Desserts / Cakes",
  Bartender: "Bar / Beverage",
  Entertainment: "Performers",
  Beauty: "Beauty",
  Rentals: "Rentals"
};

export const EVENT_TYPE_SYNONYMS = {
  wedding: "weddings",
  party: "private-parties",
  parties: "private-parties",
  birthday: "birthday-parties",
  corporate: "corporate-events",
  festival: "festivals",
  concert: "festivals",
  wellness: "wellness-events",
  retreat: "retreats",
  market: "markets-pop-ups",
  popup: "markets-pop-ups",
  "pop-up": "markets-pop-ups",
  conference: "conferences",
  fundraiser: "fundraisers-nonprofit-events",
  nonprofit: "fundraisers-nonprofit-events",
  holiday: "holiday-events",
  fashion: "fashion-shows",
  art: "art-shows",
  launch: "launch-parties",
  community: "community-events"
};

const categoryBySlug = new Map(VENDOR_CATEGORY_TREE.map((category) => [category.slug, category]));
const categoryByLabel = new Map(VENDOR_CATEGORY_TREE.map((category) => [category.label.toLowerCase(), category]));
const synonymBySlug = new Map(
  Object.entries(CATEGORY_SYNONYMS).map(([alias, canonical]) => [slugify(alias), canonical])
);

export const CATEGORY_DISPLAY = VENDOR_CATEGORY_TREE.reduce((acc, category) => {
  acc[category.label] = {
    icon: category.icon,
    label: category.label,
    color: category.color,
    slug: category.slug,
    parent: category.parent
  };
  return acc;
}, {});

Object.entries(CATEGORY_SYNONYMS).forEach(([alias, canonical]) => {
  const display = CATEGORY_DISPLAY[canonical];
  if (display) {
    CATEGORY_DISPLAY[alias] = display;
  }
});

export const EVENT_TYPE_DISPLAY = EVENT_TYPES.reduce((acc, type) => {
  acc[type.slug] = type.label;
  acc[type.label] = type.label;
  return acc;
}, {});

export function normalizeVendorCategory(category) {
  if (!category) return "";
  const trimmed = category.toString().trim();
  if (GENERIC_CATEGORY_LABELS.some((label) => label.toLowerCase() === trimmed.toLowerCase())) {
    return "";
  }
  const slug = slugify(trimmed);
  const synonym = synonymBySlug.get(slug);
  if (synonym) return synonym;
  const bySlug = categoryBySlug.get(slug);
  if (bySlug) return bySlug.label;
  const byLabel = categoryByLabel.get(trimmed.toLowerCase());
  return byLabel?.label || trimmed;
}

export function normalizeVendorCategories(categories = []) {
  return Array.from(new Set(categories.map(normalizeVendorCategory).filter(Boolean)));
}

export function normalizeEventType(eventType) {
  if (!eventType) return "";
  const slug = slugify(eventType);
  if (EVENT_TYPE_SYNONYMS[slug]) return EVENT_TYPE_SYNONYMS[slug];
  return EVENT_TYPES.find((type) => type.slug === slug || type.label.toLowerCase() === eventType.toString().toLowerCase())?.slug || slug;
}

export function getVendorCategory(category) {
  const normalized = normalizeVendorCategory(category);
  return categoryByLabel.get(normalized.toLowerCase()) || categoryBySlug.get(slugify(normalized)) || null;
}

export function getVendorCategoryLabel(category) {
  const normalized = normalizeVendorCategory(category);
  return CATEGORY_DISPLAY[normalized]?.label || normalized;
}

export function expandVendorCategoryFilter(category) {
  if (!category) return [];
  const normalized = normalizeVendorCategory(category);
  const slug = slugify(normalized);
  const group = HOMEPAGE_VENDOR_GROUPS.find((item) => item.slug === slug || slugify(item.label) === slug);
  const targetSlug = group?.slug || getVendorCategory(normalized)?.slug || slug;
  const matches = VENDOR_CATEGORY_TREE.filter((item) => {
    const groups = item.groups || [];
    return item.slug === targetSlug || item.parent === targetSlug || groups.includes(targetSlug);
  }).map((item) => item.label);

  const exampleMatches = PARENT_CATEGORY_EXAMPLES[targetSlug] || [];
  return Array.from(new Set([normalized, ...matches, ...exampleMatches.map(normalizeVendorCategory)]));
}

export function vendorMatchesCategory(vendorCategories = [], filter) {
  const selected = expandVendorCategoryFilter(filter).map(slugify);
  if (selected.length === 0) return true;
  const vendorSlugs = normalizeVendorCategories(vendorCategories).map(slugify);
  return vendorSlugs.some((slug) => selected.includes(slug));
}

export function vendorMatchesAnyCategory(vendorCategories = [], filters = []) {
  const activeFilters = Array.isArray(filters) ? filters.filter(Boolean) : [filters].filter(Boolean);
  if (activeFilters.length === 0) return true;
  return activeFilters.some((filter) => vendorMatchesCategory(vendorCategories, filter));
}

export { slugify as categorySlug };
