"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "../contexts/CartContext";

export default function ProductCard({ product, compact = false }) {
  const { addItem } = useCart();
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [showFeedback, setShowFeedback] = useState(null); // 'success' | 'options' | null
  
  const isService = product.isService === true;
  const priceFormatted = (product.price / 100).toFixed(2);
  const hasImage = product.images && product.images.length > 0;
  const hasOptions = product.options && product.options.length > 0;

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // For services or products with options, navigate to product page
    if (isService || hasOptions) {
      router.push(`/store/${product.vendorId}/products/${product.id}`);
      return;
    }
    
    setIsAdding(true);
    try {
      await addItem(product, 1);
      setShowFeedback('success');
      setTimeout(() => setShowFeedback(null), 1500);
    } catch (error) {
      // If error contains "required" or is 422, product needs options
      if (error.status === 422 || error.message?.includes('required')) {
        setShowFeedback('options');
        setTimeout(() => {
          setShowFeedback(null);
          router.push(`/store/${product.vendorId}/products/${product.id}`);
        }, 1000);
      } else {
        console.error('Failed to add item:', error);
        setShowFeedback(null);
      }
    } finally {
      setIsAdding(false);
    }
  };
  
  return (
    <Link 
      href={`/store/${product.vendorId}/products/${product.id}`}
      className="group relative rounded-[var(--radius-xl)] overflow-hidden bg-white shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-card-hover)] transition-all duration-200 block"
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-[var(--gray-100)]">
        {hasImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img 
            src={product.images[0]} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--violet-100)] to-[var(--magenta-100)] flex items-center justify-center">
            <span className="text-3xl text-[var(--violet-300)]">
              {isService ? '✨' : '📦'}
            </span>
          </div>
        )}
        
        {/* Service/Product Badge */}
        {isService && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-gradient-primary text-white text-[10px] font-bold rounded-full uppercase tracking-wide">
            Service
          </div>
        )}

        {/* Options indicator */}
        {hasOptions && !isService && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-[var(--gray-900)]/80 text-white text-[10px] font-medium rounded-full">
            Options
          </div>
        )}

        {/* Quick Add Button */}
        {!isService && (
          <button
            onClick={handleQuickAdd}
            disabled={isAdding}
            className={`absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all ${
              showFeedback === 'success'
                ? 'bg-[var(--mint-500)] scale-110'
                : showFeedback === 'options'
                ? 'bg-[var(--amber-500)]'
                : 'bg-[var(--violet-600)] hover:bg-[var(--violet-700)] hover:scale-110 active:scale-95'
            } text-white`}
            aria-label={hasOptions ? "Select options" : "Add to cart"}
          >
            {isAdding ? (
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
              </svg>
            ) : showFeedback === 'success' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : showFeedback === 'options' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            )}
          </button>
        )}

        {/* Feedback toast */}
        {showFeedback === 'success' && (
          <div className="absolute bottom-12 right-2 px-2 py-1 bg-[var(--mint-500)] text-white text-xs font-medium rounded-lg shadow-lg animate-fade-in">
            Added!
          </div>
        )}
        {showFeedback === 'options' && (
          <div className="absolute bottom-12 right-2 px-2 py-1 bg-[var(--amber-500)] text-white text-xs font-medium rounded-lg shadow-lg animate-fade-in">
            Select options...
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-sm text-[var(--gray-900)] line-clamp-2 group-hover:text-[var(--violet-600)] transition-colors leading-tight">
          {product.name}
        </h3>
        
        <div className="flex items-baseline justify-between mt-1.5">
          <span className="text-base font-bold text-[var(--gray-900)]">
            ${priceFormatted}
          </span>
          {isService && product.duration && (
            <span className="text-xs text-[var(--gray-500)]">
              {product.duration} min
            </span>
          )}
        </div>
        
        {product.description && !compact && (
          <p className="text-xs text-[var(--gray-500)] mt-1 line-clamp-1">
            {product.description}
          </p>
        )}
      </div>
    </Link>
  );
}
