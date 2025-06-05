/**
 * Template management service that uses localStorage for persistence
 */

/**
 * Save a template image to localStorage
 * @param {string} dataUrl - Base64 data URL of the image
 * @returns {boolean} - True if saved successfully
 */
export const saveTemplate = (dataUrl) => {
  try {
    localStorage.setItem('customTemplate', dataUrl);
    // Dispatch custom event for real-time updates
    window.dispatchEvent(new CustomEvent('templateChanged', { detail: dataUrl }));
    return true;
  } catch (error) {
    console.error('Failed to save template:', error);
    return false;
  }
};

/**
 * Get the current template image from localStorage
 * @returns {string|null} - Template image data URL or null if not set
 */
export const getTemplate = () => {
  return localStorage.getItem('customTemplate');
};

/**
 * Reset to default template by removing the custom template from localStorage
 * @returns {boolean} - True if reset successfully
 */
export const resetTemplate = () => {
  try {
    localStorage.removeItem('customTemplate');
    // Dispatch custom event for real-time updates
    window.dispatchEvent(new CustomEvent('templateChanged', { detail: null }));
    return true;
  } catch (error) {
    console.error('Failed to reset template:', error);
    return false;
  }
};