-- Seed file for development test data
-- This file is executed when running `supabase start` or `supabase db reset`

-- Create test user in auth.users
-- Note: This approach is for local development only
-- In production, users should be created through Supabase Auth API

-- First, we need to create a test user
-- We'll use a workaround by creating a function with SECURITY DEFINER
-- to bypass the permission restrictions on auth.users

-- Create a temporary function to insert test user
CREATE OR REPLACE FUNCTION create_test_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Check if test user already exists
  SELECT id INTO test_user_id FROM auth.users WHERE email = 'test@famify.com';
  
  IF test_user_id IS NULL THEN
    -- Insert test user
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'test@famify.com',
      extensions.crypt('testpass123', extensions.gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{}',
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO test_user_id;
    
    -- Create profile for test user
    INSERT INTO public.profiles (id, created_at, updated_at)
    VALUES (test_user_id, now(), now());
    
    -- Create test children
    INSERT INTO public.children (id, parent_id, name, age, pin_hash, famcoin_balance, created_at, updated_at)
    VALUES 
      (gen_random_uuid(), test_user_id, 'Emma', 8, '1234', 100, now(), now()),
      (gen_random_uuid(), test_user_id, 'Liam', 10, '5678', 150, now(), now());
    
    RAISE NOTICE 'Test user created successfully with email: test@famify.com';
  ELSE
    RAISE NOTICE 'Test user already exists';
  END IF;
END;
$$;

-- Execute the function
SELECT create_test_user();

-- Drop the function after use
DROP FUNCTION create_test_user();