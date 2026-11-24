export const metadata = {
  title: "Privacy Policy | Vehndr",
  description: "Privacy policy for the VEHNDR platform.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 text-[var(--gray-700)]">
      <h1 className="text-3xl font-bold text-[var(--gray-900)]">
        VEHNDR Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-[var(--gray-500)]">
        Last Updated: November 24, 2026
      </p>

      <section className="mt-8 space-y-6 text-sm leading-6">
        <p>
          VEHNDR (“we,” “our,” or “us”) respects your privacy and is committed to
          protecting your personal information. This Privacy Policy explains how
          we collect, use, disclose, and safeguard your information when you use
          the VEHNDR mobile application, website, and related services
          (collectively, the “Platform”).
        </p>
        <p>
          By using VEHNDR, you agree to the practices described in this Privacy
          Policy. If you do not agree, please do not use the Platform.
        </p>

        <hr className="border-[var(--gray-200)]" />

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--gray-900)]">
            1. Information We Collect
          </h2>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-[var(--gray-900)]">
              A. Information You Provide
            </h3>
            <p>We may collect personal information that you voluntarily provide, including:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Account login credentials</li>
              <li>Business information (for Vendors)</li>
              <li>Payment-related information (processed via third-party providers such as Stripe)</li>
              <li>Profile photos, listings, messages, and reviews</li>
              <li>Event details or service requests</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-[var(--gray-900)]">
              B. Automatically Collected Information
            </h3>
            <p>When you use VEHNDR, we may automatically collect:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Device type, operating system, and app version</li>
              <li>IP address and approximate location</li>
              <li>Usage data (pages viewed, features used, time spent)</li>
              <li>Cookies, local storage, and similar tracking technologies</li>
              <li>
                Analytics events (for example page views and product usage) when you
                consent to analytics cookies
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-[var(--gray-900)]">
              C. Information from Third Parties
            </h3>
            <p>We may receive information from:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Payment processors (including Stripe)</li>
              <li>Identity verification services (where used)</li>
              <li>Analytics providers (including PostHog, when you accept analytics)</li>
              <li>Hosting and infrastructure providers</li>
            </ul>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          2. How We Use Your Information
        </h2>
        <p>We use your information to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Create and manage user accounts</li>
          <li>Facilitate marketplace bookings, proposals, and transactions</li>
          <li>Process payments, payouts, tips, fees, and applicable taxes</li>
          <li>Enable communication between customers, coordinators, and vendors</li>
          <li>Improve, personalize, and optimize the Platform</li>
          <li>Provide customer support</li>
          <li>Send transactional messages (and promotional messages only where permitted)</li>
          <li>Detect fraud, abuse, or security issues</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          3. How We Share Your Information
        </h2>
        <p>We may share your information with:</p>

        <div className="space-y-3">
          <h3 className="text-base font-semibold text-[var(--gray-900)]">
            A. Other Users
          </h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Limited profile and booking information needed to complete a request
              or transaction (for example vendor business name, event details you
              share, and messages related to a booking).
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-semibold text-[var(--gray-900)]">
            B. Service Providers
          </h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>Payment processors (Stripe)</li>
            <li>Hosting and infrastructure providers</li>
            <li>Analytics tools (PostHog), when you have accepted analytics cookies</li>
            <li>Customer support and email delivery tools</li>
          </ul>
          <p>
            These providers are only intended to process information on our behalf
            to operate the Platform.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-semibold text-[var(--gray-900)]">
            C. Legal &amp; Safety Reasons
          </h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>If required by law, subpoena, or legal process</li>
            <li>To protect VEHNDR’s rights, users, or public safety</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-semibold text-[var(--gray-900)]">
            D. Business Transfers
          </h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>In connection with a merger, acquisition, or sale of assets</li>
          </ul>
        </div>

        <p>
          <strong>We do not sell your personal information</strong> for money. We also
          do not knowingly “share” personal information for cross-context behavioral
          advertising as those terms are commonly used under California law. If that
          ever changes, we will update this Policy and provide required opt-out options.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          4. Payments &amp; Financial Information
        </h2>
        <p>
          VEHNDR does not store full credit card or banking details. Payments are
          processed by Stripe and similar secure third-party payment processors, who
          have their own privacy policies. We may receive limited payment status and
          transaction details needed to operate bookings, payouts, and support.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          5. Data Retention
        </h2>
        <p>
          We retain personal information only as long as reasonably necessary to:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Provide the Platform and services</li>
          <li>Comply with legal, tax, and regulatory obligations</li>
          <li>Resolve disputes and enforce agreements</li>
          <li>Maintain security and prevent fraud</li>
        </ul>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          6. Your Privacy Rights
        </h2>
        <p>
          Depending on where you live (including California and certain other U.S.
          states), you may have the right to:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Know / access the personal information we have about you</li>
          <li>Correct inaccurate personal information</li>
          <li>Request deletion of your personal information</li>
          <li>Opt out of marketing communications</li>
          <li>Opt out of the sale or sharing of personal information (where applicable)</li>
          <li>Limit use of sensitive personal information (where applicable)</li>
          <li>Appeal a decision we make about a privacy request (where required by law)</li>
        </ul>
        <p>
          <strong>How to submit a request:</strong> email{" "}
          <a href="mailto:admin@vehndr.com" className="underline text-[var(--violet-700)]">
            admin@vehndr.com
          </a>{" "}
          with the subject line “Privacy Request.” Please include your name, the
          email on your VEHNDR account, and what you are asking for (access,
          correction, deletion, or opt-out). We may need to verify your identity
          before completing the request.
        </p>
        <p>
          We will respond within the time required by applicable law (generally
          within 45 days for California requests, unless an extension is permitted).
        </p>
        <p>
          You will not be discriminated against for exercising privacy rights
          available to you under law.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          7. Cookies &amp; Analytics
        </h2>
        <p>
          VEHNDR uses cookies, local storage, and similar technologies to:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Keep you signed in and remember preferences</li>
          <li>Make the Platform secure and functional</li>
          <li>Measure site performance and usage</li>
          <li>Improve the product experience</li>
        </ul>
        <p>
          <strong>Analytics:</strong> If you click <strong>Accept</strong> on our
          cookie banner, we may use PostHog to understand how people use VEHNDR
          (for example which pages are visited). If you click <strong>Decline</strong>,
          we will not run that analytics tracking. Essential cookies needed for login
          and basic site function may still be used.
        </p>
        <p>
          You can also control cookies through your browser settings. Blocking some
          cookies may affect how the Platform works.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          8. Data Security
        </h2>
        <p>
          We implement reasonable administrative, technical, and physical
          safeguards to protect your information. However, no system is 100%
          secure, and we cannot guarantee absolute security.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          9. Children’s Privacy
        </h2>
        <p>
          VEHNDR is not intended for individuals under the age of 18. We do not
          knowingly collect personal data from children.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          10. Third-Party Links
        </h2>
        <p>
          The Platform may contain links to third-party websites or services
          (including payment pages and vendor content). We are not responsible for
          their privacy practices.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          11. International Users
        </h2>
        <p>
          If you access VEHNDR from outside the United States, your information may
          be transferred to and processed in the United States or other jurisdictions
          with different data protection laws.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          12. Changes to This Privacy Policy
        </h2>
        <p>
          We may update this Privacy Policy from time to time. The “Last Updated”
          date at the top will change when we post updates. Continued use of the
          Platform after an update means you acknowledge the revised Policy.
        </p>

        <h2 className="text-lg font-semibold text-[var(--gray-900)]">
          13. Contact Us
        </h2>
        <p>
          If you have questions or concerns about this Privacy Policy, or want to
          make a privacy request, contact us at:
        </p>
        <p>
          <strong>Email:</strong>{" "}
          <a href="mailto:admin@vehndr.com" className="underline text-[var(--violet-700)]">
            admin@vehndr.com
          </a>
          <br />
          <strong>Company:</strong> Vehndr by Gabby &amp; Shay LLC
          <br />
          <strong>Support:</strong>{" "}
          <a href="/support" className="underline text-[var(--violet-700)]">
            vehndr.com/support
          </a>
        </p>
      </section>
    </div>
  );
}
