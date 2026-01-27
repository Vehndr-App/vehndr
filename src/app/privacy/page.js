export const metadata = {
  title: "Privacy Policy | Vehndr",
  description: "Privacy policy for the Vehndr marketplace.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 text-[var(--gray-700)]">
      <h1 className="text-3xl font-bold text-[var(--gray-900)]">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-[var(--gray-500)]">
        Last updated: January 26, 2026
      </p>

      <section className="mt-8 space-y-4 text-sm leading-6">
        <p>
          This Privacy Policy explains how Vehndr collects, uses, shares, and
          protects your information when you use our Service.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          Information we collect
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Account details such as name, email, and password.</li>
          <li>Profile information you choose to provide.</li>
          <li>Transaction and booking details.</li>
          <li>Device and usage information for security and analytics.</li>
        </ul>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          How we use information
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Provide and improve the Service.</li>
          <li>Process transactions and send confirmations.</li>
          <li>Maintain security and prevent fraud.</li>
          <li>Communicate important updates about your account.</li>
        </ul>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          How we share information
        </h2>
        <p>
          We share information with vendors and service providers as needed to
          fulfill your requests, process payments, and maintain the Service. We
          do not sell personal information.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          Cookies and tracking
        </h2>
        <p>
          We use cookies and similar technologies to remember preferences,
          improve performance, and understand usage. You can control cookies via
          your browser settings.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          Data retention and security
        </h2>
        <p>
          We retain information as long as needed to provide the Service and for
          legitimate business purposes. We use reasonable safeguards to protect
          your data.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          Children&apos;s privacy
        </h2>
        <p>
          The Service is not directed to children under 13, and we do not
          knowingly collect personal information from children.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          Your choices
        </h2>
        <p>
          You may update your account information at any time. You can also
          request deletion of your account by contacting support.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          Changes to this Policy
        </h2>
        <p>
          We may update this Policy periodically. The updated Policy will be
          posted here with a revised date.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          Contact us
        </h2>
        <p>
          If you have questions about this Policy, contact us at
          support@vehndr.com.
        </p>
      </section>
    </div>
  );
}
