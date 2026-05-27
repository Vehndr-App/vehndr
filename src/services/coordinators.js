import { api } from "./api";

export async function getCoordinatorProfile(coordinatorId) {
  return api(`/api/coordinators/${coordinatorId}`);
}

// ─── Stripe Connect (payout account for charging vendors) ───────────────────────
// These operate on the current user's coordinator profile (no id in the URL).

export async function getCoordinatorStripeAccount() {
  return api(`/api/coordinator/stripe/account`);
}

export async function createCoordinatorAccountLink({ refreshUrl, returnUrl } = {}) {
  return api(`/api/coordinator/stripe/account_link`, {
    method: "POST",
    body: { refreshUrl, returnUrl },
  });
}

export async function refreshCoordinatorStripeAccount() {
  return api(`/api/coordinator/stripe/refresh`, { method: "POST" });
}








