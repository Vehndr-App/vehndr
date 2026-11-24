import Link from "next/link";

export const metadata = {
  title: "Refunds & Cancellations | Vehndr",
  description: "How cancellations and refunds work on the VEHNDR marketplace.",
};

export default function RefundsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 text-[var(--gray-700)]">
      <h1 className="text-3xl font-bold text-[var(--gray-900)]">
        Refunds &amp; Cancellations
      </h1>
      <p className="mt-2 text-sm text-[var(--gray-500)]">
        Last Updated: November 24, 2026
      </p>

      <section className="mt-8 space-y-6 text-sm leading-6">
        <p>
          This page explains how cancellations and refunds work on VEHNDR
          (operated by <strong>Vehndr by Gabby &amp; Shay LLC</strong>). It is meant
          to be a plain-language guide. Your{" "}
          <Link href="/terms" className="underline text-[var(--violet-700)]">
            Terms &amp; Conditions
          </Link>{" "}
          still apply.
        </p>
        <p>
          VEHNDR is a marketplace. Payments for marketplace bookings are processed
          through Stripe. Exact refund amounts can depend on what was paid, the
          deposit type on the offer, and whether both parties agree to cancel.
        </p>

        <hr className="border-[var(--gray-200)]" />

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          1. Unpaid proposals (not booked yet)
        </h2>
        <p>
          If a booking request or proposal has <strong>not</strong> been paid yet,
          either party may cancel it in the app. Because no payment has been
          captured for that booking, there is typically nothing to refund.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          2. Paid marketplace bookings
        </h2>
        <p>
          Once a marketplace booking is paid (deposit or full payment), cancellation
          is a <strong>two-party process</strong>:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            The coordinator <em>or</em> the vendor can tap{" "}
            <strong>Request Cancellation</strong> on the proposal / booking.
          </li>
          <li>
            The other party must <strong>accept</strong> the request before the
            booking is cancelled and before any refund is issued.
          </li>
          <li>
            The other party may <strong>decline</strong> the request. If declined,
            the booking stays active.
          </li>
          <li>
            The person who requested cancellation can usually{" "}
            <strong>withdraw</strong> the request while it is still pending.
          </li>
        </ul>
        <p>
          When a cancellation is accepted, eligible refunds are processed through
          Stripe back to the original payment method when possible. Timing depends
          on Stripe and the card issuer (often several business days).
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          3. Deposits: refundable vs non-refundable
        </h2>
        <p>
          Vendors / offers may mark a deposit as <strong>refundable</strong> or{" "}
          <strong>non-refundable</strong>. That choice affects what can be refunded
          if the <em>payer</em> cancels:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Non-refundable deposit:</strong> If the person who paid requests
            cancellation, the non-refundable deposit may be forfeited (not refunded),
            based on the booking’s refund rules in the product.
          </li>
          <li>
            <strong>Refundable deposit:</strong> Eligible amounts may be proposed for
            refund when a cancellation request is made and accepted.
          </li>
          <li>
            If the <em>other</em> party (not the payer) requests cancellation, the
            payer is generally made whole up to the policy maximum for that booking.
          </li>
        </ul>
        <p>
          The cancellation request may include a proposed refund amount (including
          a partial refund), capped by what the Platform allows for that booking.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          4. Who gets a refund
        </h2>
        <p>When a refund is issued on a paid booking:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            If the coordinator paid the vendor (typical “hiring a vendor” booking),
            refunds generally go back to the <strong>coordinator</strong>.
          </li>
          <li>
            If the vendor paid a coordinator fee (vending fee booking), refunds
            generally go back to the <strong>vendor</strong>.
          </li>
          <li>
            Free / no-fee arrangements usually have nothing to refund.
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          5. Platform fees &amp; taxes
        </h2>
        <p>
          Amounts shown at checkout may include marketplace fees and applicable sales
          tax. Refund treatment of fees and tax follows what was charged on that
          payment and what Stripe can reverse for the transaction. If something looks
          wrong after a cancellation is accepted, contact us and include your booking
          or proposal details.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          6. Product / cart purchases
        </h2>
        <p>
          Separate product or cart checkouts (outside a marketplace proposal booking)
          may follow the vendor’s listing details and VEHNDR’s order tools. If you
          need help with a product order refund, email us with your order information.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          7. Disputes
        </h2>
        <p>
          Please try to resolve issues directly in the booking conversation first.
          VEHNDR may help facilitate a conversation but is not required to decide
          every dispute. Cardholders may also have chargeback rights through their
          bank; banks have their own processes and timelines.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          8. How to get help
        </h2>
        <p>
          For cancellation or refund help, contact{" "}
          <a href="mailto:admin@vehndr.com" className="underline text-[var(--violet-700)]">
            admin@vehndr.com
          </a>{" "}
          or visit{" "}
          <Link href="/support" className="underline text-[var(--violet-700)]">
            Support
          </Link>
          . Include your account email and the proposal / booking link if you have it.
        </p>

        <p className="text-[var(--gray-500)]">
          Related:{" "}
          <Link href="/terms" className="underline">
            Terms &amp; Conditions
          </Link>
          {" · "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
        </p>
      </section>
    </div>
  );
}
