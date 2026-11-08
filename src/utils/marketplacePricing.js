import { TEXAS_SALES_TAX_RATE } from "./salesTaxRates";

export const MARKETPLACE_TAX_RATE = TEXAS_SALES_TAX_RATE;
export const MARKETPLACE_PAYER_FEE_RATE = 0.10;
export const MARKETPLACE_RECIPIENT_FEE_RATE = 0.10;
export const STRIPE_FEE_RATE = 0.029;
export const STRIPE_FEE_FIXED_CENTS = 30;

export function marketplaceTaxCents(baseCents, collectTax = true, taxRate = TEXAS_SALES_TAX_RATE) {
  if (!collectTax) return 0;
  return Math.round(baseCents * taxRate);
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

export function marketplaceChargeTotalCents(
  baseCents,
  tipCents = 0,
  collectTax = true,
  taxRate = TEXAS_SALES_TAX_RATE
) {
  return (
    baseCents +
    marketplaceTaxCents(marketplaceTaxableBaseCents(baseCents), collectTax, taxRate) +
    marketplacePayerFeeCents(baseCents) +
    tipCents
  );
}

export function marketplaceStripeFeeCents(totalChargeCents) {
  return Math.round(totalChargeCents * STRIPE_FEE_RATE + STRIPE_FEE_FIXED_CENTS);
}

export function marketplaceRecipientPayoutCents(
  baseCents,
  tipCents = 0,
  collectTax = true,
  taxRate = TEXAS_SALES_TAX_RATE
) {
  const payoutBeforeTip = Math.max(
    baseCents -
      marketplaceRecipientFeeCents(baseCents) -
      marketplaceStripeFeeCents(marketplaceChargeTotalCents(baseCents, tipCents, collectTax, taxRate)),
    0
  );

  return payoutBeforeTip + tipCents;
}

export function marketplaceBreakdown(
  baseCents,
  tipCents = 0,
  collectTax = true,
  taxRate = TEXAS_SALES_TAX_RATE
) {
  const taxCents = marketplaceTaxCents(marketplaceTaxableBaseCents(baseCents), collectTax, taxRate);
  const payerFeeCents = marketplacePayerFeeCents(baseCents);
  const recipientFeeCents = marketplaceRecipientFeeCents(baseCents);
  const totalChargeCents = marketplaceChargeTotalCents(baseCents, tipCents, collectTax, taxRate);
  const stripeFeeCents = marketplaceStripeFeeCents(totalChargeCents);
  const recipientPayoutCents = marketplaceRecipientPayoutCents(baseCents, tipCents, collectTax, taxRate);

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

export function vendorBoothBreakdown(baseCents, collectTax = true, taxRate = TEXAS_SALES_TAX_RATE) {
  const vehndrFeeCents = marketplacePayerFeeCents(baseCents);
  const taxCents = collectTax ? Math.round((baseCents + vehndrFeeCents) * taxRate) : 0;
  const stripeFeeCents = marketplaceStripeFeeCents(baseCents + vehndrFeeCents + taxCents);
  const recipientFeeCents = marketplaceRecipientFeeCents(baseCents);
  return {
    baseCents,
    vehndrFeeCents,
    taxCents,
    stripeFeeCents,
    totalCents: baseCents + vehndrFeeCents + taxCents + stripeFeeCents,
    ecRecipientFeeCents: recipientFeeCents,
    ecPayoutCents: Math.max(baseCents - recipientFeeCents, 0),
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
