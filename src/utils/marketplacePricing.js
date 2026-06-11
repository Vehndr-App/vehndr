export const MARKETPLACE_TAX_RATE = 0.0825;
export const MARKETPLACE_PAYER_FEE_RATE = 0.10;
export const MARKETPLACE_RECIPIENT_FEE_RATE = 0.10;
export const STRIPE_FEE_RATE = 0.029;
export const STRIPE_FEE_FIXED_CENTS = 30;

export function marketplaceTaxCents(baseCents) {
  return Math.round(baseCents * MARKETPLACE_TAX_RATE);
}

export function marketplacePayerFeeCents(baseCents) {
  return Math.round(baseCents * MARKETPLACE_PAYER_FEE_RATE);
}

export function marketplaceRecipientFeeCents(baseCents) {
  return Math.round(baseCents * MARKETPLACE_RECIPIENT_FEE_RATE);
}

export function marketplaceChargeTotalCents(baseCents, tipCents = 0) {
  return baseCents + marketplaceTaxCents(baseCents) + marketplacePayerFeeCents(baseCents) + tipCents;
}

export function marketplaceStripeFeeCents(totalChargeCents) {
  return Math.round(totalChargeCents * STRIPE_FEE_RATE + STRIPE_FEE_FIXED_CENTS);
}

export function marketplaceRecipientPayoutCents(baseCents, tipCents = 0) {
  const payoutBeforeTip = Math.max(
    baseCents -
      marketplaceRecipientFeeCents(baseCents) -
      marketplaceStripeFeeCents(marketplaceChargeTotalCents(baseCents, tipCents)),
    0
  );

  return payoutBeforeTip + tipCents;
}

export function marketplaceBreakdown(baseCents, tipCents = 0) {
  const taxCents = marketplaceTaxCents(baseCents);
  const payerFeeCents = marketplacePayerFeeCents(baseCents);
  const recipientFeeCents = marketplaceRecipientFeeCents(baseCents);
  const totalChargeCents = marketplaceChargeTotalCents(baseCents, tipCents);
  const stripeFeeCents = marketplaceStripeFeeCents(totalChargeCents);
  const recipientPayoutCents = marketplaceRecipientPayoutCents(baseCents, tipCents);

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

// Vendor-pays booth fee breakdown: tax applies to (booth fee + VEHNDR fee)
export function vendorBoothBreakdown(baseCents) {
  const vehndrFeeCents = marketplacePayerFeeCents(baseCents);
  const taxCents = Math.round((baseCents + vehndrFeeCents) * MARKETPLACE_TAX_RATE);
  const totalCents = baseCents + vehndrFeeCents + taxCents;
  const ecRecipientFeeCents = marketplaceRecipientFeeCents(baseCents);
  const ecPayoutCents = Math.max(baseCents - ecRecipientFeeCents, 0);
  return { baseCents, vehndrFeeCents, taxCents, totalCents, ecRecipientFeeCents, ecPayoutCents };
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
