const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "";

function isFormDataLike(value) {
  if (!value) return false;
  if (typeof FormData !== "undefined" && value instanceof FormData) return true;
  return Object.prototype.toString.call(value) === "[object FormData]";
}

function getOrCreateCartToken() {
  if (typeof window === "undefined") return null;

  let cartToken = window.localStorage?.getItem("vehndr_cart_token");
  if (!cartToken) {
    // Generate a new cart token (UUID v4)
    // crypto.randomUUID() requires a secure context (HTTPS); fall back for HTTP / Android emulator
    cartToken =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
          });
    window.localStorage?.setItem("vehndr_cart_token", cartToken);
  }
  return cartToken;
}

function buildHeaders(extraHeaders = {}, body) {
  const headers = { ...extraHeaders };
  const hasFormData = isFormDataLike(body);
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
  const isMultipartBody = isFormDataLike(body);
  const requestBody =
    body && typeof body !== "string" && !isMultipartBody
      ? JSON.stringify(body)
      : body;

  const fetchOptions = {
    method,
    headers: buildHeaders(headers, isMultipartBody ? body : requestBody),
    body: requestBody,
    credentials: credentials ?? "include",
    signal,
  };

  // Add cache option for Next.js server components
  if (cache) {
    fetchOptions.cache = cache;
  }

  const url = `${API_BASE_URL}${path}`;
  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (err) {
    const error = new Error(`Network error: unable to reach ${API_BASE_URL}`);
    error.isNetworkError = true;
    error.cause = err;
    throw error;
  }

  if (!response.ok) {
    let errorDetail;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        errorDetail = await response.json();
      } catch (_) {
        // ignore
      }
    } else {
      try {
        errorDetail = await response.text();
      } catch (_) {
        // ignore
      }
    }
    const errorMessage =
      (typeof errorDetail === "string" && errorDetail.trim()) ||
      errorDetail?.message ||
      errorDetail?.error ||
      (Array.isArray(errorDetail?.errors) ? errorDetail.errors.join(", ") : "") ||
      `Request failed with ${response.status}`;
    const error = new Error(
      errorMessage
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
