const DEFAULT_STOREFRONT_ORIGIN = "https://www.vehndr.com";

export function getStorefrontIdentifier(data) {
  if (!data) return null;
  return (
    data.slug ||
    data.vendorSlug ||
    data.vendor_slug ||
    data.id ||
    data.vendorId ||
    data.vendor_id ||
    null
  );
}

export function getStorefrontPath(data) {
  const identifier = typeof data === "string" ? data : getStorefrontIdentifier(data);
  if (!identifier) return "/store";
  return `/store?vendorId=${identifier}`;
}

export function getStorefrontUrl(data, originOverride) {
  const origin =
    originOverride ||
    (typeof window !== "undefined" ? window.location.origin : DEFAULT_STOREFRONT_ORIGIN);
  return `${origin}${getStorefrontPath(data)}`;
}

export function getProductPath(vendorData, productId) {
  const identifier = typeof vendorData === "string" ? vendorData : getStorefrontIdentifier(vendorData);
  if (!identifier || !productId) return "/store";
  return `/store/products?vendorId=${identifier}&productId=${productId}`;
}
