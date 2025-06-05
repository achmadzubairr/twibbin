/**
 * Download tracking service using Supabase
 */

import { supabase, handleSupabaseError, handleSupabaseSuccess } from '../config/supabase';

/**
 * Generate random ID for downloads
 */
const generateRandomId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

/**
 * Get user's IP address (best effort)
 */
const getUserIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.warn('Could not get user IP:', error);
    return null;
  }
};

/**
 * Track a download
 * @param {Object} downloadData - { campaignId, userName, additionalText }
 * @returns {Promise<{success: boolean, data?: Object, error?: string, filename?: string}>}
 */
export const trackDownload = async (downloadData) => {
  try {
    const { campaignId, userName, additionalText, campaignSlug } = downloadData;
    
    if (!campaignId || !userName) {
      throw new Error('Campaign ID and user name are required');
    }

    const randomId = generateRandomId();
    const filename = `${campaignSlug}_${randomId}.jpg`;
    const userAgent = navigator.userAgent;
    const ipAddress = await getUserIP();

    const { data, error } = await supabase
      .from('downloads')
      .insert([
        {
          campaign_id: campaignId,
          user_name: userName,
          additional_text: additionalText || '',
          ip_address: ipAddress,
          user_agent: userAgent,
          filename: filename,
          random_id: randomId
        }
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      ...handleSupabaseSuccess(data),
      filename: filename
    };
  } catch (error) {
    console.error('Failed to track download:', error);
    return handleSupabaseError(error);
  }
};

/**
 * Get downloads for a specific campaign
 * @param {string} campaignId - Campaign ID
 * @param {Object} options - { limit, offset, startDate, endDate }
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getCampaignDownloads = async (campaignId, options = {}) => {
  try {
    const { limit = 100, offset = 0, startDate, endDate } = options;

    let query = supabase
      .from('downloads')
      .select(`
        *,
        campaigns (
          name,
          slug
        )
      `)
      .eq('campaign_id', campaignId)
      .order('download_time', { ascending: false });

    if (startDate) {
      query = query.gte('download_time', startDate);
    }

    if (endDate) {
      query = query.lte('download_time', endDate);
    }

    if (limit) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return handleSupabaseSuccess(data || []);
  } catch (error) {
    console.error('Failed to get campaign downloads:', error);
    return handleSupabaseError(error);
  }
};

/**
 * Get all downloads with campaign info
 * @param {Object} options - { limit, offset, startDate, endDate }
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getAllDownloads = async (options = {}) => {
  try {
    const { limit = 100, offset = 0, startDate, endDate } = options;

    let query = supabase
      .from('downloads')
      .select(`
        *,
        campaigns (
          name,
          slug
        )
      `)
      .order('download_time', { ascending: false });

    if (startDate) {
      query = query.gte('download_time', startDate);
    }

    if (endDate) {
      query = query.lte('download_time', endDate);
    }

    if (limit) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return handleSupabaseSuccess(data || []);
  } catch (error) {
    console.error('Failed to get all downloads:', error);
    return handleSupabaseError(error);
  }
};

/**
 * Get download statistics
 * @param {string} campaignId - Optional campaign ID to filter by
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const getDownloadStats = async (campaignId = null) => {
  try {
    let query = supabase.from('downloads').select('*');
    
    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      total: data.length,
      today: data.filter(d => new Date(d.download_time) >= today).length,
      thisWeek: data.filter(d => new Date(d.download_time) >= thisWeek).length,
      thisMonth: data.filter(d => new Date(d.download_time) >= thisMonth).length,
      uniqueUsers: new Set(data.map(d => d.user_name)).size,
      uniqueIPs: new Set(data.map(d => d.ip_address).filter(Boolean)).size,
      topNames: getTopItems(data.map(d => d.user_name), 10),
      hourlyDistribution: getHourlyDistribution(data),
      dailyDownloads: getDailyDownloads(data, 30) // Last 30 days
    };

    return handleSupabaseSuccess(stats);
  } catch (error) {
    console.error('Failed to get download stats:', error);
    return handleSupabaseError(error);
  }
};

/**
 * Get top items from array with counts
 */
const getTopItems = (items, limit = 10) => {
  const counts = {};
  items.forEach(item => {
    if (item) {
      counts[item] = (counts[item] || 0) + 1;
    }
  });

  return Object.entries(counts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([item, count]) => ({ item, count }));
};

/**
 * Get hourly distribution of downloads
 */
const getHourlyDistribution = (downloads) => {
  const hours = Array(24).fill(0);
  downloads.forEach(download => {
    const hour = new Date(download.download_time).getHours();
    hours[hour]++;
  });
  return hours.map((count, hour) => ({ hour, count }));
};

/**
 * Get daily downloads for the last N days
 */
const getDailyDownloads = (downloads, days = 30) => {
  const now = new Date();
  const dailyData = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const count = downloads.filter(d => {
      const downloadDate = new Date(d.download_time);
      return downloadDate >= dayStart && downloadDate < dayEnd;
    }).length;

    dailyData.push({
      date: dayStart.toISOString().split('T')[0],
      count
    });
  }

  return dailyData;
};

/**
 * Export downloads to CSV format
 * @param {Array} downloads - Downloads data
 * @returns {string} CSV string
 */
export const exportToCSV = (downloads) => {
  if (!downloads || downloads.length === 0) {
    return 'No data to export';
  }

  const headers = [
    'Campaign Name',
    'Campaign Slug', 
    'User Name',
    'Additional Text',
    'Download Time',
    'IP Address',
    'Filename',
    'User Agent'
  ];

  const rows = downloads.map(download => [
    download.campaigns?.name || 'N/A',
    download.campaigns?.slug || 'N/A',
    download.user_name,
    download.additional_text || '',
    new Date(download.download_time).toLocaleString(),
    download.ip_address || 'N/A',
    download.filename,
    download.user_agent || 'N/A'
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  return csvContent;
};

/**
 * Download CSV file
 * @param {string} csvContent - CSV content
 * @param {string} filename - Filename
 */
export const downloadCSV = (csvContent, filename = 'downloads.csv') => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};