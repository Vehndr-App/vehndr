'use client';

import { Capacitor } from '@capacitor/core';
import { api } from './api';

let _plugin = null;
let _tokenListener = null;
let _initialized = false;

async function getPlugin() {
  if (!_plugin) {
    const mod = await import('@capacitor-community/stripe-terminal');
    _plugin = mod.StripeTerminal;
  }
  return _plugin;
}

export function isTerminalAvailable() {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

export async function initializeTerminal() {
  if (!isTerminalAvailable()) {
    throw new Error('Tap to Pay requires the native app');
  }
  if (_initialized) return;

  const terminal = await getPlugin();
  const { TerminalEventsEnum } = await import('@capacitor-community/stripe-terminal');

  _tokenListener = await terminal.addListener(
    TerminalEventsEnum.RequestedConnectionToken,
    async () => {
      try {
        const { secret } = await api('/api/terminal/connection_token', { method: 'POST' });
        await terminal.setConnectionToken({ token: secret });
      } catch (err) {
        console.error('Terminal connection token fetch failed:', err);
      }
    }
  );

  const isTest = !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live_');
  await terminal.initialize({ isTest });
  _initialized = true;
}

export async function discoverAndConnect() {
  const terminal = await getPlugin();
  const { TerminalConnectTypes } = await import('@capacitor-community/stripe-terminal');

  const { readers } = await terminal.discoverReaders({
    type: TerminalConnectTypes.TapToPay,
  });

  if (!readers || readers.length === 0) {
    throw new Error('No Tap to Pay reader found. Ensure NFC is enabled on this device.');
  }

  await terminal.connectReader({ reader: readers[0] });
}

export async function createTerminalPaymentIntent({ amountCents, vendorId, cart }) {
  const items = cart.filter(i => !i.isCustom).map(i => ({
    product_id: i.id,
    quantity: i.quantity,
  }));
  const customItems = cart.filter(i => i.isCustom).map(i => ({
    name: i.name,
    price: i.price,
    quantity: i.quantity,
  }));

  return api('/api/terminal/payment_intent', {
    method: 'POST',
    body: { amount_cents: amountCents, vendor_id: vendorId, items, custom_items: customItems },
  });
}

export async function collectPayment(clientSecret) {
  const terminal = await getPlugin();
  await terminal.collectPaymentMethod({ paymentIntent: clientSecret });
}

export async function confirmPayment() {
  const terminal = await getPlugin();
  await terminal.confirmPaymentIntent();
}

export async function cancelPayment() {
  try {
    const terminal = await getPlugin();
    await terminal.cancelCollectPaymentMethod();
  } catch {
    // Ignore if nothing is in progress
  }
}

export async function disconnectReader() {
  try {
    const terminal = await getPlugin();
    await terminal.disconnectReader();
  } catch {
    // Ignore
  } finally {
    _initialized = false;
    _tokenListener?.remove();
    _tokenListener = null;
    _plugin = null;
  }
}
