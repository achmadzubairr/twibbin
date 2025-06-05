-- ========================================
-- TWIBBIN - Complete Database Setup
-- ========================================
-- Execute this script in your Supabase SQL Editor
-- This script includes all database schema, migrations, and setup

-- ========================================
-- 1. ENABLE EXTENSIONS
-- ========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 2. CREATE TABLES
-- ========================================

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    template_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    campaign_type VARCHAR(50) DEFAULT 'text' CHECK (campaign_type IN ('text', 'photo')),
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create downloads table to track user downloads
CREATE TABLE IF NOT EXISTS downloads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    additional_text VARCHAR(255),
    download_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    filename VARCHAR(255),
    random_id VARCHAR(50)
);

-- Create admin_settings table for admin configuration
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns(slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_campaigns_deleted_at ON campaigns(deleted_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_active_campaigns ON campaigns(is_active, deleted_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_downloads_campaign_id ON downloads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_downloads_time ON downloads(download_time);
CREATE INDEX IF NOT EXISTS idx_downloads_user_name ON downloads(user_name);
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(setting_key);

-- ========================================
-- 4. CREATE TRIGGERS AND FUNCTIONS
-- ========================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to campaigns table
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE
    ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to admin_settings table
DROP TRIGGER IF EXISTS update_admin_settings_updated_at ON admin_settings;
CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE
    ON admin_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 5. SOFT DELETE FUNCTIONS
-- ========================================

-- Function for soft delete campaign
CREATE OR REPLACE FUNCTION soft_delete_campaign(campaign_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE campaigns 
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE id = campaign_id AND deleted_at IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function for restore campaign
CREATE OR REPLACE FUNCTION restore_campaign(campaign_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE campaigns 
    SET deleted_at = NULL, updated_at = NOW()
    WHERE id = campaign_id AND deleted_at IS NOT NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to permanently delete old campaigns (optional, for cleanup)
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

-- ========================================
-- 6. CREATE ANALYTICS VIEWS
-- ========================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS campaign_analytics;
DROP VIEW IF EXISTS deleted_campaigns;

-- Create campaign analytics view (for active campaigns only)
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

-- Create view for deleted campaigns (for restoration purposes)
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

-- ========================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on campaigns" ON campaigns;
DROP POLICY IF EXISTS "Allow all operations on downloads" ON downloads;
DROP POLICY IF EXISTS "Allow read active campaigns" ON campaigns;
DROP POLICY IF EXISTS "Allow insert campaigns" ON campaigns;
DROP POLICY IF EXISTS "Allow update campaigns" ON campaigns;
DROP POLICY IF EXISTS "Prevent hard delete campaigns" ON campaigns;

-- Create policies for campaigns
CREATE POLICY "Allow read active campaigns" ON campaigns 
    FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Allow insert campaigns" ON campaigns 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update campaigns" ON campaigns 
    FOR UPDATE USING (true);

-- Don't allow actual DELETE, only soft delete via UPDATE
CREATE POLICY "Prevent hard delete campaigns" ON campaigns 
    FOR DELETE USING (false);

-- Create policies for downloads (allow all operations for tracking)
CREATE POLICY "Allow all operations on downloads" ON downloads 
    FOR ALL USING (true);

-- Create policies for admin_settings (allow all operations for admin)
CREATE POLICY "Allow all operations on admin_settings" ON admin_settings 
    FOR ALL USING (true);

-- ========================================
-- 8. UTILITY FUNCTIONS FOR ANALYTICS
-- ========================================

-- Function to get download statistics
CREATE OR REPLACE FUNCTION get_download_stats()
RETURNS TABLE(
    total_downloads BIGINT,
    downloads_today BIGINT,
    downloads_this_week BIGINT,
    downloads_this_month BIGINT,
    unique_users BIGINT,
    active_campaigns BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(d.id) as total_downloads,
        COUNT(CASE WHEN d.download_time >= NOW() - INTERVAL '24 hours' THEN 1 END) as downloads_today,
        COUNT(CASE WHEN d.download_time >= NOW() - INTERVAL '7 days' THEN 1 END) as downloads_this_week,
        COUNT(CASE WHEN d.download_time >= NOW() - INTERVAL '30 days' THEN 1 END) as downloads_this_month,
        COUNT(DISTINCT d.user_name) as unique_users,
        (SELECT COUNT(*) FROM campaigns WHERE is_active = true AND deleted_at IS NULL)::BIGINT as active_campaigns
    FROM downloads d
    JOIN campaigns c ON d.campaign_id = c.id
    WHERE c.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to get top names
CREATE OR REPLACE FUNCTION get_top_names(limit_count INTEGER DEFAULT 15)
RETURNS TABLE(
    user_name VARCHAR(255),
    download_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.user_name,
        COUNT(d.id) as download_count
    FROM downloads d
    JOIN campaigns c ON d.campaign_id = c.id
    WHERE c.deleted_at IS NULL
    AND d.user_name IS NOT NULL
    AND trim(d.user_name) != ''
    GROUP BY d.user_name
    ORDER BY download_count DESC, d.user_name ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 9. ADD COLUMN COMMENTS FOR DOCUMENTATION
-- ========================================
COMMENT ON TABLE campaigns IS 'Campaign templates for greeting cards';
COMMENT ON TABLE downloads IS 'Download tracking and analytics';
COMMENT ON TABLE admin_settings IS 'Admin configuration settings including passwords and app settings';

COMMENT ON COLUMN campaigns.id IS 'Unique campaign identifier';
COMMENT ON COLUMN campaigns.name IS 'Display name of the campaign';
COMMENT ON COLUMN campaigns.slug IS 'URL-friendly identifier for the campaign';
COMMENT ON COLUMN campaigns.template_url IS 'URL to the template image';
COMMENT ON COLUMN campaigns.is_active IS 'Whether the campaign is currently active';
COMMENT ON COLUMN campaigns.campaign_type IS 'Type of campaign: text or photo';
COMMENT ON COLUMN campaigns.deleted_at IS 'Timestamp when campaign was soft deleted. NULL means active campaign.';
COMMENT ON COLUMN campaigns.created_at IS 'Campaign creation timestamp';
COMMENT ON COLUMN campaigns.updated_at IS 'Campaign last update timestamp';

COMMENT ON COLUMN downloads.id IS 'Unique download identifier';
COMMENT ON COLUMN downloads.campaign_id IS 'Reference to the campaign';
COMMENT ON COLUMN downloads.user_name IS 'Name entered by user';
COMMENT ON COLUMN downloads.additional_text IS 'Additional text entered by user';
COMMENT ON COLUMN downloads.download_time IS 'When the download occurred';
COMMENT ON COLUMN downloads.ip_address IS 'User IP address for analytics';
COMMENT ON COLUMN downloads.user_agent IS 'Browser user agent string';
COMMENT ON COLUMN downloads.filename IS 'Generated filename for the download';
COMMENT ON COLUMN downloads.random_id IS 'Random identifier for the download';

COMMENT ON COLUMN admin_settings.id IS 'Unique setting identifier';
COMMENT ON COLUMN admin_settings.setting_key IS 'Setting key identifier (e.g., admin_password)';
COMMENT ON COLUMN admin_settings.setting_value IS 'Setting value (hashed for passwords)';
COMMENT ON COLUMN admin_settings.created_at IS 'Setting creation timestamp';
COMMENT ON COLUMN admin_settings.updated_at IS 'Setting last update timestamp';

COMMENT ON FUNCTION soft_delete_campaign(UUID) IS 'Soft delete a campaign by setting deleted_at timestamp';
COMMENT ON FUNCTION restore_campaign(UUID) IS 'Restore a soft deleted campaign by clearing deleted_at';
COMMENT ON FUNCTION permanent_delete_old_campaigns(INTEGER) IS 'Permanently delete campaigns that have been soft deleted for specified days';
COMMENT ON FUNCTION get_download_stats() IS 'Get overall download statistics';
COMMENT ON FUNCTION get_top_names(INTEGER) IS 'Get most popular user names with download counts';

COMMENT ON VIEW campaign_analytics IS 'Analytics view for active (non-deleted) campaigns only';
COMMENT ON VIEW deleted_campaigns IS 'View for soft deleted campaigns, useful for restoration';

-- ========================================
-- 10. SAMPLE DATA (OPTIONAL)
-- ========================================
-- Uncomment the following lines to insert sample data

/*
-- Sample text campaign
INSERT INTO campaigns (name, slug, template_url, is_active, campaign_type) VALUES
('Sample Text Campaign', 'sample-text', 'https://via.placeholder.com/1000x1000/14eb99/ffffff?text=Text+Template', true, 'text');

-- Sample photo campaign
INSERT INTO campaigns (name, slug, template_url, is_active, campaign_type) VALUES
('Sample Photo Campaign', 'sample-photo', 'https://via.placeholder.com/1000x1000/f59e0b/ffffff?text=Photo+Template', true, 'photo');

-- Sample downloads for analytics
INSERT INTO downloads (campaign_id, user_name, additional_text, ip_address, user_agent, filename, random_id)
SELECT 
    c.id,
    'User ' || generate_series(1, 10),
    'Sample text',
    '192.168.1.' || generate_series(1, 10),
    'Mozilla/5.0 (Sample Browser)',
    c.slug || '_sample_' || generate_series(1, 10) || '.jpg',
    substr(md5(random()::text), 1, 5)
FROM campaigns c
WHERE c.slug IN ('sample-text', 'sample-photo');

-- Insert default admin password (change this immediately after setup!)
INSERT INTO admin_settings (setting_key, setting_value) VALUES
('admin_password', '$2b$10$rLAzQqsZlKJKo9YAX.SFW.K3N8n7IzCt9yt9P0YjKnKc9d4Lx8e7m'); -- 'admin123'
*/

-- ========================================
-- 11. VERIFICATION QUERIES
-- ========================================
-- Run these queries to verify the setup

-- Check tables exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('campaigns', 'downloads', 'admin_settings');

-- Check views exist
SELECT table_name, table_type 
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('campaign_analytics', 'deleted_campaigns');

-- Check functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'soft_delete_campaign', 
    'restore_campaign', 
    'permanent_delete_old_campaigns',
    'get_download_stats',
    'get_top_names',
    'update_updated_at_column'
);

-- Check indexes exist
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('campaigns', 'downloads', 'admin_settings')
ORDER BY tablename, indexname;

-- ========================================
-- SETUP COMPLETE
-- ========================================
-- Your Twibbin database is now ready!
-- 
-- Next steps:
-- 1. Set up your environment variables in your React app
-- 2. Test the connection from your application
-- 3. Create your first campaign through the admin panel
-- 4. Upload template images to Supabase Storage or Cloudinary
-- 
-- For troubleshooting, check the comments and documentation above.