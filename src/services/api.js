const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function getOrCreateCartToken() {
  if (typeof window === "undefined") return null;

  let cartToken = window.localStorage?.getItem("vehndr_cart_token");
  if (!cartToken) {
    // Generate a new cart token (UUID v4)
    cartToken = crypto.randomUUID();
    window.localStorage?.setItem("vehndr_cart_token", cartToken);
  }
  return cartToken;
}

function buildHeaders(extraHeaders = {}, body) {
  const headers = { ...extraHeaders };
  const hasFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (!hasFormData) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    headers["Accept"] = headers["Accept"] || "application/json";
  }

  // Add JWT token if authenticated
  const token =
    typeof window !== "undefined"
      ? window.localStorage?.getItem("vehndr_token")
      : null;
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Add cart token for guest carts
  const cartToken = getOrCreateCartToken();
  if (cartToken && !headers["X-Cart-Token"]) {
    headers["X-Cart-Token"] = cartToken;
  }

  return headers;
}

export async function api(path, { method = "GET", headers = {}, body, signal, credentials, cache } = {}) {
  const requestBody =
    body && typeof body !== "string" && !(body instanceof FormData)
      ? JSON.stringify(body)
      : body;

  const token =
    typeof window !== "undefined"
      ? window.localStorage?.getItem("vehndr_token")
      : null;

  const fetchOptions = {
    method,
    headers: buildHeaders(headers, body),
    body: requestBody,
    credentials: credentials ?? "include",
    signal,
  };
  
  // Add cache option for Next.js server components
  if (cache) {
    fetchOptions.cache = cache;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, fetchOptions);

  if (!response.ok) {
    let errorDetail;
    try {
      errorDetail = await response.json();
    } catch (_) {
      // ignore
    }
    const error = new Error(
      errorDetail?.message || `Request failed with ${response.status}`
    );
    error.status = response.status;
    error.details = errorDetail;
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export { API_BASE_URL };


