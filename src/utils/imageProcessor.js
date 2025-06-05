/**
 * Image processing utilities for simple gesture-based photo editor
 */

/**
 * Create final image with transform data from gesture editor
 * @param {string} templateUrl - URL of the template image
 * @param {File} userPhoto - User's photo file
 * @param {Object} transformData - Transform data from PhotoEditor { transform: {x, y, scale}, photoPreview }
 * @param {number} outputWidth - Output image width (default: 1000)
 * @param {number} outputHeight - Output image height (default: 1000)
 * @returns {Promise<string>} - Data URL of the final image
 */
export const createCustomPositionedImage = async (templateUrl, userPhoto, transformData, outputWidth = 1000, outputHeight = 1000) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const templateImg = new Image();
    const userImg = new Image();
    
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    
    let templateLoaded = false;
    let userLoaded = false;
    
    const checkBothLoaded = () => {
      if (templateLoaded && userLoaded) {
        try {
          // Clear canvas
          ctx.clearRect(0, 0, outputWidth, outputHeight);
          
          // Get transform data or use defaults
          const transform = transformData?.transform || { x: 0, y: 0, scale: 1 };
          const previewSize = transformData?.previewSize || { width: outputWidth, height: outputHeight };
          
          // Calculate scale factor from preview to final canvas
          const scaleFactorX = outputWidth / previewSize.width;
          const scaleFactorY = outputHeight / previewSize.height;
          
          // Apply user photo as background with transforms
          ctx.save();
          
          // Scale preview coordinates to final canvas coordinates
          const finalTranslateX = transform.x * scaleFactorX;
          const finalTranslateY = transform.y * scaleFactorY;
          
          // Calculate transform matrix manually for precision
          const centerX = outputWidth / 2;
          const centerY = outputHeight / 2;
          
          // Apply transforms: first translate to center, then scale, then translate by user offset
          ctx.translate(centerX + finalTranslateX, centerY + finalTranslateY);
          ctx.scale(transform.scale, transform.scale);
          
          // Calculate dimensions to match CSS object-contain behavior
          const imageAspectRatio = userImg.width / userImg.height;
          const canvasAspectRatio = outputWidth / outputHeight;
          
          let renderWidth, renderHeight;
          
          if (imageAspectRatio > canvasAspectRatio) {
            // Image is wider - fit to width (like object-contain)
            renderWidth = outputWidth;
            renderHeight = outputWidth / imageAspectRatio;
          } else {
            // Image is taller - fit to height (like object-contain)
            renderHeight = outputHeight;
            renderWidth = outputHeight * imageAspectRatio;
          }
          
          // Center the image
          const drawX = -renderWidth / 2;
          const drawY = -renderHeight / 2;
          
          // Draw user photo to match object-contain behavior
          ctx.drawImage(userImg, drawX, drawY, renderWidth, renderHeight);
          
          ctx.restore();
          
          // Draw template over the user photo
          ctx.drawImage(templateImg, 0, 0, outputWidth, outputHeight);
          
          const dataURL = canvas.toDataURL('image/jpeg', 0.9);
          resolve(dataURL);
        } catch (error) {
          reject(new Error(`Failed to compose image: ${error.message}`));
        }
      }
    };
    
    templateImg.onload = () => {
      templateLoaded = true;
      checkBothLoaded();
    };
    
    userImg.onload = () => {
      userLoaded = true;
      checkBothLoaded();
    };
    
    templateImg.onerror = () => reject(new Error('Failed to load template'));
    userImg.onerror = () => reject(new Error('Failed to load user photo'));
    
    // Set crossOrigin for external images
    templateImg.crossOrigin = 'anonymous';
    
    templateImg.src = templateUrl;
    
    // Use photo preview URL if available, otherwise create from file
    if (transformData?.photoPreview) {
      userImg.src = transformData.photoPreview;
    } else if (userPhoto) {
      const reader = new FileReader();
      reader.onload = (e) => {
        userImg.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read user photo'));
      reader.readAsDataURL(userPhoto);
    } else {
      reject(new Error('No user photo provided'));
    }
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