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

// Tax is charged on the budget plus the payer (VEHNDR platform) fee.
export function marketplaceTaxableBaseCents(baseCents) {
  return baseCents + marketplacePayerFeeCents(baseCents);
}

export function marketplaceChargeTotalCents(baseCents, tipCents = 0, collectTax = true) {
  return baseCents + marketplaceTaxCents(marketplaceTaxableBaseCents(baseCents), collectTax) + marketplacePayerFeeCents(baseCents) + tipCents;
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
  const taxCents = marketplaceTaxCents(marketplaceTaxableBaseCents(baseCents), collectTax);
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
// Mirrors the backend `MarketplacePricing.vendor_breakdown` (see create_vendor_payment_intent)
// so the figures match the real Stripe charge: the vendor is charged booth fee + VEHNDR fee
// (10%) + tax (on booth + VEHNDR fee) + Stripe processing fee (on booth + VEHNDR fee + tax);
// the EC receives the booth fee less the VEHNDR recipient cut (10%).
export function vendorBoothBreakdown(baseCents) {
  const vehndrFeeCents = marketplacePayerFeeCents(baseCents);
  const taxCents = Math.round((baseCents + vehndrFeeCents) * MARKETPLACE_TAX_RATE);
  const stripeFeeCents = marketplaceStripeFeeCents(baseCents + vehndrFeeCents + taxCents);
  const recipientFeeCents = marketplaceRecipientFeeCents(baseCents);
  return {
    baseCents,
    vehndrFeeCents,
    taxCents,
    stripeFeeCents,
    totalCents:          baseCents + vehndrFeeCents + taxCents + stripeFeeCents,
    ecRecipientFeeCents: recipientFeeCents,
    ecPayoutCents:       Math.max(baseCents - recipientFeeCents, 0),
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
