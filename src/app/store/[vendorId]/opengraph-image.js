import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Vendor on Vehndr";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_PROXY_TARGET ||
  "https://vehndr-api-9f3b664fe80f.herokuapp.com";

async function fetchVendor(vendorId) {
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

function pickImageUrl(vendor) {
  // Cover photo first (best for link previews); fall back to profile/logo
  return vendor?.heroImage || vendor?.profileImage || null;
}

async function toDataUrl(imageUrl) {
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const buf = await imgRes.arrayBuffer();
    // Keep OG generation light — skip oversized originals
    if (buf.byteLength > 4_500_000) return null;
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function OpenGraphImage({ params }) {
  const { vendorId } = await params;
  const vendor = await fetchVendor(vendorId);
  const name = vendor?.name?.trim() || "Vendor";
  const categories = Array.isArray(vendor?.categories)
    ? vendor.categories.filter(Boolean).slice(0, 3).join(" · ")
    : "";
  const photoSrc = pickImageUrl(vendor) ? await toDataUrl(pickImageUrl(vendor)) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "linear-gradient(135deg, #7c3aed 0%, #d946ef 50%, #f43f5e 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoSrc}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(15,10,30,0.88) 0%, rgba(15,10,30,0.35) 45%, rgba(15,10,30,0.2) 100%)",
            display: "flex",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "56px 64px",
            width: "100%",
            height: "100%",
            color: "white",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 18,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 42,
                height: 42,
                borderRadius: 999,
                background: "rgba(255,255,255,0.2)",
                fontSize: 22,
              }}
            >
              V
            </div>
            vehndr
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              maxWidth: 980,
            }}
          >
            {name}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 16,
              fontSize: 28,
              color: "rgba(255,255,255,0.88)",
              maxWidth: 900,
            }}
          >
            {categories ? `${categories} · Vendor on Vehndr` : "Vendor on Vehndr"}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
