import { api } from "./api";

export async function listVendors(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.set("search", params.search);
  if (params.category) queryParams.set("category", params.category);
  if (params.minPrice) queryParams.set("min_price", params.minPrice);
  if (params.maxPrice) queryParams.set("max_price", params.maxPrice);

  const queryString = queryParams.toString();
  const url = `/api/vendors${queryString ? `?${queryString}` : ""}`;

  try {
    const res = await api(url);
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.vendors)) return res.vendors;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  } catch (error) {
    console.error("Failed to fetch vendors:", error);
    return [];
  }
}

export async function getVendorProfile(vendorId) {
  const res = await api(`/api/vendors/${vendorId}`);
  return res?.vendor ?? res?.data ?? res;
}

export async function getVendorProducts(vendorId) {
  const res = await api(`/api/vendors/${vendorId}/products`);
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.products)) return res.products;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}