/**
 * Calendar Link Generator
 * Generates "Add to Calendar" links for various calendar services without using APIs.
 */

/**
 * Format a date for Google/Yahoo Calendar URLs (YYYYMMDDTHHmmssZ format)
 * @param {Date} date
 * @returns {string}
 */
function formatDateForUrl(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Format a date for ICS files (YYYYMMDDTHHmmss format, local time)
 * @param {Date} date
 * @returns {string}
 */
function formatDateForIcs(date) {
  const pad = (n) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/**
 * Create a Date object from booking date and time strings
 * @param {string} dateStr - Date string like "2025-01-20"
 * @param {string} timeStr - Time string like "02:00 PM"
 * @returns {Date}
 */
function parseBookingDateTime(dateStr, timeStr) {
  // Parse time string like "02:00 PM"
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!timeMatch) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }

  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const isPM = timeMatch[3].toUpperCase() === 'PM';

  if (isPM && hours !== 12) {
    hours += 12;
  } else if (!isPM && hours === 12) {
    hours = 0;
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0);
}

/**
 * Generate calendar links for a booking
 * @param {Object} booking - Booking details
 * @param {string} booking.title - Event title
 * @param {string} booking.bookingDate - Date string (YYYY-MM-DD)
 * @param {string} booking.startTime - Start time (HH:MM AM/PM)
 * @param {string} booking.endTime - End time (HH:MM AM/PM)
 * @param {string} [booking.description] - Event description
 * @param {string} [booking.location] - Event location
 * @returns {Object} Calendar links object with google, outlook, yahoo, and ics properties
 */
export function generateCalendarLinks(booking) {
  const { title, bookingDate, startTime, endTime, description = '', location = '' } = booking;

  const startDate = parseBookingDateTime(bookingDate, startTime);
  const endDate = parseBookingDateTime(bookingDate, endTime);

  // Format dates for different services
  const googleDates = `${formatDateForUrl(startDate)}/${formatDateForUrl(endDate)}`;
  const outlookStart = startDate.toISOString();
  const outlookEnd = endDate.toISOString();

  // Google Calendar
  const googleParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: googleDates,
    details: description,
    location: location,
  });
  const googleLink = `https://calendar.google.com/calendar/render?${googleParams.toString()}`;

  // Outlook.com / Office 365
  const outlookParams = new URLSearchParams({
    subject: title,
    startdt: outlookStart,
    enddt: outlookEnd,
    body: description,
    location: location,
    path: '/calendar/action/compose',
    rru: 'addevent',
  });
  const outlookLink = `https://outlook.office.com/calendar/0/deeplink/compose?${outlookParams.toString()}`;

  // Yahoo Calendar
  const yahooStart = formatDateForUrl(startDate);
  const durationMs = endDate - startDate;
  const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
  const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const yahooDuration = `${durationHours.toString().padStart(2, '0')}${durationMinutes.toString().padStart(2, '0')}`;

  const yahooParams = new URLSearchParams({
    v: '60',
    title: title,
    st: yahooStart,
    dur: yahooDuration,
    desc: description,
    in_loc: location,
  });
  const yahooLink = `https://calendar.yahoo.com/?${yahooParams.toString()}`;

  // ICS file content
  const icsContent = generateIcsContent({
    title,
    startDate,
    endDate,
    description,
    location,
  });

  return {
    google: googleLink,
    outlook: outlookLink,
    yahoo: yahooLink,
    ics: icsContent,
  };
}

/**
 * Generate ICS file content
 * @param {Object} event
 * @returns {string} ICS file content
 */
function generateIcsContent({ title, startDate, endDate, description, location }) {
  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@vehndr.com`;
  const now = new Date();
  const dtstamp = formatDateForIcs(now);
  const dtstart = formatDateForIcs(startDate);
  const dtend = formatDateForIcs(endDate);

  // Escape special characters for ICS
  const escapeIcs = (str) => str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vehndr//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeIcs(title)}`,
    description ? `DESCRIPTION:${escapeIcs(description)}` : null,
    location ? `LOCATION:${escapeIcs(location)}` : null,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n');
}

/**
 * Download an ICS file
 * @param {string} icsContent - The ICS file content
 * @param {string} filename - Filename for the download
 */
export function downloadIcsFile(icsContent, filename = 'booking.ics') {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Create booking details from order item and booking data
 * @param {Object} orderItem - Order item with booking
 * @param {Object} vendor - Vendor data
 * @returns {Object} Booking details for calendar link generation
 */
export function createBookingDetails(orderItem, vendor) {
  const booking = orderItem.booking;
  if (!booking) return null;

  const description = [
    `Service: ${orderItem.productName}`,
    vendor?.name ? `Vendor: ${vendor.name}` : null,
    booking.customerName ? `Customer: ${booking.customerName}` : null,
    booking.customerPhone ? `Phone: ${booking.customerPhone}` : null,
  ].filter(Boolean).join('\n');

  return {
    title: `${orderItem.productName} - ${vendor?.name || 'Vehndr Booking'}`,
    bookingDate: booking.bookingDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
    description,
    location: vendor?.location || vendor?.address || '',
  };
}
