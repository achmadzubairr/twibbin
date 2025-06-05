-- Fix: Add campaign_type column to campaigns table
-- Execute this in your Supabase SQL Editor

-- 1. Add the campaign_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='campaign_type') THEN
        ALTER TABLE campaigns ADD COLUMN campaign_type VARCHAR(20) DEFAULT 'text' CHECK (campaign_type IN ('text', 'photo'));
    END IF;
END $$;

-- 2. Update existing campaigns to have default type
UPDATE campaigns SET campaign_type = 'text' WHERE campaign_type IS NULL;

-- 3. Create index for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(campaign_type);

-- 4. Add comment
COMMENT ON COLUMN campaigns.campaign_type IS 'Type of campaign: text (name + additional text) or photo (user uploads photo)';