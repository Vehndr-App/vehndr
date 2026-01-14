'use client';

import { useState, useRef, useEffect } from 'react';
import { generateCalendarLinks, downloadIcsFile, createBookingDetails } from '../utils/calendarLinks';

/**
 * AddToCalendar component - Displays a dropdown with calendar service options
 * @param {Object} props
 * @param {Object} props.orderItem - The order item containing booking info
 * @param {Object} props.vendor - Vendor information
 * @param {string} [props.className] - Additional CSS classes
 */
export default function AddToCalendar({ orderItem, vendor, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const bookingDetails = createBookingDetails(orderItem, vendor);

  if (!bookingDetails) {
    return null;
  }

  const links = generateCalendarLinks(bookingDetails);

  const handleIcsDownload = () => {
    const filename = `${orderItem.productName.replace(/\s+/g, '-').toLowerCase()}-booking.ics`;
    downloadIcsFile(links.ics, filename);
    setIsOpen(false);
  };

  const calendarOptions = [
    {
      name: 'Google Calendar',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.5 3H4.5C3.12 3 2 4.12 2 5.5v13C2 19.88 3.12 21 4.5 21h15c1.38 0 2.5-1.12 2.5-2.5v-13C22 4.12 20.88 3 19.5 3zm-7 14h-1v-4.5L10 13l-.5-.75L12 11h.5v6zm4.5-1.75c0 .97-.78 1.75-1.75 1.75h-1.5v-1.5h1.5c.14 0 .25-.11.25-.25v-.5c0-.14-.11-.25-.25-.25H14v-1.5h1.25c.14 0 .25-.11.25-.25v-.5c0-.14-.11-.25-.25-.25h-1.5V11h1.5c.97 0 1.75.78 1.75 1.75v.5c0 .41-.14.79-.38 1.08.24.29.38.67.38 1.08v.84z"/>
        </svg>
      ),
      href: links.google,
      external: true,
    },
    {
      name: 'Outlook',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 12c0 2.21 1.79 4 4 4s4-1.79 4-4-1.79-4-4-4-4 1.79-4 4zm6 0c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"/>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
        </svg>
      ),
      href: links.outlook,
      external: true,
    },
    {
      name: 'Yahoo Calendar',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14h2v2h-2v-2zm.5-10c1.93 0 3.5 1.57 3.5 3.5 0 1.58-1.06 2.9-2.5 3.32V14h-2v-2h1c.83 0 1.5-.67 1.5-1.5S12.33 9 11.5 9 10 9.67 10 10.5H8c0-1.93 1.57-3.5 3.5-3.5z"/>
        </svg>
      ),
      href: links.yahoo,
      external: true,
    },
    {
      name: 'Download .ics',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7,10 12,15 17,10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      ),
      onClick: handleIcsDownload,
    },
  ];

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Add to Calendar
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            {calendarOptions.map((option) => (
              option.onClick ? (
                <button
                  key={option.name}
                  onClick={option.onClick}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  <span className="text-gray-500">{option.icon}</span>
                  {option.name}
                </button>
              ) : (
                <a
                  key={option.name}
                  href={option.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  <span className="text-gray-500">{option.icon}</span>
                  {option.name}
                  <svg className="w-4 h-4 ml-auto text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15,3 21,3 21,9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
