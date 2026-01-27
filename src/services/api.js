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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/10bfb25e-a71c-4a63-9b69-e5a8b576d54d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'api.js:43',message:'api() entry',data:{path,method,hasBody:!!body,bodyType:body instanceof FormData ? 'FormData' : typeof body,apiBaseUrl:API_BASE_URL,hasWindow:typeof window !== 'undefined'},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
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

  const url = `${API_BASE_URL}${path}`;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/10bfb25e-a71c-4a63-9b69-e5a8b576d54d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'api.js:69',message:'before fetch',data:{url,method,credentials:fetchOptions.credentials,headersKeys:Object.keys(fetchOptions.headers || {}),hasCache:!!fetchOptions.cache,cacheValue:fetchOptions.cache || null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/10bfb25e-a71c-4a63-9b69-e5a8b576d54d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3',location:'api.js:74',message:'fetch threw',data:{url,errorName:err?.name||'unknown',errorMessage:err?.message||'unknown'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const error = new Error(`Network error: unable to reach ${API_BASE_URL}`);
    error.isNetworkError = true;
    error.cause = err;
    throw error;
  }

  if (!response.ok) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/10bfb25e-a71c-4a63-9b69-e5a8b576d54d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4',location:'api.js:84',message:'non-2xx response',data:{url,status:response.status,statusText:response.statusText,contentType:response.headers.get('content-type')||''},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/10bfb25e-a71c-4a63-9b69-e5a8b576d54d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5',location:'api.js:106',message:'response parsed as text',data:{url,contentType},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return response.text();
}

export { API_BASE_URL };


