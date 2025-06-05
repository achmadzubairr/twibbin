-- ========================================
-- TWIBBIN - Simple Database Setup
-- ========================================
-- Run this step by step in Supabase SQL Editor

-- Step 1: Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create index
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON admin_settings(setting_key);

-- Step 3: Enable RLS
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policy
CREATE POLICY "Allow all operations on admin_settings" ON admin_settings 
    FOR ALL USING (true);

-- Step 5: Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 6: Apply trigger to admin_settings
DROP TRIGGER IF EXISTS update_admin_settings_updated_at ON admin_settings;
CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE
    ON admin_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Insert default admin password (admin123)
-- Hash untuk 'admin123': e3afed0047b08059d0fada10f400c1e5
INSERT INTO admin_settings (setting_key, setting_value) 
VALUES ('admin_password', 'e3afed0047b08059d0fada10f400c1e5')
ON CONFLICT (setting_key) DO NOTHING;

-- Verification query
SELECT * FROM admin_settings WHERE setting_key = 'admin_password';