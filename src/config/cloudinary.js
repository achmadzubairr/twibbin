// Cloudinary configuration
export const cloudinaryConfig = {
  cloudName: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
  uploadPreset: process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET,
  apiKey: process.env.REACT_APP_CLOUDINARY_API_KEY,
};

// Template storage constants
export const TEMPLATE_PUBLIC_ID = 'twibbin_template';
export const getTemplatePublicId = () => `${TEMPLATE_PUBLIC_ID}_${Date.now()}`;
export const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/`;