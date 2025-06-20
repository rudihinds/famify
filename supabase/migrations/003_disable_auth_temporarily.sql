-- Temporarily disable RLS policies for development
-- This allows operations without authentication

-- Drop existing policies that require authentication
DROP POLICY IF EXISTS "Parents can view their children" ON children;
DROP POLICY IF EXISTS "Parents can insert children" ON children;
DROP POLICY IF EXISTS "Parents can update their children" ON children;
DROP POLICY IF EXISTS "Parents can delete their children" ON children;

-- Create permissive policies for children table (temporary)
CREATE POLICY "Allow all operations on children (temp)" ON children
  FOR ALL USING (true) WITH CHECK (true);

-- Also allow profile operations without strict auth
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Allow all operations on profiles (temp)" ON profiles
  FOR ALL USING (true) WITH CHECK (true);

-- Make pin_hash nullable temporarily
ALTER TABLE children ALTER COLUMN pin_hash DROP NOT NULL;

-- Add a comment to remember this is temporary
COMMENT ON TABLE children IS 'RLS temporarily disabled for development - re-enable for production';
COMMENT ON TABLE profiles IS 'RLS temporarily disabled for development - re-enable for production';
