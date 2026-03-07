'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Curated list of common IANA timezones with display labels
export const TIMEZONE_OPTIONS = [
  // North America
  { value: 'America/New_York',      label: 'Eastern (ET)' },
  { value: 'America/Chicago',       label: 'Central (CT)' },
  { value: 'America/Denver',        label: 'Mountain (MT)' },
  { value: 'America/Phoenix',       label: 'Arizona (MT, no DST)' },
  { value: 'America/Los_Angeles',   label: 'Pacific (PT)' },
  { value: 'America/Anchorage',     label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu',      label: 'Hawaii (HT)' },
  { value: 'America/Toronto',       label: 'Toronto (ET)' },
  { value: 'America/Vancouver',     label: 'Vancouver (PT)' },
  // Europe
  { value: 'Europe/London',         label: 'London (GMT/BST)' },
  { value: 'Europe/Paris',          label: 'Paris (CET)' },
  { value: 'Europe/Berlin',         label: 'Berlin (CET)' },
  { value: 'Europe/Amsterdam',      label: 'Amsterdam (CET)' },
  { value: 'Europe/Zurich',         label: 'Zurich (CET)' },
  { value: 'Europe/Madrid',         label: 'Madrid (CET)' },
  { value: 'Europe/Rome',           label: 'Rome (CET)' },
  { value: 'Europe/Stockholm',      label: 'Stockholm (CET)' },
  { value: 'Europe/Moscow',         label: 'Moscow (MSK)' },
  // Asia / Pacific
  { value: 'Asia/Dubai',            label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata',          label: 'India (IST)' },
  { value: 'Asia/Singapore',        label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo',            label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai',         label: 'Shanghai (CST)' },
  { value: 'Asia/Seoul',            label: 'Seoul (KST)' },
  { value: 'Australia/Sydney',      label: 'Sydney (AEST)' },
  { value: 'Australia/Melbourne',   label: 'Melbourne (AEST)' },
  { value: 'Pacific/Auckland',      label: 'Auckland (NZST)' },
  // UTC
  { value: 'UTC',                   label: 'UTC' },
];

const STORAGE_KEY = 'adminTimezone';

function getBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

function getInitialTimezone() {
  if (typeof window === 'undefined') return 'UTC';
  try {
    return localStorage.getItem(STORAGE_KEY) || getBrowserTimezone();
  } catch {
    return getBrowserTimezone();
  }
}

const AdminTimezoneContext = createContext(null);

export function AdminTimezoneProvider({ children }) {
  const [timezone, setTimezoneState] = useState(getInitialTimezone);

  const setTimezone = useCallback((tz) => {
    setTimezoneState(tz);
    try {
      localStorage.setItem(STORAGE_KEY, tz);
    } catch {
      // localStorage unavailable (e.g. private browsing with storage blocked)
    }
  }, []);

  // Sync on mount in case localStorage changed in another tab
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored !== timezone) setTimezoneState(stored);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Format a UTC ISO8601 string (or Date) as a date+time string in the
   * selected timezone, e.g. "Apr 1, 2026, 9:00 AM".
   */
  const formatDateTime = useCallback((value) => {
    if (!value) return null;
    try {
      return new Date(value).toLocaleString(undefined, {
        timeZone: timezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return String(value);
    }
  }, [timezone]);

  /**
   * Format a UTC ISO8601 string (or Date) as a date-only string in the
   * selected timezone, e.g. "Apr 1, 2026".
   */
  const formatDate = useCallback((value) => {
    if (!value) return null;
    try {
      return new Date(value).toLocaleDateString(undefined, {
        timeZone: timezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return String(value);
    }
  }, [timezone]);

  /**
   * Convert a datetime-local string (e.g. "2026-04-01T09:00") interpreted in
   * the selected timezone to a UTC ISO8601 string for sending to the API.
   * Returns null if input is empty.
   */
  const localInputToUtcIso = useCallback((datetimeLocalValue) => {
    if (!datetimeLocalValue) return null;
    // Use the Intl API to figure out the UTC offset for this local wall-clock
    // time in the selected timezone, then produce the UTC equivalent.
    const [datePart, timePart] = datetimeLocalValue.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = (timePart || '00:00').split(':').map(Number);

    // Create a Date from the parts as if they were UTC, then correct for the
    // timezone offset by comparing what that UTC instant looks like in tz.
    const guessUtc = new Date(Date.UTC(year, month - 1, day, hour, minute));

    // What does guessUtc look like in the target timezone?
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(guessUtc);

    const p = {};
    parts.forEach(({ type, value }) => { p[type] = value; });
    const tzYear   = Number(p.year);
    const tzMonth  = Number(p.month);
    const tzDay    = Number(p.day);
    const tzHour   = Number(p.hour) % 24;  // handle "24" hour edge case
    const tzMinute = Number(p.minute);

    // Difference between what we wanted and what we got (in minutes)
    const diffMs = Date.UTC(year, month - 1, day, hour, minute)
                 - Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute);

    return new Date(guessUtc.getTime() + diffMs).toISOString();
  }, [timezone]);

  /**
   * Convert a UTC ISO8601 string to a datetime-local input value string
   * (YYYY-MM-DDTHH:mm) in the selected timezone, for pre-filling forms.
   * Returns "" if input is empty.
   */
  const utcIsoToLocalInput = useCallback((utcIso) => {
    if (!utcIso) return '';
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).formatToParts(new Date(utcIso));

      const p = {};
      parts.forEach(({ type, value }) => { p[type] = value; });
      const h = String(Number(p.hour) % 24).padStart(2, '0');
      return `${p.year}-${p.month}-${p.day}T${h}:${p.minute}`;
    } catch {
      return '';
    }
  }, [timezone]);

  return (
    <AdminTimezoneContext.Provider value={{
      timezone,
      setTimezone,
      formatDateTime,
      formatDate,
      localInputToUtcIso,
      utcIsoToLocalInput,
    }}>
      {children}
    </AdminTimezoneContext.Provider>
  );
}

export function useAdminTimezone() {
  const ctx = useContext(AdminTimezoneContext);
  if (!ctx) throw new Error('useAdminTimezone must be used within AdminTimezoneProvider');
  return ctx;
}
