/**
 * Campaign management service using Supabase
 */

import { supabase, handleSupabaseError, handleSupabaseSuccess } from '../config/supabase';
import { cloudinaryConfig } from '../config/cloudinary';

/**
 * Generate unique campaign public ID for Cloudinary
 */
const getCampaignPublicId = (campaignId) => {
  return `twibbin_campaign_${campaignId}`;
};

/**
 * Create a new campaign
 * @param {Object} campaignData - { name, slug, templateFile }
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const createCampaign = async (campaignData) => {
  try {
    const { name, slug, templateFile } = campaignData;
    
    if (!name || !slug || !templateFile) {
      throw new Error('Campaign name, slug, and template are required');
    }

    // Check if slug already exists
    const { data: existingCampaign, error: checkError } = await supabase
      .from('campaigns')
      .select('slug')
      .eq('slug', slug)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw checkError;
    }

    if (existingCampaign) {
      throw new Error('Slug already exists');
    }

    // First create campaign record to get ID
    const { data: campaign, error: createError } = await supabase
      .from('campaigns')
      .insert([
        {
          name,
          slug,
          template_url: '', // Will be updated after upload
          is_active: true
        }
      ])
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Upload template to Cloudinary
    const formData = new FormData();
    formData.append('file', templateFile);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    formData.append('public_id', getCampaignPublicId(campaign.id));

    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!cloudinaryResponse.ok) {
      // If upload fails, delete the campaign record
      await supabase.from('campaigns').delete().eq('id', campaign.id);
      const errorData = await cloudinaryResponse.text();
      throw new Error(`Upload failed: ${cloudinaryResponse.statusText} - ${errorData}`);
    }

    const uploadData = await cloudinaryResponse.json();

    // Update campaign with template URL
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('campaigns')
      .update({ template_url: uploadData.secure_url })
      .eq('id', campaign.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return handleSupabaseSuccess(updatedCampaign);
  } catch (error) {
    console.error('Failed to create campaign:', error);
    return handleSupabaseError(error);
  }
};

/**
 * Get all campaigns (excluding soft deleted)
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getCampaigns = async () => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return handleSupabaseSuccess(data || []);
  } catch (error) {
    console.error('Failed to get campaigns:', error);
    return handleSupabaseError(error);
  }
};

/**
 * Get active campaigns only (excluding soft deleted)
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getActiveCampaigns = async () => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return handleSupabaseSuccess(data || []);
  } catch (error) {
    console.error('Failed to get active campaigns:', error);
    return handleSupabaseError(error);
  }
};

/**
 * Get campaign by slug (active and not deleted)
 * @param {string} slug - Campaign slug
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const getCampaignBySlug = async (slug) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return handleSupabaseSuccess(null); // Campaign not found
      }
      throw error;
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    console.error('Failed to get campaign by slug:', error);
    return handleSupabaseError(error);
  }
};

/**
 * Update campaign
 * @param {string} campaignId - Campaign ID
 * @param {Object} updateData - Data to update { name?, slug?, templateFile?, is_active? }
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const updateCampaign = async (campaignId, updateData) => {
  try {
    // Check if campaign exists and is not deleted
    const { data: existingCampaign, error: getError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .is('deleted_at', null)
      .single();

    if (getError) {
      if (getError.code === 'PGRST116') {
        throw new Error('Campaign not found or has been deleted');
      }
      throw getError;
    }

    // Check if new slug already exists (if slug is being updated)
    if (updateData.slug && updateData.slug !== existingCampaign.slug) {
      const { data: slugCheck, error: checkError } = await supabase
        .from('campaigns')
        .select('slug')
        .eq('slug', updateData.slug)
        .is('deleted_at', null)
        .neq('id', campaignId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (slugCheck) {
        throw new Error('Slug already exists');
      }
    }

    // Prepare update object
    const updateObject = { ...updateData };
    delete updateObject.templateFile; // Remove file from update object

    // If templateFile is provided, upload to Cloudinary first
    if (updateData.templateFile) {
      const formData = new FormData();
      formData.append('file', updateData.templateFile);
      formData.append('upload_preset', cloudinaryConfig.uploadPreset);
      formData.append('public_id', getCampaignPublicId(campaignId));
      formData.append('overwrite', 'true');

      const cloudinaryResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!cloudinaryResponse.ok) {
        const errorData = await cloudinaryResponse.text();
        throw new Error(`Upload failed: ${cloudinaryResponse.statusText} - ${errorData}`);
      }

      const uploadData = await cloudinaryResponse.json();
      updateObject.template_url = uploadData.secure_url;
    }

    // Update campaign in database
    const { data, error } = await supabase
      .from('campaigns')
      .update(updateObject)
      .eq('id', campaignId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    console.error('Failed to update campaign:', error);
    return handleSupabaseError(error);
  }
};

/**
 * Soft delete campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteCampaign = async (campaignId) => {
  try {
    const { data, error } = await supabase
      .rpc('soft_delete_campaign', { campaign_id: campaignId });

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Campaign not found or already deleted');
    }

    return handleSupabaseSuccess(true);
  } catch (error) {
    console.error('Failed to soft delete campaign:', error);
    return handleSupabaseError(error);
  }
};

/**
 * Toggle campaign active status (only for non-deleted campaigns)
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const toggleCampaignStatus = async (campaignId) => {
  try {
    // First get current status (only for non-deleted campaigns)
    const { data: campaign, error: getError } = await supabase
      .from('campaigns')
      .select('is_active')
      .eq('id', campaignId)
      .is('deleted_at', null)
      .single();

    if (getError) {
      if (getError.code === 'PGRST116') {
        throw new Error('Campaign not found or has been deleted');
      }
      throw getError;
    }

    // Toggle status
    const { data, error } = await supabase
      .from('campaigns')
      .update({ is_active: !campaign.is_active })
      .eq('id', campaignId)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    console.error('Failed to toggle campaign status:', error);
    return handleSupabaseError(error);
  }
};

/**
 * Restore soft deleted campaign
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const restoreCampaign = async (campaignId) => {
  try {
    const { data, error } = await supabase
      .rpc('restore_campaign', { campaign_id: campaignId });

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Campaign not found or not deleted');
    }

    return handleSupabaseSuccess(true);
  } catch (error) {
    console.error('Failed to restore campaign:', error);
    return handleSupabaseError(error);
  }
};

/**
 * Get deleted campaigns
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getDeletedCampaigns = async () => {
  try {
    const { data, error } = await supabase
      .from('deleted_campaigns')
      .select('*')
      .order('deleted_at', { ascending: false });

    if (error) {
      throw error;
    }

    return handleSupabaseSuccess(data || []);
  } catch (error) {
    console.error('Failed to get deleted campaigns:', error);
    return handleSupabaseError(error);
  }
};

/**
 * Get campaign by ID (including deleted ones, for admin purposes)
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const getCampaignById = async (campaignId) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return handleSupabaseSuccess(null); // Campaign not found
      }
      throw error;
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    console.error('Failed to get campaign by ID:', error);
    return handleSupabaseError(error);
  }
};

/**
 * Get campaign analytics (only active campaigns)
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getCampaignAnalytics = async () => {
  try {
    const { data, error } = await supabase
      .from('campaign_analytics')
      .select('*')
      .order('total_downloads', { ascending: false });

    if (error) {
      throw error;
    }

    return handleSupabaseSuccess(data || []);
  } catch (error) {
    console.error('Failed to get campaign analytics:', error);
    return handleSupabaseError(error);
  }
};