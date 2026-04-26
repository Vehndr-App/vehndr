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

export async function createMarketplacePaymentIntent({ bookingId, payDeposit }) {
  return api("/api/checkout/marketplace_payment_intent", {
    method: "POST",
    body: {
      booking_id: bookingId,
      pay_deposit: payDeposit,
    },
  });
}

export async function confirmMarketplacePayment({ paymentIntentId, bookingId, isDeposit }) {
  return api("/api/checkout/marketplace_confirm", {
    method: "POST",
    body: { paymentIntentId, bookingId, isDeposit },
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









