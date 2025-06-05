/**
 * Campaign management service that uses Cloudinary for template storage
 */

import { cloudinaryConfig, CLOUDINARY_BASE_URL } from '../config/cloudinary';

/**
 * Generate unique campaign ID
 */
const generateCampaignId = () => {
  return Date.now().toString();
};

/**
 * Get campaign public ID for Cloudinary
 */
const getCampaignPublicId = (campaignId) => {
  return `twibbin_campaign_${campaignId}`;
};

/**
 * Create a new campaign
 * @param {Object} campaignData - { name, slug, templateFile }
 * @returns {Promise<{success: boolean, campaign?: Object, error?: string}>}
 */
export const createCampaign = async (campaignData) => {
  try {
    const { name, slug, templateFile } = campaignData;
    
    if (!name || !slug || !templateFile) {
      throw new Error('Campaign name, slug, and template are required');
    }

    // Check if slug already exists
    const existingCampaigns = await getCampaigns();
    if (existingCampaigns.some(c => c.slug === slug)) {
      throw new Error('Slug already exists');
    }

    const campaignId = generateCampaignId();
    
    // Upload template to Cloudinary
    const formData = new FormData();
    formData.append('file', templateFile);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    formData.append('public_id', getCampaignPublicId(campaignId));

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Upload failed: ${response.statusText} - ${errorData}`);
    }

    const uploadData = await response.json();

    const campaign = {
      id: campaignId,
      name,
      slug,
      templateUrl: uploadData.secure_url,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    // Save campaign to localStorage
    const campaigns = await getCampaigns();
    campaigns.push(campaign);
    localStorage.setItem('campaigns', JSON.stringify(campaigns));

    return { success: true, campaign };
  } catch (error) {
    console.error('Failed to create campaign:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all campaigns
 * @returns {Promise<Array>} - Array of campaigns
 */
export const getCampaigns = async () => {
  try {
    const campaigns = localStorage.getItem('campaigns');
    return campaigns ? JSON.parse(campaigns) : [];
  } catch (error) {
    console.error('Failed to get campaigns:', error);
    return [];
  }
};

/**
 * Get campaign by slug
 * @param {string} slug - Campaign slug
 * @returns {Promise<Object|null>} - Campaign object or null
 */
export const getCampaignBySlug = async (slug) => {
  try {
    const campaigns = await getCampaigns();
    return campaigns.find(c => c.slug === slug && c.isActive) || null;
  } catch (error) {
    console.error('Failed to get campaign by slug:', error);
    return null;
  }
};

/**
 * Update campaign
 * @param {string} campaignId - Campaign ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<{success: boolean, campaign?: Object, error?: string}>}
 */
export const updateCampaign = async (campaignId, updateData) => {
  try {
    const campaigns = await getCampaigns();
    const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
    
    if (campaignIndex === -1) {
      throw new Error('Campaign not found');
    }

    // Check if new slug already exists (if slug is being updated)
    if (updateData.slug && updateData.slug !== campaigns[campaignIndex].slug) {
      if (campaigns.some(c => c.slug === updateData.slug && c.id !== campaignId)) {
        throw new Error('Slug already exists');
      }
    }

    campaigns[campaignIndex] = { ...campaigns[campaignIndex], ...updateData };
    localStorage.setItem('campaigns', JSON.stringify(campaigns));

    return { success: true, campaign: campaigns[campaignIndex] };
  } catch (error) {
    console.error('Failed to update campaign:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteCampaign = async (campaignId) => {
  try {
    const campaigns = await getCampaigns();
    const filteredCampaigns = campaigns.filter(c => c.id !== campaignId);
    localStorage.setItem('campaigns', JSON.stringify(filteredCampaigns));

    return { success: true };
  } catch (error) {
    console.error('Failed to delete campaign:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Toggle campaign active status
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<{success: boolean, campaign?: Object, error?: string}>}
 */
export const toggleCampaignStatus = async (campaignId) => {
  try {
    const campaigns = await getCampaigns();
    const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
    
    if (campaignIndex === -1) {
      throw new Error('Campaign not found');
    }

    campaigns[campaignIndex].isActive = !campaigns[campaignIndex].isActive;
    localStorage.setItem('campaigns', JSON.stringify(campaigns));

    return { success: true, campaign: campaigns[campaignIndex] };
  } catch (error) {
    console.error('Failed to toggle campaign status:', error);
    return { success: false, error: error.message };
  }
};