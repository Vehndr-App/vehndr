import { api } from "./api";

export async function listInquiries() {
  const res = await api("/api/inquiries");
  return res?.inquiries ?? [];
}

export async function getInquiry(id) {
  const res = await api(`/api/inquiries/${id}`);
  return res?.inquiry ?? res;
}

export async function createInquiry(data) {
  return await api("/api/inquiries", {
    method: "POST",
    body: data,
  });
}

export async function listMessages(inquiryId) {
  return await api(`/api/inquiries/${inquiryId}/messages`);
}

export async function sendMessage(inquiryId, body) {
  return await api(`/api/inquiries/${inquiryId}/messages`, {
    method: "POST",
    body: { body },
  });
}

export async function listVendorInquiries() {
  const res = await api("/api/inquiries/vendor_inbox");
  return res?.inquiries ?? [];
}

export async function updateInquiry(id, data) {
  return api(`/api/inquiries/${id}`, { method: "PATCH", body: data });
}

export async function deleteInquiry(id) {
  return api(`/api/inquiries/${id}`, { method: "DELETE" });
}

export async function declineInquiry(id) {
  return api(`/api/inquiries/${id}/decline`, { method: "PATCH" });
}

// Cancel an unpaid proposal (no booking / no refund). For a paid booking use
// cancelMarketplaceBooking() in services/checkout.js instead.
export async function cancelInquiry(id, { reason } = {}) {
  return api(`/api/inquiries/${id}/cancel`, {
    method: "PATCH",
    body: reason ? { reason } : {},
  });
}

export async function updateInquiryTip(id, tipCents) {
  return api(`/api/inquiries/${id}/tip`, {
    method: "PATCH",
    body: { tip_cents: tipCents },
  });
}
