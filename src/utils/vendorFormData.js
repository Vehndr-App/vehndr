import { normalizeVendorCategories } from "../constants/categories";

export function clampFocalPoint(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 50;
  return Math.min(Math.max(numeric, 0), 100);
}

/**
 * Build FormData for vendor create/update from a partial field object.
 */
export function buildVendorFormData(fields = {}) {
  const formData = new FormData();

  if (fields.name !== undefined) {
    formData.append("vendor[name]", fields.name);
  }
  if (fields.slug !== undefined) {
    formData.append("vendor[slug]", fields.slug?.trim().toLowerCase() || "");
  }
  if (fields.description !== undefined) {
    formData.append("vendor[description]", fields.description);
  }
  if (fields.location !== undefined) {
    formData.append("vendor[location]", fields.location);
  }
  if (fields.serviceRadiusMiles !== undefined) {
    formData.append("vendor[service_radius_miles]", fields.serviceRadiusMiles);
  }
  if (fields.collectTax !== undefined) {
    formData.append("vendor[collect_tax]", fields.collectTax ? "true" : "false");
  }

  if (fields.categories !== undefined) {
    normalizeVendorCategories(fields.categories).forEach((category) => {
      formData.append("vendor[categories][]", category);
    });
  }

  if (fields.eventTypes !== undefined) {
    fields.eventTypes.forEach((eventType) => {
      formData.append("vendor[event_types][]", eventType);
    });
  }

  if (fields.bookingAcceptsFree !== undefined) {
    formData.append("vendor[booking_accepts_free]", fields.bookingAcceptsFree ? "true" : "false");
  }
  if (fields.bookingAcceptsTrade !== undefined) {
    formData.append("vendor[booking_accepts_trade]", fields.bookingAcceptsTrade ? "true" : "false");
  }
  if (fields.bookingAcceptsPaid !== undefined) {
    formData.append("vendor[booking_accepts_paid]", fields.bookingAcceptsPaid ? "true" : "false");
  }
  if (fields.bookingStartingFeeCents !== undefined) {
    formData.append(
      "vendor[booking_starting_fee_cents]",
      fields.bookingStartingFeeCents === null || fields.bookingStartingFeeCents === ""
        ? ""
        : String(fields.bookingStartingFeeCents)
    );
  }

  if (fields.profileImage) {
    formData.append("vendor[profile_image]", fields.profileImage);
  }
  if (fields.removeProfileImage) {
    formData.append("remove_profile_image", "true");
  }

  if (fields.heroImage) {
    formData.append("vendor[hero_image]", fields.heroImage);
  }
  if (fields.removeHeroImage) {
    formData.append("remove_hero_image", "true");
  }
  if (fields.heroFocalX !== undefined) {
    formData.append("vendor[hero_focal_x]", String(clampFocalPoint(fields.heroFocalX)));
  }
  if (fields.heroFocalY !== undefined) {
    formData.append("vendor[hero_focal_y]", String(clampFocalPoint(fields.heroFocalY)));
  }

  if (fields.galleryImages?.length) {
    fields.galleryImages.forEach((file) => {
      if (file) formData.append("vendor[gallery_images][]", file);
    });
  }

  if (fields.keepGalleryImages?.length) {
    fields.keepGalleryImages.forEach((value) => {
      formData.append("keep_gallery_images[]", value);
    });
  }

  if (fields.galleryImageOrder?.length) {
    fields.galleryImageOrder.forEach((id) => {
      formData.append("vendor[gallery_image_order][]", id);
    });
  }

  return formData;
}
