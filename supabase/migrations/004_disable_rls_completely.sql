-- Completely disable RLS for development
-- This is a temporary measure for development only

-- Disable RLS entirely on children table
ALTER TABLE children DISABLE ROW LEVEL SECURITY;

-- Disable RLS entirely on profiles table  
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies since RLS is disabled
DROP POLICY IF EXISTS "Allow all operations on children (temp)" ON children;
DROP POLICY IF EXISTS "Allow all operations on profiles (temp)" ON profiles;

-- Add comment to remember to re-enable for production
COMMENT ON TABLE children IS 'RLS completely disabled for development - MUST re-enable for production';
COMMENT ON TABLE profiles IS 'RLS completely disabled for development - MUST re-enable for production';
