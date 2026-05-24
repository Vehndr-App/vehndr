"use client";

import { Suspense } from "react";
import AuthGate from "../../../components/AuthGate";
import VendorSetupWizard from "../../../components/onboarding/VendorSetupWizard";

function SetupContent() {
  return <VendorSetupWizard />;
}

export default function VendorSetupPage() {
  return (
    <AuthGate allowedRoles={["vendor"]}>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
            <p className="text-[var(--gray-500)]">Loading…</p>
          </div>
        }
      >
        <SetupContent />
      </Suspense>
    </AuthGate>
  );
}
