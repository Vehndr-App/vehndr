"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import { getCurrentUser } from "../services/auth";
import {
  ONBOARDING_STEP_STORAGE_KEY,
  WIZARD_STEPS,
  wizardIndexFromApiStep
} from "../constants/vendorOnboardingSteps";

export function useVendorOnboarding() {
  const [user, setUser] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    const u = await getCurrentUser();
    setUser(u);

    if (!u?.vendorId) {
      setVendor(null);
      setOnboarding(null);
      return u;
    }

    const [vendorData, onboardingData] = await Promise.all([
      api(`/api/vendors/${u.vendorId}`),
      api(`/api/vendors/${u.vendorId}/onboarding`)
    ]);

    const v = vendorData.vendor || vendorData;
    setVendor(v);
    setOnboarding(onboardingData);
    return { user: u, vendor: v, onboarding: onboardingData };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await refresh();
        if (cancelled || !result?.user?.vendorId) return;

        const savedStep =
          typeof window !== "undefined"
            ? parseInt(window.localStorage.getItem(ONBOARDING_STEP_STORAGE_KEY) || "", 10)
            : NaN;

        const fromApi = wizardIndexFromApiStep(
          result.onboarding?.currentStep,
          result.user,
          result.vendor
        );

        const initial = Number.isFinite(savedStep)
          ? Math.min(Math.max(savedStep, 0), WIZARD_STEPS.length - 1)
          : fromApi;

        setStepIndex(initial);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load onboarding");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const persistStepIndex = useCallback((index) => {
    setStepIndex(index);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ONBOARDING_STEP_STORAGE_KEY, String(index));
    }
  }, []);

  const goNext = useCallback(() => {
    persistStepIndex(Math.min(stepIndex + 1, WIZARD_STEPS.length - 1));
  }, [stepIndex, persistStepIndex]);

  const goBack = useCallback(() => {
    persistStepIndex(Math.max(stepIndex - 1, 0));
  }, [stepIndex, persistStepIndex]);

  const goToStep = useCallback(
    (idOrIndex) => {
      if (typeof idOrIndex === "number") {
        persistStepIndex(idOrIndex);
        return;
      }
      const idx = WIZARD_STEPS.findIndex((s) => s.id === idOrIndex);
      if (idx >= 0) persistStepIndex(idx);
    },
    [persistStepIndex]
  );

  const refreshOnboarding = useCallback(async () => {
    if (!user?.vendorId) return;
    const onboardingData = await api(`/api/vendors/${user.vendorId}/onboarding`);
    setOnboarding(onboardingData);
    return onboardingData;
  }, [user?.vendorId]);

  const currentStep = WIZARD_STEPS[stepIndex];

  return {
    user,
    setUser,
    vendor,
    setVendor,
    onboarding,
    loading,
    error,
    stepIndex,
    currentStep,
    totalSteps: WIZARD_STEPS.length,
    goNext,
    goBack,
    goToStep,
    persistStepIndex,
    refresh,
    refreshOnboarding
  };
}
