'use client';

import { useState, useMemo, useEffect, useRef } from 'react';

const CUSTOM_TIP_DEBOUNCE_MS = 600;

const TIP_PRESETS = [
  { percent: 15, label: '15%' },
  { percent: 18, label: '18%' },
  { percent: 20, label: '20%' },
  { percent: 25, label: '25%' },
];

export default function TipSelector({ subtotalCents, onTipChange, disabled = false, maxTotalCents = null }) {
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const maxTipCents = maxTotalCents !== null ? Math.max(0, maxTotalCents - subtotalCents) : null;

  // Debounced custom tip cents — only fire onTipChange after the user stops typing.
  const [pendingCustomCents, setPendingCustomCents] = useState(null);
  const debounceTimer = useRef(null);

  useEffect(() => {
    if (pendingCustomCents === null) return;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      onTipChange(pendingCustomCents);
      setPendingCustomCents(null);
    }, CUSTOM_TIP_DEBOUNCE_MS);
    return () => clearTimeout(debounceTimer.current);
  }, [pendingCustomCents, onTipChange]);

  const tipCents = useMemo(() => {
    if (isCustom) {
      const customCents = Math.round(parseFloat(customAmount || 0) * 100);
      const safeCents = isNaN(customCents) ? 0 : Math.max(0, customCents);
      return maxTipCents !== null ? Math.min(safeCents, maxTipCents) : safeCents;
    }
    if (selectedPreset !== null) {
      const presetCents = Math.round(subtotalCents * (selectedPreset / 100));
      return maxTipCents !== null ? Math.min(presetCents, maxTipCents) : presetCents;
    }
    return 0;
  }, [selectedPreset, customAmount, isCustom, subtotalCents, maxTipCents]);

  const handlePresetClick = (percent) => {
    const presetCents = Math.round(subtotalCents * (percent / 100));
    if (maxTipCents !== null && presetCents > maxTipCents) {
      return;
    }
    clearTimeout(debounceTimer.current);
    setPendingCustomCents(null);
    setIsCustom(false);
    setCustomAmount('');
    setSelectedPreset(percent);
    onTipChange(presetCents);
  };

  const handleNoTip = () => {
    clearTimeout(debounceTimer.current);
    setPendingCustomCents(null);
    setIsCustom(false);
    setCustomAmount('');
    setSelectedPreset(null);
    onTipChange(0);
  };

  const handleCustomClick = () => {
    setIsCustom(true);
    setSelectedPreset(null);
  };

  const handleCustomChange = (e) => {
    const value = e.target.value;
    if (value.startsWith('-')) return;
    const cents = Math.round(parseFloat(value || 0) * 100);
    const safeCents = isNaN(cents) ? 0 : Math.max(0, cents);
    if (maxTipCents !== null && safeCents > maxTipCents) {
      setCustomAmount((maxTipCents / 100).toFixed(2));
      setPendingCustomCents(maxTipCents);
      return;
    }
    setCustomAmount(value);
    setPendingCustomCents(safeCents);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--gray-700)]">
          Add a tip
        </label>
        {tipCents > 0 && (
          <span className="text-sm font-semibold text-[var(--violet-600)]">
            +${(tipCents / 100).toFixed(2)}
          </span>
        )}
      </div>

      {/* Preset Buttons */}
      <div className="flex gap-2">
        {TIP_PRESETS.map(({ percent, label }) => {
          const presetCents = Math.round(subtotalCents * (percent / 100));
          const presetDisabled = maxTipCents !== null && presetCents > maxTipCents;
          return (
          <button
            key={percent}
            type="button"
            disabled={disabled || presetDisabled}
            onClick={() => handlePresetClick(percent)}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
              selectedPreset === percent && !isCustom
                ? 'bg-[var(--violet-600)] text-white shadow-md'
                : 'bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--gray-200)]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {label}
          </button>
        )})}
      </div>

      {/* Custom & No Tip Row */}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={handleNoTip}
          className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
            selectedPreset === null && !isCustom && tipCents === 0
              ? 'bg-[var(--gray-300)] text-[var(--gray-800)]'
              : 'bg-[var(--gray-100)] text-[var(--gray-600)] hover:bg-[var(--gray-200)]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          No tip
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={handleCustomClick}
          className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
            isCustom
              ? 'bg-[var(--violet-600)] text-white shadow-md'
              : 'bg-[var(--gray-100)] text-[var(--gray-600)] hover:bg-[var(--gray-200)]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Custom
        </button>
      </div>

      {/* Custom Amount Input */}
      {isCustom && (
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gray-500)] font-medium">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={customAmount}
            onChange={handleCustomChange}
            disabled={disabled}
            placeholder="0.00"
            className="w-full h-12 pl-8 pr-4 rounded-xl bg-[var(--gray-100)] border-0 text-[var(--foreground)] placeholder:text-[var(--gray-400)] focus:ring-2 focus:ring-[var(--violet-500)] focus:bg-white transition-all disabled:opacity-50"
          />
        </div>
      )}

      {/* Tip Info */}
      <p className="text-xs text-[var(--gray-500)] text-center">
        100% of your tip goes directly to the vendor
      </p>
    </div>
  );
}
