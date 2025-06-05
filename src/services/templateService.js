/**
 * Template management service that uses Cloudinary for persistence
 */

import { cloudinaryConfig, TEMPLATE_PUBLIC_ID, CLOUDINARY_BASE_URL } from '../config/cloudinary';

/**
 * Upload template image to Cloudinary
 * @param {File} file - Image file to upload
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const saveTemplate = async (file) => {
  try {
    if (!cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) {
      throw new Error('Cloudinary configuration missing');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    formData.append('public_id', TEMPLATE_PUBLIC_ID);
    formData.append('overwrite', 'true');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Store template URL in localStorage for faster access
    localStorage.setItem('customTemplateUrl', data.secure_url);
    
    // Dispatch custom event for real-time updates
    window.dispatchEvent(new CustomEvent('templateChanged', { detail: data.secure_url }));

    return { success: true, url: data.secure_url };
  } catch (error) {
    console.error('Failed to save template:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get the current template image URL
 * @returns {Promise<string|null>} - Template image URL or null if not set
 */
export const getTemplate = async () => {
  try {
    // First try to get from localStorage for faster loading
    const cachedUrl = localStorage.getItem('customTemplateUrl');
    if (cachedUrl) {
      return cachedUrl;
    }

    // If not in cache, try to get from Cloudinary
    if (cloudinaryConfig.cloudName) {
      const templateUrl = `${CLOUDINARY_BASE_URL}${TEMPLATE_PUBLIC_ID}`;
      
      // Check if image exists by trying to fetch it
      const response = await fetch(templateUrl, { method: 'HEAD' });
      if (response.ok) {
        // Cache the URL for future use
        localStorage.setItem('customTemplateUrl', templateUrl);
        return templateUrl;
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to get template:', error);
    return null;
  }
};

/**
 * Reset to default template by removing from Cloudinary and cache
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const resetTemplate = async () => {
  try {
    // Remove from localStorage cache
    localStorage.removeItem('customTemplateUrl');
    
    // Dispatch custom event for real-time updates
    window.dispatchEvent(new CustomEvent('templateChanged', { detail: null }));

    // Note: We don't actually delete from Cloudinary here to avoid API key exposure
    // In a production app, this should be handled by a backend API
    
    return { success: true };
  } catch (error) {
    console.error('Failed to reset template:', error);
    return { success: false, error: error.message };
  }
};