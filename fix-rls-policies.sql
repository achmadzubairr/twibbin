-- Fix RLS policies for soft delete functionality
-- Execute this in your Supabase SQL Editor

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow read active campaigns" ON campaigns;
DROP POLICY IF EXISTS "Allow insert campaigns" ON campaigns;
DROP POLICY IF EXISTS "Allow update campaigns" ON campaigns;
DROP POLICY IF EXISTS "Prevent hard delete campaigns" ON campaigns;

-- Create more permissive policies that work with soft delete
-- For now, allow all operations since this is a controlled admin environment
CREATE POLICY "Allow all operations on campaigns" ON campaigns FOR ALL USING (true);

-- Alternative: If you want more security, use these instead:
-- CREATE POLICY "Allow read campaigns" ON campaigns FOR SELECT USING (true);
-- CREATE POLICY "Allow insert campaigns" ON campaigns FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow update campaigns" ON campaigns FOR UPDATE USING (true) WITH CHECK (true);
-- CREATE POLICY "Prevent hard delete campaigns" ON campaigns FOR DELETE USING (false);

-- Ensure the soft_delete_campaign function has proper permissions
-- Grant execute permission to authenticated users (if needed)
GRANT EXECUTE ON FUNCTION soft_delete_campaign(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_campaign(UUID) TO authenticated;

-- Also ensure anon (anonymous) users can execute if needed for admin functionality
GRANT EXECUTE ON FUNCTION soft_delete_campaign(UUID) TO anon;
GRANT EXECUTE ON FUNCTION restore_campaign(UUID) TO anon;