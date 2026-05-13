import { api } from "./api";

export async function createCheckoutSession({ lineItems, vendorId }) {
  return api("/api/checkout/sessions", {
    method: "POST",
    body: {
      vendor_id: vendorId,
      items: lineItems,
    },
  });
}

export async function createMarketplacePaymentIntent({ bookingId, payDeposit, tipCents = 0 }) {
  return api("/api/checkout/marketplace_payment_intent", {
    method: "POST",
    body: {
      booking_id: bookingId,
      pay_deposit: payDeposit,
      tip_cents: tipCents,
    },
  });
}

export async function confirmMarketplacePayment({ paymentIntentId, bookingId, isDeposit, tipCents = 0 }) {
  return api("/api/checkout/marketplace_confirm", {
    method: "POST",
    body: { paymentIntentId, bookingId, isDeposit, tipCents },
  });
}

export async function addMarketplaceTip({ bookingId, tipCents }) {
  return api("/api/checkout/marketplace_tip", {
    method: "POST",
    body: { booking_id: bookingId, tip_cents: tipCents },
  });
}

export async function confirmMarketplaceTip({ paymentIntentId, bookingId, tipCents }) {
  return api("/api/checkout/marketplace_tip_confirm", {
    method: "POST",
    body: { paymentIntentId, bookingId, tipCents },
  });
}

export async function createVendorPaymentIntent({ inquiryId }) {
  return api("/api/checkout/vendor_payment_intent", {
    method: "POST",
    body: { inquiry_id: inquiryId },
  });
}

export async function confirmVendorPayment({ paymentIntentId, bookingId }) {
  return api("/api/checkout/vendor_confirm", {
    method: "POST",
    body: { paymentIntentId, bookingId },
  });
}
