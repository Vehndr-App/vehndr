/**
 * Image resizing utility for client-side image compression before upload.
 * Reduces storage costs by ensuring images don't exceed maximum dimensions.
 */

const DEFAULT_OPTIONS = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  maxFileSizeMB: 5,
};

/**
 * Resize an image file if it exceeds maximum dimensions.
 * @param {File} file - The image file to resize
 * @param {Object} options - Resize options
 * @param {number} options.maxWidth - Maximum width in pixels (default: 1920)
 * @param {number} options.maxHeight - Maximum height in pixels (default: 1920)
 * @param {number} options.quality - JPEG quality 0-1 (default: 0.85)
 * @param {number} options.maxFileSizeMB - Maximum file size in MB (default: 5)
 * @returns {Promise<File>} - Resized image file (or original if no resize needed)
 */
export async function resizeImage(file, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Skip non-image files
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Skip SVGs - they're vector and don't need resizing
  if (file.type === 'image/svg+xml') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const { width, height } = img;

      // Calculate new dimensions maintaining aspect ratio
      let newWidth = width;
      let newHeight = height;

      if (width > opts.maxWidth || height > opts.maxHeight) {
        const aspectRatio = width / height;

        if (width > height) {
          newWidth = Math.min(width, opts.maxWidth);
          newHeight = newWidth / aspectRatio;
        } else {
          newHeight = Math.min(height, opts.maxHeight);
          newWidth = newHeight * aspectRatio;
        }
      }

      // If image is already small enough, check file size
      const needsResize = newWidth !== width || newHeight !== height;
      const fileSizeMB = file.size / (1024 * 1024);

      if (!needsResize && fileSizeMB <= opts.maxFileSizeMB) {
        resolve(file);
        return;
      }

      // Create canvas and resize
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(newWidth);
      canvas.height = Math.round(newHeight);

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to resize image'));
            return;
          }

          // Create new file with same name but potentially different extension
          const extension = file.type === 'image/png' ? 'png' : 'jpg';
          const fileName = file.name.replace(/\.[^/.]+$/, `.${extension}`);

          const resizedFile = new File([blob], fileName, {
            type: blob.type,
            lastModified: Date.now(),
          });

          resolve(resizedFile);
        },
        // Use PNG for transparency, otherwise JPEG for better compression
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        opts.quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for resizing'));
    };

    img.src = objectUrl;
  });
}

/**
 * Resize multiple image files.
 * @param {File[]} files - Array of image files
 * @param {Object} options - Resize options (see resizeImage)
 * @returns {Promise<File[]>} - Array of resized files
 */
export async function resizeImages(files, options = {}) {
  return Promise.all(files.map((file) => resizeImage(file, options)));
}

/**
 * Get human-readable file size.
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size string
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate file size before upload.
 * @param {File} file - The file to check
 * @param {number} maxSizeMB - Maximum size in MB
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateFileSize(file, maxSizeMB = 10) {
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return {
      valid: false,
      message: `File "${file.name}" is ${formatFileSize(file.size)}, which exceeds the ${maxSizeMB}MB limit.`,
    };
  }
  return { valid: true };
}
