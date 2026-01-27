export const metadata = {
  title: "Terms & Conditions | Vehndr",
  description: "Terms and conditions for using the Vehndr marketplace.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 text-[var(--gray-700)]">
      <h1 className="text-3xl font-bold text-[var(--gray-900)]">
        Terms & Conditions
      </h1>
      <p className="mt-2 text-sm text-[var(--gray-500)]">
        Last updated: January 26, 2026
      </p>

      <section className="mt-8 space-y-4 text-sm leading-6">
        <p>
          These Terms & Conditions govern your access to and use of Vehndr,
          including our website, applications, and services (collectively, the
          &quot;Service&quot;). By creating an account or using the Service, you
          agree to these Terms.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          Eligibility and accounts
        </h2>
        <p>
          You must be at least 18 years old and able to form a binding contract.
          You are responsible for the accuracy of your account information and
          for safeguarding your login credentials.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          Marketplace listings and transactions
        </h2>
        <p>
          Vendors and coordinators are responsible for the accuracy of listings,
          pricing, availability, and fulfillment. Purchases and bookings are
          subject to vendor-specific terms presented at checkout. We are not a
          party to vendor-customer agreements.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          Payments, fees, and refunds
        </h2>
        <p>
          Payments may be processed by third-party providers. We may charge
          service fees as disclosed at checkout. Refunds and cancellations are
          governed by vendor policies and applicable law.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          Prohibited activities
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Violating any applicable law or regulation.</li>
          <li>Posting misleading, harmful, or infringing content.</li>
          <li>Interfering with the security or operation of the Service.</li>
        </ul>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          Intellectual property
        </h2>
        <p>
          The Service and its content are owned by Vehndr or its licensors and
          are protected by intellectual property laws. You may not copy,
          distribute, or create derivative works without permission.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          Disclaimers and limitation of liability
        </h2>
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available.&quot;
          To the maximum extent permitted by law, Vehndr disclaims all implied
          warranties and is not liable for indirect, incidental, or consequential
          damages.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          Indemnification
        </h2>
        <p>
          You agree to indemnify and hold Vehndr harmless from claims arising
          out of your use of the Service, your content, or your violation of
          these Terms.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          Governing law
        </h2>
        <p>
          These Terms are governed by the laws of the United States and the
          state in which Vehndr is headquartered, without regard to conflict of
          laws principles.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          Changes to these Terms
        </h2>
        <p>
          We may update these Terms from time to time. Continued use of the
          Service after changes become effective constitutes acceptance of the
          updated Terms.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          Contact us
        </h2>
        <p>
          If you have questions about these Terms, contact us at
          support@vehndr.com.
        </p>
      </section>
    </div>
  );
}
