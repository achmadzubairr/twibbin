/**
 * Admin Authentication Service
 * Handles admin login, password management, and settings
 */

import { supabase } from '../config/supabase';

// Password hashing utility (simple hash for demo - use bcrypt in production)
const hashPassword = async (password) => {
  // For demo purposes, using simple hash
  // In production, use bcrypt or similar
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

/**
 * Initialize admin settings with default password
 */
export const initializeAdminSettings = async () => {
  try {
    // Check if admin password already exists
    const { data: existing, error: checkError } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('setting_key', 'admin_password')
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    // If no password exists, create default
    if (!existing) {
      const defaultPassword = await hashPassword('admin123');
      
      const { data, error } = await supabase
        .from('admin_settings')
        .insert([
          {
            setting_key: 'admin_password',
            setting_value: defaultPassword
          }
        ])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: 'Default admin password initialized',
        data
      };
    }

    return {
      success: true,
      message: 'Admin password already exists',
      data: existing
    };

  } catch (error) {
    console.error('Error initializing admin settings:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Authenticate admin login
 * @param {string} password - Plain text password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const authenticateAdmin = async (password) => {
  try {
    // Get hashed password from database
    const { data: settings, error: fetchError } = await supabase
      .from('admin_settings')
      .select('setting_value')
      .eq('setting_key', 'admin_password')
      .single();

    if (fetchError) {
      // If no password in database, try to initialize
      if (fetchError.code === 'PGRST116') {
        const initResult = await initializeAdminSettings();
        if (!initResult.success) {
          throw new Error('Failed to initialize admin settings');
        }
        // Retry authentication with default password
        return authenticateAdmin(password);
      }
      throw fetchError;
    }

    // Hash the provided password
    const hashedPassword = await hashPassword(password);

    // Compare hashed passwords
    if (hashedPassword === settings.setting_value) {
      return {
        success: true
      };
    } else {
      return {
        success: false,
        error: 'Password salah'
      };
    }

  } catch (error) {
    console.error('Error authenticating admin:', error);
    return {
      success: false,
      error: 'Gagal melakukan autentikasi'
    };
  }
};

/**
 * Change admin password
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const changeAdminPassword = async (currentPassword, newPassword) => {
  try {
    // First verify current password
    const authResult = await authenticateAdmin(currentPassword);
    if (!authResult.success) {
      return {
        success: false,
        error: 'Password lama tidak benar'
      };
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password in database
    const { data, error } = await supabase
      .from('admin_settings')
      .update({
        setting_value: hashedNewPassword,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', 'admin_password')
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: 'Password berhasil diubah',
      data
    };

  } catch (error) {
    console.error('Error changing admin password:', error);
    return {
      success: false,
      error: 'Gagal mengubah password'
    };
  }
};

/**
 * Get admin setting by key
 * @param {string} key - Setting key
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export const getAdminSetting = async (key) => {
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('setting_key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Setting tidak ditemukan'
        };
      }
      throw error;
    }

    return {
      success: true,
      data
    };

  } catch (error) {
    console.error('Error getting admin setting:', error);
    return {
      success: false,
      error: 'Gagal mengambil setting'
    };
  }
};

/**
 * Set admin setting
 * @param {string} key - Setting key
 * @param {string} value - Setting value
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export const setAdminSetting = async (key, value) => {
  try {
    // Try to update existing setting first
    const { data: updateData, error: updateError } = await supabase
      .from('admin_settings')
      .update({
        setting_value: value,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', key)
      .select()
      .single();

    if (updateError && updateError.code === 'PGRST116') {
      // Setting doesn't exist, create it
      const { data: insertData, error: insertError } = await supabase
        .from('admin_settings')
        .insert([
          {
            setting_key: key,
            setting_value: value
          }
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      return {
        success: true,
        data: insertData,
        message: 'Setting berhasil dibuat'
      };
    }

    if (updateError) throw updateError;

    return {
      success: true,
      data: updateData,
      message: 'Setting berhasil diupdate'
    };

  } catch (error) {
    console.error('Error setting admin setting:', error);
    return {
      success: false,
      error: 'Gagal menyimpan setting'
    };
  }
};

/**
 * Get all admin settings
 * @returns {Promise<{success: boolean, data?: any[], error?: string}>}
 */
export const getAllAdminSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .order('setting_key');

    if (error) throw error;

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    console.error('Error getting all admin settings:', error);
    return {
      success: false,
      error: 'Gagal mengambil semua setting',
      data: []
    };
  }
};

/**
 * Reset admin password to default
 * This is a utility function for emergency access
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const resetAdminPasswordToDefault = async () => {
  try {
    const defaultPassword = await hashPassword('admin123');

    const { data, error } = await supabase
      .from('admin_settings')
      .update({
        setting_value: defaultPassword,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', 'admin_password')
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: 'Password berhasil direset ke default (admin123)'
    };

  } catch (error) {
    console.error('Error resetting admin password:', error);
    return {
      success: false,
      error: 'Gagal mereset password'
    };
  }
};