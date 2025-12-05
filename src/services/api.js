const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function buildHeaders(extraHeaders = {}, body) {
  const headers = { ...extraHeaders };
  const hasFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (!hasFormData) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    headers["Accept"] = headers["Accept"] || "application/json";
  }
  const token =
    typeof window !== "undefined"
      ? window.localStorage?.getItem("vehndr_token")
      : null;
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function api(path, { method = "GET", headers = {}, body, signal, credentials } = {}) {
  const requestBody =
    body && typeof body !== "string" && !(body instanceof FormData)
      ? JSON.stringify(body)
      : body;

  const token =
    typeof window !== "undefined"
      ? window.localStorage?.getItem("vehndr_token")
      : null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: buildHeaders(headers, body),
    body: requestBody,
    credentials: credentials ?? "include",
    signal,
  });

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


