-- Update Analytics View untuk menggunakan timezone Asia/Makassar
-- Execute this script in your Supabase SQL Editor

-- Drop existing view
DROP VIEW IF EXISTS campaign_analytics;

-- Create updated campaign analytics view with Asia/Makassar timezone
CREATE VIEW campaign_analytics AS
SELECT 
    c.id,
    c.name,
    c.slug,
    c.is_active,
    c.campaign_type,
    c.created_at,
    c.updated_at,
    c.deleted_at,
    COUNT(d.id) as total_downloads,
    COUNT(DISTINCT d.user_name) as unique_users,
    MAX(d.download_time) as last_download,
    -- Today: since start of today in Asia/Makassar timezone
    COUNT(CASE WHEN d.download_time >= DATE_TRUNC('day', NOW() AT TIME ZONE 'Asia/Makassar') AT TIME ZONE 'Asia/Makassar' THEN 1 END) as downloads_today,
    -- This week: since start of this week (Monday) in Asia/Makassar timezone
    COUNT(CASE WHEN d.download_time >= DATE_TRUNC('week', NOW() AT TIME ZONE 'Asia/Makassar') AT TIME ZONE 'Asia/Makassar' THEN 1 END) as downloads_this_week,
    -- This month: since start of this month in Asia/Makassar timezone
    COUNT(CASE WHEN d.download_time >= DATE_TRUNC('month', NOW() AT TIME ZONE 'Asia/Makassar') AT TIME ZONE 'Asia/Makassar' THEN 1 END) as downloads_this_month
FROM campaigns c
LEFT JOIN downloads d ON c.id = d.campaign_id
WHERE c.deleted_at IS NULL  -- Only include non-deleted campaigns
GROUP BY c.id, c.name, c.slug, c.is_active, c.campaign_type, c.created_at, c.updated_at, c.deleted_at
ORDER BY total_downloads DESC;

-- Add comment
COMMENT ON VIEW campaign_analytics IS 'Analytics view for active campaigns using Asia/Makassar timezone';