-- Fix admin password dengan hash yang benar
-- Hash untuk password 'admin123': 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9

UPDATE admin_settings 
SET setting_value = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
WHERE setting_key = 'admin_password';

-- Verify the update
SELECT setting_key, setting_value, updated_at 
FROM admin_settings 
WHERE setting_key = 'admin_password';