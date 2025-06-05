-- Database Migration: Add Campaign Types Support
-- Execute these commands in your Supabase SQL Editor

-- 1. Add campaign_type column to campaigns table
ALTER TABLE campaigns ADD COLUMN campaign_type VARCHAR(20) DEFAULT 'text' CHECK (campaign_type IN ('text', 'photo'));

-- 2. Create index for campaign type queries
CREATE INDEX idx_campaigns_type ON campaigns(campaign_type);

-- 3. Update existing campaigns to be 'text' type (already default)
UPDATE campaigns SET campaign_type = 'text' WHERE campaign_type IS NULL;

-- 4. Update campaign_analytics view to include campaign_type
DROP VIEW IF EXISTS campaign_analytics;

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
    COUNT(CASE WHEN d.download_time >= NOW() - INTERVAL '24 hours' THEN 1 END) as downloads_today,
    COUNT(CASE WHEN d.download_time >= NOW() - INTERVAL '7 days' THEN 1 END) as downloads_this_week,
    COUNT(CASE WHEN d.download_time >= NOW() - INTERVAL '30 days' THEN 1 END) as downloads_this_month
FROM campaigns c
LEFT JOIN downloads d ON c.id = d.campaign_id
WHERE c.deleted_at IS NULL  -- Only include non-deleted campaigns
GROUP BY c.id, c.name, c.slug, c.is_active, c.campaign_type, c.created_at, c.updated_at, c.deleted_at
ORDER BY total_downloads DESC;

-- 5. Update deleted_campaigns view to include campaign_type
DROP VIEW IF EXISTS deleted_campaigns;

CREATE VIEW deleted_campaigns AS
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
    COUNT(DISTINCT d.user_name) as unique_users
FROM campaigns c
LEFT JOIN downloads d ON c.id = d.campaign_id
WHERE c.deleted_at IS NOT NULL  -- Only include deleted campaigns
GROUP BY c.id, c.name, c.slug, c.is_active, c.campaign_type, c.created_at, c.updated_at, c.deleted_at
ORDER BY c.deleted_at DESC;

-- 6. Add comments for documentation
COMMENT ON COLUMN campaigns.campaign_type IS 'Type of campaign: text (name + additional text) or photo (user uploads photo)';