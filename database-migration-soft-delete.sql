-- Database Migration: Soft Delete Implementation
-- Execute these commands in your Supabase SQL Editor

-- 1. Add deleted_at column to campaigns table
ALTER TABLE campaigns ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Create index for soft delete queries (performance optimization)
CREATE INDEX idx_campaigns_deleted_at ON campaigns(deleted_at);
CREATE INDEX idx_campaigns_active_campaigns ON campaigns(is_active, deleted_at);

-- 3. Update the campaign_analytics view to exclude deleted campaigns
DROP VIEW IF EXISTS campaign_analytics;

CREATE VIEW campaign_analytics AS
SELECT 
    c.id,
    c.name,
    c.slug,
    c.is_active,
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
GROUP BY c.id, c.name, c.slug, c.is_active, c.created_at, c.updated_at, c.deleted_at
ORDER BY total_downloads DESC;

-- 4. Create view for deleted campaigns (for restoration purposes)
CREATE VIEW deleted_campaigns AS
SELECT 
    c.id,
    c.name,
    c.slug,
    c.is_active,
    c.created_at,
    c.updated_at,
    c.deleted_at,
    COUNT(d.id) as total_downloads,
    COUNT(DISTINCT d.user_name) as unique_users
FROM campaigns c
LEFT JOIN downloads d ON c.id = d.campaign_id
WHERE c.deleted_at IS NOT NULL  -- Only include deleted campaigns
GROUP BY c.id, c.name, c.slug, c.is_active, c.created_at, c.updated_at, c.deleted_at
ORDER BY c.deleted_at DESC;

-- 5. Update RLS policies to handle soft delete
DROP POLICY IF EXISTS "Allow all operations on campaigns" ON campaigns;

-- Create separate policies for better security
CREATE POLICY "Allow read active campaigns" ON campaigns 
    FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Allow insert campaigns" ON campaigns 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update campaigns" ON campaigns 
    FOR UPDATE USING (true);

-- Don't allow actual DELETE, only soft delete via UPDATE
CREATE POLICY "Prevent hard delete campaigns" ON campaigns 
    FOR DELETE USING (false);

-- 6. Create function for soft delete
CREATE OR REPLACE FUNCTION soft_delete_campaign(campaign_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE campaigns 
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE id = campaign_id AND deleted_at IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function for restore campaign
CREATE OR REPLACE FUNCTION restore_campaign(campaign_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE campaigns 
    SET deleted_at = NULL, updated_at = NOW()
    WHERE id = campaign_id AND deleted_at IS NOT NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to permanently delete old campaigns (optional, for cleanup)
CREATE OR REPLACE FUNCTION permanent_delete_old_campaigns(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM campaigns 
    WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '1 day' * days_old;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 9. Add comments for documentation
COMMENT ON COLUMN campaigns.deleted_at IS 'Timestamp when campaign was soft deleted. NULL means active campaign.';
COMMENT ON FUNCTION soft_delete_campaign(UUID) IS 'Soft delete a campaign by setting deleted_at timestamp';
COMMENT ON FUNCTION restore_campaign(UUID) IS 'Restore a soft deleted campaign by clearing deleted_at';
COMMENT ON VIEW campaign_analytics IS 'Analytics view for active (non-deleted) campaigns only';
COMMENT ON VIEW deleted_campaigns IS 'View for soft deleted campaigns, useful for restoration';