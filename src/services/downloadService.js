/**
 * Download tracking service using Supabase
 */

import { supabase, handleSupabaseError, handleSupabaseSuccess } from '../config/supabase';

/**
 * Generate random ID for downloads (max 5 characters)
 */
const generateRandomId = () => {
  return Math.random().toString(36).substring(2, 7);
};

/**
 * Clean user name for filename (remove special characters, spaces, etc.)
 */
const cleanNameForFilename = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric characters
    .substring(0, 20); // Limit to 20 characters
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
    const cleanedUserName = cleanNameForFilename(userName);
    const filename = `${campaignSlug}_${cleanedUserName}_${randomId}.jpg`;
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
 * @returns {Promise<{success: boolean, data?: Array, error?: string, count?: number}>}
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
 * Get total count of downloads
 * @param {Object} options - { startDate, endDate }
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
export const getDownloadsCount = async (options = {}) => {
  try {
    const { startDate, endDate } = options;

    let query = supabase
      .from('downloads')
      .select('id', { count: 'exact', head: true });

    if (startDate) {
      query = query.gte('download_time', startDate);
    }

    if (endDate) {
      query = query.lte('download_time', endDate);
    }

    const { count, error } = await query;

    if (error) {
      throw error;
    }

    return handleSupabaseSuccess({ count });
  } catch (error) {
    console.error('Failed to get downloads count:', error);
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

    // Use Asia/Makassar timezone for accurate local time calculations
    const now = new Date();
    
    // Calculate "today" from 00:00:00 Asia/Makassar time
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calculate "this week" from Monday 00:00:00 Asia/Makassar time
    const currentWeekStart = new Date(now);
    const dayOfWeek = currentWeekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, so 6 days back
    currentWeekStart.setDate(currentWeekStart.getDate() - daysToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);
    
    // Calculate "this month" from 1st day 00:00:00 Asia/Makassar time
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      total: data.length,
      // Use "today" from 00:00 instead of 24 hours ago
      today: data.filter(d => new Date(d.download_time) >= todayStart).length,
      // Use "this week" from Monday 00:00
      thisWeek: data.filter(d => new Date(d.download_time) >= currentWeekStart).length,
      // Use "this month" from 1st day 00:00
      thisMonth: data.filter(d => new Date(d.download_time) >= thisMonthStart).length,
      uniqueUsers: new Set(data.map(d => d.user_name)).size,
      uniqueIPs: new Set(data.map(d => d.ip_address).filter(Boolean)).size,
      topNames: getTopItems(data.map(d => d.user_name), 10),
      hourlyDistribution: getHourlyDistribution(data),
      dailyDownloads: getDailyDownloads(data, 30), // Last 30 days
      // Debug info for timezone checking
      debug: {
        now: now.toISOString(),
        nowLocal: now.toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }),
        todayStart: todayStart.toISOString(),
        todayStartLocal: todayStart.toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }),
        currentWeekStart: currentWeekStart.toISOString(),
        currentWeekStartLocal: currentWeekStart.toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }),
        thisMonthStart: thisMonthStart.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
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