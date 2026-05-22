/**
 * Price label for booking the vendor as a whole (not product catalog prices).
 */
export function getVendorBookingPriceLabel(vendor) {
  if (!vendor) return "Request to book";

  const acceptsFree = vendor.bookingAcceptsFree ?? vendor.booking_accepts_free;
  const acceptsTrade = vendor.bookingAcceptsTrade ?? vendor.booking_accepts_trade;
  const acceptsPaid = vendor.bookingAcceptsPaid ?? vendor.booking_accepts_paid;
  const feeCents = vendor.bookingStartingFeeCents ?? vendor.booking_starting_fee_cents;

  const hasPreference = acceptsFree || acceptsTrade || acceptsPaid;
  if (!hasPreference) return "Request to book";

  if (acceptsFree) return "$0+";

  if (acceptsPaid) {
    if (feeCents != null && feeCents > 0) {
      return `From $${Math.round(feeCents / 100)}`;
    }
    return "Paid bookings";
  }

  if (acceptsTrade) return "Trade / barter";

  return "Request to book";
}

export const VENDOR_BOOKING_FOOTER_SUBTITLE =
  "Book this vendor for your event — free, trade, or paid";
