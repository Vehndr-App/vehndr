"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getVendorProfile, getVendorProducts } from "../../../../../services/vendors";
import { useCart } from "../../../../../contexts/CartContext";
import { useAuth } from "../../../../../contexts/AuthContext";
import { api } from "../../../../../services/api";
import Link from "next/link";
import { getVendorPlaceholderImage } from "../../../../../utils/placeholderImages";
import { generateCalendarLinks, downloadIcsFile } from "../../../../../utils/calendarLinks";

// Calendar helper functions
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function generateCalendarDays(currentMonth) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }
  return days;
}

export default function ProductPage() {
  const { vendorId, productId } = useParams();
  const router = useRouter();
  const { addItem } = useCart();
  const { user } = useAuth();

  const [vendor, setVendor] = useState(null);
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookingAdvanceMinutes, setBookingAdvanceMinutes] = useState(60);

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [calendarLinks, setCalendarLinks] = useState(null);

  useEffect(() => {
    (async () => {
      const v = await getVendorProfile(vendorId);
      const products = await getVendorProducts(vendorId);
      const p = products.find((prod) => prod.id === productId);
      setVendor(v);
      setProduct(p);
      setBookingAdvanceMinutes(v.bookingAdvanceMinutes || 60);
    })();
  }, [vendorId, productId]);

  // Fetch available time slots when date is selected
  useEffect(() => {
    if (!selectedDate || !product?.isService) {
      setAvailableSlots([]);
      return;
    }

    const fetchTimeSlots = async () => {
      setLoadingSlots(true);
      setSelectedTimeSlot(null); // Reset time slot when date changes

      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/vendors/${vendorId}/availabilities/time_slots?date=${dateStr}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch time slots');
        }

        const data = await response.json();
        setAvailableSlots(data.slots || []);
      } catch (error) {
        console.error('Error fetching time slots:', error);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchTimeSlots();
  }, [selectedDate, vendorId, product]);

  if (!product || !vendor) {
    return (
      <div className="min-h-screen bg-[var(--gray-50)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[var(--violet-600)] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[var(--gray-500)]">Loading...</p>
        </div>
      </div>
    );
  }

  const isService = product.isService === true;
  const hasOptions = (product.options?.length ?? 0) > 0;
  const optionDefs = product.options ?? [];
  const isValid = (!hasOptions || optionDefs.every((o) => selected[o.id])) &&
                  (!isService || (selectedDate && selectedTimeSlot));
  
  const placeholderImage = getVendorPlaceholderImage(vendor.categories, product.id);
  const hasImages = product.images && product.images.length > 0;
  const calendarDays = generateCalendarDays(currentMonth);

  // Handle booking for services
  const handleBookService = () => {
    if (user) {
      // User is logged in, book directly with their info
      submitBooking(user.name, user.email, '');
    } else {
      // User not logged in, show modal to collect info
      setShowBookingModal(true);
    }
  };

  // Submit booking to API
  const submitBooking = async (name, email, phone) => {
    setBookingInProgress(true);
    setBookingError(null);

    try {
      const response = await api('/api/bookings', {
        method: 'POST',
        body: {
          productId: product.id,
          date: selectedDate.toISOString().split('T')[0],
          timeSlot: selectedTimeSlot,
          customerName: name,
          customerEmail: email,
          customerPhone: phone || undefined
        }
      });

      // Generate calendar links for the frontend
      const links = generateCalendarLinks({
        title: `${product.name} at ${vendor.name}`,
        bookingDate: selectedDate.toISOString().split('T')[0],
        startTime: response.booking.startTime,
        endTime: response.booking.endTime,
        description: `Service booking with ${vendor.name}`,
        location: vendor.location || ''
      });

      setConfirmedBooking(response.booking);
      setCalendarLinks(links);
      setShowBookingModal(false);
      setShowSuccessModal(true);

      // Reset form
      setSelectedDate(null);
      setSelectedTimeSlot(null);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
    } catch (error) {
      console.error('Booking error:', error);
      setBookingError(error.message || 'Failed to create booking. Please try again.');
    } finally {
      setBookingInProgress(false);
    }
  };

  // Handle form submission from modal
  const handleBookingFormSubmit = (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerEmail.trim()) {
      setBookingError('Please enter your name and email');
      return;
    }
    submitBooking(customerName, customerEmail, customerPhone);
  };

  // Handle add to cart for products (non-services)
  const handleAddToCart = () => {
    const cartOptions = { ...selected };
    addItem(product, quantity, cartOptions);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[var(--gray-50)] pb-24">
      {/* Success Toast */}
      {addedToCart && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
          <div className="bg-[var(--mint-600)] text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span className="font-semibold">{isService ? "Booking Added!" : "Added to Cart!"}</span>
          </div>
        </div>
      )}

      {/* Breadcrumb Header */}
      <div className="bg-white border-b border-[var(--gray-100)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/vendors" className="text-[var(--gray-500)] hover:text-[var(--violet-600)] transition-colors">
              Vendors
            </Link>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <Link href={`/store/${vendorId}`} className="text-[var(--gray-500)] hover:text-[var(--violet-600)] transition-colors">
              {vendor.name}
            </Link>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <span className="text-[var(--gray-900)] font-medium truncate">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square rounded-[var(--radius-2xl)] overflow-hidden bg-white shadow-[var(--shadow-card)]">
              {isService && (
                <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-[var(--amber-500)] text-white text-xs font-semibold shadow-lg">
                  ⏱️ Service • {product.duration} min
                </div>
              )}
              {hasImages ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={product.images[selectedImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={placeholderImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Thumbnail Gallery */}
            {hasImages && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {product.images.map((imageUrl, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square rounded-[var(--radius-xl)] overflow-hidden transition-all ${
                      selectedImageIndex === index
                        ? "ring-2 ring-[var(--violet-600)] ring-offset-2"
                        : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            {/* Title & Price */}
            <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-6">
              <h1 className="font-display text-2xl sm:text-3xl text-[var(--gray-900)] tracking-tight mb-3">
                {product.name}
              </h1>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold text-gradient-primary">
                  ${(product.price / 100).toFixed(2)}
                </span>
                {isService && (
                  <span className="text-[var(--gray-500)] text-sm">/ {product.duration} min session</span>
                )}
              </div>
              <p className="text-[var(--gray-600)] leading-relaxed">{product.description}</p>
            </div>

            {/* Vendor Info Card */}
            <Link 
              href={`/store/${vendorId}`}
              className="flex items-center gap-4 bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-4 hover:shadow-[var(--shadow-card-hover)] transition-all group"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xl font-bold shrink-0">
                {vendor.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--gray-400)] uppercase tracking-wider font-medium mb-0.5">
                  {isService ? "Service Provider" : "Sold by"}
                </p>
                <p className="font-semibold text-[var(--gray-900)] group-hover:text-[var(--violet-600)] transition-colors truncate">
                  {vendor.name}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--gray-500)]">
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {vendor.location}
                  </span>
                  {vendor.rating && (
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--amber-500)" stroke="none">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                      {vendor.rating}
                    </span>
                  )}
                </div>
              </div>
              <svg className="text-[var(--gray-300)] group-hover:text-[var(--violet-600)] transition-colors" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>

            {/* Date & Time Selection for Services */}
            {isService && (
              <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-6 space-y-6">
                {/* Date Selection */}
                <div>
                  <label className="block text-sm font-semibold text-[var(--gray-900)] mb-3">
                    Select Date <span className="text-[var(--coral-500)]">*</span>
                  </label>
                  
                  {/* Calendar */}
                  <div className="border border-[var(--gray-200)] rounded-[var(--radius-xl)] p-4">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-4">
                      <button 
                        onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                        className="w-8 h-8 rounded-full hover:bg-[var(--gray-100)] flex items-center justify-center transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="15 18 9 12 15 6"/>
                        </svg>
                      </button>
                      <span className="font-semibold text-[var(--gray-900)]">
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                      </span>
                      <button 
                        onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                        className="w-8 h-8 rounded-full hover:bg-[var(--gray-100)] flex items-center justify-center transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="text-center text-xs font-medium text-[var(--gray-400)] py-1">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((day, index) => {
                        if (!day) return <div key={`empty-${index}`} />;
                        
                        const isToday = day.toDateString() === new Date().toDateString();
                        const isPast = day < new Date().setHours(0,0,0,0);
                        const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
                        
                        return (
                          <button
                            key={day.toISOString()}
                            onClick={() => !isPast && setSelectedDate(day)}
                            disabled={isPast}
                            className={`w-9 h-9 rounded-full text-sm font-medium transition-all ${
                              isSelected
                                ? "bg-[var(--violet-600)] text-white"
                                : isToday
                                ? "ring-2 ring-[var(--violet-400)] text-[var(--violet-700)]"
                                : isPast
                                ? "text-[var(--gray-300)] cursor-not-allowed"
                                : "hover:bg-[var(--gray-100)] text-[var(--gray-700)]"
                            }`}
                          >
                            {day.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {!selectedDate && (
                    <p className="text-xs text-[var(--coral-500)] mt-2">Please select a date to continue</p>
                  )}

                  {selectedDate && (
                    <>
                      <div className="mt-3 flex items-center gap-2 p-3 bg-[var(--violet-50)] rounded-[var(--radius-lg)]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span className="text-sm font-medium text-[var(--violet-700)]">
                          {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>

                      {bookingAdvanceMinutes > 0 && (
                        <div className="mt-2 flex items-start gap-2 p-3 bg-[var(--amber-50)] rounded-[var(--radius-lg)]">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber-600)" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                          </svg>
                          <p className="text-xs text-[var(--amber-700)]">
                            Bookings require {bookingAdvanceMinutes >= 60
                              ? `${(bookingAdvanceMinutes / 60).toFixed(1)} hours`
                              : `${bookingAdvanceMinutes} minutes`} advance notice.
                            Time slots too soon will not be available.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Time Slot Selection */}
                {selectedDate && (
                  <div>
                    <label className="block text-sm font-semibold text-[var(--gray-900)] mb-3">
                      Select Time <span className="text-[var(--coral-500)]">*</span>
                    </label>

                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-8 h-8 border-3 border-[var(--violet-600)] border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="text-center py-8 px-4 bg-[var(--gray-50)] rounded-[var(--radius-lg)]">
                        <svg className="mx-auto mb-2" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <p className="text-sm text-[var(--gray-500)]">No time slots available for this date</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot.time}
                            onClick={() => slot.available && setSelectedTimeSlot(slot.time)}
                            disabled={!slot.available}
                            className={`px-3 py-2.5 rounded-[var(--radius-lg)] text-sm font-medium transition-all relative ${
                              selectedTimeSlot === slot.time
                                ? "bg-[var(--violet-600)] text-white shadow-md"
                                : slot.available
                                ? "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--violet-100)] hover:text-[var(--violet-700)]"
                                : "bg-[var(--gray-50)] text-[var(--gray-300)] cursor-not-allowed"
                            }`}
                          >
                            <div>{slot.time}</div>
                            {slot.available && slot.capacity > 0 && slot.capacity <= 3 && (
                              <div className="text-[10px] mt-0.5 opacity-75">
                                {slot.capacity} {slot.capacity === 1 ? 'spot' : 'spots'}
                              </div>
                            )}
                            {!slot.available && (
                              <div className="text-[10px] mt-0.5">
                                {slot.withinBuffer ? 'Too soon' : 'Full'}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {!selectedTimeSlot && availableSlots.length > 0 && (
                      <p className="text-xs text-[var(--coral-500)] mt-2">Please select a time slot to continue</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Options */}
            {hasOptions && (
              <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-6 space-y-5">
                {optionDefs.map((opt) => (
                  <div key={opt.id}>
                    <label className="block text-sm font-semibold text-[var(--gray-900)] mb-3">
                      {opt.name} <span className="text-[var(--coral-500)]">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {opt.values.map((v) => (
                        <button
                          key={v}
                          onClick={() => setSelected((prev) => ({ ...prev, [opt.id]: v }))}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            selected[opt.id] === v
                              ? "bg-[var(--violet-600)] text-white shadow-md"
                              : "bg-[var(--gray-100)] text-[var(--gray-700)] hover:bg-[var(--violet-100)] hover:text-[var(--violet-700)]"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    {!selected[opt.id] && (
                      <p className="text-xs text-[var(--coral-500)] mt-2">Please select {opt.name.toLowerCase()}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Quantity - Only for products */}
            {!isService && (
              <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-6">
                <label className="block text-sm font-semibold text-[var(--gray-900)] mb-3">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-11 h-11 rounded-full bg-[var(--gray-100)] hover:bg-[var(--gray-200)] flex items-center justify-center text-lg font-medium transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    className="w-16 text-center rounded-[var(--radius-lg)] border border-[var(--gray-200)] px-3 py-2 text-lg font-semibold focus:border-[var(--violet-500)] focus:ring-2 focus:ring-[var(--violet-500)]/20 outline-none"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-11 h-11 rounded-full bg-[var(--gray-100)] hover:bg-[var(--gray-200)] flex items-center justify-center text-lg font-medium transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Total & Actions */}
            <div className="bg-white rounded-[var(--radius-2xl)] shadow-[var(--shadow-card)] p-6 space-y-4">
              {/* Total */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--gray-100)]">
                <span className="text-[var(--gray-600)] font-medium">
                  {isService ? "Service Total" : `Total (${quantity} ${quantity === 1 ? "item" : "items"})`}
                </span>
                <span className="text-2xl font-bold text-gradient-primary">
                  ${((product.price * (isService ? 1 : quantity)) / 100).toFixed(2)}
                </span>
              </div>

              {isService && selectedDate && selectedTimeSlot && (
                <div className="flex items-center gap-2 p-3 bg-[var(--violet-50)] rounded-[var(--radius-lg)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--violet-600)" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span className="text-sm text-[var(--violet-700)]">
                    <span className="font-semibold">{selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span> at <span className="font-semibold">{selectedTimeSlot}</span> • {product.duration} min
                  </span>
                </div>
              )}

              {/* Book/Add to Cart Button */}
              <button
                className={`w-full h-14 rounded-[var(--radius-xl)] font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
                  isValid && !bookingInProgress
                    ? "bg-gradient-primary text-white hover:shadow-lg hover:shadow-[var(--violet-500)]/25"
                    : "bg-[var(--gray-200)] text-[var(--gray-400)] cursor-not-allowed"
                }`}
                disabled={!isValid || bookingInProgress}
                onClick={isService ? handleBookService : handleAddToCart}
              >
                {bookingInProgress ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Booking...
                  </>
                ) : isService ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Book Now
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="21" r="1"/>
                      <circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    Add to Cart
                  </>
                )}
              </button>

              {/* Secondary Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => router.push("/cart")}
                  className="h-11 rounded-[var(--radius-xl)] border-2 border-[var(--violet-200)] text-[var(--violet-600)] font-medium hover:bg-[var(--violet-50)] transition-colors"
                >
                  View Cart
                </button>
                <button
                  onClick={() => router.push(`/store/${vendorId}`)}
                  className="h-11 rounded-[var(--radius-xl)] border-2 border-[var(--gray-200)] text-[var(--gray-600)] font-medium hover:bg-[var(--gray-50)] transition-colors"
                >
                  Back to Store
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal - For collecting guest info */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[var(--radius-2xl)] shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-[var(--gray-100)]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[var(--gray-900)]">Complete Your Booking</h2>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-[var(--gray-100)] flex items-center justify-center"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleBookingFormSubmit} className="p-6 space-y-4">
              {/* Booking Summary */}
              <div className="bg-[var(--violet-50)] rounded-[var(--radius-lg)] p-4">
                <p className="font-semibold text-[var(--violet-900)]">{product?.name}</p>
                <p className="text-sm text-[var(--violet-700)]">
                  {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {selectedTimeSlot}
                </p>
                <p className="text-sm text-[var(--violet-600)]">{product?.duration} min - ${(product?.price / 100).toFixed(2)}</p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Your Name <span className="text-[var(--coral-500)]">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-4 py-3 rounded-[var(--radius-lg)] border border-[var(--gray-200)] focus:border-[var(--violet-500)] focus:ring-2 focus:ring-[var(--violet-500)]/20 outline-none"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Email Address <span className="text-[var(--coral-500)]">*</span>
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 rounded-[var(--radius-lg)] border border-[var(--gray-200)] focus:border-[var(--violet-500)] focus:ring-2 focus:ring-[var(--violet-500)]/20 outline-none"
                  required
                />
                <p className="text-xs text-[var(--gray-500)] mt-1">We&apos;ll send your booking confirmation here</p>
              </div>

              {/* Phone (optional) */}
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Phone Number <span className="text-[var(--gray-400)]">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 rounded-[var(--radius-lg)] border border-[var(--gray-200)] focus:border-[var(--violet-500)] focus:ring-2 focus:ring-[var(--violet-500)]/20 outline-none"
                />
              </div>

              {/* Error */}
              {bookingError && (
                <div className="p-3 bg-[var(--coral-50)] text-[var(--coral-700)] rounded-[var(--radius-lg)] text-sm">
                  {bookingError}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={bookingInProgress}
                className="w-full h-12 bg-gradient-primary text-white rounded-[var(--radius-xl)] font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {bookingInProgress ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Confirming...
                  </>
                ) : (
                  'Confirm Booking'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal - Shows after booking is confirmed */}
      {showSuccessModal && confirmedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[var(--radius-2xl)] shadow-xl max-w-md w-full">
            <div className="p-6 text-center">
              {/* Success Icon */}
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--mint-100)] flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--mint-600)" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-[var(--gray-900)] mb-2">Booking Confirmed!</h2>
              <p className="text-[var(--gray-600)] mb-6">
                A confirmation email has been sent to your inbox.
              </p>

              {/* Booking Details */}
              <div className="bg-[var(--gray-50)] rounded-[var(--radius-xl)] p-4 text-left mb-6">
                <p className="font-semibold text-[var(--gray-900)]">{product?.name}</p>
                <p className="text-sm text-[var(--gray-600)]">with {vendor?.name}</p>
                <div className="mt-3 pt-3 border-t border-[var(--gray-200)]">
                  <p className="text-sm text-[var(--gray-700)]">
                    <strong>Date:</strong> {confirmedBooking.bookingDate && new Date(confirmedBooking.bookingDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-sm text-[var(--gray-700)]">
                    <strong>Time:</strong> {confirmedBooking.startTime} - {confirmedBooking.endTime}
                  </p>
                </div>
              </div>

              {/* Calendar Links */}
              <p className="text-sm font-medium text-[var(--gray-700)] mb-3">Add to your calendar:</p>
              <div className="flex gap-3 justify-center mb-6">
                <a
                  href={calendarLinks?.google}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-gradient h-10 px-4 text-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.5 3h-15A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zm-9 15h-3v-9h3v9zm6 0h-3V9h3v9z"/>
                  </svg>
                  Google
                </a>
                <button
                  onClick={() => downloadIcsFile(calendarLinks?.ics, `booking-${confirmedBooking.id}.ics`)}
                  className="btn btn-outline h-10 px-4 text-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  .ics File
                </button>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setConfirmedBooking(null);
                  setCalendarLinks(null);
                }}
                className="w-full h-12 border-2 border-[var(--violet-200)] text-[var(--violet-600)] rounded-[var(--radius-xl)] font-semibold hover:bg-[var(--violet-50)] transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
