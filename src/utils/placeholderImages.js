// Placeholder images for vendors based on category
// Using Unsplash Source API for high-quality, relevant images

const categoryImages = {
  'Food & Beverage': [
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80', // Street food
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80', // Food platter
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80', // Pancakes
  ],
  'Clothing & Accessories': [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80', // Clothing store
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', // Fashion accessories
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&q=80', // Colorful clothing
  ],
  'Health & Wellness': [
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80', // Yoga
    'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&q=80', // Spa stones
    'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=600&q=80', // Massage
  ],
  'Entertainment': [
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80', // Concert
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80', // Live music
    'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&q=80', // Festival crowd
  ],
  'Photography': [
    'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=600&q=80', // Camera
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80', // Photography gear
    'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=600&q=80', // Photo shoot
  ],
  'Rentals': [
    'https://images.unsplash.com/photo-1478827536114-da961b7f86d2?w=600&q=80', // Event setup
    'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&q=80', // Wedding venue
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&q=80', // Party tent
  ],
  'DJ/Music': [
    'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=600&q=80', // DJ booth
    'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=600&q=80', // DJ mixer
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&q=80', // Concert DJ
  ],
  'Workshops': [
    'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&q=80', // Workshop
    'https://images.unsplash.com/photo-1552581234-26160f608093?w=600&q=80', // Team workshop
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80', // Creative workshop
  ],
  'Beauty': [
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&q=80', // Makeup
    'https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=600&q=80', // Beauty products
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80', // Salon
  ],
  'Other': [
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&q=80', // Market booth
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80', // Event
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80', // Celebration
  ],
};

// Default images for vendors without a category match
const defaultImages = [
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80', // Market stall
  'https://images.unsplash.com/photo-1555529771-122e5b691fdf?w=600&q=80', // Festival booth
  'https://images.unsplash.com/photo-1531058020387-3be344556be6?w=600&q=80', // Event setup
];

/**
 * Get a placeholder image URL for a vendor based on their categories
 * @param {string[]} categories - Array of vendor categories
 * @param {string|number} vendorId - Vendor ID for consistent image selection
 * @returns {string} Image URL
 */
export function getVendorPlaceholderImage(categories = [], vendorId = '') {
  // Create a simple hash from vendorId for consistent image selection
  const hash = String(vendorId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Try to find an image based on the first matching category
  for (const category of categories) {
    if (categoryImages[category]) {
      const images = categoryImages[category];
      return images[hash % images.length];
    }
  }
  
  // Fallback to default images
  return defaultImages[hash % defaultImages.length];
}

/**
 * Get a placeholder image for a product based on its vendor's categories
 * @param {object} product - Product object with vendor info
 * @returns {string} Image URL
 */
export function getProductPlaceholderImage(product) {
  const categories = product?.vendor?.categories || [];
  const productId = product?.id || '';
  return getVendorPlaceholderImage(categories, productId);
}

export default {
  getVendorPlaceholderImage,
  getProductPlaceholderImage,
  categoryImages,
  defaultImages,
};

