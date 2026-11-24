import { getStorefrontPath } from "../utils/storefrontLinks";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.vehndr.com";
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://www.vehndr.com";

const STATIC_PATHS = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/vendors", changeFrequency: "daily", priority: 0.9 },
  { path: "/events", changeFrequency: "daily", priority: 0.8 },
  { path: "/events/plan", changeFrequency: "weekly", priority: 0.6 },
  { path: "/support", changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/refunds", changeFrequency: "yearly", priority: 0.3 },
  { path: "/login", changeFrequency: "yearly", priority: 0.2 },
  { path: "/register", changeFrequency: "yearly", priority: 0.4 },
];

async function fetchPublicVendors() {
  try {
    const res = await fetch(`${API_BASE}/api/vendors`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.vendors)) return data.vendors;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  } catch (error) {
    console.error("sitemap: failed to load vendors", error);
    return [];
  }
}

export default async function sitemap() {
  const now = new Date();

  const staticEntries = STATIC_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const vendors = await fetchPublicVendors();
  const vendorEntries = vendors
    .map((vendor) => {
      const path = getStorefrontPath(vendor);
      if (!path || path === "/store") return null;
      return {
        url: `${SITE_URL}${path}`,
        lastModified: vendor.updated_at ? new Date(vendor.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.7,
      };
    })
    .filter(Boolean);

  return [...staticEntries, ...vendorEntries];
}
