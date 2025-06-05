-- Supabase Database Schema for Twibbin
-- Execute these commands in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create campaigns table
CREATE TABLE campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    template_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create downloads table to track user downloads
CREATE TABLE downloads (
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

-- Create indexes for better performance
CREATE INDEX idx_campaigns_slug ON campaigns(slug);
CREATE INDEX idx_campaigns_active ON campaigns(is_active);
CREATE INDEX idx_downloads_campaign_id ON downloads(campaign_id);
CREATE INDEX idx_downloads_time ON downloads(download_time);

-- Create updated_at trigger for campaigns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE
    ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access and admin write access
-- For now, we'll allow all operations (you can restrict later)
CREATE POLICY "Allow all operations on campaigns" ON campaigns FOR ALL USING (true);
CREATE POLICY "Allow all operations on downloads" ON downloads FOR ALL USING (true);

-- Create a view for campaign analytics
CREATE VIEW campaign_analytics AS
SELECT 
    c.id,
    c.name,
    c.slug,
    c.is_active,
    c.created_at,
    COUNT(d.id) as total_downloads,
    COUNT(DISTINCT d.user_name) as unique_users,
    MAX(d.download_time) as last_download,
    COUNT(CASE WHEN d.download_time >= NOW() - INTERVAL '24 hours' THEN 1 END) as downloads_today,
    COUNT(CASE WHEN d.download_time >= NOW() - INTERVAL '7 days' THEN 1 END) as downloads_this_week,
    COUNT(CASE WHEN d.download_time >= NOW() - INTERVAL '30 days' THEN 1 END) as downloads_this_month
FROM campaigns c
LEFT JOIN downloads d ON c.id = d.campaign_id
GROUP BY c.id, c.name, c.slug, c.is_active, c.created_at
ORDER BY total_downloads DESC;

-- Insert sample data (optional)
-- INSERT INTO campaigns (name, slug, template_url, is_active) VALUES
-- ('Sample Campaign', 'sample-campaign', 'https://example.com/sample.jpg', true);