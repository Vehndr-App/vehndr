import { api } from "./api";

export async function listOffers(inquiryId) {
  const res = await api(`/api/inquiries/${inquiryId}/offers`);
  return res?.offers ?? [];
}

export async function createOffer(inquiryId, data) {
  return api(`/api/inquiries/${inquiryId}/offers`, {
    method: "POST",
    body: data,
  });
}

export async function updateOffer(inquiryId, offerId, data) {
  return api(`/api/inquiries/${inquiryId}/offers/${offerId}`, {
    method: "PATCH",
    body: data,
  });
}

export async function acceptOffer(inquiryId, offerId) {
  return api(`/api/inquiries/${inquiryId}/offers/${offerId}/accept`, {
    method: "PATCH",
  });
}

export async function declineOffer(inquiryId, offerId) {
  return api(`/api/inquiries/${inquiryId}/offers/${offerId}/decline`, {
    method: "PATCH",
  });
}
