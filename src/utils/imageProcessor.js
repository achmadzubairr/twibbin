/**
 * Image processing utilities for photo campaigns
 */

/**
 * Create a circular cropped version of an image
 * @param {File} imageFile - The image file to process
 * @param {number} size - The diameter of the circle (default: 400)
 * @param {number} scale - Scale factor for the image inside circle (default: 1)
 * @returns {Promise<string>} - Base64 data URL of the circular image
 */
export const createCircularImage = (imageFile, size = 400, scale = 1) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      
      // Clear canvas
      ctx.clearRect(0, 0, size, size);
      
      // Create circular clipping path
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      
      // Calculate scaling and positioning for aspect ratio
      const imgAspect = img.width / img.height;
      let drawWidth, drawHeight, drawX, drawY;
      
      if (imgAspect > 1) {
        // Landscape image
        drawHeight = size * scale;
        drawWidth = size * imgAspect * scale;
        drawX = -(drawWidth - size) / 2;
        drawY = -(drawHeight - size) / 2;
      } else {
        // Portrait or square image
        drawWidth = size * scale;
        drawHeight = size / imgAspect * scale;
        drawX = -(drawWidth - size) / 2;
        drawY = -(drawHeight - size) / 2;
      }
      
      // Draw the image
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      ctx.restore();
      
      // Convert to data URL
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    
    // Load the image
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(imageFile);
  });
};

/**
 * Overlay a circular image onto a template at specified position
 * @param {string} templateUrl - URL of the template image
 * @param {string} circularImageDataUrl - Data URL of the circular image
 * @param {Object} position - Position and size { x, y, size }
 * @param {number} canvasWidth - Width of the output canvas
 * @param {number} canvasHeight - Height of the output canvas
 * @returns {Promise<string>} - Data URL of the combined image
 */
export const overlayImageOnTemplate = (templateUrl, circularImageDataUrl, position, canvasWidth = 1000, canvasHeight = 1000) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const templateImg = new Image();
    const overlayImg = new Image();
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    let templateLoaded = false;
    let overlayLoaded = false;
    
    const checkBothLoaded = () => {
      if (templateLoaded && overlayLoaded) {
        // Calculate position based on percentage
        const actualX = (position.x / 100) * canvasWidth;
        const actualY = (position.y / 100) * canvasHeight;
        const actualSize = (position.size / 100) * Math.min(canvasWidth, canvasHeight);
        
        // Draw photo FIRST (background layer)
        ctx.drawImage(
          overlayImg,
          actualX - actualSize / 2,
          actualY - actualSize / 2,
          actualSize,
          actualSize
        );
        
        // Draw template OVER the photo (foreground layer)
        ctx.drawImage(templateImg, 0, 0, canvasWidth, canvasHeight);
        
        const dataURL = canvas.toDataURL('image/jpeg', 0.9);
        resolve(dataURL);
      }
    };
    
    templateImg.onload = () => {
      templateLoaded = true;
      checkBothLoaded();
    };
    
    overlayImg.onload = () => {
      overlayLoaded = true;
      checkBothLoaded();
    };
    
    templateImg.onerror = () => reject(new Error('Failed to load template'));
    overlayImg.onerror = () => reject(new Error('Failed to load overlay image'));
    
    // Set crossOrigin for external images
    templateImg.crossOrigin = 'anonymous';
    
    templateImg.src = templateUrl;
    overlayImg.src = circularImageDataUrl;
  });
};

/**
 * Get image dimensions
 * @param {File} imageFile - The image file
 * @returns {Promise<{width: number, height: number}>}
 */
export const getImageDimensions = (imageFile) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height
      });
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(imageFile);
  });
};

/**
 * Validate image file
 * @param {File} file - The file to validate
 * @param {number} maxSizeMB - Maximum file size in MB (default: 5)
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export const validateImageFile = async (file, maxSizeMB = 5) => {
  try {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'File harus berupa gambar' };
    }
    
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return { valid: false, error: `Ukuran file maksimal ${maxSizeMB}MB` };
    }
    
    // Check if image can be loaded
    try {
      await getImageDimensions(file);
    } catch (error) {
      return { valid: false, error: 'File gambar tidak valid' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Gagal memvalidasi file' };
  }
};

/**
 * Create final image with custom positioning
 * @param {string} templateUrl - URL of the template image
 * @param {File} userPhoto - User's photo file
 * @param {Object} position - Position config { x, y, size, scale } in percentages
 * @param {number} outputWidth - Output image width (default: 1000)
 * @param {number} outputHeight - Output image height (default: 1000)
 * @returns {Promise<string>} - Data URL of the final image
 */
export const createCustomPositionedImage = async (templateUrl, userPhoto, position, outputWidth = 1000, outputHeight = 1000) => {
  try {
    // Calculate actual size based on output dimensions
    const actualSize = (position.size / 100) * Math.min(outputWidth, outputHeight);
    
    // Create circular image with scale
    const circularImageDataUrl = await createCircularImage(userPhoto, actualSize, position.scale);
    
    // Overlay on template with custom position
    const finalImage = await overlayImageOnTemplate(
      templateUrl,
      circularImageDataUrl,
      position,
      outputWidth,
      outputHeight
    );
    
    return finalImage;
  } catch (error) {
    throw new Error(`Failed to create positioned image: ${error.message}`);
  }
};