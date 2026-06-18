export const MARKETPLACE_TAX_RATE = 0.0825;
export const MARKETPLACE_PAYER_FEE_RATE = 0.10;
export const MARKETPLACE_RECIPIENT_FEE_RATE = 0.10;
export const STRIPE_FEE_RATE = 0.029;
export const STRIPE_FEE_FIXED_CENTS = 30;

export function marketplaceTaxCents(baseCents, collectTax = true) {
  if (!collectTax) return 0;
  return Math.round(baseCents * MARKETPLACE_TAX_RATE);
}

export function marketplacePayerFeeCents(baseCents) {
  return Math.round(baseCents * MARKETPLACE_PAYER_FEE_RATE);
}

export function marketplaceRecipientFeeCents(baseCents) {
  return Math.round(baseCents * MARKETPLACE_RECIPIENT_FEE_RATE);
}

export function marketplaceChargeTotalCents(baseCents, tipCents = 0, collectTax = true) {
  return baseCents + marketplaceTaxCents(baseCents, collectTax) + marketplacePayerFeeCents(baseCents) + tipCents;
}

export function marketplaceStripeFeeCents(totalChargeCents) {
  return Math.round(totalChargeCents * STRIPE_FEE_RATE + STRIPE_FEE_FIXED_CENTS);
}

export function marketplaceRecipientPayoutCents(baseCents, tipCents = 0, collectTax = true) {
  const payoutBeforeTip = Math.max(
    baseCents -
      marketplaceRecipientFeeCents(baseCents) -
      marketplaceStripeFeeCents(marketplaceChargeTotalCents(baseCents, tipCents, collectTax)),
    0
  );

  return payoutBeforeTip + tipCents;
}

export function marketplaceBreakdown(baseCents, tipCents = 0, collectTax = true) {
  const taxCents = marketplaceTaxCents(baseCents, collectTax);
  const payerFeeCents = marketplacePayerFeeCents(baseCents);
  const recipientFeeCents = marketplaceRecipientFeeCents(baseCents);
  const totalChargeCents = marketplaceChargeTotalCents(baseCents, tipCents, collectTax);
  const stripeFeeCents = marketplaceStripeFeeCents(totalChargeCents);
  const recipientPayoutCents = marketplaceRecipientPayoutCents(baseCents, tipCents, collectTax);

  return {
    subtotalCents: baseCents,
    taxCents,
    payerFeeCents,
    coordinatorFeeCents: payerFeeCents,
    buyerFeeCents: payerFeeCents,
    recipientFeeCents,
    sellerFeeCents: recipientFeeCents,
    vendorFeeCents: recipientFeeCents,
    vehndrFeeCents: payerFeeCents + recipientFeeCents,
    stripeFeeCents,
    tipCents,
    totalChargeCents,
    recipientPayoutCents,
    vendorPayoutCents: recipientPayoutCents,
    applicationFeeCents: totalChargeCents - recipientPayoutCents,
  };
}

// Vendor-pays booth fee breakdown (proposal_type "product"): the vendor pays the EC.
// Mirrors the backend `MarketplacePricing.breakdown` (see create_vendor_payment_intent) so
// the figures match the real Stripe charge: the vendor is charged base + service fee (10%)
// + tax (on base); the EC receives base − VEHNDR fee (10%) − Stripe processing fee.
export function vendorBoothBreakdown(baseCents) {
  const b = marketplaceBreakdown(baseCents);
  return {
    baseCents:           b.subtotalCents,
    vehndrFeeCents:      b.payerFeeCents,        // vendor's service fee (10%), added to charge
    taxCents:            b.taxCents,             // tax on base
    totalCents:          b.totalChargeCents,     // what the vendor pays
    ecRecipientFeeCents: b.recipientFeeCents,    // EC's VEHNDR fee (10%), deducted from payout
    ecStripeFeeCents:    b.stripeFeeCents,       // processing fee deducted from EC payout
    ecPayoutCents:       b.recipientPayoutCents, // what the EC actually receives
  };
}

export function marketplaceTipBreakdown(tipCents) {
  const stripeFeeCents = marketplaceStripeFeeCents(tipCents);
  const recipientPayoutCents = Math.max(tipCents - stripeFeeCents, 0);

  return {
    tipCents,
    stripeFeeCents,
    recipientPayoutCents,
    vendorPayoutCents: recipientPayoutCents,
    applicationFeeCents: tipCents - recipientPayoutCents,
  };
}
