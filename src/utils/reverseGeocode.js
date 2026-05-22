/**
 * Reverse geocode coordinates to a city, state string via Nominatim.
 */
export async function reverseGeocode(latitude, longitude) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
    {
      headers: { "User-Agent": "Vehndr App" }
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get address");
  }

  const data = await response.json();

  if (data.address) {
    const city =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      data.address.county;
    const state = data.address.state;

    if (city && state) return `${city}, ${state}`;
    if (city) return city;
    if (state) return state;
    return data.display_name;
  }

  return data.display_name || "";
}

export async function searchLocationSuggestions(query, { signal } = {}) {
  const trimmed = String(query || "").trim();
  if (!trimmed) return [];

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(trimmed)}`,
    {
      signal,
      headers: { "User-Agent": "Vehndr App" }
    }
  );

  if (!response.ok) {
    throw new Error("Failed to search locations");
  }

  const results = await response.json();
  return (results || []).map((item) => {
    const address = item.address || {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.hamlet ||
      address.county;
    const state = address.state || address.region;
    const postcode = address.postcode;
    const country = address.country;
    const parts = [city, state, postcode, country].filter(Boolean);
    return {
      label: parts.length ? parts.join(", ") : item.display_name,
      latitude: item.lat,
      longitude: item.lon
    };
  });
}

export function geolocationErrorMessage(err) {
  if (err?.code === 1) {
    return "Location access denied. Please enable location permissions in your browser.";
  }
  if (err?.code === 2) {
    return "Location unavailable. Please try again.";
  }
  if (err?.code === 3) {
    return "Location request timed out. Please try again.";
  }
  return err?.message || "Failed to get location. Please enter manually.";
}

export async function getCurrentLocationString() {
  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported by your browser");
  }

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve(pos);
        },
        (err) => {
          reject(err);
        },
        {
          enableHighAccuracy: false,
          timeout: 12000,
          maximumAge: 300000
        }
      );
    });

    const { latitude, longitude } = position.coords;
    return reverseGeocode(latitude, longitude);
  } catch (err) {
    // On timeout/unavailable, fall back to coarse IP-based location so "Use my location" still works.
    if (err?.code === 2 || err?.code === 3) {
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (response.ok) {
          const data = await response.json();
          const city = data?.city;
          const region = data?.region;
          const postal = data?.postal;
          const country = data?.country_name;
          const parts = [city, region, postal, country].filter(Boolean);
          const label = parts.join(", ");
          if (label) {
            return label;
          }
        }
      } catch {
        // swallow; we rethrow original error below
      }
    }
    throw err;
  }
}
