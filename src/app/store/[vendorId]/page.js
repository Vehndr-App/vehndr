import StorefrontClient from "./StorefrontClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.vehndr.com";
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_PROXY_TARGET ||
  "https://vehndr-api-9f3b664fe80f.herokuapp.com";

async function fetchVendorForMeta(vendorId) {
  try {
    const res = await fetch(`${API_BASE}/api/vendors/${encodeURIComponent(vendorId)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.vendor ?? data?.data ?? data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { vendorId } = await params;
  const vendor = await fetchVendorForMeta(vendorId);
  const name = vendor?.name?.trim() || "Vendor";
  const categories = Array.isArray(vendor?.categories)
    ? vendor.categories.filter(Boolean).join(" · ")
    : "";
  const description =
    (vendor?.description || vendor?.tagline || categories || "Event vendor on Vehndr").toString().slice(0, 160);

  const title = `${name} on Vehndr`;
  const url = `${SITE_URL}/store/${encodeURIComponent(vendorId)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Vehndr",
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function StorefrontPage() {
  return <StorefrontClient />;
}
